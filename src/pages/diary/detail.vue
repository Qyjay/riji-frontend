<template>
  <view class="page">
    <!-- ── 自定义顶栏 ── -->
    <view class="detail-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <view class="nav-left" @click="goBack">
          <text class="nav-back">←</text>
        </view>
        <text class="nav-title">{{ navTitle }}</text>
        <view class="nav-right" @click="showMoreMenu">
          <text class="nav-more">···</text>
        </view>
      </view>
    </view>

    <!-- ── 主内容 ── -->
    <scroll-view class="detail-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 日记内容 -->
      <template v-else-if="diary">
        <!-- 情绪 + 时间 -->
        <view class="emotion-row">
          <text class="emotion-emoji">{{ diary.emotion.emoji }}</text>
          <text class="emotion-label">{{ diary.emotion.label }}</text>
          <text class="emotion-time">{{ formatDateTime(diary.createdAt) }}</text>
        </view>

        <!-- 照片轮播 -->
        <view v-if="diary.images && diary.images.length > 0" class="photo-swiper-wrap">
          <swiper
            class="photo-swiper"
            :indicator-dots="diary.images.length > 1"
            :autoplay="false"
            :current="currentSwiper"
            @change="onSwiperChange"
          >
            <swiper-item v-for="(img, i) in diary.images" :key="i">
              <image class="swiper-img" :src="img" mode="aspectFill" />
            </swiper-item>
          </swiper>
          <view v-if="diary.images.length > 1" class="swiper-indicators">
            <text class="swiper-indicator-text">{{ currentSwiper + 1 }} / {{ diary.images.length }}</text>
          </view>
        </view>

        <!-- 编辑按钮 -->
        <view v-if="canEdit && !isEditing" class="edit-hint-row">
          <view class="edit-hint-btn press-feedback" @click="startEdit">
            <DoodleIcon name="pen" color="#E8855A" :size="28" />
            <text class="edit-hint-text">编辑（剩余 {{ remainingEdits }} 次）</text>
          </view>
        </view>

        <!-- 正文（只读/编辑） -->
        <view class="content-section">
          <text v-if="!isEditing" class="diary-content">{{ diary.content }}</text>
          <view v-else class="edit-section">
            <textarea
              v-model="editContent"
              class="edit-textarea"
              :auto-height="true"
              maxlength="-1"
            />
            <view class="edit-actions">
              <view class="edit-cancel press-feedback" @click="cancelEdit">
                <text class="edit-cancel-text">取消</text>
              </view>
              <view class="edit-save press-feedback" :class="{ saving: editSaving }" @click="saveEdit">
                <text class="edit-save-text">{{ editSaving ? '保存中...' : '保存修改' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 位置+天气 -->
        <view v-if="diary.location || diary.weather" class="meta-row">
          <text class="meta-text">📍 {{ diary.location }}  {{ diary.weather }}</text>
        </view>

        <!-- 标签 -->
        <view v-if="diary.tags && diary.tags.length > 0" class="tags-row">
          <view v-for="tag in diary.tags" :key="tag" class="tag-chip">
            <text class="tag-text">#{{ tag }}</text>
          </view>
        </view>

        <!-- ── 情绪趋势 ── -->
        <view v-if="emotionTrend.length > 0" class="emotion-trend-section">
          <view class="section-header">
            <view class="header-line" />
            <text class="header-label">情绪趋势</text>
            <view class="header-line" />
          </view>
          <view class="emotion-trend-card">
            <view class="emotion-chart">
              <view v-for="(point, i) in emotionTrend" :key="i" class="chart-col">
                <view class="chart-bar-wrap">
                  <view class="chart-bar" :style="{ height: (point.score * 80) + 'rpx' }" />
                </view>
                <text class="chart-time">{{ point.hour }}时</text>
                <text class="chart-emoji-icon">{{ getEmotionEmoji(point.label) }}</text>
              </view>
            </view>
            <text class="dominant-info">主要情绪：{{ diary.emotionSummary?.dominant ?? '开心' }}</text>
          </view>
        </view>

        <!-- ── AI 评论 ── -->
        <view class="ai-comment-section">
          <view class="section-header">
            <view class="header-line" />
            <text class="header-label">AI 评论</text>
            <view class="header-line" />
          </view>
          <view class="ai-comment-card">
            <DoodleIcon name="robot" :size="56" color="#E8855A" class="ai-avatar-icon" />
            <view class="ai-comment-body">
              <text class="ai-label">AI 说：</text>
              <text class="ai-comment-text">"{{ aiComment }}"</text>
            </view>
          </view>
        </view>

        <!-- ── 创作工具 ── -->
        <view class="tools-section">
          <view class="section-header">
            <view class="header-line" />
            <text class="header-label">创作工具</text>
            <view class="header-line" />
          </view>
          <view class="tools-grid">
            <view class="tool-item" @click="handleTool('comic')">
              <DoodleIcon name="palette" :size="48" color="#E8855A" class="tool-icon" />
              <text class="tool-label">生成</text>
              <text class="tool-name">漫画</text>
            </view>
            <view class="tool-item" @click="handleTool('novel')">
              <DoodleIcon name="pen" :size="48" color="#6B8EC4" class="tool-icon" />
              <text class="tool-label">生成</text>
              <text class="tool-name">小说</text>
            </view>
            <view class="tool-item" @click="handleTool('share')">
              <DoodleIcon name="share" :size="48" color="#5BBF8E" class="tool-icon" />
              <text class="tool-label">分享</text>
              <text class="tool-name">卡片</text>
            </view>
            <view class="tool-item" @click="handleTool('style')">
              <DoodleIcon name="wand" :size="48" color="#C8A86B" class="tool-icon" />
              <text class="tool-label">切换</text>
              <text class="tool-name">文风</text>
            </view>
            <view class="tool-item" @click="handleTool('tts')">
              <DoodleIcon name="music" :size="48" color="#AE9D92" class="tool-icon" />
              <text class="tool-label">有声</text>
              <text class="tool-name">朗读</text>
            </view>
            <view class="tool-item" @click="handleTool('capsule')">
              <DoodleIcon name="calendar" :size="48" color="#D4645C" class="tool-icon" />
              <text class="tool-label">时光</text>
              <text class="tool-name">胶囊</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 加载失败 -->
      <view v-else class="error-state">
        <text class="error-text">日记不存在</text>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDiaryDetail, updateDiary, generateDerivative, getEmotionTrend } from '@/services/api/diary'
import type { Diary } from '@/services/api/diary'
import DoodleIcon from '@/components/DoodleIcon.vue'

const diary = ref<Diary | null>(null)
const loading = ref(true)
const currentSwiper = ref(0)
const statusBarHeight = ref(20)
const scrollHeight = ref(600)

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const editSaving = ref(false)

// 情绪趋势
const emotionTrend = ref<Array<{ hour: number; label: string; score: number }>>([])

const aiComments = [
  '又去吃酸菜鱼了！这已经是本周第3次了哦😄 要不要试试二食堂新出的麻辣烫？',
  '最近学习强度有点大，记得适当休息～你的情绪曲线最近比较稳定，很好！',
  '这篇日记洋溢着幸福感，能量值满满！继续保持 ✨',
  '社交活动记录得越来越多了呢，人际关系指数稳步上升 🌱',
  '这篇文字好有画面感！配上BGM一定很棒，要不要试试生成一个？',
  '雅思倒计时43天，时间紧迫但也要注意休息哦 💪 加油！',
]

const aiComment = computed(() => {
  if (!diary.value) return ''
  const idx = Math.abs(Number(diary.value.id)) % aiComments.length
  return aiComments[idx]
})

const navTitle = computed(() => {
  if (!diary.value) return ''
  const d = new Date(diary.value.createdAt)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${m}月${day}日 ${w}`
})

const canEdit = computed(() => {
  if (!diary.value) return false
  return diary.value.editCount < diary.value.maxEdits
})

const remainingEdits = computed(() => {
  if (!diary.value) return 0
  return diary.value.maxEdits - diary.value.editCount
})

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function getEmotionEmoji(label: string): string {
  const map: Record<string, string> = {
    '开心': '😊', '幸福': '🥰', '平静': '😌', '疲惫': '😴',
    '满足': '😎', '难过': '😢', '烦躁': '😤', '兴奋': '🤩',
  }
  return map[label] ?? '😊'
}

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  scrollHeight.value = info.windowHeight - statusBarHeight.value - 44

  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any)?.options ?? {}
  const id = options.id ?? '1'

  loading.value = true
  try {
    diary.value = await getDiaryDetail(id)
  } catch {
    loading.value = false
    uni.showToast({ title: '日记加载失败', icon: 'none' })
    return
  }

  // Load emotion trend
  if (diary.value) {
    try {
      const trend = await getEmotionTrend(diary.value.id)
      emotionTrend.value = trend.trend
    } catch {
      emotionTrend.value = diary.value.emotionSummary?.trend ?? []
    }
  }

  loading.value = false
})

function goBack() {
  uni.navigateBack()
}

function startEdit() {
  if (!diary.value || !canEdit.value) return
  editContent.value = diary.value.content
  isEditing.value = true
}

async function saveEdit() {
  if (!diary.value || editSaving.value) return
  editSaving.value = true
  try {
    const updated = await updateDiary(diary.value.id, editContent.value)
    diary.value = updated
    isEditing.value = false
    uni.showToast({ title: '修改成功 ✓', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    editSaving.value = false
  }
}

function cancelEdit() {
  isEditing.value = false
}

async function handleGenerateDerivative(type: 'comic' | 'novel' | 'share_card') {
  if (!diary.value) return
  uni.showLoading({ title: 'AI 生成中...', mask: true })
  try {
    await generateDerivative(diary.value.id, type)
    uni.hideLoading()
    const labels: Record<string, string> = { comic: '漫画', novel: '小说', share_card: '分享卡片' }
    uni.showToast({ title: `${labels[type]}生成成功 ✨`, icon: 'success' })
    if (type === 'comic') {
      uni.navigateTo({ url: `/pages/diary/comic?id=${diary.value.id}` })
    } else if (type === 'share_card') {
      uni.navigateTo({ url: `/pages/diary/share-card?id=${diary.value.id}` })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  }
}

function showMoreMenu() {
  if (!diary.value) return
  const items = canEdit.value ? [`编辑日记（剩余${remainingEdits.value}次）`, '删除日记', '标记重要'] : ['删除日记', '标记重要']
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (canEdit.value && res.tapIndex === 0) {
        startEdit()
      } else {
        uni.showToast({ title: '操作成功', icon: 'none' })
      }
    }
  })
}

function onSwiperChange(e: any) {
  currentSwiper.value = e.detail.current
}

function handleTool(type: string) {
  if (!diary.value) return
  const id = diary.value.id

  if (type === 'comic') {
    handleGenerateDerivative('comic')
  } else if (type === 'share') {
    handleGenerateDerivative('share_card')
  } else if (type === 'novel') {
    handleGenerateDerivative('novel')
  } else if (type === 'style') {
    const styles = ['简洁', '文艺', '搞笑', '中二', '武侠', '古风', '科幻', '电影']
    uni.showActionSheet({
      itemList: styles,
      success: (res) => {
        uni.showToast({ title: `已切换为 ${styles[res.tapIndex]} 风格`, icon: 'none' })
      }
    })
  } else if (type === 'tts') {
    uni.showToast({ title: '有声朗读功能开发中', icon: 'none' })
  } else if (type === 'bgm') {
    uni.showToast({ title: 'BGM 生成功能开发中', icon: 'none' })
  } else if (type === 'capsule') {
    uni.showToast({ title: '时光胶囊功能开发中', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

/* ── 自定义顶栏 ── */
.detail-navbar {
  background: #FDF8F3;
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-left,
.nav-right {
  width: 120rpx;
  display: flex;
  align-items: center;
}

.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }

.nav-back {
  font-size: 44rpx;
  color: #2C1F14;
  line-height: 1;
  cursor: pointer;
  &:active { opacity: 0.6; }
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
  text-align: center;
}

.nav-more {
  font-size: 44rpx;
  color: #2C1F14;
  letter-spacing: -4rpx;
  cursor: pointer;
  &:active { opacity: 0.6; }
}

/* ── 滚动区 ── */
.detail-scroll {
  -webkit-overflow-scrolling: touch;
}

/* ── 情绪+时间 ── */
.emotion-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 24rpx 0;
}

.emotion-emoji {
  font-size: 40rpx;
}

.emotion-label {
  font-size: 30rpx;
  color: #4A3628;
  font-weight: 500;
}

.emotion-time {
  font-size: 28rpx;
  color: #AE9D92;
  margin-left: auto;
}

/* ── 照片轮播 ── */
.photo-swiper-wrap {
  margin: 16rpx 24rpx 0;
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
}

.photo-swiper {
  width: 100%;
  height: 400rpx;
}

.swiper-img {
  width: 100%;
  height: 100%;
  display: block;
}

.swiper-indicators {
  position: absolute;
  bottom: 16rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
}

.swiper-indicator-text {
  font-size: 24rpx;
  color: #FFFFFF;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 19998rpx;
  padding: 4rpx 16rpx;
}

/* ── 编辑提示 ── */
.edit-hint-row {
  padding: 12rpx 24rpx 0;
  display: flex;
  justify-content: flex-end;
}

.edit-hint-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(232, 133, 90, 0.08);
  border-radius: 16rpx;
  padding: 10rpx 20rpx;
  &:active { opacity: 0.7; }
}

.edit-hint-text {
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 500;
}

/* 编辑区 */
.edit-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.edit-textarea {
  width: 100%;
  min-height: 300rpx;
  font-size: 32rpx;
  color: #4A3628;
  line-height: 1.8;
  border: 2rpx solid #E8855A;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
  background: #FFFDF9;
}

.edit-actions {
  display: flex;
  gap: 12rpx;
  justify-content: flex-end;
}

.edit-cancel {
  padding: 14rpx 28rpx;
  background: #F5F0EB;
  border-radius: 16rpx;
  &:active { opacity: 0.8; }
}

.edit-cancel-text {
  font-size: 28rpx;
  color: #4A3628;
}

.edit-save {
  padding: 14rpx 28rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 16rpx;
  &:active { opacity: 0.85; }

  &.saving {
    background: #D4C4B8;
  }
}

.edit-save-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* ── 情绪趋势 ── */
.emotion-trend-section {
  padding: 24rpx 24rpx 0;
}

.emotion-trend-card {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 20rpx;
}

.emotion-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.chart-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.chart-bar-wrap {
  height: 80rpx;
  display: flex;
  align-items: flex-end;
  width: 32rpx;
}

.chart-bar {
  width: 100%;
  background: linear-gradient(to top, #E8855A, #F2B49B);
  border-radius: 4rpx 4rpx 0 0;
  min-height: 8rpx;
}

.chart-time {
  font-size: 18rpx;
  color: #AE9D92;
  white-space: nowrap;
}

.chart-emoji-icon {
  font-size: 24rpx;
}

.dominant-info {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

/* ── 正文 ── */
.content-section {
  padding: 20rpx 24rpx 0;
}

.diary-content {
  font-size: 32rpx;
  color: #4A3628;
  line-height: 1.8;
  display: block;
}

/* ── 位置天气 ── */
.meta-row {
  padding: 12rpx 24rpx 0;
}

.meta-text {
  font-size: 26rpx;
  color: #AE9D92;
}

/* ── 标签 ── */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 12rpx 24rpx 0;
}

.tag-chip {
  background: #FDF0E8;
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #E8855A;
}

/* ── AI 评论 ── */
.ai-comment-section {
  padding: 24rpx 24rpx 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.header-line {
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

.header-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

.ai-comment-card {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  gap: 12rpx;
}

.ai-avatar-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.ai-comment-body {
  flex: 1;
}

.ai-label {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 600;
  display: block;
  margin-bottom: 4rpx;
}

.ai-comment-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.7;
  display: block;
}

/* ── 创作工具 ── */
.tools-section {
  padding: 24rpx 24rpx 0;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.tool-item {
  background: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  cursor: pointer;
  transition: transform 0.15s;
  &:active { transform: scale(0.96); }
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-label {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

.tool-name {
  font-size: 24rpx;
  color: #AE9D92;
}

/* ── 加载/错误 ── */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #AE9D92;
}

.error-text {
  font-size: 28rpx;
  color: #AE9D92;
}

/* ── 底部留白 ── */
.bottom-spacer {
  height: 40rpx;
}
</style>
