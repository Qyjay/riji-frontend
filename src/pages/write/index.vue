<template>
  <view class="write-page">
    <!-- ── CustomNavBar ── -->
    <CustomNavBar title="记录此刻" @left-click="handleBack">
      <template #left>
        <view class="nav-back press-feedback" @click="handleBack">
          <DoodleIcon name="arrow-left" color="#2C1F14" :size="36" />
        </view>
      </template>
    </CustomNavBar>

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- ── 主滚动区 ── -->
    <scroll-view
      class="page-scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
    >
      <!-- 文字输入区（始终可见） -->
      <view class="input-card">
        <textarea
          v-model="textInput"
          class="text-textarea"
          placeholder="写下此刻的想法..."
          :placeholder-style="'color: #AE9D92; font-size: 30rpx; line-height: 1.7;'"
          :auto-height="true"
          maxlength="500"
        />
        <view class="char-count-row">
          <text class="char-count">{{ textInput.length }}/500</text>
        </view>
      </view>

      <!-- 照片区域 -->
      <view v-if="photos.length > 0 || true" class="photo-section">
        <text class="section-label">照片</text>
        <scroll-view class="photo-scroll" scroll-x>
          <view class="photo-list">
            <!-- 已选照片 -->
            <view
              v-for="(photo, idx) in photos"
              :key="photo"
              class="photo-item"
            >
              <image class="photo-thumb" :src="photo" mode="aspectFill" />
              <view class="photo-remove" @click="removePhoto(idx)">
                <text class="photo-remove-icon">×</text>
              </view>
            </view>
            <!-- 添加按钮（最多9张） -->
            <view
              v-if="photos.length < 9"
              class="photo-add press-feedback"
              @click="pickPhoto"
            >
              <text class="photo-add-icon">+</text>
              <text class="photo-add-label">添加</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 位置信息 -->
      <view class="location-row">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ locationText }}</text>
      </view>

      <!-- 分隔线 + 今日已记录 -->
      <view class="divider">
        <view class="divider-line" />
        <text class="divider-label">今日已记录 {{ todayMaterials.length }} 条</text>
        <view class="divider-line" />
      </view>

      <!-- 今日素材列表 -->
      <view class="today-list">
        <view v-if="loadingMaterials" class="list-loading">
          <text class="list-loading-text">加载中...</text>
        </view>

        <view
          v-for="item in todayMaterials"
          :key="item.id"
          class="today-item"
        >
          <view class="item-header">
            <text class="item-time">{{ formatTime(item.createdAt) }}</text>
            <text class="item-type-icon">{{ typeIcon(item.type) }}</text>
            <text v-if="item.emotion && item.emotion.emoji" class="item-emotion-emoji">{{ item.emotion.emoji }}</text>
          </view>
          <view class="item-body">
            <image
              v-if="item.type === 'image' && (item.mediaUrl || item.content)"
              class="item-image"
              :src="item.mediaUrl || item.content"
              mode="aspectFill"
            />
            <text v-else class="item-text">{{ item.content }}</text>
          </view>
        </view>

        <view v-if="!loadingMaterials && todayMaterials.length === 0" class="empty-today">
          <text class="empty-today-text">今天还没有记录，快来添加第一条吧 ✨</text>
        </view>
      </view>

      <!-- 底部留白（给 toolbar 让位） -->
      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ── 语音录制浮层 ── -->
    <view v-if="showVoiceOverlay" class="voice-overlay" @click.stop>
      <view class="voice-overlay-inner">
        <view class="voice-wave">
          <view
            v-for="i in 5"
            :key="i"
            class="voice-bar"
            :class="{ 'voice-bar-active': isRecording }"
            :style="{ animationDelay: (i * 0.1) + 's' }"
          />
        </view>
        <text class="voice-status-text">{{ isRecording ? '录音中，点击停止...' : '准备中...' }}</text>
        <view class="voice-btns">
          <view class="voice-cancel-btn press-feedback" @click="cancelVoice">
            <text class="voice-cancel-text">取消</text>
          </view>
          <view
            class="voice-record-btn"
            :class="{ recording: isRecording }"
            @click="toggleRecord"
          >
            <text class="voice-record-icon">🎤</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ── 底部工具栏 ── -->
    <view class="toolbar" :style="{ paddingBottom: safeBottom + 'px' }">
      <!-- 📷 拍照 -->
      <view class="toolbar-btn press-feedback" @click="pickPhoto">
        <text class="toolbar-btn-icon">📷</text>
        <text class="toolbar-btn-label">拍照</text>
      </view>

      <!-- 🎤 语音 -->
      <view class="toolbar-btn press-feedback" @click="openVoice">
        <text class="toolbar-btn-icon">🎤</text>
        <text class="toolbar-btn-label">语音</text>
      </view>

      <!-- ✓ 保存 -->
      <view
        class="toolbar-save press-feedback"
        :class="{ disabled: !canSave }"
        @click="handleSave"
      >
        <text class="toolbar-save-text">{{ saving ? '保存中...' : '✓ 保存' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { createMaterial, getMaterials, extractEmotion } from '@/services/api/material'
import type { RawMaterial } from '@/services/api/material'

// ── 布局 ──
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const safeBottom = ref(0)

// ── 状态 ──
const textInput = ref('')
const photos = ref<string[]>([])
const locationText = ref('获取位置中...')
const todayMaterials = ref<RawMaterial[]>([])
const loadingMaterials = ref(false)
const saving = ref(false)

// 语音
const showVoiceOverlay = ref(false)
const isRecording = ref(false)

const today = new Date().toISOString().slice(0, 10)

// 是否可保存：至少有文字 OR 照片
const canSave = computed(() => {
  return !saving.value && (textInput.value.trim().length > 0 || photos.value.length > 0)
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  const statusH = info.statusBarHeight ?? 20
  navPlaceholderHeight.value = statusH + 44
  // toolbar 高度约 100rpx + safe area
  const toolbarH = 100 * (info.windowWidth / 750) + (info.safeAreaInsets?.bottom ?? 0)
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - toolbarH
  safeBottom.value = info.safeAreaInsets?.bottom ?? 0

  getLocation()
  await loadTodayMaterials()
})

function getLocation() {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      // 简单用经纬度模拟地址（真实场景需逆地理编码）
      locationText.value = `${res.latitude.toFixed(4)}°N · 晴 22°`
    },
    fail: () => {
      locationText.value = '位置未获取'
    },
  })
}

async function loadTodayMaterials() {
  loadingMaterials.value = true
  try {
    todayMaterials.value = await getMaterials(today)
  } catch {
    // silently ignore
  } finally {
    loadingMaterials.value = false
  }
}

// ── 照片 ──
function pickPhoto() {
  const remain = 9 - photos.value.length
  if (remain <= 0) return

  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      photos.value = [...photos.value, ...res.tempFilePaths].slice(0, 9)
    },
    fail: () => {
      // H5 fallback: mock images
      const mockUrl = `https://picsum.photos/seed/${Date.now()}/400/400`
      photos.value = [...photos.value, mockUrl].slice(0, 9)
    },
  })
}

function removePhoto(idx: number) {
  photos.value.splice(idx, 1)
}

// ── 语音 ──
function openVoice() {
  showVoiceOverlay.value = true
  // H5 mock: auto-start after short delay
  setTimeout(() => {
    isRecording.value = true
  }, 300)
}

function toggleRecord() {
  if (isRecording.value) {
    // 停止录音 → mock 转文字
    stopAndTranscribe()
  } else {
    isRecording.value = true
  }
}

function cancelVoice() {
  isRecording.value = false
  showVoiceOverlay.value = false
}

async function stopAndTranscribe() {
  isRecording.value = false
  uni.showLoading({ title: '转文字中...', mask: true })
  await new Promise(resolve => setTimeout(resolve, 1000))
  uni.hideLoading()

  const transcription = '刚才录了一段语音...'
  // 追加到 textarea
  if (textInput.value && !textInput.value.endsWith('\n')) {
    textInput.value += '\n'
  }
  textInput.value += transcription

  showVoiceOverlay.value = false
  uni.showToast({ title: '语音已转文字', icon: 'none' })
}

// ── 保存 ──
async function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true

  try {
    // 决定类型：有照片→image，否则文字内容是否来自语音已混入 textarea
    let type: 'image' | 'text' = 'text'
    let mediaUrl: string | undefined

    if (photos.value.length > 0) {
      type = 'image'
      mediaUrl = photos.value[0]
    }

    const content = textInput.value.trim()

    const mat = await createMaterial({
      type,
      content: content || undefined,
      mediaUrl,
      date: today,
    })

    // 立即追加到今日列表
    todayMaterials.value.unshift(mat)

    // 重置输入
    textInput.value = ''
    photos.value = []

    uni.showToast({ title: '已记录 ✓', icon: 'success' })

    // 后台情绪提取
    extractEmotion(mat.id).then(emotion => {
      const idx = todayMaterials.value.findIndex(m => m.id === mat.id)
      if (idx >= 0) {
        todayMaterials.value[idx] = { ...todayMaterials.value[idx], emotion }
      }
    }).catch(() => {})

    // 短暂延迟后返回
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch {
    uni.showToast({ title: '记录失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// ── 工具函数 ──
function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function typeIcon(type: string): string {
  if (type === 'image') return '📷'
  if (type === 'voice') return '🎤'
  return '📝'
}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.write-page {
  background: #FDF8F3;
  min-height: 100vh;
  position: relative;
}

.nav-placeholder {}

.nav-back {
  padding: 8rpx 16rpx;
}

.page-scroll {
  box-sizing: border-box;
}

/* ── 文字输入卡片 ── */
.input-card {
  margin: 24rpx 24rpx 16rpx;
  background: #FFFFFF;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid rgba(232, 133, 90, 0.1);
}

.text-textarea {
  width: 100%;
  min-height: 180rpx;
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.7;
  background: transparent;
  box-sizing: border-box;
}

.char-count-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}

.char-count {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ── 照片区域 ── */
.photo-section {
  margin: 0 24rpx 16rpx;
}

.section-label {
  font-size: 26rpx;
  color: #AE9D92;
  display: block;
  margin-bottom: 12rpx;
}

.photo-scroll {
  white-space: nowrap;
}

.photo-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.photo-item {
  position: relative;
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: visible;
}

.photo-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  display: block;
}

.photo-remove {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #2C1F14;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.photo-remove-icon {
  color: #FFF;
  font-size: 28rpx;
  line-height: 1;
}

.photo-add {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #FFFFFF;
  border: 2rpx dashed #D4C4B8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  &:active { opacity: 0.7; }
}

.photo-add-icon {
  font-size: 48rpx;
  color: #AE9D92;
  line-height: 1;
}

.photo-add-label {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ── 位置 ── */
.location-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 0 24rpx 24rpx;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16rpx 20rpx 14rpx 18rpx;
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 26rpx;
  color: #AE9D92;
}

/* ── 分隔线 ── */
.divider {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 24rpx 20rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent 6rpx,
    #D4C4B8 6rpx,
    #D4C4B8 12rpx
  );
}

.divider-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

/* ── 今日素材列表 ── */
.today-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.list-loading {
  display: flex;
  justify-content: center;
  padding: 24rpx;
}

.list-loading-text {
  font-size: 26rpx;
  color: #AE9D92;
}

.today-item {
  background: #FFFFFF;
  border-radius: 16rpx 20rpx 14rpx 18rpx;
  padding: 18rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.item-time {
  font-size: 22rpx;
  color: #AE9D92;
}

.item-type-icon {
  font-size: 22rpx;
}

.item-emotion-emoji {
  font-size: 22rpx;
  margin-left: auto;
}

.item-body {}

.item-image {
  width: 100%;
  height: 220rpx;
  border-radius: 10rpx;
  display: block;
}

.item-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  /* 最多展示2行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-today {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.empty-today-text {
  font-size: 26rpx;
  color: #D4C4B8;
  text-align: center;
}

.bottom-spacer {
  height: 40rpx;
}

/* ── 语音浮层 ── */
.voice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(44, 31, 20, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.voice-overlay-inner {
  width: 100%;
  background: #FDF8F3;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 32rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.voice-wave {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 60rpx;
}

.voice-bar {
  width: 8rpx;
  height: 20rpx;
  background: #D4C4B8;
  border-radius: 4rpx;
  transition: height 0.2s;

  &.voice-bar-active {
    background: #E8855A;
    animation: voiceBarAnim 0.6s ease-in-out infinite alternate;
  }
}

@keyframes voiceBarAnim {
  from { height: 12rpx; }
  to   { height: 52rpx; }
}

.voice-status-text {
  font-size: 30rpx;
  color: #4A3628;
}

.voice-btns {
  display: flex;
  align-items: center;
  gap: 40rpx;
}

.voice-cancel-btn {
  padding: 16rpx 36rpx;
  border-radius: 20rpx;
  background: #F0EAE4;
  &:active { opacity: 0.8; }
}

.voice-cancel-text {
  font-size: 28rpx;
  color: #4A3628;
}

.voice-record-btn {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232, 133, 90, 0.3);
  &:active { opacity: 0.85; }

  &.recording {
    background: #D4645C;
    box-shadow: 0 0 0 16rpx rgba(212, 100, 92, 0.18);
  }
}

.voice-record-icon {
  font-size: 64rpx;
}

/* ── 底部工具栏 ── */
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid rgba(212, 196, 184, 0.5);
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 50;
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  background: #F5F0EB;
  &:active { opacity: 0.75; transform: scale(0.95); }
}

.toolbar-btn-icon {
  font-size: 40rpx;
}

.toolbar-btn-label {
  font-size: 20rpx;
  color: #4A3628;
}

.toolbar-save {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.3);
  &:active { opacity: 0.85; transform: scale(0.98); }

  &.disabled {
    background: #D4C4B8;
    box-shadow: none;
  }
}

.toolbar-save-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 700;
}

/* ── 通用按压反馈 ── */
.press-feedback {
  &:active { opacity: 0.75; }
}
</style>
