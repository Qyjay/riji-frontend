<script setup lang="ts">
// 全局启动 — 登录检查由 login 页面自身处理
// 如需在其他页面拦截未登录，可在对应页面 onLoad 中检查
</script>

<template>
  <router-view v-if="false" />
</template>

<style lang="scss">
// 引入手绘风格规范（§11）
@import './common/styles/handdrawn.scss';
// 设计系统基础
@import './common/design-tokens.scss';
@import './common/animations.scss';
@import './common/doodle.scss';

/* 全局字体 & 重置 */
page {
  background-color: #FDF8F3;
  font-family: "PingFang SC", "Noto Sans SC", -apple-system, sans-serif;
  color: #4A3628;
  font-size: 32rpx;
  line-height: 1.5;
  height: 100%;
}

uni-page, uni-page-wrapper, uni-page-body {
  height: 100% !important;
  max-height: 100% !important;
  position: relative !important;
}

view, text, input, textarea, scroll-view, swiper, image {
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* CSS 变量 */
:root, page {
  --color-primary:       #E8855A;
  --color-primary-dark:  #C05C30;
  --color-primary-light: #FDF0E8;
  --color-primary-5:     rgba(232, 133, 90, 0.05);
  --color-primary-10:    rgba(232, 133, 90, 0.10);
  --color-primary-20:    rgba(232, 133, 90, 0.20);

  --color-secondary:     #F2B49B;
  --color-secondary-pale: #FEF3EE;

  --color-bg:            #FDF8F3;
  --color-surface:       #FFFFFF;

  --color-neutral-50:    #FDF8F3;
  --color-neutral-100:   #F5EDE4;
  --color-neutral-200:   #EAE0D6;
  --color-neutral-300:   #D4C4B8;
  --color-neutral-400:   #AE9D92;
  --color-neutral-500:   #857268;
  --color-neutral-700:   #4A3628;
  --color-neutral-900:   #2C1F14;

  --shadow-sm:    0 2rpx 12rpx rgba(26, 26, 46, 0.06);
  --shadow-md:    0 8rpx 24rpx rgba(232, 133, 90, 0.12);
  --shadow-lg:    0 16rpx 48rpx rgba(232, 133, 90, 0.20);
  --shadow-tabbar: 0 -2rpx 12rpx rgba(26, 26, 46, 0.08);

  --radius-sm:    8rpx;
  --radius-md:    16rpx;
  --radius-lg:    24rpx;
  --radius-xl:    40rpx;
  --radius-full:  9999rpx;

  --space-xs:     8rpx;
  --space-sm:     16rpx;
  --space-md:     24rpx;
  --space-lg:     32rpx;
  --space-xl:     48rpx;
  --space-xxl:    64rpx;

  --page-margin:  32rpx;
  --tabbar-height: 100rpx;
  --navbar-height: 88rpx;
}

/* 工具类 */
.font-mono {
  font-family: "DIN Alternate", "SF Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.text-gradient {
  background: linear-gradient(135deg, #E8855A 0%, #F0A882 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.clickable {
  transition: transform 80ms ease, opacity 80ms ease;
  &:active {
    transform: scale(0.96);
    opacity: 0.85;
  }
}
</style>
