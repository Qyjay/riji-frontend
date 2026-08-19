<template>
  <view class="summary">
    <view class="summary-mark">
      <DoodleIcon name="check" :size="36" color="#557A60" />
    </view>
    <text class="title">本次通话已结束</text>
    <view class="facts">
      <view class="fact-row">
        <text class="fact-label">通话时长</text>
        <text class="fact-value">{{ durationLabel }}</text>
      </view>
      <view class="fact-row">
        <text class="fact-label">找到的记忆</text>
        <text class="fact-value">{{ summary.memoryCount || 0 }} 条</text>
      </view>
      <view v-if="summary.missionId" class="fact-row">
        <text class="fact-label">找人任务</text>
        <text class="fact-value">已保留任务进度</text>
      </view>
    </view>
    <button
      v-if="summary.missionId"
      class="mission-button"
      role="button"
      tabindex="0"
      @click="$emit('mission')"
    >查看任务进度</button>
    <button class="back-button" role="button" tabindex="0" @click="$emit('back')">返回消息</button>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import type { VoiceSessionSummary } from '@/services/realtime/voice-protocol'

const props = defineProps<{ summary: VoiceSessionSummary }>()
defineEmits<{
  (event: 'mission'): void
  (event: 'back'): void
}>()

const durationLabel = computed(() => {
  const seconds = Math.max(0, Number(props.summary.durationSec || 0))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes ? `${minutes} 分 ${rest} 秒` : `${rest} 秒`
})
</script>

<style scoped lang="scss">
.summary {
  flex: 1;
  min-height: 0;
  padding: 48rpx 44rpx calc(36rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.summary-mark {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e3ece5;
}
.title {
  margin-top: 22rpx;
  color: #30241d;
  font-size: 32rpx;
  line-height: 1.4;
  font-weight: 750;
}
.facts {
  width: min(600rpx, 100%);
  margin: 30rpx 0;
  border-top: 1px solid #ddd2c9;
  border-bottom: 1px solid #ddd2c9;
}
.fact-row {
  min-height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}
.fact-label { color: #887469; font-size: 23rpx; }
.fact-value { color: #403129; font-size: 24rpx; font-weight: 650; text-align: right; }
.mission-button,
.back-button {
  width: min(600rpx, 100%);
  min-height: 96rpx;
  margin: 0 0 14rpx;
  border-radius: 16rpx;
  font-size: 25rpx;
  font-weight: 700;
}
.mission-button { color: #fffaf6; background: #557a60; border: 0; }
.back-button { color: #5f4c42; background: transparent; border: 1px solid #cdbdb2; }
.mission-button::after,
.back-button::after { border: 0; }
button:focus-visible { outline: 2px solid #52765e; outline-offset: 2px; }
</style>
