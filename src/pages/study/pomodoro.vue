<template>
  <view class="page">

    <CustomNavBar
      title="番茄钟 Pro"
      left-icon="back"
      @right-click="showStats = !showStats"
    >
      <template #right>
        <view class="nav-stats-btn" @click="showStats = !showStats">
          <DoodleIcon name="chart" color="#8A7668" :size="40" />
        </view>
      </template>
    </CustomNavBar>

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- AI 对话区 -->
      <view class="ai-chat-card">
        <view class="ai-bubble bot">
          <view class="bot-avatar doodle-box-v3">
            <DoodleIcon name="robot" color="#FFFFFF" :size="18" :filtered="false" />
          </view>
          <text class="bubble-text">{{ aiMessages[currentAiIndex].text }}</text>
        </view>

        <template v-if="phase !== 'idle'">
          <view class="ai-bubble user">
            <text class="bubble-text">{{ taskInput }}</text>
          </view>
          <view v-if="phase !== 'completed'" class="ai-bubble bot">
            <view class="bot-avatar doodle-box-v3">
              <DoodleIcon name="robot" color="#FFFFFF" :size="36" :filtered="false" />
            </view>
            <text class="bubble-text">{{ aiEncouragement }}</text>
          </view>
        </template>

        <template v-if="phase === 'completed'">
          <view class="ai-bubble bot">
            <view class="bot-avatar doodle-box-v3">
              <DoodleIcon name="robot" color="#FFFFFF" :size="36" :filtered="false" />
            </view>
            <text class="bubble-text">做得好！要记录结果吗？</text>
          </view>
        </template>
      </view>

      <!-- 任务输入（idle 阶段） -->
      <view v-if="phase === 'idle'" class="task-input-card">
        <input
          v-model="taskInput"
          class="task-input"
          placeholder="这个番茄钟做什么？"
          placeholder-class="input-placeholder"
        />
        <view class="quick-tags">
          <view
            v-for="tag in quickTags"
            :key="tag"
            class="quick-tag"
            :class="{ 'quick-tag--active': taskInput === tag }"
            @click="selectTag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
        <view class="btn-primary" @click="startTimer">
          <text>开始对话</text>
        </view>
      </view>

      <!-- 倒计时主区域 -->
      <view v-if="phase !== 'idle'" class="timer-area">

        <!-- 圆环 -->
        <view class="timer-ring-wrap">
          <!-- 背景圆环 -->
          <view class="ring-bg" />
          <!-- 进度圆环：CSS conic-gradient -->
          <view
            class="ring-progress"
            :style="{
              background: `conic-gradient(#E8855A ${progressDeg}deg, transparent ${progressDeg}deg)`
            }"
          />
          <!-- 中心 -->
          <view class="ring-center">
            <text class="timer-digits">{{ displayTime }}</text>
            <text class="timer-label">{{ phaseLabel }}</text>
          </view>
        </view>

        <!-- 控制按钮 -->
        <view class="timer-controls">
          <template v-if="phase === 'ready'">
            <view class="btn-primary btn-large press-feedback" @click="startCountdown">
              <DoodleIcon name="check" color="#FFFFFF" :size="36" :filtered="false" />
              <text>开始专注</text>
            </view>
          </template>
          <template v-else-if="phase === 'running'">
            <view class="btn-warn press-feedback" @click="pauseTimer">
              <text>暂停</text>
            </view>
            <view class="btn-ghost press-feedback" @click="giveUp">
              <DoodleIcon name="cross" color="#AE9D92" :size="32" />
              <text>放弃</text>
            </view>
          </template>
          <template v-else-if="phase === 'paused'">
            <view class="btn-primary btn-large press-feedback" @click="resumeTimer">
              <text>继续</text>
            </view>
            <view class="btn-ghost press-feedback" @click="giveUp">
              <DoodleIcon name="cross" color="#AE9D92" :size="32" />
              <text>放弃</text>
            </view>
          </template>
          <template v-else-if="phase === 'completed'">
            <view class="result-input-row">
              <input
                v-model="resultInput"
                class="result-input"
                placeholder="今天正确率如何？"
                placeholder-class="input-placeholder"
              />
            </view>
            <view class="btn-primary btn-large press-feedback" @click="recordResult">
              <DoodleIcon name="check" color="#FFFFFF" :size="36" :filtered="false" />
              <text>记录</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 今日统计（可折叠） -->
      <view v-if="showStats" class="stats-section">
        <SectionTitle title="今日统计" />
        <view class="stats-card">

          <!-- 进度条 -->
          <view class="stats-progress-row">
            <text class="stats-label">今日番茄：</text>
            <view class="stats-bar-wrap">
              <view class="stats-bar-done" :style="{ width: progressBarWidth }" />
              <view class="stats-bar-rest" />
            </view>
            <text class="stats-label">4/6</text>
          </view>

          <!-- 分类标签 -->
          <view class="tag-chips">
            <view class="tag-chip tag-chip--success">
              <DoodleIcon name="target" color="#6BA87B" :size="14" />
              <text> 雅思阅读</text>
              <text class="chip-count">×3</text>
            </view>
            <view class="tag-chip tag-chip--info">
              <DoodleIcon name="bookopen" color="#6B8EB4" :size="14" />
              <text> 编程</text>
              <text class="chip-count">×1</text>
            </view>
          </view>

          <!-- 本周趋势柱状图 -->
          <view class="stats-sub-title-row">
            <DoodleIcon name="chart" color="#C8A86B" :size="16" />
            <text class="stats-sub-title"> 本周趋势</text>
          </view>
          <view class="bar-chart">
            <view
              v-for="day in weekData"
              :key="day.label"
              class="bar-col"
            >
              <view
                class="bar-fill"
                :class="{ 'bar-fill--today': day.isToday }"
                :style="{ height: (day.value / maxWeekValue * 100) + '%' }"
              />
              <text class="bar-label">{{ day.label }}</text>
            </view>
          </view>

        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
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

// ── 状态机 ──
type Phase = 'idle' | 'ready' | 'running' | 'paused' | 'completed'
const phase = ref<Phase>('idle')
const showStats = ref(true)
const taskInput = ref('')
const resultInput = ref('')
const timer = ref(25 * 60) // 秒
let intervalId: ReturnType<typeof setInterval> | null = null

const TOTAL = 25 * 60

const quickTags = ['雅思阅读', '编程', '数学', '英语口语']

const aiMessages = [
  { text: '这个番茄钟做什么？' },
]

const aiEncouragement = computed(() => {
  const task = taskInput.value
  if (task.includes('雅思')) return '上次正确率9/13，今天挑战10/13？加油！💪'
  if (task.includes('编程')) return '代码之路虽然艰辛，但每一次 debug 都是成长！'
  if (task.includes('数学')) return '数学是宇宙的语言，你在探索真理！'
  return '专注当下，每一分钟都在积累力量 🌟'
})

const currentAiIndex = ref(0)

const progressDeg = computed(() => {
  return ((TOTAL - timer.value) / TOTAL) * 360
})

const displayTime = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const phaseLabel = computed(() => {
  const map: Record<Phase, string> = {
    idle: '',
    ready: '准备就绪',
    running: '专注中',
    paused: '已暂停',
    completed: '完成！',
  }
  return map[phase.value]
})

// ── 操作 ──
function selectTag(tag: string) {
  taskInput.value = tag
}

function startTimer() {
  if (!taskInput.value.trim()) {
    uni.showToast({ title: '请输入任务', icon: 'none' })
    return
  }
  phase.value = 'ready'
}

function startCountdown() {
  phase.value = 'running'
  intervalId = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      clearInterval(intervalId!)
      intervalId = null
      phase.value = 'completed'
    }
  }, 1000)
}

function pauseTimer() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  phase.value = 'paused'
}

function resumeTimer() {
  phase.value = 'running'
  intervalId = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      clearInterval(intervalId!)
      intervalId = null
      phase.value = 'completed'
    }
  }, 1000)
}

function giveUp() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  timer.value = TOTAL
  phase.value = 'idle'
  taskInput.value = ''
}

function recordResult() {
  uni.showToast({ title: '已记录！🎉', icon: 'none' })
  timer.value = TOTAL
  phase.value = 'idle'
  taskInput.value = ''
  resultInput.value = ''
}

// ── 统计数据 ──
const progressBarWidth = computed(() => `${(4 / 6) * 100}%`)

const weekData = [
  { label: 'Mon', value: 2 },
  { label: 'Tue', value: 4 },
  { label: 'Wed', value: 6 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 2 },
  { label: 'Sat', value: 8, isToday: true },
]

const maxWeekValue = computed(() => Math.max(...weekData.map(d => d.value)))

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
  flex-shrink: 0;
}

.nav-stats-btn {
  padding: 8rpx;
}

.page-scroll {
  padding: 0 24rpx;
}

/* ── AI 对话 ── */
.ai-chat-card {
  margin: 20rpx 0 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.ai-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  max-width: 85%;
}

.ai-bubble.bot { align-self: flex-start; }
.ai-bubble.user { align-self: flex-end; flex-direction: row-reverse; }

.bot-avatar {
  width: 32rpx;
  height: 32rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
}

.bubble-text {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 12rpx 18rpx;
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.5;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.ai-bubble.user .bubble-text {
  background: #E8855A;
  color: #FFFFFF;
}

/* ── 任务输入 ── */
.task-input-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 20rpx;
}

.task-input {
  width: 100%;
  height: 80rpx;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
  color: #2C1F14;
  margin-bottom: 16rpx;
  box-sizing: border-box;
}

.input-placeholder {
  color: #AE9D92;
  font-size: 28rpx;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.quick-tag {
  background: #FDF0E8;
  border-radius: 20rpx;
  padding: 8rpx 20rpx;
  font-size: 26rpx;
  color: #4A3628;
  cursor: pointer;
  transition: background 0.15s;
  &:active { background: #F7CDB5; }
}

.quick-tag--active {
  background: #E8855A;
  color: #FFFFFF;
}

/* ── 计时器区域 ── */
.timer-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20rpx 0;
}

.timer-ring-wrap {
  width: 400rpx;
  height: 400rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.ring-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #F7CDB5;
  opacity: 0.25;
}

.ring-progress {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transition: background 0.3s;
}

.ring-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 340rpx;
  height: 340rpx;
  border-radius: 50%;
  background: #FDF8F3;
}

.timer-digits {
  font-size: 80rpx;
  font-weight: 600;
  color: #2C1F14;
  letter-spacing: 4rpx;
  line-height: 1;
}

.timer-label {
  font-size: 26rpx;
  color: #AE9D92;
  margin-top: 8rpx;
}

.timer-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  width: 100%;
}

.result-input-row {
  width: 100%;
  margin-bottom: 16rpx;
}

.result-input {
  width: 100%;
  height: 80rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
  color: #2C1F14;
  box-sizing: border-box;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background: #E8855A;
  border-radius: 28rpx 36rpx 24rpx 32rpx;
  padding: 20rpx 56rpx;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.2);
  text { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
}

.btn-large {
  padding: 24rpx 80rpx;
  text { font-size: 34rpx; }
}

.btn-warn {
  background: #E8A94E;
  border-radius: 28rpx 36rpx 24rpx 32rpx;
  padding: 20rpx 48rpx;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  text { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
}

.btn-ghost {
  background: transparent;
  border: 3rpx solid #D4C4B8;
  border-radius: 28rpx 36rpx 24rpx 32rpx;
  padding: 18rpx 48rpx;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  text { font-size: 32rpx; color: #AE9D92; }
}

/* ── 统计 ── */
.stats-section {
  margin-top: 24rpx;
}

.section-title-wrap {
  padding: 8rpx 0 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.stats-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.stats-progress-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.stats-label {
  font-size: 28rpx;
  color: #4A3628;
  flex-shrink: 0;
}

.stats-bar-wrap {
  flex: 1;
  height: 16rpx;
  border-radius: 8rpx;
  background: #F5F0EB;
  overflow: hidden;
  display: flex;
}

.stats-bar-done {
  height: 100%;
  background: #E8855A;
  border-radius: 8rpx;
  transition: width 0.3s;
}

.stats-bar-rest { flex: 1; }

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  border-radius: 20rpx;
  padding: 8rpx 16rpx;
  font-size: 26rpx;
  color: #4A3628;
}

.tag-chip--success { background: rgba(91, 191, 142, 0.15); }
.tag-chip--info    { background: rgba(107, 142, 196, 0.15); }

.chip-count {
  font-weight: 600;
  color: #2C1F14;
}

.stats-sub-title-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 16rpx;
}

.stats-sub-title {
  font-size: 28rpx;
  color: #4A3628;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  height: 120rpx;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  height: 100%;
}

.bar-fill {
  width: 100%;
  background: #F7CDB5;
  border-radius: 6rpx 6rpx 0 0;
  transition: height 0.3s;
  min-height: 8rpx;
}

.bar-fill--today {
  background: #E8855A;
}

.bar-label {
  font-size: 20rpx;
  color: #AE9D92;
  flex-shrink: 0;
}

.bottom-spacer { height: 60rpx; }
</style>
