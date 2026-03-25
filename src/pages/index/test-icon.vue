<template>
  <view style="padding: 40rpx; background: yellow;">
    <text>测试1 - 纯image标签:</text>
    <image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='red' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E" style="width: 80rpx; height: 80rpx;" mode="aspectFit" />
    <text>测试2 - 纯文字图标:</text>
    <text style="font-size: 60rpx;">🏠</text>
    <text>测试3 - CSS画的圆:</text>
    <view style="width: 80rpx; height: 80rpx; border-radius: 50%; border: 4rpx solid red; background: transparent;" />
  </view>
</template>
