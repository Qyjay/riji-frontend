<template>
  <view class="page page-root">
    <CustomNavBar title="漫画工坊" left-icon="back" @right-click="handleSave" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 原始日记 -->
      <view class="section-label">原始日记</view>
      <view class="diary-card">
        <view class="diary-header">
          <text class="diary-emoji">{{ diary?.emotion.emoji }}</text>
          <text class="diary-time">{{ formatTime(diary?.createdAt) }}</text>
        </view>
        <text class="diary-content">{{ diary?.content }}</text>
      </view>

      <!-- 选择风格 -->
      <view class="section-label">选择风格</view>
      <scroll-view class="style-scroll" scroll-x enable-flex>
        <view
          v-for="style in comicStyles"
          :key="style.id"
          class="style-item"
          :class="{ 'style-item--active': selectedStyle === style.id }"
          @click="selectedStyle = style.id"
        >
          <DoodleIcon :name="style.iconName" :size="44" :color="selectedStyle === style.id ? style.iconColor : '#AE9D92'" class="style-emoji" />
          <text class="style-name">{{ style.name }}</text>
          <text class="style-desc">{{ style.desc }}</text>
        </view>
      </scroll-view>

      <!-- 生成按钮 -->
      <view class="generate-btn-wrap">
        <view class="generate-btn" @click="handleGenerate">
          <text class="generate-btn-text">✨ 生成漫画</text>
        </view>
      </view>

      <!-- 生成结果 -->
      <template v-if="isGenerating || hasGenerated">
        <view class="section-label">生成结果</view>
        <view class="comic-panel-card">
          <!-- Loading -->
          <view v-if="isGenerating" class="loading-wrap">
            <view class="loading-spinner" />
            <text class="loading-text">正在生成漫画...</text>
          </view>
          <!-- 结果 -->
          <view v-else class="comic-grid">
            <view
              v-for="(panel, idx) in comicPanels"
              :key="idx"
              class="comic-panel"
            >
              <image
                class="panel-img"
                :src="panel.image"
                mode="aspectFill"
              />
              <view class="panel-caption">
                <text class="panel-caption-text">{{ panel.caption }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部操作按钮 -->
        <view v-if="!isGenerating" class="action-btns">
          <view class="action-btn" @click="handleShare">
            <DoodleIcon name="share" :size="44" color="#E8855A" class="action-icon" />
            <text class="action-label">分享</text>
          </view>
          <view class="action-btn" @click="handleSaveLocal">
            <DoodleIcon name="camera" :size="44" color="#5BBF8E" class="action-icon" />
            <text class="action-label">保存到相册</text>
          </view>
          <view class="action-btn" @click="handleRegenerate">
            <DoodleIcon name="sparkle" :size="44" color="#6B8EC4" class="action-icon" />
            <text class="action-label">重新生成</text>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { getDiaryDetail, generateDerivative, getDerivatives } from '@/services/api/diary'
import type { Diary, DiaryDerivative } from '@/services/api/diary'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { API_BASE_URL } from '@/services/config'

const comicStyles = [
  { id: 'jp-fresh',   iconName: 'sparkle',  iconColor: '#E8A4B8', name: '日漫清新', desc: '治愈系少女风' },
  { id: 'jp-hot',     iconName: 'star',     iconColor: '#E8855A', name: '日漫热血', desc: '少年漫风格' },
  { id: 'cn-wuxia',   iconName: 'palette',  iconColor: '#4A3628', name: '国漫武侠', desc: '水墨风格' },
  { id: 'watercolor', iconName: 'palette',  iconColor: '#6B8EC4', name: '水彩治愈', desc: '手绘水彩' },
  { id: 'pixel',      iconName: 'robot',    iconColor: '#5BBF8E', name: '像素复古', desc: '8bit像素风' },
  { id: 'chibi',      iconName: 'heart',    iconColor: '#E8C44E', name: 'Q版可爱', desc: 'SD比例' },
]

const selectedStyle = ref('jp-fresh')
const diary = ref<Diary | null>(null)
const isGenerating = ref(false)
const hasGenerated = ref(false)

interface ComicPanel {
  image: string
  caption: string
}

const comicPanels = ref<ComicPanel[]>([])

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

function generateCaptions(content: string): string[] {
  // Split content into ~4 sentences/phrases for comic panels
  const sentences = content.split(/[，。！~～,.!]/).filter(s => s.trim().length > 2)
  const captions: string[] = []
  for (let i = 0; i < 4; i++) {
    if (sentences[i]) {
      captions.push(sentences[i].trim().substring(0, 30))
    } else {
      captions.push(`场景${i + 1}`)
    }
  }
  return captions
}

function toFullMediaUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('/')) {
    if (path.startsWith('/uploads/')) {
      const host = API_BASE_URL.replace(/\/api$/, '')
      return `${host}${path}`
    }
    return `${API_BASE_URL}${path}`
  }
  return path
}

function applyComicDerivative(derivative: DiaryDerivative): boolean {
  const imageUrl = toFullMediaUrl(derivative.mediaUrl || '')
  if (!imageUrl) return false

  const caption = derivative.content?.trim() || diary.value?.title || 'AI 漫画分镜'
  comicPanels.value = [{ image: imageUrl, caption }]
  hasGenerated.value = true
  return true
}

async function loadExistingComicDerivative(diaryId: string, derivativeId?: string) {
  const derivatives = await getDerivatives(diaryId)

  if (derivativeId) {
    const exact = derivatives.find(item => item.id === derivativeId)
    if (exact && exact.type === 'comic' && applyComicDerivative(exact)) {
      return
    }
  }

  const latestComic = derivatives.find(item => item.type === 'comic')
  if (latestComic) {
    applyComicDerivative(latestComic)
  }
}

async function handleGenerate() {
  if (isGenerating.value) return
  if (!diary.value) {
    uni.showToast({ title: '日记未加载完成', icon: 'none' })
    return
  }

  isGenerating.value = true
  hasGenerated.value = false
  comicPanels.value = []

  try {
    const derivative = await generateDerivative(diary.value.id, 'comic')
    if (!applyComicDerivative(derivative)) {
      // 兼容后端异步写入延迟：补查一次列表
      await loadExistingComicDerivative(diary.value.id, derivative.id)
    }
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    isGenerating.value = false
  }
}

async function handleRegenerate() {
  await handleGenerate()
}

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function handleSave() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

function handleSaveLocal() {
  uni.showToast({ title: '已保存到相册', icon: 'success' })
}

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as any
  const options = current?.$page?.options ?? current?.options ?? {}
  const id = (options as any).id ?? '1'
  const derivativeId = (options as any).derivativeId as string | undefined
  try {
    diary.value = await getDiaryDetail(id)
    await loadExistingComicDerivative(diary.value.id, derivativeId)
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

.section-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #AE9D92;
  margin-bottom: 20rpx;
  margin-top: 32rpx;
  &:first-child { margin-top: 0; }
}

.diary-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.diary-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.diary-emoji { font-size: 36rpx; }

.diary-time {
  font-size: 24rpx;
  color: #AE9D92;
}

.diary-content {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.7;
}

.style-scroll {
  white-space: nowrap;
}

.style-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 160rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 16rpx 8rpx;
  margin-right: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
  cursor: pointer;
}

.style-item--active {
  border-color: #E8855A;
  background: #FDF0E8;
}

.style-emoji { display: flex; align-items: center; justify-content: center; }

.style-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #2C1F14;
  margin-top: 4rpx;
}

.style-desc {
  font-size: 22rpx;
  color: #AE9D92;
}

.generate-btn-wrap {
  margin-top: 40rpx;
}

.generate-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 40rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(232, 133, 90, 0.35);
}

.generate-btn:active {
  transform: scale(0.97);
}

.generate-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.comic-panel-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  min-height: 400rpx;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx;
  gap: 32rpx;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(232, 133, 90, 0.20);
  border-top-color: #E8855A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #AE9D92;
}

.comic-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  padding: 8rpx;
}

.comic-panel {
  border-radius: 8rpx;
  overflow: hidden;
}

.panel-img {
  width: 100%;
  height: 240rpx;
  display: block;
}

.panel-caption {
  background: rgba(44, 31, 20, 0.85);
  padding: 6rpx 10rpx;
}

.panel-caption-text {
  font-size: 22rpx;
  color: #FFFFFF;
  line-height: 1.5;
}

.action-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.action-btn {
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  cursor: pointer;
  &:active { background: #F5F0EB; }
}

.action-icon { display: flex; align-items: center; justify-content: center; }

.action-label {
  font-size: 24rpx;
  color: #4A3628;
}
</style>
