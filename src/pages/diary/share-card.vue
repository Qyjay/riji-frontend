<template>
  <view class="page page-root">
    <CustomNavBar title="分享卡片" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 卡片预览区 -->
      <view class="card-preview-wrap">
        <view class="card-preview" :style="cardStyle">
          <view class="card-inner">
            <text class="card-title">✨ 今日日记</text>
            <view class="card-divider">
              <view class="divider-line" />
              <text class="divider-dot">·</text>
              <view class="divider-line" />
            </view>
            <text class="card-content" :style="{ fontSize: fontSize + 'rpx' }">
              "{{ trimmedContent }}"
            </text>
            <view class="card-footer">
              <text class="card-meta">{{ diary?.emotion.emoji }} {{ diary?.emotion.label }} · {{ formattedDate }}</text>
              <view v-if="showPhoto && diary?.images?.length" class="card-photo-wrap">
                <image class="card-photo" :src="diary.images[0]" mode="aspectFill" />
              </view>
              <view v-if="showLocation && diary?.location" class="card-location">
                <text class="card-location-text">📍 {{ diary.location }}</text>
              </view>
              <view class="card-brand">
                <text class="card-brand-text">📱 半日 App</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 选择模板 -->
      <view class="section-label">选择模板</view>
      <scroll-view class="template-scroll" scroll-x enable-flex>
        <view
          v-for="tpl in templates"
          :key="tpl.id"
          class="template-item"
          :class="{ 'template-item--active': selectedTemplate === tpl.id }"
          @click="selectedTemplate = tpl.id"
        >
          <view class="template-swatch" :style="{ background: tpl.bg }" />
          <text class="template-name">{{ tpl.name }}</text>
        </view>
      </scroll-view>

      <!-- 自定义 -->
      <view class="section-label">自定义</view>
      <view class="custom-card">
        <!-- 字体大小 -->
        <view class="custom-row">
          <text class="custom-label">字体大小</text>
          <view class="font-size-btns">
            <view
              v-for="size in fontSizes"
              :key="size.value"
              class="font-btn"
              :class="{ 'font-btn--active': fontSize === size.value }"
              @click="fontSize = size.value"
            >
              <text class="font-btn-text">{{ size.label }}</text>
            </view>
          </view>
        </view>
        <view class="custom-divider" />
        <!-- 显示照片 -->
        <view class="custom-row">
          <text class="custom-label">显示照片</text>
          <switch
            :checked="showPhoto"
            @change="e => showPhoto = e.detail.value"
            color="#E8855A"
            class="custom-switch"
          />
        </view>
        <view class="custom-divider" />
        <!-- 显示位置 -->
        <view class="custom-row">
          <text class="custom-label">显示位置</text>
          <switch
            :checked="showLocation"
            @change="e => showLocation = e.detail.value"
            color="#E8855A"
            class="custom-switch"
          />
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="cta-primary" @click="handleShare">
        <DoodleIcon name="share" :size="36" color="#FFFFFF" style="margin-right: 12rpx;" />
        <text class="cta-primary-text">分享到...</text>
      </view>
      <view class="cta-secondary" @click="handleSave">
        <DoodleIcon name="camera" :size="36" color="#4A3628" style="margin-right: 12rpx;" />
        <text class="cta-secondary-text">保存图片</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { getDiaryDetail } from '@/services/api/diary'
import type { Diary } from '@/services/api/diary'
import DoodleIcon from '@/components/DoodleIcon.vue'

const templates = [
  { id: 'warm', name: '暖阳', bg: 'linear-gradient(135deg, #FDF0E8, #F7CDB5)', textColor: '#2C1F14' },
  { id: 'starry', name: '星空', bg: 'linear-gradient(135deg, #1a1a3e, #2d2d6e)', textColor: '#FFFFFF' },
  { id: 'minimal', name: '极简', bg: '#FFFFFF', textColor: '#2C1F14' },
  { id: 'garden', name: '花园', bg: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', textColor: '#2E7D32' },
  { id: 'sunset', name: '晚霞', bg: 'linear-gradient(135deg, #FF9A9E, #FAD0C4)', textColor: '#FFFFFF' },
  { id: 'ocean', name: '海洋', bg: 'linear-gradient(135deg, #667eea, #764ba2)', textColor: '#FFFFFF' },
]

const fontSizes = [
  { label: '小', value: 28 },
  { label: '中', value: 32 },
  { label: '大', value: 36 },
]

const diary = ref<Diary | null>(null)
const selectedTemplate = ref('warm')
const fontSize = ref(32)
const showPhoto = ref(false)
const showLocation = ref(false)

const currentTemplate = computed(() => templates.find(t => t.id === selectedTemplate.value) ?? templates[0])

const cardStyle = computed(() => ({
  background: currentTemplate.value.bg,
  color: currentTemplate.value.textColor,
}))

const trimmedContent = computed(() => {
  const content = diary.value?.content ?? ''
  // Max 3 lines roughly 20 chars each
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length <= 3) return lines.join('\n')
  return lines.slice(0, 3).join('\n')
})

const formattedDate = computed(() => {
  if (!diary.value?.createdAt) return ''
  const d = new Date(diary.value.createdAt)
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
})

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function handleSave() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options ?? current.options ?? {}
  const id = (options as any).id ?? '1'
  try {
    diary.value = await getDiaryDetail(id)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 32rpx 32rpx 64rpx;
}

.card-preview-wrap {
  display: flex;
  justify-content: center;
  margin: 16rpx 0 32rpx;
}

.card-preview {
  width: 600rpx;
  height: 800rpx;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.card-inner {
  width: 100%;
  height: 100%;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.card-title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.card-divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  margin-bottom: 32rpx;
}

.divider-line {
  flex: 1;
  height: 2rpx;
  background: currentColor;
  opacity: 0.25;
}

.divider-dot {
  font-size: 24rpx;
  opacity: 0.4;
}

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  text-align: center;
  line-height: 1.8;
  word-break: break-all;
}

.card-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-top: 32rpx;
}

.card-meta {
  font-size: 24rpx;
  opacity: 0.75;
}

.card-photo-wrap {
  width: 200rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.card-photo {
  width: 100%;
  height: 100%;
}

.card-location {
  margin-top: 8rpx;
}

.card-location-text {
  font-size: 22rpx;
  opacity: 0.6;
}

.card-brand {
  margin-top: 16rpx;
}

.card-brand-text {
  font-size: 22rpx;
  opacity: 0.45;
}

.section-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #AE9D92;
  margin-bottom: 20rpx;
  margin-top: 16rpx;
}

.template-scroll {
  white-space: nowrap;
}

.template-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-right: 24rpx;
  cursor: pointer;
}

.template-swatch {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.08);
}

.template-item--active .template-swatch {
  border: 2rpx solid #E8855A;
  box-shadow: 0 0 0 4rpx rgba(232, 133, 90, 0.25);
}

.template-name {
  font-size: 24rpx;
  color: #4A3628;
}

.custom-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 40rpx;
}

.custom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
}

.custom-label {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 500;
}

.font-size-btns {
  display: flex;
  gap: 16rpx;
}

.font-btn {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.font-btn--active {
  background: #FDF0E8;
  border-color: #E8855A;
}

.font-btn-text {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

.custom-switch {
  transform: scale(0.8);
}

.custom-divider {
  height: 2rpx;
  background: rgba(44, 31, 20, 0.05);
  margin: 0 32rpx;
}

.cta-primary {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 40rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 4px 16px rgba(232, 133, 90, 0.35);
  &:active { transform: scale(0.98); }
}

.cta-primary-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.cta-secondary {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  &:active { background: #F5F0EB; }
}

.cta-secondary-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #4A3628;
}
</style>
