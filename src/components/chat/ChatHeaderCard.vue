<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  diaryCount: number
  interestCount: number
}>()
</script>

<template>
  <view class="ai-info-card">
    <view class="ai-info-icon doodle-box-v3">
      <DoodleIcon name="robot" color="#FFFFFF" :size="44" :filtered="false" />
    </view>
    <view class="ai-info-text">
      <text class="ai-info-title">你的 AI 伙伴</text>
      <text class="ai-info-sub">已陪你写了 {{ diaryCount }} 篇日记</text>
      <text class="ai-info-sub">了解你的 {{ interestCount }} 个兴趣标签</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ai-info-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx;
  background: #ffffff;
  border-bottom: 1px solid rgba(44, 31, 20, 0.06);
}

.ai-info-icon {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #e8855a, #f0a882) !important;
  border-color: transparent !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.2);
}

.ai-info-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.ai-info-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c1f14;
}

.ai-info-sub {
  font-size: 24rpx;
  color: #ae9d92;
}
</style>
