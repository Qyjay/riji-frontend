<template>
  <view class="page-placeholder">
    <text class="placeholder-emoji">👥</text>
    <text class="placeholder-title">社交</text>
    <text class="placeholder-desc">敬请期待</text>
  </view>
</template>
<script setup lang="ts"></script>
<style lang="scss">
.page-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #FDF8F3;
  gap: 16rpx;
  .placeholder-emoji { font-size: 80rpx; }
  .placeholder-title { font-size: 44rpx; font-weight: 600; color: #2C1F14; }
  .placeholder-desc { font-size: 28rpx; color: #AE9D92; }
}
</style>
