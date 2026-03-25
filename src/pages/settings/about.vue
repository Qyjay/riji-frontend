<template>
  <view class="page page-root">
    <CustomNavBar title="关于 App" left-icon="back" />
    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />
    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- Logo Area -->
      <view class="logo-section">
        <view class="logo-wrap">
          <image class="logo-img" src="/static/brand/logo-d-mascot.png" mode="aspectFill" />
        </view>
        <text class="app-name">日迹</text>
        <text class="app-slogan">你的 AI 生活伙伴</text>
        <view class="version-badge">
          <text class="version-text">v1.0.0</text>
        </view>
      </view>

      <!-- Info Cards -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">App 名称</text>
          <text class="info-value">日迹</text>
        </view>
        <view class="info-divider" />
        <view class="info-row">
          <text class="info-label">版本号</text>
          <text class="info-value">v1.0.0</text>
        </view>
      </view>

      <!-- Features -->
      <view class="section-title">
        <view class="section-title-row">
          <DoodleIcon name="sparkle" color="#C8A86B" :size="36" />
          <text class="section-title-text">核心功能</text>
        </view>
      </view>
      <view class="feature-grid">
        <view class="feature-item press-feedback" v-for="f in features" :key="f.iconName">
          <view class="feature-icon-wrap doodle-box-v2" :class="f.boxClass">
            <DoodleIcon :name="f.iconName" :color="f.iconColor" :size="48" />
          </view>
          <text class="feature-name">{{ f.name }}</text>
        </view>
      </view>

      <!-- Footer -->
      <view class="footer">
        <text class="footer-text">© 2026 日迹</text>
        <text class="footer-text">记录每一天，遇见更好的自己</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

const features = [
  { iconName: 'book',    iconColor: '#E8855A', boxClass: 'func-color-diary',  name: 'AI 日记' },
  { iconName: 'grid',    iconColor: '#5CA06E', boxClass: 'func-color-comic',  name: '心情漫画' },
  { iconName: 'crystal', iconColor: '#D4728A', boxClass: 'func-color-fortune',name: 'AI 运势' },
  { iconName: 'tomato',  iconColor: '#E8855A', boxClass: 'func-color-diary',  name: '番茄钟' },
  { iconName: 'robot',   iconColor: '#9B72C8', boxClass: 'func-color-novel',  name: 'AI 对话' },
  { iconName: 'chart',   iconColor: '#C8A86B', boxClass: 'func-color-growth', name: '成长数据' },
]
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 40rpx 32rpx;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 48rpx 0 64rpx;
}

.logo-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(232, 133, 90, 0.30);
  overflow: hidden;
}

.logo-img { width: 100%; height: 100%; }

.app-name {
  font-size: 48rpx;
  font-weight: 700;
  color: #2C1F14;
}

.app-slogan {
  font-size: 28rpx;
  color: #857268;
}

.version-badge {
  background: rgba(232, 133, 90, 0.10);
  border-radius: 19998rpx;
  padding: 8rpx 28rpx;
  margin-top: 8rpx;
}

.version-text {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 600;
}

.info-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 8rpx 0;
  margin-bottom: 32rpx;
  box-shadow: 0 1px 6px rgba(44, 31, 20, 0.06);
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
}

.info-label {
  font-size: 28rpx;
  color: #4A3628;
}

.info-value {
  font-size: 28rpx;
  color: #857268;
}

.info-divider {
  height: 2rpx;
  background: rgba(44, 31, 20, 0.05);
  margin: 0 32rpx;
}

.section-title {
  margin-bottom: 20rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.section-title-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C1F14;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 64rpx;
}

.feature-item {
  background: #FFFFFF;
  border-radius: 28rpx 36rpx 24rpx 32rpx;
  padding: 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.08), 0 1px 4px rgba(44, 31, 20, 0.05);
  border: 1px solid rgba(232, 133, 90, 0.08);
}

.feature-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-style: solid;
}

.feature-name {
  font-size: 24rpx;
  color: #4A3628;
  text-align: center;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 32rpx 0 64rpx;
}

.footer-text {
  font-size: 24rpx;
  color: #AE9D92;
}
</style>
