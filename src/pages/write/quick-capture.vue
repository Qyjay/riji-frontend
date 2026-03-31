<template>
  <view class="page">
    <CustomNavBar title="快拍" @left-click="handleBack">
      <template #left>
        <view class="nav-back press-feedback" @click="handleBack">
          <DoodleIcon name="arrow-left" color="#2C1F14" :size="36" />
        </view>
      </template>
    </CustomNavBar>

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <view class="content" :style="{ height: contentHeight + 'px' }">
      <!-- 照片预览 -->
      <view class="photo-wrap">
        <image class="photo-preview" :src="photoUrl" mode="aspectFill" />
      </view>

      <!-- 输入区 -->
      <view class="input-card">
        <view class="input-row">
          <textarea
            v-model="caption"
            class="caption-input"
            placeholder="说点什么..."
            :placeholder-style="'color: #D4C4B8; font-size: 28rpx;'"
            maxlength="200"
            :auto-height="true"
          />
          <view
            class="voice-btn press-feedback"
            :class="{ recording: isRecording }"
            @touchstart.prevent="startRecording"
            @touchend.prevent="stopRecording"
            @mousedown.prevent="startRecording"
            @mouseup.prevent="stopRecording"
          >
            <text class="voice-btn-icon">🎤</text>
          </view>
        </view>
        <view v-if="isRecording" class="recording-hint">
          <view class="recording-dot" />
          <text class="recording-text">松开结束</text>
        </view>
        <view class="char-row">
          <text class="char-count">{{ caption.length }}/200</text>
        </view>
      </view>

      <!-- 保存按钮 -->
      <view
        class="save-btn press-feedback"
        :class="{ disabled: saving }"
        @click="handleSave"
      >
        <text class="save-btn-text">{{ saving ? '保存中...' : '✓ 记下了' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { createMaterial, extractEmotion } from '@/services/api/material'

const navPlaceholderHeight = ref(64)
const contentHeight = ref(600)
const photoUrl = ref('')
const caption = ref('')
const saving = ref(false)
const isRecording = ref(false)

const today = new Date().toISOString().slice(0, 10)

onLoad((query: Record<string, string> | undefined) => {
  if (query?.photo) {
    photoUrl.value = decodeURIComponent(query.photo)
  }
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  contentHeight.value = info.windowHeight - navPlaceholderHeight.value
})

// ── 按住录音 ──
let recordTimer: ReturnType<typeof setTimeout> | null = null

function startRecording() {
  isRecording.value = true
  // H5 mock：模拟录音中
  recordTimer = null
}

function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false

  // H5 mock：模拟转文字
  uni.showLoading({ title: '转文字中...', mask: true })
  setTimeout(() => {
    uni.hideLoading()
    const mockText = '今天天气不错，心情也很好'
    if (caption.value && !caption.value.endsWith('\n')) {
      caption.value += '\n'
    }
    caption.value += mockText
    uni.showToast({ title: '语音已转文字', icon: 'none' })
  }, 800)
}

// ── 保存 ──
async function handleSave() {
  if (saving.value) return
  saving.value = true

  try {
    const mat = await createMaterial({
      type: 'image',
      content: caption.value.trim() || undefined,
      mediaUrl: photoUrl.value,
      date: today,
    })

    uni.showToast({ title: '已记录 ✓', icon: 'success' })

    // 后台提取情绪
    extractEmotion(mat.id).catch(() => {})

    setTimeout(() => {
      uni.navigateBack()
    }, 600)
  } catch {
    uni.showToast({ title: '记录失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
  min-height: 100vh;
}

.nav-back {
  padding: 8rpx 16rpx;
}

.content {
  display: flex;
  flex-direction: column;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

/* 照片预览 */
.photo-wrap {
  flex: 1;
  min-height: 0;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 24rpx;
}

.photo-preview {
  width: 100%;
  height: 100%;
  display: block;
}

/* 输入区 */
.input-card {
  background: #FFFFFF;
  border-radius: 20rpx 24rpx 16rpx 22rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 20rpx;
}

.input-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.caption-input {
  flex: 1;
  min-height: 60rpx;
  max-height: 160rpx;
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.6;
  background: transparent;
  box-sizing: border-box;
}

.voice-btn {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50% 55% 45% 52%;
  background: #F5F0EB;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:active { transform: scale(0.92); }
}

.voice-btn.recording {
  background: #E8855A;
  box-shadow: 0 0 0 8rpx rgba(232, 133, 90, 0.2);
}

.voice-btn-icon {
  font-size: 40rpx;
}

.recording-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}

.recording-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #D4645C;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-text {
  font-size: 24rpx;
  color: #D4645C;
  font-weight: 500;
}

.char-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}

.char-count {
  font-size: 22rpx;
  color: #AE9D92;
}

/* 保存按钮 */
.save-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.3);
  margin-bottom: 24rpx;
  &:active { opacity: 0.85; transform: scale(0.98); }
}

.save-btn.disabled {
  background: #D4C4B8;
  box-shadow: none;
}

.save-btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.press-feedback {
  &:active { opacity: 0.75; }
}
</style>
