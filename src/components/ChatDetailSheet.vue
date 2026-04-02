<template>
  <view v-if="visible" class="sheet-mask" @click="close">
    <view class="sheet-container doodle-box" @click.stop>
      <!-- 头部 -->
      <view class="sheet-header">
        <view class="sheet-handle" />
        <view class="sheet-title-row">
          <text class="sheet-title">{{ session?.title || '对话记录' }}</text>
          <text class="sheet-close" @click="close">×</text>
        </view>
        <view class="sheet-meta">
          <text class="sheet-time">{{ formatTimeRange(session?.startTime, session?.endTime) }}</text>
          <text class="sheet-mood">{{ session?.moodEmoji }} {{ session?.mood }}</text>
        </view>
      </view>

      <!-- 对话消息列表 -->
      <scroll-view class="sheet-messages" scroll-y :style="{ height: '600rpx' }">
        <view v-for="(msg, idx) in messages" :key="idx"
          class="sheet-msg"
          :class="msg.role === 'user' ? 'sheet-msg--user' : 'sheet-msg--ai'"
        >
          <view class="sheet-msg-bubble" :class="msg.role === 'user' ? 'bubble--user' : 'bubble--ai'">
            <text class="sheet-msg-text">{{ msg.content }}</text>
          </view>
          <text class="sheet-msg-time">{{ formatTime(msg.timestamp) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatSessionDetail, ChatSessionMessage } from '@/services/api/chat'

defineProps<{
  visible: boolean
  session: ChatSessionDetail | null
  messages: ChatSessionMessage[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}

function formatTimeRange(start?: number, end?: number | null): string {
  if (!start) return ''
  const fmt = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (!end) return fmt(start)
  return `${fmt(start)} ~ ${fmt(end)}`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.sheet-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.sheet-container {
  width: 100%;
  background: #FDF8F3;
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx 48rpx;
  max-height: 75vh;
}

.sheet-handle {
  width: 60rpx; height: 8rpx;
  background: #D4C4B8;
  border-radius: 4rpx;
  margin: 0 auto 24rpx;
}

.sheet-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C1F14;
}

.sheet-close {
  font-size: 40rpx;
  color: #AE9D92;
  padding: 8rpx 16rpx;
}

.sheet-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.sheet-time, .sheet-mood {
  font-size: 24rpx;
  color: #8A7668;
}

.sheet-messages {
  margin-top: 24rpx;
}

.sheet-msg {
  margin-bottom: 20rpx;
}

.sheet-msg--user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.sheet-msg--ai {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.sheet-msg-bubble {
  max-width: 80%;
  padding: 16rpx 24rpx;
  border-radius: 24rpx 28rpx 20rpx 24rpx;
}

.bubble--user {
  background: #E8855A;
}

.bubble--ai {
  background: #FFFFFF;
  border: 1px solid #E8D5C4;
}

.bubble--user .sheet-msg-text {
  color: #FFFFFF;
}

.bubble--ai .sheet-msg-text {
  color: #2C1F14;
}

.sheet-msg-text {
  font-size: 28rpx;
  line-height: 1.6;
}

.sheet-msg-time {
  font-size: 20rpx;
  color: #AE9D92;
  margin-top: 4rpx;
}
</style>
