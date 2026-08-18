<template>
  <view class="header" :style="{ paddingTop: `${statusBarHeight}px` }">
    <button
      class="icon-button"
      role="button"
      tabindex="0"
      aria-label="返回"
      @click="$emit('back')"
      @keyup.enter="$emit('back')"
      @keyup.space="$emit('back')"
    >
      <DoodleIcon name="back" :size="38" color="#3F3027" />
    </button>
    <view class="title-block">
      <text class="title">和分身说话</text>
      <text class="privacy">仅本次通话</text>
    </view>
    <view class="header-spacer" aria-hidden="true" />
  </view>
</template>

<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{ statusBarHeight: number }>()
defineEmits<{ (event: 'back'): void }>()
</script>

<style scoped lang="scss">
.header {
  min-height: 88rpx;
  padding-left: 22rpx;
  padding-right: 22rpx;
  display: grid;
  grid-template-columns: 88rpx minmax(0, 1fr) 88rpx;
  align-items: center;
  background: #fdf8f3;
  border-bottom: 1px solid rgba(92, 71, 58, 0.1);
}
.icon-button {
  width: 88rpx;
  height: 88rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
.icon-button::after { border: 0; }
.icon-button:active { background: #f2e7df; }
.icon-button:focus-visible { outline: 2px solid #c7633b; outline-offset: 2px; }
.title-block { min-width: 0; text-align: center; }
.title {
  display: block;
  color: #2c1f18;
  font-size: 30rpx;
  line-height: 1.3;
  font-weight: 700;
}
.privacy {
  display: block;
  margin-top: 2rpx;
  color: #8b776b;
  font-size: 20rpx;
  line-height: 1.35;
}
.header-spacer { width: 88rpx; height: 88rpx; }
</style>
