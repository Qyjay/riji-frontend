<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  diaryCount: number
  interestCount: number
}>()
</script>

<template>
  <view class="ai-info-card">
    <view class="ai-info-icon">
      <DoodleIcon name="robot" color="#FFFFFF" :size="28" :filtered="false" />
    </view>
    <view class="ai-info-text">
      <text class="ai-info-title">你的 AI 伙伴</text>
      <text class="ai-info-sub">陪你整理情绪、灵感和生活片段</text>
    </view>
    <view class="ai-info-meta">
      <text class="ai-info-meta-text">{{ diaryCount }} 篇日记</text>
      <text class="ai-info-meta-dot">·</text>
      <text class="ai-info-meta-text">{{ interestCount }} 个偏好</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ai-info-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 26rpx 18rpx;
  background: rgba(255, 255, 255, 0.52);
  border-bottom: 1px solid rgba(44, 31, 20, 0.04);
  backdrop-filter: blur(8px);
}

.ai-info-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #e8855a, #f0a882);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 24rpx rgba(232, 133, 90, 0.16);
}

.ai-info-text {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
  flex: 1;
}

.ai-info-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c1f14;
}

.ai-info-sub {
  font-size: 24rpx;
  color: #8d7b6f;
}

.ai-info-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.ai-info-meta-text,
.ai-info-meta-dot {
  font-size: 22rpx;
  color: #ae9d92;
}
</style>
