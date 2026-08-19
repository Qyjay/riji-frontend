<template>
  <view class="page-container" :class="readerThemeClass">
    <CustomNavBar
      :title="viewMode === 'toc' ? '我的小传' : (currentChapter?.title || '')"
      :leftIcon="viewMode === 'reader' ? 'back' : 'none'"
      @leftClick="backToToc"
    />

    <view class="nav-placeholder" :style="{ height: navBarHeight + 'px' }" />

    <!-- 阅读进度条 -->
    <view v-if="viewMode === 'reader'" class="reading-progress-bar" :style="{ top: navBarHeight + 'px' }">
      <view class="reading-progress-fill" :style="{ width: readingProgress + '%' }" />
    </view>

    <scroll-view
      scroll-y
      class="scroll-area"
      :style="{ height: scrollHeight + 'px' }"
      :scroll-top="scrollTop"
      :scroll-with-animation="false"
      @scroll="onScroll"
    >
      <!-- ========== 目录视图 ========== -->
      <view v-if="viewMode === 'toc'" class="toc-view">

        <view v-if="loading" class="novel-skeleton">
          <view class="sk-cover" />
          <view class="sk-progress-card">
            <view class="sk-progress-head">
              <Skeleton :width="220" :height="28" />
              <Skeleton :width="80" :height="28" />
            </view>
            <Skeleton :width="'100%'" :height="14" :margin-bottom="14" />
            <Skeleton :width="320" :height="22" />
          </view>
          <Skeleton :width="200" :height="26" :margin-bottom="20" />
          <view v-for="n in 3" :key="n" class="sk-chapter-card">
            <Skeleton :width="180" :height="180" :radius="16" />
            <view class="sk-chapter-body">
              <Skeleton :width="280" :height="32" :margin-bottom="14" />
              <Skeleton :width="220" :height="22" :margin-bottom="14" />
              <Skeleton :width="'100%'" :height="22" :margin-bottom="8" />
              <Skeleton :width="'80%'" :height="22" />
            </view>
          </view>
        </view>

        <template v-else>
          <!-- 封面卡片 -->
          <view class="cover-card">
            <image
              v-if="coverImage"
              :src="coverImage"
              class="cover-bg"
              mode="aspectFill"
            />
            <view class="cover-overlay" />
            <view class="cover-inner">
              <DoodleIcon name="bookopen" :size="72" color="rgba(255,255,255,0.9)" class="cover-emoji" />
              <text class="cover-title">《我的小传》</text>
              <text class="cover-subtitle">由你的日记自动谱写</text>
              <view class="cover-divider" />
              <text class="cover-stats">
                已生成 {{ chapters.length }} 章 · 共 {{ totalWords.toLocaleString() }} 字
              </text>
            </view>
          </view>

          <!-- 解锁进度卡 -->
          <view class="progress-card">
            <view class="progress-card-head">
              <text class="progress-card-title">下一章解锁进度</text>
              <text class="progress-card-count">
                {{ progress.pendingDiaryCount }} / {{ progress.threshold }}
              </text>
            </view>
            <view class="progress-track">
              <view
                class="progress-track-fill"
                :style="{ width: unlockPercent + '%' }"
              />
            </view>
            <text class="progress-card-hint">
              {{ progress.canGenerate
                ? '素材已充足，可以生成新的一章了！'
                : `再写 ${progress.neededForNext} 篇日记即可解锁下一章` }}
            </text>
          </view>

          <!-- 章节目录标题 -->
          <view class="section-title-row">
            <text class="section-title">── 章节目录 ──</text>
          </view>

          <!-- 空状态 -->
          <view v-if="chapters.length === 0" class="empty-state">
            <DoodleIcon name="bookopen" :size="64" color="#D9C9BC" />
            <text class="empty-text">还没有任何章节</text>
            <text class="empty-subtext">积累足够日记后，生成你的第一章人生小传</text>
          </view>

          <!-- 章节列表 -->
          <view v-else class="chapters-list">
            <view
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              class="chapter-card"
              @click="openChapter(chapter)"
            >
              <image
                v-if="chapter.coverImageUrl"
                :src="chapter.coverImageUrl"
                class="chapter-thumb"
                mode="aspectFill"
              />
              <view class="chapter-content">
                <view class="chapter-header-row">
                  <view class="chapter-title-group">
                    <text class="chapter-num">第{{ chapter.chapterIndex }}章</text>
                    <text class="chapter-title-text">{{ chapter.title }}</text>
                    <text v-if="index === chapters.length - 1" class="chapter-latest">最新</text>
                  </view>
                </view>
                <text class="chapter-date">{{ formatRange(chapter) }} · {{ chapter.wordCount.toLocaleString() }}字</text>
                <text class="chapter-preview">「{{ chapter.preview }}」</text>
              </view>
            </view>
          </view>

          <!-- 生成下一章按钮 -->
          <view class="generate-btn-wrap">
            <view
              class="generate-btn"
              :class="{ 'generate-btn-disabled': !progress.canGenerate || generating }"
              @click="onGenerate"
            >
              <text class="generate-btn-text">
                {{ generating ? '正在创作中...' : (progress.canGenerate ? '生成下一章' : `还差 ${progress.neededForNext} 篇日记`) }}
              </text>
            </view>
          </view>

          <view class="bottom-safe" />
        </template>
      </view>

      <!-- ========== 阅读视图 ========== -->
      <view
        v-else-if="viewMode === 'reader' && currentChapter"
        class="reader-view"
        :style="{ fontSize: readerSettings.fontSize + 'rpx' }"
      >
        <!-- 章节封面 -->
        <image
          v-if="currentChapter.coverImageUrl"
          :src="currentChapter.coverImageUrl"
          class="reader-cover"
          mode="aspectFill"
        />

        <view class="reader-header">
          <text class="reader-chapter-num">第{{ currentChapter.chapterIndex }}章</text>
          <text class="reader-title">{{ currentChapter.title }}</text>
          <text class="reader-date">{{ formatRange(currentChapter) }}</text>
        </view>

        <view class="reader-body">
          <block v-for="(para, i) in readerParagraphs" :key="i">
            <text
              class="reader-para"
              :style="{ lineHeight: readerSettings.lineHeight }"
            >{{ para }}</text>
            <!-- 插图：锚定在对应段落之后 -->
            <image
              v-if="illustrationAt(i)"
              :src="illustrationAt(i)"
              class="reader-illustration"
              mode="widthFix"
              @click="previewIllustration(illustrationAt(i))"
            />
          </block>
        </view>

        <view style="height: 180rpx;" />
      </view>
    </scroll-view>

    <!-- 阅读视图底部固定导航 -->
    <view v-if="viewMode === 'reader'" class="reader-nav-bar">
      <view
        class="reader-nav-btn"
        :class="{ 'reader-nav-btn-disabled': currentIndex <= 0 }"
        @click="prevChapter"
      >
        <text class="reader-nav-btn-text">上一章</text>
      </view>
      <view class="reader-nav-btn reader-nav-btn-center" @click="backToToc">
        <text class="reader-nav-btn-text reader-nav-btn-text-primary">目录</text>
      </view>
      <view class="reader-nav-btn" @click="showSettings = true">
        <text class="reader-nav-btn-text">设置</text>
      </view>
      <view
        class="reader-nav-btn"
        :class="{ 'reader-nav-btn-disabled': currentIndex >= chapters.length - 1 }"
        @click="nextChapter"
      >
        <text class="reader-nav-btn-text">下一章</text>
      </view>
    </view>

    <!-- 阅读设置面板 -->
    <view v-if="showSettings" class="settings-mask" @click="showSettings = false">
      <view class="settings-panel" @click.stop>
        <text class="settings-title">阅读设置</text>

        <!-- 字号 -->
        <view class="settings-row">
          <text class="settings-label">字号</text>
          <view class="settings-controls">
            <view class="settings-step" @click="changeFontSize(-2)"><text class="settings-step-text">A-</text></view>
            <text class="settings-value">{{ readerSettings.fontSize }}</text>
            <view class="settings-step" @click="changeFontSize(2)"><text class="settings-step-text">A+</text></view>
          </view>
        </view>

        <!-- 行距 -->
        <view class="settings-row">
          <text class="settings-label">行距</text>
          <view class="settings-controls">
            <view
              v-for="opt in lineHeightOptions"
              :key="opt.value"
              class="settings-chip"
              :class="{ 'settings-chip-active': readerSettings.lineHeight === opt.value }"
              @click="readerSettings.lineHeight = opt.value; persistSettings()"
            >
              <text class="settings-chip-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- 主题 -->
        <view class="settings-row">
          <text class="settings-label">主题</text>
          <view class="settings-controls">
            <view
              v-for="t in themeOptions"
              :key="t.value"
              class="theme-dot"
              :class="[`theme-dot-${t.value}`, { 'theme-dot-active': readerSettings.theme === t.value }]"
              @click="readerSettings.theme = t.value; persistSettings()"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import {
  getBiography,
  createBiographyTask,
  getBiographyTask,
  type BiographyChapter,
  type BiographyProgress,
} from '@/services/api/biography'

const CACHE_KEY = 'biography_cache'
const SETTINGS_KEY = 'biography_reader_settings'
const POSITION_KEY = 'biography_read_positions'

// ─── 导航栏高度 ───
const navBarHeight = ref(88)
const scrollHeight = ref(600)

// ─── 状态 ───
const loading = ref(true)
const generating = ref(false)
const viewMode = ref<'toc' | 'reader'>('toc')
const chapters = ref<BiographyChapter[]>([])
const progress = ref<BiographyProgress>({
  threshold: 7,
  chapterCount: 0,
  pendingDiaryCount: 0,
  neededForNext: 7,
  canGenerate: false,
  nextChapterIndex: 1,
})
const currentChapterId = ref('')
const scrollTop = ref(0)
const readingProgress = ref(0)

// ─── 阅读设置 ───
const showSettings = ref(false)
const lineHeightOptions = [
  { label: '紧凑', value: '1.6' },
  { label: '标准', value: '1.9' },
  { label: '宽松', value: '2.2' },
]
const themeOptions = [
  { value: 'paper' },
  { value: 'sepia' },
  { value: 'dark' },
] as const
const readerSettings = ref<{ fontSize: number; lineHeight: string; theme: 'paper' | 'sepia' | 'dark' }>({
  fontSize: 32,
  lineHeight: '1.9',
  theme: 'paper',
})

const readerThemeClass = computed(() =>
  viewMode.value === 'reader' ? `theme-${readerSettings.value.theme}` : '',
)

// ─── 计算属性 ───
const totalWords = computed(() => chapters.value.reduce((s, c) => s + (c.wordCount || 0), 0))
const coverImage = computed(() => chapters.value[chapters.value.length - 1]?.coverImageUrl || '')
const unlockPercent = computed(() => {
  if (progress.value.threshold <= 0) return 0
  return Math.min(100, Math.round((progress.value.pendingDiaryCount / progress.value.threshold) * 100))
})

const currentChapter = computed(() => chapters.value.find(c => c.id === currentChapterId.value))
const currentIndex = computed(() => chapters.value.findIndex(c => c.id === currentChapterId.value))
const readerParagraphs = computed(() =>
  (currentChapter.value?.content || '').split('\n').map(p => p.trim()).filter(Boolean),
)

function illustrationAt(paraIndex: number): string {
  const list = currentChapter.value?.illustrations || []
  const hit = list.find(i => i.anchorPara === paraIndex)
  return hit?.imageUrl || ''
}

// ─── 工具 ───
function formatRange(c: BiographyChapter): string {
  if (!c.dateRangeStart) return ''
  if (c.dateRangeStart === c.dateRangeEnd) return c.dateRangeStart
  return `${c.dateRangeStart} ~ ${c.dateRangeEnd}`
}

// ─── 加载数据 ───
function loadCache() {
  try {
    const cached = uni.getStorageSync(CACHE_KEY)
    if (cached && cached.chapters) {
      chapters.value = cached.chapters
      progress.value = cached.progress || progress.value
    }
  } catch (e) { /* ignore */ }
}

function saveCache() {
  try {
    uni.setStorageSync(CACHE_KEY, { chapters: chapters.value, progress: progress.value })
  } catch (e) { /* ignore */ }
}

async function loadBiography() {
  try {
    const data = await getBiography()
    chapters.value = data.chapters || []
    progress.value = data.progress
    saveCache()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ─── 生成 ───
async function onGenerate() {
  if (generating.value) return
  if (!progress.value.canGenerate) {
    uni.showToast({ title: `还差 ${progress.value.neededForNext} 篇日记`, icon: 'none' })
    return
  }
  generating.value = true
  uni.showLoading({ title: '正在创作...', mask: true })
  try {
    const task = await createBiographyTask()
    await pollTask(task.taskId)
  } catch (e: any) {
    uni.hideLoading()
    generating.value = false
    uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
  }
}

function pollTask(taskId: string): Promise<void> {
  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      try {
        const t = await getBiographyTask(taskId)
        if (t.status === 'done') {
          clearInterval(timer)
          uni.hideLoading()
          generating.value = false
          await loadBiography()
          uni.showToast({ title: '新章节已生成', icon: 'success' })
          resolve()
        } else if (t.status === 'failed') {
          clearInterval(timer)
          uni.hideLoading()
          generating.value = false
          uni.showToast({ title: t.error || '生成失败', icon: 'none' })
          resolve()
        }
      } catch (e) {
        clearInterval(timer)
        uni.hideLoading()
        generating.value = false
        resolve()
      }
    }, 3000)
  })
}

// ─── 阅读 ───
function getPositions(): Record<string, number> {
  try {
    return uni.getStorageSync(POSITION_KEY) || {}
  } catch (e) {
    return {}
  }
}

function savePosition(top: number) {
  if (!currentChapterId.value) return
  const positions = getPositions()
  positions[currentChapterId.value] = top
  try {
    uni.setStorageSync(POSITION_KEY, positions)
  } catch (e) { /* ignore */ }
}

function openChapter(chapter: BiographyChapter) {
  currentChapterId.value = chapter.id
  viewMode.value = 'reader'
  readingProgress.value = 0
  // 恢复阅读位置
  const saved = getPositions()[chapter.id] || 0
  scrollTop.value = 0
  setTimeout(() => { scrollTop.value = saved }, 60)
}

function backToToc() {
  if (viewMode.value === 'reader') {
    viewMode.value = 'toc'
    scrollTop.value = 0
  }
}

function prevChapter() {
  if (currentIndex.value > 0) openChapter(chapters.value[currentIndex.value - 1])
}

function nextChapter() {
  if (currentIndex.value < chapters.value.length - 1) openChapter(chapters.value[currentIndex.value + 1])
}

let scrollSaveTimer: any = null
function onScroll(e: any) {
  if (viewMode.value !== 'reader') return
  const { scrollTop: top, scrollHeight: sh } = e.detail
  const denom = sh - scrollHeight.value
  readingProgress.value = denom > 0 ? Math.min(100, Math.round((top / denom) * 100)) : 0
  if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
  scrollSaveTimer = setTimeout(() => savePosition(top), 400)
}

function previewIllustration(url: string) {
  if (!url) return
  uni.previewImage({ urls: [url], current: url })
}

// ─── 设置持久化 ───
function loadSettings() {
  try {
    const s = uni.getStorageSync(SETTINGS_KEY)
    if (s) readerSettings.value = { ...readerSettings.value, ...s }
  } catch (e) { /* ignore */ }
}

function persistSettings() {
  try {
    uni.setStorageSync(SETTINGS_KEY, readerSettings.value)
  } catch (e) { /* ignore */ }
}

function changeFontSize(delta: number) {
  const next = readerSettings.value.fontSize + delta
  readerSettings.value.fontSize = Math.max(24, Math.min(48, next))
  persistSettings()
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navBarHeight.value
  loadSettings()
  loadCache()
  loadBiography()
})
</script>

<style scoped>
/* ── 整体 ── */
.page-container {
  background-color: #FDF8F3;
}

/* 阅读主题 */
.theme-paper { background-color: #FDF8F3; }
.theme-sepia { background-color: #F5ECD8; }
.theme-dark { background-color: #1A1815; }

/* 阅读进度条 */
.reading-progress-bar {
  position: fixed;
  left: 0;
  right: 0;
  height: 4rpx;
  background: rgba(174, 157, 146, 0.15);
  z-index: 50;
}
.reading-progress-fill {
  height: 100%;
  background: #E8855A;
  transition: width 0.2s;
}

/* ── 目录视图 ── */
.toc-view {
  padding: 24rpx 32rpx 0;
}

.state-hint, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  gap: 16rpx;
}
.state-hint-text { font-size: 26rpx; color: #AE9D92; }
.empty-text { font-size: 30rpx; color: #4A3628; font-weight: 600; margin-top: 16rpx; }
.empty-subtext { font-size: 24rpx; color: #AE9D92; }

/* 封面卡片 */
.cover-card {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  min-height: 320rpx;
  box-shadow: 0 8rpx 32rpx rgba(44, 31, 20, 0.25);
  background: linear-gradient(135deg, #2C1F14 0%, #5C3D2E 100%);
}
.cover-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
}
.cover-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, rgba(28,20,12,0.35) 0%, rgba(28,20,12,0.75) 100%);
}
.cover-inner {
  position: relative;
  padding: 56rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cover-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18rpx;
}
.cover-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}
.cover-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 28rpx;
}
.cover-divider {
  width: 80rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.3);
  margin-bottom: 22rpx;
}
.cover-stats {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1rpx;
}

/* 进度卡 */
.progress-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.progress-card-head {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.progress-card-title { font-size: 28rpx; color: #2C1F14; font-weight: 600; }
.progress-card-count { font-size: 26rpx; color: #E8855A; font-weight: 600; }
.progress-track {
  height: 14rpx;
  background: rgba(174, 157, 146, 0.18);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 14rpx;
}
.progress-track-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A, #D4645C);
  border-radius: 8rpx;
  transition: width 0.3s;
}
.progress-card-hint { font-size: 23rpx; color: #AE9D92; }

/* 章节目录标题 */
.section-title-row {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 26rpx;
  color: #AE9D92;
  letter-spacing: 4rpx;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.chapter-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: row;
}
.chapter-thumb {
  width: 180rpx;
  flex-shrink: 0;
  background: #EFE6DC;
}
.chapter-content {
  flex: 1;
  padding: 24rpx 24rpx 24rpx 22rpx;
  min-width: 0;
}
.chapter-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8rpx;
}
.chapter-title-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.chapter-num { font-size: 22rpx; color: #AE9D92; }
.chapter-title-text { font-size: 30rpx; font-weight: 600; color: #2C1F14; }
.chapter-latest {
  font-size: 20rpx;
  color: #E8855A;
  background: rgba(232, 133, 90, 0.12);
  padding: 2rpx 10rpx;
  border-radius: 20rpx;
}
.chapter-date { font-size: 22rpx; color: #AE9D92; margin-bottom: 12rpx; display: block; }
.chapter-preview {
  font-size: 24rpx;
  color: #4A3628;
  font-style: italic;
  line-height: 1.6;
  display: block;
}

/* 生成按钮 */
.generate-btn-wrap { margin: 40rpx 0 32rpx; }
.generate-btn {
  background: linear-gradient(135deg, #E8855A 0%, #D4645C 100%);
  border-radius: 48rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(232, 133, 90, 0.35);
}
.generate-btn-disabled {
  background: #D9C9BC;
  box-shadow: none;
}
.generate-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
.bottom-safe { height: 60rpx; }

/* ── 阅读视图 ── */
.reader-view {
  padding: 0 40rpx;
}
.reader-cover {
  width: 100%;
  height: 360rpx;
  border-radius: 20rpx;
  margin: 24rpx 0 8rpx;
  background: #EFE6DC;
}
.reader-header {
  margin: 24rpx 0 40rpx;
}
.reader-chapter-num {
  display: block;
  font-size: 22rpx;
  color: #E8855A;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}
.reader-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #2C1F14;
  margin-bottom: 14rpx;
  line-height: 1.3;
}
.reader-date {
  display: block;
  font-size: 24rpx;
  color: #AE9D92;
}
.reader-body {
  display: flex;
  flex-direction: column;
}
.reader-para {
  color: #2C1F14;
  text-align: justify;
  letter-spacing: 0.5rpx;
  margin-bottom: 32rpx;
  font-size: inherit;
}
.reader-illustration {
  width: 100%;
  border-radius: 16rpx;
  margin: 8rpx 0 36rpx;
  background: #EFE6DC;
}

/* 主题下的正文颜色 */
.theme-sepia .reader-para, .theme-sepia .reader-title { color: #4A3320; }
.theme-dark .reader-para { color: #C9C2B6; }
.theme-dark .reader-title { color: #E8E2D6; }
.theme-dark .reader-date, .theme-dark .reader-chapter-num { color: #8A8275; }

/* 底部固定导航 */
.reader-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid rgba(174, 157, 146, 0.2);
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.reader-nav-btn {
  flex: 1;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(174, 157, 146, 0.25);
}
.reader-nav-btn-center {
  background: rgba(232, 133, 90, 0.1);
  border-color: rgba(232, 133, 90, 0.3);
}
.reader-nav-btn-disabled { opacity: 0.38; }
.reader-nav-btn-text { font-size: 26rpx; color: #4A3628; font-weight: 500; }
.reader-nav-btn-text-primary { color: #E8855A; font-weight: 600; }

/* 设置面板 */
.settings-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.settings-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  padding: 36rpx 40rpx calc(48rpx + env(safe-area-inset-bottom));
}
.settings-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #2C1F14;
  margin-bottom: 32rpx;
  text-align: center;
}
.settings-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.settings-label { font-size: 28rpx; color: #4A3628; }
.settings-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}
.settings-step {
  width: 72rpx;
  height: 60rpx;
  background: #FDF8F3;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(174, 157, 146, 0.25);
}
.settings-step-text { font-size: 26rpx; color: #4A3628; font-weight: 600; }
.settings-value { font-size: 28rpx; color: #2C1F14; min-width: 48rpx; text-align: center; }
.settings-chip {
  padding: 12rpx 24rpx;
  background: #FDF8F3;
  border-radius: 24rpx;
  border: 1px solid rgba(174, 157, 146, 0.25);
}
.settings-chip-active {
  background: rgba(232, 133, 90, 0.12);
  border-color: #E8855A;
}
.settings-chip-text { font-size: 24rpx; color: #4A3628; }
.theme-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid transparent;
}
.theme-dot-paper { background: #FDF8F3; border-color: rgba(174,157,146,0.3); }
.theme-dot-sepia { background: #F5ECD8; }
.theme-dot-dark { background: #1A1815; }
.theme-dot-active { border-color: #E8855A; border-width: 3rpx; }

/* ===== 骨架屏 ===== */
.novel-skeleton {
  padding: 0 0 32rpx;
}
.sk-cover {
  width: 100%;
  height: 360rpx;
  border-radius: 24rpx;
  background: #EFE7DF;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
}
.sk-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%);
  transform: translateX(-100%);
  animation: sk-shimmer 1.4s infinite;
}
.sk-progress-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 28rpx;
  border: 1rpx solid #F0EAE4;
}
.sk-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.sk-chapter-card {
  display: flex;
  gap: 20rpx;
  background: #FFFFFF;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  border: 1rpx solid #F0EAE4;
}
.sk-chapter-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
@keyframes sk-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
