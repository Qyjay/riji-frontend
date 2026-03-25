<template>
  <view class="page">

    <CustomNavBar
      title="待办清单"
      left-icon="back"
      right-text="+ 添加"
      @right-click="showAddModal = true"
    />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- AI 自动提取 -->
      <SectionTitle title="AI 自动提取" />
      <view class="card ai-card">
        <view class="card-header">
          <DoodleIcon name="robot" :size="48" color="#E8855A" class="card-header-icon" />
          <text class="card-header-label">从日记和对话中识别：</text>
        </view>
        <view
          v-for="item in aiTodos"
          :key="item.id"
          class="todo-item"
          @click="toggleTodo(item.id)"
        >
          <view class="todo-check" :class="{ 'todo-check--done': item.completed }">
            <text v-if="item.completed" class="check-icon">✓</text>
          </view>
          <view class="todo-body">
            <text class="todo-content" :class="{ 'todo-content--done': item.completed }">{{ item.content }}</text>
            <view class="todo-meta">
              <text class="meta-item">⏰ {{ item.due }}</text>
              <text class="meta-item">🔔 {{ item.remind }}</text>
            </view>
            <view class="todo-source">
              <text class="source-tag">来源：{{ item.source }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 手动添加 -->
      <SectionTitle title="手动添加" />
      <view class="card">
        <view
          v-for="item in manualTodos"
          :key="item.id"
          class="todo-item"
          @click="toggleTodo(item.id)"
        >
          <view class="todo-check" :class="{ 'todo-check--done': item.completed }">
            <text v-if="item.completed" class="check-icon">✓</text>
          </view>
          <view class="todo-body">
            <text class="todo-content" :class="{ 'todo-content--done': item.completed }">{{ item.content }}</text>
            <view v-if="item.due" class="todo-meta">
              <text class="meta-item">⏰ {{ item.due }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 已完成（折叠） -->
      <view class="completed-section">
        <view class="completed-header" @click="completedExpanded = !completedExpanded">
          <text class="completed-title">已完成 ({{ completedTodos.length }})</text>
          <text class="completed-arrow">{{ completedExpanded ? '▼' : '▶' }}</text>
        </view>
        <view v-if="completedExpanded" class="card">
          <view
            v-for="item in completedTodos"
            :key="item.id"
            class="todo-item todo-item--completed"
          >
            <view class="todo-check todo-check--done">
              <text class="check-icon">✓</text>
            </view>
            <view class="todo-body">
              <text class="todo-content todo-content--done">{{ item.content }}</text>
              <view class="todo-meta">
                <text class="meta-item meta-item--done">✅ 已完成 {{ item.completedAt }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 添加弹窗 -->
    <view v-if="showAddModal" class="modal-mask" @click.self="showAddModal = false">
      <view class="modal-card">
        <view class="modal-header">
          <text class="modal-title">添加待办</text>
          <view class="modal-close" @click="showAddModal = false">
            <text>✕</text>
          </view>
        </view>
        <input
          v-model="newTodoContent"
          class="modal-input"
          placeholder="待办事项"
          placeholder-class="input-placeholder"
        />
        <view class="modal-date-row">
          <text class="modal-date-label">截止日期：</text>
          <picker mode="date" :value="newTodoDate" @change="onDateChange">
            <view class="modal-date-picker">
              <text>{{ newTodoDate }}</text>
            </view>
          </picker>
        </view>
        <view class="modal-btns">
          <view class="btn-cancel" @click="showAddModal = false">
            <text>取消</text>
          </view>
          <view class="btn-confirm" @click="addTodo">
            <text>确认添加</text>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

const SectionTitle = {
  props: { title: String },
  template: `<view class="section-title-wrap"><text class="section-title">{{ title }}</text></view>`,
}

interface TodoItem {
  id: string
  content: string
  completed: boolean
  due?: string
  remind?: string
  source?: string
  completedAt?: string
  isAI?: boolean
}

const showAddModal = ref(false)
const newTodoContent = ref('')
const newTodoDate = ref('今天')
const completedExpanded = ref(false)

// AI 提取的待办
const aiTodos = ref<TodoItem[]>([
  { id: 'ai1', content: '交数据结构作业', completed: false, due: '明天 23:59', remind: '18:00', source: '今日日记' },
  { id: 'ai2', content: '和导师谈论文', completed: false, due: '下周三', remind: '9:00', source: 'AI 对话' },
])

// 手动添加的待办
const manualTodos = ref<TodoItem[]>([
  { id: 'm1', content: '雅思阅读练习', completed: false, due: '今天' },
  { id: 'm2', content: '刷算法 hot100', completed: false, due: '明天' },
  { id: 'm3', content: '跑步 3 公里', completed: false, due: '今天' },
])

// 已完成
const completedTodos = ref<TodoItem[]>([
  { id: 'c1', content: '买酸奶', completed: true, completedAt: '16:30' },
  { id: 'c2', content: '完成留学文书初稿', completed: true, completedAt: '昨天' },
])

function toggleTodo(id: string) {
  // 先在 aiTodos 里找
  const aiIdx = aiTodos.value.findIndex(t => t.id === id)
  if (aiIdx !== -1) {
    const item = aiTodos.value[aiIdx]
    item.completed = !item.completed
    if (item.completed) {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      completedTodos.value.unshift({ ...item, completedAt: time, id: `c_${Date.now()}` })
      aiTodos.value.splice(aiIdx, 1)
    }
    return
  }
  // manualTodos
  const mIdx = manualTodos.value.findIndex(t => t.id === id)
  if (mIdx !== -1) {
    const item = manualTodos.value[mIdx]
    item.completed = !item.completed
    if (item.completed) {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      completedTodos.value.unshift({ ...item, completedAt: time, id: `c_${Date.now()}` })
      manualTodos.value.splice(mIdx, 1)
    }
    return
  }
}

function onDateChange(e: any) {
  newTodoDate.value = e.detail.value
}

function addTodo() {
  if (!newTodoContent.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  manualTodos.value.push({
    id: `m_${Date.now()}`,
    content: newTodoContent.value.trim(),
    completed: false,
    due: newTodoDate.value,
  })
  newTodoContent.value = ''
  newTodoDate.value = '今天'
  showAddModal.value = false
  uni.showToast({ title: '已添加！', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 0 24rpx;
}

/* ── 标题 ── */
.section-title-wrap {
  padding: 20rpx 0 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

/* ── 卡片 ── */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 16rpx;
}

.ai-card .card-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 24rpx 12rpx;
  border-bottom: 1rpx solid #F5F0EB;
}

.card-header-icon { display: flex; align-items: center; }
.card-header-label { font-size: 26rpx; color: #4A3628; font-weight: 500; }

/* ── 待办项 ── */
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #F5F0EB;
  cursor: pointer;
  transition: background 0.15s;
  &:active { background: #FDF8F3; }
  &:last-child { border-bottom: none; }
}

.todo-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 3rpx solid #D4C4B8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
  transition: background 0.15s;
}

.todo-check--done {
  background: #5BBF8E;
  border-color: #5BBF8E;
}

.check-icon {
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 700;
}

.todo-body { flex: 1; }

.todo-content {
  font-size: 30rpx;
  color: #2C1F14;
  display: block;
  margin-bottom: 6rpx;
  line-height: 1.4;
}

.todo-content--done {
  text-decoration: line-through;
  color: #AE9D92;
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #4A3628;
  opacity: 0.7;
}

.meta-item--done { color: #5BBF8E; opacity: 1; }

.todo-source { margin-top: 4rpx; }

.source-tag {
  font-size: 22rpx;
  color: #AE9D92;
  background: #F5F0EB;
  border-radius: 10rpx;
  padding: 2rpx 10rpx;
}

/* ── 已完成区 ── */
.completed-section {
  margin-top: 8rpx;
}

.completed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  cursor: pointer;
}

.completed-title {
  font-size: 28rpx;
  color: #AE9D92;
}

.completed-arrow {
  font-size: 24rpx;
  color: #AE9D92;
}

/* ── 添加弹窗 ── */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(44, 31, 20, 0.4);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 120rpx;
}

.modal-card {
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx 48rpx;
  width: 100%;
  max-width: 750rpx;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C1F14;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}

.modal-input {
  width: 100%;
  height: 88rpx;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
  color: #2C1F14;
  margin-bottom: 20rpx;
  box-sizing: border-box;
}

.input-placeholder { color: #AE9D92; font-size: 28rpx; }

.modal-date-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 32rpx;
}

.modal-date-label {
  font-size: 28rpx;
  color: #4A3628;
}

.modal-date-picker {
  background: #FDF8F3;
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  font-size: 28rpx;
  color: #2C1F14;
}

.modal-btns {
  display: flex;
  gap: 16rpx;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background: #F5F0EB;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.8; }
  text { font-size: 30rpx; color: #4A3628; }
}

.btn-confirm {
  flex: 2;
  height: 88rpx;
  background: #E8855A;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.85; }
  text { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
}

.bottom-spacer { height: 40rpx; }
</style>
