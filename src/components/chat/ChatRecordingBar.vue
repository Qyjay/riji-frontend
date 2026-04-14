<script setup lang="ts">
defineProps<{
  visible: boolean
  duration: number
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
}>()
</script>

<template>
  <view v-if="visible" class="recording-bar">
    <view class="recording-dot-anim" />
    <text class="recording-text">录音中... {{ duration }}s</text>
    <view class="recording-cancel" @click="emit('cancel')">
      <text class="recording-cancel-text">取消</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.recording-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  background: #fef0f0;
  border-top: 1px solid rgba(232, 90, 90, 0.15);
}

.recording-dot-anim {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e85a5a;
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.recording-text {
  flex: 1;
  font-size: 26rpx;
  color: #c05030;
  font-weight: 500;
}

.recording-cancel {
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  background: rgba(232, 90, 90, 0.1);
}

.recording-cancel-text {
  font-size: 24rpx;
  color: #c05030;
}
</style>
