<template>
  <view class="controls">
    <button
      class="control-button"
      role="button"
      tabindex="0"
      :class="{ 'control-button--inactive': !micEnabled }"
      :aria-label="micEnabled ? '关闭麦克风' : '打开麦克风'"
      :disabled="disabled"
      @click="$emit('toggle-mic')"
      @keyup.enter="$emit('toggle-mic')"
      @keyup.space="$emit('toggle-mic')"
    >
      <view class="control-icon">
        <DoodleIcon
          :name="micEnabled ? 'voice' : 'mic-off'"
          :size="40"
          :color="micEnabled ? '#4B3B32' : '#9A7F70'"
        />
      </view>
      <text>{{ micEnabled ? '麦克风' : '已静音' }}</text>
    </button>

    <button
      class="end-button"
      role="button"
      tabindex="0"
      aria-label="结束通话"
      :disabled="ending"
      @click="$emit('end')"
      @keyup.enter="$emit('end')"
      @keyup.space="$emit('end')"
    >
      <DoodleIcon name="phone-off" :size="46" color="#FFF9F5" />
      <text>{{ ending ? '结束中' : '结束' }}</text>
    </button>

    <button
      class="control-button"
      role="button"
      tabindex="0"
      :class="{ 'control-button--inactive': !speakerEnabled }"
      :aria-label="speakerEnabled ? '关闭扬声器' : '打开扬声器'"
      :disabled="disabled"
      @click="$emit('toggle-speaker')"
      @keyup.enter="$emit('toggle-speaker')"
      @keyup.space="$emit('toggle-speaker')"
    >
      <view class="control-icon">
        <DoodleIcon
          :name="speakerEnabled ? 'volume' : 'volume-off'"
          :size="40"
          :color="speakerEnabled ? '#4B3B32' : '#9A7F70'"
        />
      </view>
      <text>{{ speakerEnabled ? '扬声器' : '已关闭' }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  micEnabled: boolean
  speakerEnabled: boolean
  disabled?: boolean
  ending?: boolean
}>()
defineEmits<{
  (event: 'toggle-mic'): void
  (event: 'toggle-speaker'): void
  (event: 'end'): void
}>()
</script>

<style scoped lang="scss">
.controls {
  flex: 0 0 auto;
  min-height: 156rpx;
  padding: 18rpx 44rpx calc(18rpx + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: minmax(96rpx, 1fr) 152rpx minmax(96rpx, 1fr);
  align-items: center;
  gap: 24rpx;
  border-top: 1px solid rgba(89, 68, 55, 0.1);
  background: #fdf8f3;
  box-sizing: border-box;
}
.control-button,
.end-button {
  min-width: 96rpx;
  min-height: 104rpx;
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7rpx;
  background: transparent;
  color: #5a483e;
  font-size: 20rpx;
  line-height: 1.35;
}
.control-button::after,
.end-button::after { border: 0; }
.control-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee4dc;
  transition: background-color 160ms ease-out, opacity 160ms ease-out;
}
.control-button:active .control-icon { background: #e1d4ca; }
.control-button--inactive .control-icon { background: #e9dfd8; opacity: 0.72; }
.end-button {
  width: 152rpx;
  min-height: 112rpx;
  border-radius: 56rpx;
  color: #fff9f5;
  background: #a84d45;
  font-weight: 700;
}
.end-button:active:not([disabled]) { background: #8f3f39; }
button[disabled] { opacity: 0.46; }
button:focus-visible { outline: 2px solid #8f472d; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .control-icon { transition: none; }
}
@media (orientation: landscape) {
  .controls {
    min-height: 96rpx;
    padding: 0 44rpx env(safe-area-inset-bottom);
  }
  .control-button,
  .end-button { min-height: 88rpx; }
  .control-icon { width: 64rpx; height: 64rpx; }
  .end-button { min-height: 88rpx; border-radius: 44rpx; }
}
</style>
