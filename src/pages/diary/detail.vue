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

        <!-- 编辑按钮 -->
        <view v-if="canEdit && !isEditing" class="edit-hint-row">
          <view class="edit-hint-btn press-feedback" @click="startEdit">
            <DoodleIcon name="pen" color="#E8855A" :size="28" />
            <text class="edit-hint-text">编辑（剩余 {{ remainingEdits }} 次）</text>
          </view>
        </view>

        <!-- ── 图文混排正文 ── -->
        <view v-if="!isEditing" class="content-section" :style="{ fontFamily: currentFontFamily }">
          <template v-for="(block, bi) in contentBlocks" :key="bi">
            <text v-if="block.type === 'text'" class="diary-content">{{ block.text }}</text>
            <view v-else-if="block.type === 'image'" class="inline-photo-wrap">
              <image class="inline-photo" :src="block.src" mode="widthFix" />
            </view>
          </template>
        </view>

        <!-- 编辑模式 -->
        <view v-else class="content-section">
          <view class="edit-section">
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
            <view class="trend-meta-row">
              <text class="trend-meta">分钟级趋势，越高代表心情越好</text>
              <text class="trend-range">-10 ~ 10</text>
            </view>
            <scroll-view class="trend-scroll" scroll-x>
              <view class="line-chart-canvas" :style="{ width: chartCanvasWidth + 'rpx' }">
                <view v-if="trendWeatherSummary.length > 0" class="trend-weather-summary">
                  <view
                    v-for="item in trendWeatherSummary"
                    :key="item.key"
                    class="trend-weather-chip"
                  >
                    <text class="trend-weather-icon">{{ weatherIcon(item.weatherText) }}</text>
                    <text class="trend-weather-text">{{ item.weatherText }}</text>
                  </view>
                </view>
                <view class="y-grid y-grid-top"><text class="y-label">+10</text></view>
                <view class="y-grid y-grid-mid"><text class="y-label">0</text></view>
                <view class="y-grid y-grid-bottom"><text class="y-label">-10</text></view>

                <view
                  v-for="(_, i) in emotionTrendSegments"
                  :key="`segment-${i}`"
                  class="trend-segment"
                  :style="trendSegmentStyle(i)"
                />
                <view
                  v-for="(point, i) in emotionTrend"
                  :key="`${point.time ?? point.hour}-${i}`"
                  class="trend-point-wrap"
                  :style="trendPointStyle(i, point.score)"
                >
                  <text class="trend-point-emoji">{{ getEmotionEmoji(point.label) }}</text>
                  <view class="trend-dot" :style="{ background: getEmotionColor(point.label) }" />
                </view>

                <view
                  v-for="(point, i) in emotionTrend"
                  :key="`label-${point.time ?? point.hour}-${i}`"
                  class="trend-x-label"
                  :style="{ left: trendPointX(i) + 'rpx' }"
                >
                  <text class="trend-time">{{ formatTrendTime(point) }}</text>
                  <text class="trend-label">{{ point.label }} {{ formatTrendScore(point.score) }}</text>
                </view>
              </view>
            </scroll-view>
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
              <text class="ai-comment-text">
                {{ aiComment || (aiCommentLoading ? 'AI 正在读这篇日记...' : '这篇日记还没有 AI 点评。') }}
              </text>
              <view v-if="!aiComment && !aiCommentLoading" class="ai-comment-action" @click="generateAiCommentStream">
                <text class="ai-comment-action-text">生成 AI 点评</text>
              </view>
              <view v-else-if="aiCommentLoading" class="ai-comment-action disabled">
                <text class="ai-comment-action-text">生成中...</text>
              </view>
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
            <view class="tool-item" @click="handleTool('share')">
              <DoodleIcon name="share" :size="48" color="#5BBF8E" class="tool-icon" />
              <text class="tool-label">分享</text>
              <text class="tool-name">卡片</text>
            </view>
            <view class="tool-item" @click="handleTool('comic')">
              <DoodleIcon name="palette" :size="48" color="#E8855A" class="tool-icon" />
              <text class="tool-label">生成</text>
              <text class="tool-name">漫画</text>
            </view>
          </view>
        </view>

        <!-- ── 历史创作 ── -->
        <view v-if="hasHistoryCreation" class="creation-history-section">
          <view class="section-header">
            <view class="header-line" />
            <text class="header-label">历史创作</text>
            <view class="header-line" />
          </view>
          <view class="creation-list">
            <view v-if="comicTask" class="creation-card creation-card--pending">
              <view class="creation-pending-thumb">
                <DoodleIcon name="palette" :size="52" color="#E8855A" />
              </view>
              <view class="creation-card-body">
                <text class="creation-title">漫画生成中...</text>
                <text class="creation-desc">AI 正在把这篇日记画成漫画，完成后会自动出现在这里</text>
              </view>
            </view>
            <view
              v-for="item in comicHistory"
              :key="item.id"
              class="creation-card"
              @click="previewComic(item)"
            >
              <image class="creation-thumb" :src="toFullUrl(item.mediaUrl)" mode="aspectFill" />
              <view class="creation-card-body">
                <text class="creation-title">日记漫画</text>
                <text class="creation-desc">{{ formatCreationTime(item.createdAt) }}</text>
              </view>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  getDerivativeTask,
  getDerivatives,
  getDiaryDetail,
  getEmotionTrend,
  generateDerivative,
  startDerivativeTask,
  streamDiaryAiComment,
  updateDiary,
} from '@/services/api/diary'
import type { Diary, DiaryDerivative, DiaryDerivativeTask, EmotionTrendPoint, WeatherPeriod } from '@/services/api/diary'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { useSettingsStore } from '@/stores/settings'
import { decodeQueryParam, withQuery } from '@/utils/query'
import { resolveMediaUrl } from '@/utils/avatar'
import { isFallbackComicUrl } from '@/utils/comic'

const diary = ref<Diary | null>(null)
const loading = ref(true)
const aiCommentLoading = ref(false)
const statusBarHeight = ref(20)
const scrollHeight = ref(600)

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const editSaving = ref(false)
const derivativeHistory = ref<DiaryDerivative[]>([])
const comicTask = ref<DiaryDerivativeTask | null>(null)
let comicTaskTimer: ReturnType<typeof setInterval> | null = null
const COMIC_TASK_STORAGE_KEY = 'avalin_comic_derivative_tasks_v1'

// 情绪趋势
const emotionTrend = ref<EmotionTrendPoint[]>([])
const trendWeatherPeriods = ref<WeatherPeriod[]>([])
const CHART_TOP_PADDING = 96
const CHART_HEIGHT = 180
const CHART_STEP = 92
const CHART_MIN_WIDTH = 560

const chartCanvasWidth = computed(() => {
  return Math.max(CHART_MIN_WIDTH, (emotionTrend.value.length - 1) * CHART_STEP + 96)
})

const emotionTrendSegments = computed(() => {
  return emotionTrend.value.slice(0, Math.max(0, emotionTrend.value.length - 1))
})

const trendWeatherSummary = computed(() => {
  const labelMap: Record<WeatherPeriod['key'], string> = {
    morning: '上午',
    afternoon: '中午',
    evening: '下午',
  }
  const order: WeatherPeriod['key'][] = ['morning', 'afternoon', 'evening']
  return order
    .map(key => {
      const matched = trendWeatherPeriods.value.find(item => item.key === key)
      return matched
        ? { ...matched, label: labelMap[key], weatherText: String(matched.weatherText || '').trim() }
        : null
    })
    .filter((item): item is WeatherPeriod => !!item && !!item.weatherText)
})

const comicHistory = computed(() => {
  return derivativeHistory.value.filter(item => (
    item.type === 'comic'
    && item.mediaUrl
    && !isFallbackComicUrl(item.mediaUrl)
  ))
})

const hasHistoryCreation = computed(() => {
  return !!comicTask.value || comicHistory.value.length > 0
})

// 字体 — 从设置 store 读取
const settingsStore = useSettingsStore()

const fontFamilyMap: Record<string, string> = {
  handwrite: "'ZCOOL KuaiLe', 'STXingkai', 'KaiTi', sans-serif",
  zhaizaijia: "'ZhaiZaiJia', 'PingFang SC', sans-serif",
  nailao: "'XiaoKeNaiLao', 'PingFang SC', sans-serif",
  songti: "'Noto Serif SC', 'STSong', 'SimSun', serif",
  kaiti: "'STKaiti', 'KaiTi', 'AR PL UKai CN', serif",
  default: "'PingFang SC', 'Helvetica Neue', sans-serif",
}

const currentFontFamily = computed(() => {
  return fontFamilyMap[settingsStore.diaryFont] ?? fontFamilyMap.handwrite
})

// 图文混排：将 content 按段落分割，在段落间插入图片
interface ContentBlock {
  type: 'text' | 'image'
  text?: string
  src?: string
}

function toFullUrl(path: string): string {
  return resolveMediaUrl(path)
}

function readComicTasks(): Record<string, DiaryDerivativeTask> {
  try {
    const raw = uni.getStorageSync(COMIC_TASK_STORAGE_KEY)
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeComicTasks(tasks: Record<string, DiaryDerivativeTask>) {
  uni.setStorageSync(COMIC_TASK_STORAGE_KEY, JSON.stringify(tasks))
}

function saveComicTask(task: DiaryDerivativeTask) {
  const tasks = readComicTasks()
  tasks[task.diaryId] = task
  writeComicTasks(tasks)
}

function clearComicTask(diaryId: string) {
  const tasks = readComicTasks()
  delete tasks[diaryId]
  writeComicTasks(tasks)
}

function restoreComicTask(diaryId: string) {
  const task = readComicTasks()[diaryId]
  if (task && task.status === 'running') {
    comicTask.value = task
    startComicTaskPolling()
  }
}

const contentBlocks = computed<ContentBlock[]>(() => {
  if (!diary.value) return []
  const content = diary.value.content || ''
  const images = diary.value.images || []

  if (images.length === 0) {
    return [{ type: 'text', text: content }]
  }

  // 按段落分割文本
  const paragraphs = content.split(/\n\n|\n/).filter(p => p.trim())
  const blocks: ContentBlock[] = []

  if (paragraphs.length === 0) {
    // 没有文字，只展示图片
    images.forEach(src => blocks.push({ type: 'image', src: toFullUrl(src) }))
    return blocks
  }

  // 将图片均匀穿插在段落间
  const imgInterval = Math.max(1, Math.ceil(paragraphs.length / (images.length + 1)))
  let imgIdx = 0

  for (let i = 0; i < paragraphs.length; i++) {
    blocks.push({ type: 'text', text: paragraphs[i] })

    // 每隔 imgInterval 段插入一张图
    if (imgIdx < images.length && (i + 1) % imgInterval === 0) {
      blocks.push({ type: 'image', src: toFullUrl(images[imgIdx]) })
      imgIdx++
    }
  }

  // 剩余图片追加到末尾
  while (imgIdx < images.length) {
    blocks.push({ type: 'image', src: toFullUrl(images[imgIdx]) })
    imgIdx++
  }

  return blocks
})

const aiComment = computed(() => {
  return (diary.value?.aiComment ?? '').trim()
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

function formatCreationTime(ts: number): string {
  const d = new Date(ts)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${h}:${min}`
}

async function loadDerivativeHistory(diaryId: string) {
  try {
    derivativeHistory.value = await getDerivatives(diaryId)
  } catch {
    derivativeHistory.value = []
  }
}

function stopComicTaskPolling() {
  if (!comicTaskTimer) return
  clearInterval(comicTaskTimer)
  comicTaskTimer = null
}

async function refreshComicTask() {
  if (!comicTask.value || !diary.value) return
  try {
    const latest = await getDerivativeTask(comicTask.value.taskId)
    comicTask.value = latest.status === 'running' ? latest : null
    if (latest.status === 'done') {
      clearComicTask(latest.diaryId)
      stopComicTaskPolling()
      await loadDerivativeHistory(latest.diaryId)
      const created = derivativeHistory.value.find(item => item.id === latest.derivativeId)
      if (!created?.mediaUrl || isFallbackComicUrl(created.mediaUrl)) {
        uni.showToast({ title: '漫画没有画出来，请稍后重试', icon: 'none' })
      } else {
        uni.showToast({ title: '漫画生成完成', icon: 'success' })
      }
    } else if (latest.status === 'failed') {
      clearComicTask(latest.diaryId)
      stopComicTaskPolling()
      uni.showToast({ title: latest.error || '漫画生成失败', icon: 'none' })
    } else {
      saveComicTask(latest)
    }
  } catch {
    // 任务查询偶发失败时保留生成中卡片，下次轮询继续尝试。
  }
}

function startComicTaskPolling() {
  if (comicTaskTimer) return
  comicTaskTimer = setInterval(() => {
    void refreshComicTask()
  }, 3000)
  void refreshComicTask()
}

async function startComicGenerationTask() {
  if (!diary.value || comicTask.value) return
  try {
    const task = await startDerivativeTask(diary.value.id, 'comic')
    comicTask.value = task
    saveComicTask(task)
    startComicTaskPolling()
    uni.showToast({ title: '漫画已开始生成', icon: 'none' })
  } catch {
    uni.showToast({ title: '漫画任务创建失败', icon: 'none' })
  }
}

function previewComic(item: DiaryDerivative) {
  const url = toFullUrl(item.mediaUrl)
  if (!url) return
  uni.previewImage({
    urls: comicHistory.value.map(derivative => toFullUrl(derivative.mediaUrl)).filter(Boolean),
    current: url,
  })
}

function getEmotionEmoji(label: string): string {
  const map: Record<string, string> = {
    '开心': '😊', '幸福': '🥰', '平静': '😌', '疲惫': '😴',
    '满足': '😎', '难过': '😢', '烦躁': '😤', '兴奋': '🤩',
    '焦虑': '😰', '专注': '🧐', '沮丧': '😞', '温暖': '🥰',
    '愤怒': '😠', '感动': '🥹', '期待': '🤩', '无聊': '😑',
  }
  return map[label] ?? '😊'
}

function getEmotionColor(label: string): string {
  const map: Record<string, string> = {
    '开心': '#E8855A', '幸福': '#E8855A', '期待': '#C8A86B',
    '感动': '#E9A15F', '平静': '#6B8EC4', '无聊': '#AE9D92',
    '焦虑': '#D79A52', '难过': '#6B8EC4', '愤怒': '#D4645C',
  }
  return map[label] ?? '#E8855A'
}

function normalizeTrendScore(score: number, label: string): number {
  const value = Number(score) || 0
  if (value >= -10 && value <= 10 && (value < 0 || value > 1 || Number.isInteger(value))) {
    return Math.max(-10, Math.min(10, Math.round(value)))
  }
  const intensity = value > 1 && value <= 100 ? value / 100 : value
  const base: Record<string, number> = {
    '开心': 8, '幸福': 8, '期待': 6, '感动': 6, '平静': 0,
    '无聊': -2, '焦虑': -5, '愤怒': -6, '难过': -7, '沮丧': -7, '疲惫': -3,
  }
  return Math.max(-10, Math.min(10, Math.round((base[label] ?? 0) * intensity)))
}

function normalizeTrendPoint(point: EmotionTrendPoint): EmotionTrendPoint {
  return {
    ...point,
    minute: point.minute ?? 0,
    time: point.time ?? `${String(point.hour).padStart(2, '0')}:00`,
    score: normalizeTrendScore(point.score, point.label),
  }
}

function trendPointX(index: number): number {
  return 48 + index * CHART_STEP
}

function trendPointY(score: number): number {
  const clamped = Math.max(-10, Math.min(10, Number(score) || 0))
  return CHART_TOP_PADDING + Math.round(((10 - clamped) / 20) * CHART_HEIGHT)
}

function trendPointStyle(index: number, score: number) {
  return {
    left: `${trendPointX(index)}rpx`,
    top: `${trendPointY(score)}rpx`,
  }
}

function trendSegmentStyle(index: number) {
  const current = emotionTrend.value[index]
  const next = emotionTrend.value[index + 1]
  const y1 = trendPointY(current.score)
  const y2 = trendPointY(next.score)
  const dy = y2 - y1
  const length = Math.round(Math.sqrt(CHART_STEP ** 2 + dy ** 2))
  const angle = Math.atan2(dy, CHART_STEP) * 180 / Math.PI
  return {
    left: `${trendPointX(index)}rpx`,
    top: `${y1}rpx`,
    width: `${length}rpx`,
    transform: `rotate(${angle}deg)`,
    background: getEmotionColor(next.label),
  }
}

function formatTrendTime(point: EmotionTrendPoint): string {
  if (point.time) return point.time
  return `${String(point.hour).padStart(2, '0')}:${String(point.minute ?? 0).padStart(2, '0')}`
}

function formatTrendScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`
}

function weatherIcon(weatherText: string): string {
  const text = String(weatherText || '')
  if (/雷|电/.test(text)) return '⛈️'
  if (/雨|阵雨|暴雨|小雨|中雨|大雨/.test(text)) return '🌧️'
  if (/雪|冰雹/.test(text)) return '❄️'
  if (/阴/.test(text)) return '☁️'
  if (/云/.test(text)) return '🌤️'
  if (/雾|霾|沙|尘/.test(text)) return '🌫️'
  if (/晴/.test(text)) return '☀️'
  return '🌡️'
}

async function generateAiCommentStream() {
  if (!diary.value || aiComment.value || aiCommentLoading.value) return

  aiCommentLoading.value = true
  diary.value = {
    ...diary.value,
    aiComment: '',
  }
  try {
    await streamDiaryAiComment(diary.value.id, {
      onChunk(text) {
        if (!diary.value) return
        diary.value = {
          ...diary.value,
          aiComment: `${diary.value.aiComment || ''}${text}`,
        }
      },
      onDone(aiComment) {
        if (!diary.value) return
        diary.value = {
          ...diary.value,
          aiComment,
        }
      },
    })
  } catch {
    uni.showToast({ title: 'AI 点评生成失败', icon: 'none' })
  } finally {
    aiCommentLoading.value = false
  }
}

onLoad((options) => {
  const id = decodeQueryParam(options?.id)
  if (!id) {
    loading.value = false
    return
  }
  void loadDiary(id)
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  scrollHeight.value = info.windowHeight - statusBarHeight.value - 44
})

async function loadDiary(id: string) {
  loading.value = true
  try {
    diary.value = await getDiaryDetail(id)
  } catch {
    diary.value = null
    loading.value = false
    uni.showToast({ title: '日记加载失败', icon: 'none' })
    return
  }

  if (diary.value) {
    await loadDerivativeHistory(diary.value.id)
    restoreComicTask(diary.value.id)
    try {
      const trend = await getEmotionTrend(diary.value.id)
      emotionTrend.value = trend.trend.map(normalizeTrendPoint)
      trendWeatherPeriods.value = trend.weatherPeriods || diary.value.emotionSummary?.weatherPeriods || []
    } catch {
      emotionTrend.value = (diary.value.emotionSummary?.trend ?? []).map(normalizeTrendPoint)
      trendWeatherPeriods.value = diary.value.emotionSummary?.weatherPeriods || []
    }
  }

  loading.value = false
}

onUnmounted(() => {
  stopComicTaskPolling()
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
    const derivative = await generateDerivative(diary.value.id, type)
    uni.hideLoading()
    const labels: Record<string, string> = { comic: '漫画', novel: '小说', share_card: '分享卡片' }
    if (type === 'comic' && isFallbackComicUrl(derivative.mediaUrl)) {
      uni.showToast({ title: '漫画没有画出来，请稍后重试', icon: 'none' })
      return
    }
    uni.showToast({ title: `${labels[type]}生成成功 ✨`, icon: 'success' })
    if (type === 'comic') {
      uni.navigateTo({ url: withQuery('/pages/diary/comic', { id: diary.value.id, derivativeId: derivative.id }) })
      return
    }
    if (type === 'novel') {
      uni.navigateTo({ url: withQuery('/pages/novel/reader', { diaryId: diary.value.id, derivativeId: derivative.id }) })
      return
    }
    if (type === 'share_card') {
      uni.navigateTo({ url: withQuery('/pages/diary/share-card', { id: diary.value.id }) })
      return
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

function handleTool(type: string) {
  if (!diary.value) return

  if (type === 'share') {
    handleGenerateDerivative('share_card')
  } else if (type === 'comic') {
    startComicGenerationTask()
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
  padding: 20rpx 32rpx 0;
}

.emotion-emoji { font-size: 40rpx; }
.emotion-label { font-size: 30rpx; color: #4A3628; font-weight: 500; }
.emotion-time { font-size: 28rpx; color: #AE9D92; margin-left: auto; }

/* ── 编辑提示 ── */
.edit-hint-row {
  padding: 12rpx 32rpx 0;
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

/* ── 图文混排正文 ── */
.content-section {
  padding: 20rpx 32rpx 0;
}

.diary-content {
  font-size: 32rpx;
  color: #4A3628;
  line-height: 2;
  display: block;
  margin-bottom: 16rpx;
}

.inline-photo-wrap {
  margin: 16rpx 0;
  border-radius: 16rpx 20rpx 14rpx 18rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.inline-photo {
  width: 100%;
  display: block;
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

.edit-cancel-text { font-size: 28rpx; color: #4A3628; }

.edit-save {
  padding: 14rpx 28rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 16rpx;
  &:active { opacity: 0.85; }
  &.saving { background: #D4C4B8; }
}

.edit-save-text { font-size: 28rpx; color: #FFFFFF; font-weight: 600; }

/* ── 位置天气 ── */
.meta-row { padding: 12rpx 32rpx 0; }
.meta-text { font-size: 26rpx; color: #AE9D92; }

/* ── 标签 ── */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 12rpx 32rpx 0;
}

.tag-chip {
  background: #FDF0E8;
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
}

.tag-text { font-size: 24rpx; color: #E8855A; }

/* ── 情绪趋势 ── */
.emotion-trend-section {
  padding: 24rpx 32rpx 0;
}

.emotion-trend-card {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 20rpx 20rpx 18rpx;
}

.trend-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.trend-meta {
  font-size: 24rpx;
  color: #7A6656;
}

.trend-range {
  font-size: 22rpx;
  color: #E8855A;
  font-weight: 700;
  background: rgba(232, 133, 90, 0.1);
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
}

.trend-scroll {
  width: 100%;
  padding: 6rpx 0 4rpx;
}

.line-chart-canvas {
  position: relative;
  height: 374rpx;
  padding-top: 0;
}

.y-grid {
  position: absolute;
  left: 0;
  right: 0;
  height: 1rpx;
  background: rgba(174, 157, 146, 0.35);
}

.y-grid-top { top: 96rpx; }
.y-grid-mid {
  top: 186rpx;
  background: repeating-linear-gradient(
    to right,
    rgba(232, 133, 90, 0.5) 0,
    rgba(232, 133, 90, 0.5) 10rpx,
    transparent 10rpx,
    transparent 18rpx
  );
}
.y-grid-bottom { top: 276rpx; }

.y-label {
  position: absolute;
  left: 0;
  top: -14rpx;
  font-size: 20rpx;
  color: #AE9D92;
}

.trend-segment {
  position: absolute;
  height: 4rpx;
  border-radius: 999rpx;
  transform-origin: left center;
  opacity: 0.86;
}

.trend-point-wrap {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  z-index: 2;
}

.trend-weather-summary {
  position: absolute;
  left: 46rpx;
  right: 18rpx;
  top: 12rpx;
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 10rpx;
  z-index: 3;
}

.trend-weather-chip {
  min-width: 154rpx;
  padding: 8rpx 12rpx;
  border-radius: 14rpx;
  background: rgba(255, 253, 249, 0.94);
  border: 1rpx solid rgba(232, 133, 90, 0.14);
  box-shadow: 0 3rpx 8rpx rgba(74, 54, 40, 0.06);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
}

.trend-weather-icon {
  font-size: 22rpx;
  line-height: 1;
  flex-shrink: 0;
}

.trend-weather-text {
  font-size: 20rpx;
  color: #7A6656;
  line-height: 1.2;
  white-space: nowrap;
}

.trend-point-emoji {
  font-size: 24rpx;
  line-height: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(74, 54, 40, 0.12));
}

.trend-dot {
  width: 18rpx;
  height: 18rpx;
  border: 4rpx solid #FFFDF9;
  border-radius: 50%;
  box-shadow: 0 4rpx 10rpx rgba(74, 54, 40, 0.16);
}

.trend-x-label {
  position: absolute;
  top: 306rpx;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  width: 88rpx;
}

.trend-time {
  font-size: 20rpx;
  color: #7A6656;
  white-space: nowrap;
}

.trend-label {
  font-size: 18rpx;
  color: #AE9D92;
  white-space: nowrap;
}

.dominant-info { font-size: 26rpx; color: #4A3628; font-weight: 500; }

/* ── Section Header ── */
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
    to right, transparent 0, transparent 6rpx, #D4C4B8 6rpx, #D4C4B8 12rpx
  );
}

.header-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

/* ── AI 评论 ── */
.ai-comment-section { padding: 24rpx 32rpx 0; }

.ai-comment-card {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  gap: 12rpx;
}

.ai-avatar-icon { display: flex; align-items: center; flex-shrink: 0; }
.ai-comment-body { flex: 1; }
.ai-label { font-size: 26rpx; color: #4A3628; font-weight: 600; display: block; margin-bottom: 4rpx; }
.ai-comment-text { font-size: 28rpx; color: #4A3628; line-height: 1.7; display: block; }
.ai-comment-action {
  align-self: flex-start;
  margin-top: 14rpx;
  padding: 10rpx 20rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 999rpx;
}
.ai-comment-action:active { opacity: 0.82; }
.ai-comment-action.disabled { background: #D4C4B8; }
.ai-comment-action-text { color: #fff; font-size: 24rpx; font-weight: 600; }

/* ── 创作工具 ── */
.tools-section { padding: 24rpx 32rpx 0; }

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.tool-icon { display: flex; align-items: center; justify-content: center; }
.tool-label { font-size: 26rpx; color: #4A3628; font-weight: 500; }
.tool-name { font-size: 24rpx; color: #AE9D92; }

/* ── 历史创作 ── */
.creation-history-section {
  padding: 28rpx 32rpx 0;
}

.creation-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.creation-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 16rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 54, 40, 0.06);
  border: 1rpx solid rgba(232, 133, 90, 0.08);
  &:active { opacity: 0.86; }
}

.creation-card--pending {
  background: #FFF8F0;
  border-color: rgba(232, 133, 90, 0.18);
}

.creation-thumb,
.creation-pending-thumb {
  width: 132rpx;
  height: 132rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

.creation-thumb {
  background: #F6EDE4;
}

.creation-pending-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    -45deg,
    #FFF1E8 0,
    #FFF1E8 12rpx,
    #FFE5D3 12rpx,
    #FFE5D3 24rpx
  );
}

.creation-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.creation-title {
  font-size: 28rpx;
  color: #2C1F14;
  font-weight: 700;
}

.creation-desc {
  font-size: 23rpx;
  color: #8A7568;
  line-height: 1.45;
}

/* ── 加载/错误 ── */
.loading-state, .error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.loading-text, .error-text { font-size: 28rpx; color: #AE9D92; }

/* ── 底部留白 ── */
.bottom-spacer { height: 60rpx; }

/* ── 通用 ── */
.press-feedback { &:active { opacity: 0.75; } }
</style>
