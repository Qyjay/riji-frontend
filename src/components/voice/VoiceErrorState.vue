<template>
  <view class="error-state" role="alert">
    <view class="error-mark">
      <DoodleIcon name="cross" :size="34" color="#A24B43" />
    </view>
    <text class="title">{{ error.title }}</text>
    <text class="message">{{ error.message }}</text>
    <view class="actions">
      <button v-if="error.recoverable" class="retry" role="button" tabindex="0" @click="$emit('retry')">
        {{ error.actionLabel || '重新连接' }}
      </button>
      <button class="leave" role="button" tabindex="0" @click="$emit('leave')">返回文字对话</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'
import type { VoiceUiError } from '@/services/realtime/voice-errors'

defineProps<{ error: VoiceUiError }>()
defineEmits<{
  (event: 'retry'): void
  (event: 'leave'): void
}>()
</script>

<style scoped lang="scss">
.error-state {
  flex: 1;
  min-height: 0;
  padding: 44rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.error-mark {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3dfdc;
}
.title {
  margin-top: 24rpx;
  color: #392820;
  font-size: 32rpx;
  line-height: 1.4;
  font-weight: 750;
}
.message {
  max-width: 560rpx;
  margin-top: 12rpx;
  color: #715d52;
  font-size: 25rpx;
  line-height: 1.65;
}
.actions {
  width: min(560rpx, 100%);
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.retry,
.leave {
  min-height: 96rpx;
  margin: 0;
  border-radius: 16rpx;
  font-size: 25rpx;
  font-weight: 700;
}
.retry { color: #fffaf6; background: #bd603d; border: 0; }
.leave { color: #5f4c42; background: transparent; border: 1px solid #cdbdb2; }
.retry::after,
.leave::after { border: 0; }
button:focus-visible { outline: 2px solid #8f472d; outline-offset: 2px; }
</style>
