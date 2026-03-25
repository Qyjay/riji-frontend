<template>
  <view class="page">
    <CustomNavBar title="小说阅读" left-icon="back" />
    <view class="content">
      <text class="placeholder">小说阅读页 - 开发中</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import CustomNavBar from '@/components/CustomNavBar.vue'
</script>

<style lang="scss" scoped>
.page {
  height: 100%;
  background: #FDF8F3;
}
.content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1; overflow-y: auto;
}
.placeholder {
  font-size: 30rpx;
  color: #AE9D92;
}
</style>
