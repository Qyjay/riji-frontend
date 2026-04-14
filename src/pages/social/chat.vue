<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getMessages, sendMessage, getMatchReport } from '@/services/api/social'
import type { Message, Match, MatchReport } from '@/services/api/social'

const navBarHeight = ref(64)
const matchId = ref('')
const nickname = ref('')
const avatar = ref('')
const messages = ref<Message[]>([])
const inputText = ref('')
const scrollTopVal = ref(0)
const loading = ref(true)
const showReport = ref(false)
const report = ref<MatchReport | null>(null)

const canSend = computed(() => inputText.value.trim().length > 0)

function formatTime(timestamp: number) {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateLabel(timestamp: number) {
  const d = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

interface DisplayItem {
  type: 'time' | 'message'
  id: string
  label?: string
  message?: Message
}

const displayItems = computed<DisplayItem[]>(() => {
  const items: DisplayItem[] = []
  let lastTimestamp = 0
  for (const msg of messages.value) {
    // 超过 5 分钟间隔显示时间
    if (!lastTimestamp || Math.abs(msg.timestamp - lastTimestamp) > 5 * 60 * 1000) {
      items.push({
        type: 'time',
        id: `time-${msg.id}`,
        label: `${formatDateLabel(msg.timestamp)} ${formatTime(msg.timestamp)}`,
      })
    }
    items.push({ type: 'message', id: msg.id, message: msg })
    lastTimestamp = msg.timestamp
  }
  return items
})

function scrollToBottom() {
  nextTick(() => {
    scrollTopVal.value += 200000
  })
}

watch(
  () => messages.value.length,
  () => scrollToBottom(),
  { flush: 'post' },
)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  try {
    const msg = await sendMessage(matchId.value, text)
    messages.value.push(msg)
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function handleViewReport() {
  if (report.value) {
    showReport.value = true
    return
  }
  uni.showLoading({ title: '加载中...' })
  try {
    report.value = await getMatchReport(matchId.value)
    showReport.value = true
  } catch {
    uni.showToast({ title: '获取报告失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

onLoad((options: any) => {
  matchId.value = options?.matchId || ''
  nickname.value = options?.nickname || '搭子'
  avatar.value = options?.avatar || ''
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44

  if (matchId.value) {
    try {
      messages.value = await getMessages(matchId.value)
    } catch {
      uni.showToast({ title: '加载消息失败', icon: 'none' })
    }
  }
  loading.value = false
  scrollToBottom()
})
</script>

<template>
  <view class="page">
    <CustomNavBar
      :title="nickname"
      left-icon="back"
      right-icon="···"
      @right-click="handleViewReport"
    />
    <view class="nav-placeholder" :style="{ height: navBarHeight + 'px' }" />

    <!-- 匹配卡片（头部简介） -->
    <view class="match-header">
      <view class="match-avatar">
        <text v-if="avatar" class="match-avatar-emoji">{{ avatar }}</text>
        <DoodleIcon v-else name="user" :size="48" color="#E8855A" />
      </view>
      <view class="match-info">
        <text class="match-name">{{ nickname }}</text>
        <text class="match-hint">点右上角查看匹配报告</text>
      </view>
    </view>

    <!-- 消息列表 -->
    <view class="messages-panel">
      <scroll-view
        class="messages-scroll"
        scroll-y
        :scroll-top="scrollTopVal"
        :scroll-with-animation="true"
      >
        <view class="messages-inner">
          <view v-if="loading" class="loading-wrap">
            <text class="loading-text">加载中...</text>
          </view>

          <template v-for="item in displayItems" :key="item.id">
            <!-- 时间分割 -->
            <view v-if="item.type === 'time'" class="time-divider">
              <text class="time-divider-text">{{ item.label }}</text>
            </view>

            <!-- 消息气泡 -->
            <view
              v-else-if="item.message"
              class="message-wrap"
              :class="item.message.fromUid === 'me' ? 'message-wrap--user' : 'message-wrap--other'"
            >
              <view v-if="item.message.fromUid !== 'me'" class="msg-avatar">
                <text v-if="avatar" class="msg-avatar-emoji">{{ avatar }}</text>
                <DoodleIcon v-else name="user" :size="32" color="#FFFFFF" />
              </view>
              <view
                class="message-bubble"
                :class="item.message.fromUid === 'me' ? 'bubble--user' : 'bubble--other'"
              >
                <text
                  class="bubble-text"
                  :class="item.message.fromUid === 'me' ? 'bubble-text--user' : ''"
                >{{ item.message.content }}</text>
              </view>
            </view>
          </template>

          <view v-if="!loading && messages.length === 0" class="empty-wrap">
            <text class="empty-text">还没有聊天记录，发条消息打个招呼吧～</text>
          </view>

          <view class="scroll-bottom-spacer" />
        </view>
      </scroll-view>
    </view>

    <!-- 底部输入栏 -->
    <view class="composer">
      <view class="composer-input-wrap">
        <input
          v-model="inputText"
          class="composer-input"
          placeholder="说点什么..."
          placeholder-class="input-placeholder"
          confirm-type="send"
          @confirm="handleSend"
        />
      </view>
      <view
        class="send-btn"
        :class="{ 'send-btn--active': canSend }"
        @click="handleSend"
      >
        <DoodleIcon name="send" :size="36" :color="canSend ? '#FFFFFF' : '#D4C4B8'" />
      </view>
    </view>

    <!-- 匹配报告弹窗 -->
    <view v-if="showReport && report" class="overlay" @click="showReport = false">
      <view class="report-sheet" @click.stop>
        <view class="report-header">
          <text class="report-title">AI 匹配报告</text>
          <view class="report-close" @click="showReport = false">
            <text class="close-icon">✕</text>
          </view>
        </view>

        <view class="report-score-row">
          <view class="report-score-circle">
            <text class="report-score-num">{{ report.compatibility }}</text>
            <text class="report-score-unit">%</text>
          </view>
          <text class="report-score-label">综合匹配度</text>
        </view>

        <view class="report-section">
          <text class="report-section-title">AI 分析</text>
          <text class="report-analysis-text">{{ report.analysis }}</text>
        </view>

        <view class="report-section">
          <text class="report-section-title">共同点</text>
          <view v-for="(point, i) in report.commonPoints" :key="'c' + i" class="report-tag-row">
            <text class="report-tag report-tag--common">{{ point }}</text>
          </view>
        </view>

        <view class="report-section">
          <text class="report-section-title">差异点</text>
          <view v-for="(diff, i) in report.differences" :key="'d' + i" class="report-tag-row">
            <text class="report-tag report-tag--diff">{{ diff }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #FDF8F3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-placeholder {
  flex-shrink: 0;
}

/* ── 匹配卡片 ── */
.match-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(174, 157, 146, 0.12);
}

.match-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #FDF0E8, #FEF3EE);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.match-avatar-emoji {
  font-size: 56rpx;
  line-height: 1;
}

.match-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.match-name {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 600;
}

.match-hint {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ── 消息列表 ── */
.messages-panel {
  position: relative;
  flex: 1;
  min-height: 0;
}

.messages-scroll {
  height: 100%;
}

.messages-inner {
  padding: 24rpx 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #AE9D92;
}

.empty-wrap {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #AE9D92;
  text-align: center;
}

.time-divider {
  display: flex;
  justify-content: center;
}

.time-divider-text {
  font-size: 22rpx;
  color: #AE9D92;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
}

.message-wrap {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.message-wrap--user {
  justify-content: flex-end;
}

.message-wrap--other {
  justify-content: flex-start;
}

.msg-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6B8EC4, #8AACCF);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 1px 2px 0 rgba(107, 142, 196, 0.15);
}

.msg-avatar-emoji {
  font-size: 48rpx;
  line-height: 1;
}

.message-bubble {
  max-width: 72%;
  padding: 20rpx 24rpx;
  line-height: 1.6;
  word-break: break-word;
}

.bubble--other {
  background: #FFFFFF;
  border-radius: 0 24rpx 24rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.bubble--user {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 24rpx 0 24rpx 24rpx;
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #2C1F14;
}

.bubble-text--user {
  color: #FFFFFF;
}

.scroll-bottom-spacer {
  height: 20rpx;
}

/* ── 底部输入栏 ── */
.composer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FEFAF7;
  border-top: 1px solid #F0E8E0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.composer-input-wrap {
  flex: 1;
  background: #F5EDE4;
  border-radius: 36rpx;
  padding: 0 28rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.composer-input {
  width: 100%;
  height: 72rpx;
  font-size: 28rpx;
  color: #2C1F14;
  background: transparent;
}

.input-placeholder {
  color: #D4C4B8;
}

.send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: #E0D6CC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.send-btn--active {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  box-shadow: 0 4rpx 12rpx rgba(232, 133, 90, 0.3);
}

/* ── 匹配报告弹窗 ── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.report-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.report-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C1F14;
}

.report-close {
  padding: 8rpx;
}

.close-icon {
  font-size: 36rpx;
  color: #AE9D92;
}

.report-score-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 32rpx;
}

.report-score-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}

.report-score-num {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.report-score-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 12rpx;
}

.report-score-label {
  font-size: 26rpx;
  color: #AE9D92;
}

.report-section {
  margin-bottom: 28rpx;
}

.report-section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C1F14;
  display: block;
  margin-bottom: 16rpx;
}

.report-analysis-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.7;
  display: block;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.report-tag-row {
  margin-bottom: 12rpx;
}

.report-tag {
  font-size: 26rpx;
  line-height: 1.6;
  display: block;
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
}

.report-tag--common {
  background: rgba(91, 191, 142, 0.1);
  color: #3A9668;
}

.report-tag--diff {
  background: rgba(107, 142, 196, 0.1);
  color: #5B7EB4;
}
</style>
