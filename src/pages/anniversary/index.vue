<template>
  <view class="page">
    <CustomNavBar title="纪念日" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">

        <!-- ── 加载中 ── -->
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>

        <template v-else>
          <!-- ── 那年今日 ── -->
          <view v-if="todayHistory.length > 0" class="section-card">
            <view class="section-header">
              <text class="section-icon">📅</text>
              <text class="section-title">那年今日</text>
            </view>

            <view v-for="item in todayHistory" :key="item.diary.id" class="history-item press-feedback">
              <view class="history-years">
                <text class="years-num">{{ item.yearsAgo }}</text>
                <text class="years-label">年前</text>
              </view>
              <view class="history-body">
                <text class="history-date">{{ todayDateStr }}</text>
                <text class="history-excerpt">"{{ item.diary.content ? item.diary.content.slice(0, 40) + '...' : '查看日记' }}"</text>
              </view>
              <view class="history-arrow">
                <text class="arrow-text">›</text>
              </view>
            </view>
          </view>

          <!-- ── 今日纪念日提醒 ── -->
          <view v-if="todayAnniversaries.length > 0" class="section-card today-card">
            <view class="section-header">
              <text class="section-icon">🎉</text>
              <text class="section-title">今日纪念日</text>
            </view>

            <view v-for="ann in todayAnniversaries" :key="ann.id" class="ann-item ann-today">
              <view class="ann-icon-wrap">
                <text class="ann-icon">💕</text>
              </view>
              <view class="ann-info">
                <text class="ann-title">{{ ann.title }}</text>
                <view class="ann-meta-row">
                  <text class="ann-meta">{{ ann.date }}</text>
                  <view class="ann-source" :class="ann.source === 'ai_extracted' ? 'source-ai' : 'source-manual'">
                    <text class="source-text">{{ ann.source === 'ai_extracted' ? 'AI感知' : '手动添加' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- ── 纪念日列表 ── -->
          <view class="section-card">
            <view class="section-header">
              <text class="section-icon">🗓</text>
              <text class="section-title">纪念日列表</text>
              <text class="ann-count">共 {{ anniversaries.length }} 个</text>
            </view>

            <view v-if="anniversaries.length === 0" class="empty-ann">
              <text class="empty-text">还没有纪念日</text>
              <text class="empty-sub">添加第一个纪念日吧</text>
            </view>

            <view
              v-for="(ann, index) in anniversaries"
              :key="ann.id"
              class="ann-item"
              :class="{ 'ann-item-border': index > 0 }"
            >
              <view class="ann-icon-wrap">
                <text class="ann-icon">{{ getAnnIcon(ann) }}</text>
              </view>
              <view class="ann-info">
                <text class="ann-title">{{ ann.title }}</text>
                <view class="ann-meta-row">
                  <text class="ann-meta">{{ ann.date }}</text>
                  <text v-if="ann.year" class="ann-meta"> · {{ ann.year }}年</text>
                  <view class="ann-source" :class="ann.source === 'ai_extracted' ? 'source-ai' : 'source-manual'">
                    <text class="source-text">{{ ann.source === 'ai_extracted' ? 'AI自动感知' : '手动添加' }}</text>
                  </view>
                </view>
                <text v-if="ann.relatedPerson" class="ann-person">相关人：{{ ann.relatedPerson }}</text>
              </view>
              <view class="ann-actions">
                <view class="ann-delete press-feedback" @click="handleDelete(ann.id)">
                  <DoodleIcon name="cross" color="#AE9D92" :size="28" />
                </view>
              </view>
            </view>
          </view>

          <!-- ── 添加按钮 ── -->
          <view class="add-ann-btn press-feedback" @click="showAddDialog = true">
            <DoodleIcon name="plus" color="#FFFFFF" :size="32" :filtered="false" />
            <text class="add-btn-text">添加纪念日</text>
          </view>

          <view class="bottom-spacer" />
        </template>
      </view>
    </scroll-view>

    <!-- ── 添加纪念日弹窗 ── -->
    <view v-if="showAddDialog" class="overlay" @click="showAddDialog = false">
      <view class="dialog-sheet" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">添加纪念日</text>
          <view class="dialog-close press-feedback" @click="showAddDialog = false">
            <DoodleIcon name="cross" color="#AE9D92" :size="28" />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">纪念日名称</text>
          <input
            v-model="newAnn.title"
            class="form-input"
            placeholder="如：相识纪念日、妈妈生日..."
            :placeholder-style="'color: #D4C4B8;'"
          />
        </view>

        <view class="form-item">
          <text class="form-label">日期</text>
          <view class="form-date-row press-feedback" @click="pickDate">
            <text :class="newAnn.date ? 'date-value' : 'date-placeholder'">
              {{ newAnn.date || '选择日期（月-日）' }}
            </text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">相关人（选填）</text>
          <input
            v-model="newAnn.relatedPerson"
            class="form-input"
            placeholder="如：小红、妈妈..."
            :placeholder-style="'color: #D4C4B8;'"
          />
        </view>

        <view class="dialog-footer">
          <view class="dialog-cancel press-feedback" @click="showAddDialog = false">
            <text class="cancel-text">取消</text>
          </view>
          <view class="dialog-confirm press-feedback" @click="handleAddAnniversary">
            <text class="confirm-text">确定添加</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import {
  getAnniversaries,
  getTodayAnniversaries,
  createAnniversary,
  deleteAnniversary,
} from '@/services/api/anniversary'
import type { Anniversary } from '@/services/api/anniversary'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const loading = ref(true)
const anniversaries = ref<Anniversary[]>([])
const todayAnniversaries = ref<Anniversary[]>([])
const todayHistory = ref<Array<{ diary: any; yearsAgo: number }>>([])
const showAddDialog = ref(false)

const newAnn = reactive({
  title: '',
  date: '',
  relatedPerson: '',
})

const todayDateStr = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value

  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [annList, todayData] = await Promise.all([
      getAnniversaries(),
      getTodayAnniversaries(),
    ])
    anniversaries.value = annList
    todayAnniversaries.value = todayData.anniversaries
    todayHistory.value = todayData.thisDateInHistory
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getAnnIcon(ann: Anniversary): string {
  const title = ann.title
  if (title.includes('生日')) return '🎂'
  if (title.includes('认识') || title.includes('相识') || title.includes('纪念')) return '💕'
  if (title.includes('结婚') || title.includes('婚')) return '💍'
  if (title.includes('毕业')) return '🎓'
  if (ann.source === 'ai_extracted') return '✨'
  return '📅'
}

function pickDate() {
  const months = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}月`)
  uni.showActionSheet({
    itemList: months,
    success: (res) => {
      const month = String(res.tapIndex + 1).padStart(2, '0')
      const days = Array.from({ length: 31 }, (_, i) => `${String(i + 1).padStart(2, '0')}日`)
      uni.showActionSheet({
        itemList: days,
        success: (res2) => {
          const day = String(res2.tapIndex + 1).padStart(2, '0')
          newAnn.date = `${month}-${day}`
        }
      })
    }
  })
}

async function handleAddAnniversary() {
  if (!newAnn.title.trim()) {
    uni.showToast({ title: '请输入纪念日名称', icon: 'none' })
    return
  }
  if (!newAnn.date) {
    uni.showToast({ title: '请选择日期', icon: 'none' })
    return
  }

  try {
    const ann = await createAnniversary({
      title: newAnn.title,
      date: newAnn.date,
      relatedPerson: newAnn.relatedPerson,
      source: 'manual',
    })
    anniversaries.value.unshift(ann)
    showAddDialog.value = false
    newAnn.title = ''
    newAnn.date = ''
    newAnn.relatedPerson = ''
    uni.showToast({ title: '添加成功 ✓', icon: 'success' })
  } catch {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

async function handleDelete(id: string) {
  uni.showModal({
    title: '删除纪念日',
    content: '确定删除这个纪念日吗？',
    confirmColor: '#D4645C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteAnniversary(id)
          const idx = anniversaries.value.findIndex(a => a.id === id)
          if (idx >= 0) anniversaries.value.splice(idx, 1)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {}
.scroll {}

.content {
  padding: 24rpx 32rpx;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #AE9D92;
}

/* 分组卡片 */
.section-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
}

.today-card {
  background: linear-gradient(135deg, #FDF0E8, #FFF5EE);
  border: 2rpx solid rgba(232, 133, 90, 0.15);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.section-icon {
  font-size: 36rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2C1F14;
  flex: 1;
}

.ann-count {
  font-size: 24rpx;
  color: #AE9D92;
}

/* 那年今日 */
.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid rgba(174, 157, 146, 0.1);
  &:active { opacity: 0.7; }
}

.history-years {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(232, 133, 90, 0.1);
  border-radius: 16rpx;
  padding: 12rpx 16rpx;
  flex-shrink: 0;
}

.years-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #E8855A;
  line-height: 1;
}

.years-label {
  font-size: 20rpx;
  color: #E8855A;
}

.history-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.history-date {
  font-size: 24rpx;
  color: #AE9D92;
}

.history-excerpt {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.5;
}

.history-arrow {
  flex-shrink: 0;
}

.arrow-text {
  font-size: 40rpx;
  color: #AE9D92;
}

/* 纪念日条目 */
.ann-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
}

.ann-item-border {
  border-top: 1rpx solid rgba(174, 157, 146, 0.1);
}

.ann-today {
  background: rgba(232, 133, 90, 0.05);
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.ann-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #FDF0E8, #FFF5EE);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ann-icon {
  font-size: 40rpx;
}

.ann-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.ann-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.ann-meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.ann-meta {
  font-size: 24rpx;
  color: #AE9D92;
}

.ann-source {
  border-radius: 10rpx;
  padding: 4rpx 12rpx;
}

.source-ai {
  background: rgba(232, 133, 90, 0.1);
}

.source-manual {
  background: rgba(91, 191, 142, 0.1);
}

.source-text {
  font-size: 20rpx;
  .source-ai & { color: #E8855A; }
  .source-manual & { color: #5BBF8E; }
}

.ann-person {
  font-size: 24rpx;
  color: #AE9D92;
}

.ann-actions {
  flex-shrink: 0;
}

.ann-delete {
  padding: 8rpx;
  &:active { opacity: 0.6; }
}

/* 空状态 */
.empty-ann {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #AE9D92;
}

.empty-sub {
  font-size: 24rpx;
  color: #D4C4B8;
}

/* 添加按钮 */
.add-ann-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 44rpx;
  height: 88rpx;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.25);
  margin-bottom: 24rpx;
  &:active { opacity: 0.85; }
}

.add-btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.bottom-spacer {
  height: 40rpx;
}

/* 弹窗 */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.dialog-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.dialog-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C1F14;
}

.dialog-close {
  padding: 8rpx;
  &:active { opacity: 0.6; }
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #FDF8F3;
  border: 2rpx solid #EAE0D6;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #2C1F14;
  box-sizing: border-box;
}

.form-date-row {
  width: 100%;
  height: 80rpx;
  background: #FDF8F3;
  border: 2rpx solid #EAE0D6;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  &:active { opacity: 0.8; }
}

.date-value {
  font-size: 30rpx;
  color: #2C1F14;
}

.date-placeholder {
  font-size: 30rpx;
  color: #D4C4B8;
}

.dialog-footer {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.dialog-cancel {
  flex: 1;
  background: #F5F0EB;
  border-radius: 20rpx;
  padding: 24rpx;
  text-align: center;
  &:active { opacity: 0.8; }
}

.cancel-text {
  font-size: 30rpx;
  color: #4A3628;
  font-weight: 500;
}

.dialog-confirm {
  flex: 2;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 20rpx;
  padding: 24rpx;
  text-align: center;
  &:active { opacity: 0.85; }
}

.confirm-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 700;
}
</style>
