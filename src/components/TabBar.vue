<template>
  <view v-if="visible" class="tabbar-wrapper">
    <!-- 双路径选择面板 -->
      <view v-if="showActionSheet" class="action-sheet-overlay" @click="closeActionSheet">
        <view class="action-panel" @click.stop>
          <text class="action-panel-title">记录此刻</text>
          <view class="action-dual">
            <!-- 快拍 -->
            <view class="action-card press-feedback" @click="chooseQuickCapture">
              <view class="action-card-icon camera-icon-wrap">
                <DoodleIcon name="camera" color="#FFFFFF" :size="52" :filtered="false" />
              </view>
              <text class="action-card-name">快拍</text>
              <text class="action-card-desc">拍下此刻 + 说两句</text>
            </view>
            <!-- 随记 -->
            <view class="action-card press-feedback" @click="chooseQuickWrite">
              <view class="action-card-icon write-icon-wrap">
                <DoodleIcon name="pen" color="#FFFFFF" :size="52" :filtered="false" />
              </view>
              <text class="action-card-name">随记</text>
              <text class="action-card-desc">写点什么</text>
            </view>
            <!-- 发帖 -->
            <view class="action-card press-feedback" @click="choosePost">
              <view class="action-card-icon post-icon-wrap">
                <DoodleIcon name="share" color="#FFFFFF" :size="52" :filtered="false" />
              </view>
              <text class="action-card-name">发帖</text>
              <text class="action-card-desc">发到广场</text>
            </view>
            <!-- 修图 -->
            <view class="action-card press-feedback" @click="chooseRetouch">
              <view class="action-card-icon retouch-icon-wrap">
                <DoodleIcon name="sparkle" color="#FFFFFF" :size="52" :filtered="false" />
              </view>
              <text class="action-card-name">修图</text>
              <text class="action-card-desc">改成想要的样子</text>
            </view>
          </view>
          <view class="action-panel-cancel press-feedback" @click="closeActionSheet">
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
  'pages/social/chat',
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
  'pages/plaza/post',
  'pages/plaza/detail',
  'pages/profile/avatar-memory',
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

function chooseQuickCapture() {
  closeActionSheet()
  // 直接打开相机拍照，支持连续拍摄
  const photos: string[] = []

  function takeOne() {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        photos.push(...res.tempFilePaths)
        // 拍完一张后询问是否继续
        if (photos.length >= 9) {
          // 已达上限，直接跳转
          goToCapturePage(photos)
          return
        }
        uni.showModal({
          title: `已拍 ${photos.length} 张`,
          content: '继续拍照？',
          confirmText: '继续拍',
          cancelText: '完成',
          success: (modal) => {
            if (modal.confirm) {
              takeOne()
            } else {
              goToCapturePage(photos)
            }
          },
        })
      },
      fail: () => {
        // 用户取消拍照
        if (photos.length > 0) {
          goToCapturePage(photos)
        }
      },
    })
  }

  function goToCapturePage(imgs: string[]) {
    const encoded = encodeURIComponent(JSON.stringify(imgs))
    uni.navigateTo({ url: `/pages/write/quick-capture?photos=${encoded}` })
  }

  takeOne()
}

function chooseQuickWrite() {
  closeActionSheet()
  uni.navigateTo({ url: '/pages/write/index' })
}

function choosePost() {
  closeActionSheet()
  uni.navigateTo({ url: '/pages/plaza/post' })
}

function chooseRetouch() {
  closeActionSheet()
  uni.navigateTo({ url: '/pages/write/retouch' })
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

/* ActionSheet — 双路径面板 */
.action-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 99990;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-panel {
  width: 100%;
  background: #FDF8F3;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.action-panel-title {
  display: block;
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 700;
  text-align: center;
  margin-bottom: 28rpx;
}

.action-dual {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.action-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  padding: 32rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid rgba(232, 133, 90, 0.1);
  &:active { transform: scale(0.96); }
}

.action-card-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50% 55% 45% 52%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-icon-wrap {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.35);
}

.write-icon-wrap {
  background: linear-gradient(135deg, #6B8EB4, #8BAED4);
  box-shadow: 0 4rpx 16rpx rgba(107, 142, 180, 0.35);
}

.post-icon-wrap {
  background: linear-gradient(135deg, #5BBF8E, #7DD4A8);
  box-shadow: 0 4rpx 16rpx rgba(91, 191, 142, 0.35);
}

.retouch-icon-wrap {
  background: linear-gradient(135deg, #6B8EB4, #C8A86B);
  box-shadow: 0 4rpx 16rpx rgba(139, 124, 105, 0.35);
}

.action-card-name {
  font-size: 32rpx;
  color: #2C1F14;
  font-weight: 700;
}

.action-card-desc {
  font-size: 24rpx;
  color: #AE9D92;
}

.action-panel-cancel {
  margin: 20rpx 0 24rpx;
  padding: 24rpx 0;
  background: #F0EAE4;
  border-radius: 16rpx;
  display: flex;
  justify-content: center;
  &:active { opacity: 0.75; }
}

.cancel-text {
  font-size: 30rpx;
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
