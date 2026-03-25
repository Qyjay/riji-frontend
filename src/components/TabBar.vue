<template>
  <view v-if="visible" class="tabbar-wrapper">
    <!-- ActionSheet -->
      <view v-if="showActionSheet" class="action-sheet-overlay" @click="closeActionSheet">
        <view class="action-sheet-panel doodle-box" @click.stop>
          <view class="action-sheet-header">
            <text class="action-sheet-title font-handwrite">选择记录方式</text>
          </view>
          <view class="action-sheet-options">
            <view class="action-option press-feedback" @click="chooseMode('photo')">
              <view class="action-icon-wrap func-color-study doodle-box-v3">
                <DoodleIcon name="camera" color="#6BA87B" :size="44" />
              </view>
              <text class="action-label">拍照记录</text>
            </view>
            <view class="action-option press-feedback" @click="chooseMode('album')">
              <view class="action-icon-wrap func-color-social doodle-box-v2">
                <DoodleIcon name="palette" color="#6B8EB4" :size="44" />
              </view>
              <text class="action-label">从相册选择</text>
            </view>
            <view class="action-option press-feedback" @click="chooseMode('text')">
              <view class="action-icon-wrap func-color-diary doodle-box">
                <DoodleIcon name="pen" color="#E8855A" :size="44" />
              </view>
              <text class="action-label">文字记录</text>
            </view>
            <view class="action-option press-feedback" @click="chooseMode('voice')">
              <view class="action-icon-wrap func-color-novel doodle-box-v4">
                <DoodleIcon name="voice" color="#9B72C8" :size="44" />
              </view>
              <text class="action-label">语音记录</text>
            </view>
          </view>
          <view class="action-sheet-cancel press-feedback" @click="closeActionSheet">
            <text class="cancel-text">取消</text>
          </view>
        </view>
      </view>

    <!-- TabBar -->
    <view class="tabbar">
      <!-- 选中指示器背景 -->
      <view
        v-for="(item, index) in tabs"
        :key="index"
        class="tabbar-item"
        :class="{
          'tabbar-item--active': activeIndex === index,
          'tabbar-item--write': index === 2
        }"
        @click="switchTab(index)"
      >
        <!-- 写日记：中间凸起圆形按钮 + 脉冲动画 -->
        <view v-if="index === 2" class="tabbar-write-btn pulse-btn">
          <DoodleIcon name="pen" color="#FFFFFF" :size="44" :filtered="false" />
        </view>

        <!-- 普通 tab -->
        <template v-else>
          <view class="tabbar-icon-wrap">
            <DoodleIcon
              :name="item.iconName"
              :color="activeIndex === index ? '#E8855A' : '#AE9D92'"
              :size="44"
            />
            <!-- 选中小圆点 -->
            <view v-if="activeIndex === index" class="active-dot" />
          </view>
          <text
            class="tabbar-label"
            :class="{ 'tabbar-label--active': activeIndex === index }"
          >{{ item.text }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import DoodleIcon from './DoodleIcon.vue'

const props = defineProps<{
  current?: number
}>()

const activeIndex = ref(props.current ?? 0)
const showActionSheet = ref(false)

// 只在 Tab 一级页面显示 TabBar
const visible = ref(true)

// 不应显示 TabBar 的二级页面路由
const HIDE_ROUTES = [
  'pages/growth/index',
  'pages/growth/achievements',
  'pages/novel/index',
  'pages/novel/reader',
  'pages/social/match',
  'pages/profile/settings',
  'pages/profile/agent-portrait',
  'pages/profile/semester-report',
  'pages/settings/about',
  'pages/diary/detail',
  'pages/diary/comic',
  'pages/diary/share-card',
  'pages/diary/emotion-calendar',
  'pages/diary/style-engine',
  'pages/study/pomodoro',
  'pages/study/todo',
  'pages/fortune/index',
  'pages/chat/index',
]

onShow(() => {
  try {
    const pages = getCurrentPages()
    if (!pages || pages.length === 0) {
      visible.value = true
      return
    }
    const currentPage = pages[pages.length - 1]
    const route = currentPage.route || ''
    const shouldHide = HIDE_ROUTES.some(r => route === r || route.startsWith(r))
    visible.value = !shouldHide
  } catch (_) {
    visible.value = true
  }
})

watch(() => props.current, (v) => {
  if (v !== undefined) activeIndex.value = v
})

const tabs = [
  { iconName: 'book',     text: '日记',  path: '/pages/index/index' },
  { iconName: 'discover', text: '发现',  path: '/pages/discover/index' },
  { iconName: 'pen',      text: '写',    path: '/pages/write/index' },
  { iconName: 'chat',     text: '消息',  path: '/pages/messages/index' },
  { iconName: 'user',     text: '我的',  path: '/pages/profile/index' },
]

function switchTab(index: number) {
  if (index === 2) {
    showActionSheet.value = true
    return
  }
  activeIndex.value = index
  uni.redirectTo({ url: tabs[index].path })
}

function closeActionSheet() {
  showActionSheet.value = false
}

function chooseMode(mode: string) {
  closeActionSheet()
  const modeMap: Record<string, string> = {
    photo: 'photo',
    album: 'album',
    text: 'text',
    voice: 'voice',
  }
  uni.navigateTo({ url: `/pages/write/index?mode=${modeMap[mode] ?? 'text'}` })
}
</script>

<style lang="scss">
.tabbar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  pointer-events: none;
}

.tabbar-wrapper > * {
  pointer-events: auto;
}

.tabbar {
  position: relative;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  height: 120rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 -1px 0 rgba(232, 133, 90, 0.1), 0 -4px 16px rgba(44, 31, 20, 0.06);
  display: flex;
  align-items: stretch;
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  cursor: pointer;
  padding-top: 8rpx;
  position: relative;
}

.tabbar-icon-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  position: relative;
}

.active-dot {
  position: absolute;
  bottom: -8rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50% 60% 40% 55%;  /* 手绘感不完美圆 */
  background: #E8855A;
}

.tabbar-label {
  font-size: 22rpx;
  color: #AE9D92;
  font-weight: 500;
  transition: color 0.2s;
  line-height: 1;
}

.tabbar-label--active {
  color: #E8855A;
  font-weight: 700;
}

/* 写日记：中间凸起 */
.tabbar-item--write {
  padding-top: 0;
  margin-top: -20rpx;
}

.tabbar-write-btn {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50% 55% 45% 52%;  /* 手绘感不完美圆 */
  background: linear-gradient(135deg, #E8855A 0%, #F0A882 100%);
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.40), 0 0 0 3px rgba(232, 133, 90, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}

.tabbar-item--write:active .tabbar-write-btn {
  transform: scale(0.92);
  box-shadow: 0 2rpx 8rpx rgba(232, 133, 90, 0.25);
  animation: none;
}

/* ActionSheet */
.action-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 99990;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-sheet-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0 !important;
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

.action-sheet-header {
  padding: 28rpx 0 20rpx;
  display: flex;
  justify-content: center;
}

.action-sheet-title {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 600;
}

.action-sheet-options {
  display: flex;
  flex-direction: column;
  padding: 0 24rpx;
  gap: 4rpx;
}

.action-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  transition: background 0.15s;
}

.action-option:active {
  background: rgba(232, 133, 90, 0.08);
}

.action-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-style: solid;
  flex-shrink: 0;
}

.action-label {
  font-size: 32rpx;
  color: #2C1F14;
  font-weight: 500;
}

.action-sheet-cancel {
  margin: 16rpx 24rpx 0;
  padding: 28rpx 0;
  background: #F5F0EB;
  border-radius: 16rpx;
  display: flex;
  justify-content: center;
}

.cancel-text {
  font-size: 32rpx;
  color: #4A3628;
  font-weight: 500;
}

/* ActionSheet 动画 */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .action-sheet-panel,
.sheet-leave-active .action-sheet-panel {
  transition: transform 0.3s ease-out;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .action-sheet-panel,
.sheet-leave-to .action-sheet-panel {
  transform: translateY(100%);
}
</style>
