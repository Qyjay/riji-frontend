<template>
  <view class="page">
    <CustomNavBar
      title="日记"
      left-icon="avatar"
      @left-click="drawerVisible = true"
      @right-click="onSearch"
    >
      <template #right>
        <view class="nav-search-btn" @click="onSearch">
          <DoodleIcon name="search" color="#8A7668" :size="40" />
        </view>
      </template>
    </CustomNavBar>

    <!-- 侧边栏 -->
    <SideDrawer v-model:visible="drawerVisible" />

    <!-- NavBar 占位（fixed 定位后需要此占位撑开空间） -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- 主内容滚动区 -->
    <scroll-view
      class="main-scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- ── 今日纪念日提醒 ── -->
      <view v-if="todayAnniversaries.length > 0" class="anniversary-card stagger-item press-feedback" @click="goAnniversary">
        <view class="ann-card-left">
          <text class="ann-card-icon">🎉</text>
          <view class="ann-card-info">
            <text class="ann-card-title">今日纪念日</text>
            <text class="ann-card-name">{{ todayAnniversaries[0].title }}</text>
          </view>
        </view>
        <text class="ann-card-arrow">›</text>
      </view>

      <!-- ── 那年今日 ── -->
      <view v-if="todayHistory.length > 0" class="memory-card stagger-item press-feedback" @click="goDetail(todayHistory[0].diary.id)">
        <view class="memory-header">
          <text class="memory-icon">📅</text>
          <text class="memory-title">{{ todayHistory[0].yearsAgo }}年前的今天</text>
        </view>
        <text class="memory-excerpt">"{{ todayHistory[0].diary.content ? todayHistory[0].diary.content.slice(0, 40) + '...' : '查看回忆' }}"</text>
      </view>

      <!-- ── 今日素材入口 + 时间线 ── -->
      <view class="today-section stagger-item">
        <!-- 头部：素材计数 + 添加按钮 -->
        <view class="today-header">
          <view class="today-header-left">
            <text class="today-icon">📝</text>
            <text class="today-count-text">
              今日已记录 {{ todaySummary ? todaySummary.material_count : 0 }} 条素材
            </text>
          </view>
          <view class="material-entry-btn press-feedback" @click="goWrite">
            <DoodleIcon name="plus" color="#E8855A" :size="28" />
            <text class="material-entry-add">添加</text>
          </view>
        </view>

        <!-- 素材时间线（有素材时显示） -->
        <view v-if="todaySummary && todaySummary.materials.length > 0" class="today-timeline">
          <view
            v-for="(mat, idx) in todaySummary.materials"
            :key="mat.id"
            class="timeline-entry"
          >
            <view class="tl-dot-col">
              <view class="tl-dot" />
              <view v-if="idx < todaySummary!.materials.length - 1" class="tl-line" />
            </view>
            <view class="tl-content">
              <text class="tl-time">{{ formatMatTime(mat.createdAt) }}</text>
              <text class="tl-type-icon">{{ matTypeIcon(mat.type) }}</text>
              <text class="tl-text" :class="{ 'tl-text-clamp': getTimelinePreview(mat).length > 20 }">{{ getTimelinePreview(mat) }}</text>
              <text v-if="mat.emotion" class="tl-emotion">{{ mat.emotion.emoji }}</text>
            </view>
          </view>
        </view>

        <!-- 生成日记按钮 -->
        <view
          v-if="todaySummary && todaySummary.material_count > 0 && !todaySummary.has_diary"
          class="generate-diary-btn press-feedback"
          :class="{ generating: generatingDiary }"
          @click="handleGenerateDiary"
        >
          <text class="gen-icon">✨</text>
          <text class="gen-text">{{ generatingDiary ? 'AI 生成中...' : '生成今日日记' }}</text>
        </view>

        <!-- 已有日记时显示查看和重写按钮 -->
        <view
          v-if="todaySummary && todaySummary.has_diary"
          class="diary-actions"
        >
          <view class="view-diary-btn press-feedback" @click="goDetail(todaySummary!.diary_id!)">
            <text class="view-diary-text">查看</text>
          </view>
          <view class="regenerate-btn press-feedback" :class="{ regenerating: regeneratingDiary }" @click="handleRegenerateDiary">
            <text class="regenerate-text">{{ regeneratingDiary ? '重写中...' : '重写日记 ✨' }}</text>
          </view>
        </view>
      </view>

      <!-- ── AI 早安/晚安卡片 ── -->
      <view v-if="greetingCardVisible" class="greeting-card stagger-item">
        <view class="greeting-inner" :class="isMorning ? 'greeting-morning' : 'greeting-night'">
          <view class="greeting-header">
            <DoodleIcon :name="isMorning ? 'sun' : 'moon'" :color="isMorning ? '#C8A86B' : '#9B72C8'" :size="22" />
            <text class="greeting-title">{{ greetingTitle }}</text>
            <view class="greeting-close press-feedback" @click="greetingCardVisible = false">
              <DoodleIcon name="cross" color="#AE9D92" :size="16" />
            </view>
          </view>

          <template v-if="isMorning">
            <text class="greeting-desc">{{ greetingDesc }}</text>
            <view class="greeting-todo press-feedback" @click="handleGreetingAction">
              <DoodleIcon name="list" color="#E8855A" :size="36" />
              <text class="todo-label">{{ greetingActionLabel }}</text>
              <text class="todo-arrow"> {{ greetingActionArrow }} </text>
            </view>
          </template>

          <template v-else>
            <text class="greeting-desc">{{ greetingDesc }}</text>
            <text class="greeting-night-tip">{{ greetingNightTip }}</text>
          </template>
        </view>
      </view>

      <!-- ── 日记列表 ── -->
      <view v-if="!loading || hasDiaryListItems">
        <template v-for="(group, gIndex) in groupedDiaries" :key="gIndex">
          <!-- 日期分隔符 -->
          <view class="date-separator">
            <view class="sep-line" />
            <text class="sep-label">{{ group.label }}</text>
            <view class="sep-line" />
          </view>

          <!-- 日期下的日记卡片 -->
          <view
            v-for="(diary, dIndex) in group.diaries"
            :key="diary.id"
          >
            <!-- AI 洞察卡：穿插在第2和第5条日记后 -->
            <view v-if="shouldShowInsight(gIndex, dIndex)" class="ai-insight-card-style stagger-item">
              <view class="insight-header">
                <DoodleIcon name="sparkle" color="#C8A86B" :size="36" />
                <text class="insight-title">AI 洞察</text>
              </view>
              <text class="insight-text">{{ getInsightText(gIndex, dIndex) }}</text>
            </view>

            <view v-if="isPendingDiary(diary)" class="pending-diary-card">
              <view class="pending-card-top">
                <view class="pending-title-row">
                  <text class="pending-emoji">✨</text>
                  <text class="pending-title">{{ diary.mode === 'regenerate' ? '正在重写今日日记' : '正在生成今日日记' }}</text>
                </view>
                <text class="pending-time">{{ formatTime(diary.createdAt) }}</text>
              </view>
              <view class="pending-content">
                <view class="pending-spinner" />
                <view class="pending-copy">
                  <text class="pending-main">AI 正在整理今天的素材</text>
                  <text class="pending-sub">生成完成后会自动显示在这里</text>
                </view>
              </view>
              <view class="pending-skeleton pending-skeleton-long" />
              <view class="pending-skeleton pending-skeleton-short" />
            </view>

            <DiaryCard
              v-else
              :diary="diary"
              @click="goDetail"
              @tag-click="onTagClick"
              @action-click="onActionClick"
            />
          </view>
        </template>

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-more">
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else-if="noMore" class="loading-more">
          <text class="loading-text">没有更多日记了</text>
        </view>
      </view>

      <!-- ── 空状态 ── -->
      <view v-if="!loading && !hasDiaryListItems" class="empty-state">
        <view class="empty-icon-wrap doodle-box func-color-diary">
          <DoodleIcon name="camera" color="#E8855A" :size="48" />
        </view>
        <text class="empty-title">还没有日记</text>
        <text class="empty-sub">拍张照片，开始你的第一篇日记</text>
        <view class="empty-btn press-feedback" @click="goWrite">
          <text class="empty-btn-text">写日记</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- TabBar -->
    <TabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import SideDrawer from '@/components/SideDrawer.vue'
import DiaryCard from '@/components/DiaryCard.vue'
import TabBar from '@/components/TabBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getDiaries, generateDiary, getTodaySummary, deleteDiary } from '@/services/api/diary'
import type { Diary, TodaySummary } from '@/services/api/diary'
import { getTodayAnniversaries } from '@/services/api/anniversary'
import type { Anniversary } from '@/services/api/anniversary'
import { getAssistantPreview } from '@/utils/chat-message'
import { toLocalDateYmd } from '@/utils/date'

const drawerVisible = ref(false)
const diaries = ref<Diary[]>([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const noMore = ref(false)

// 纪念日
const todayAnniversaries = ref<Anniversary[]>([])
const todayHistory = ref<Array<{ diary: any; yearsAgo: number }>>([])

// 今日摘要
const todaySummary = ref<TodaySummary | null>(null)
const generatingDiary = ref(false)
const regeneratingDiary = ref(false)
const currentDateKey = ref(toLocalDateYmd())

interface PendingDiary {
  id: string
  mode: 'generate' | 'regenerate'
  date: string
  createdAt: number
}

type DiaryListItem = Diary | PendingDiary

const pendingDiaries = ref<PendingDiary[]>([])
const hasDiaryListItems = computed(() => diaries.value.length > 0 || pendingDiaries.value.length > 0)

// 状态栏 + NavBar 占位高度（px）
const navPlaceholderHeight = ref(64) // 默认值，onMounted 后更新
const scrollHeight = ref(600)

// ── 时间判断 ──
const now = new Date()
const hour = now.getHours()
const isMorning = hour >= 6 && hour < 12
const greetingCardVisible = ref(true)

const greetingUserName = computed(() => {
  const name = String(todaySummary.value?.greeting_user_name || '').trim()
  return name || '同学'
})

const greetingTitle = computed(() => {
  return isMorning ? `早上好 ${greetingUserName.value}！` : `晚安 ${greetingUserName.value}`
})

const greetingDesc = computed(() => {
  const summary = todaySummary.value
  if (!summary) {
    return isMorning ? '新的一天，记得记录生活里的小闪光' : '今天辛苦了，给自己一个微笑'
  }

  if (isMorning) {
    if (summary.material_count > 0) {
      return `今天已记录 ${summary.material_count} 条素材，继续保持`
    }
    return '新的一天，记得记录生活里的小闪光'
  }

  const diaryCount = summary.diary_count ?? (summary.has_diary ? 1 : 0)
  const dominant = String(summary.dominant_emotion || '').trim()
  if (diaryCount > 0) {
    return dominant
      ? `今日共写了 ${diaryCount} 篇日记，整体情绪以${dominant}为主`
      : `今日共写了 ${diaryCount} 篇日记`
  }

  if (summary.material_count > 0) {
    return `今天记录了 ${summary.material_count} 条素材，离日记只差一步`
  }

  return '今天还没有留下记录，睡前写一句也很好'
})

const greetingNightTip = computed(() => {
  const summary = todaySummary.value
  if (!summary) return '早点休息，明天又是新的一天'

  const diaryCount = summary.diary_count ?? (summary.has_diary ? 1 : 0)
  if (diaryCount > 0) {
    return '早点休息，明天又是新的一天'
  }
  return '如果还没困，不妨写下今天最想记住的一刻'
})

const greetingActionLabel = computed(() => {
  const summary = todaySummary.value
  if (!summary) return '开始记录今天'

  const diaryCount = summary.diary_count ?? (summary.has_diary ? 1 : 0)
  if (diaryCount > 0) return `今日日记 ${diaryCount} 篇`
  if (summary.material_count > 0) return `今日素材 ${summary.material_count} 条`
  return '开始记录今天'
})

const greetingActionArrow = computed(() => {
  if (todaySummary.value?.has_diary && todaySummary.value?.diary_id) {
    return '查看今日日记 →'
  }
  return '去记录素材 →'
})

let dayRefreshTimer: ReturnType<typeof setInterval> | null = null
let dayRefreshPending = false

async function refreshForNewDay(nextDate: string) {
  if (dayRefreshPending) return
  dayRefreshPending = true
  try {
    page.value = 1
    noMore.value = false
    await Promise.all([loadDiaries(1), loadAnniversaryData(nextDate)])
    currentDateKey.value = nextDate
  } finally {
    dayRefreshPending = false
  }
}

function startDayRefreshWatcher() {
  if (dayRefreshTimer) clearInterval(dayRefreshTimer)
  dayRefreshTimer = setInterval(() => {
    const today = toLocalDateYmd()
    if (today === currentDateKey.value) return
    void refreshForNewDay(today)
  }, 30000)
}

function stopDayRefreshWatcher() {
  if (!dayRefreshTimer) return
  clearInterval(dayRefreshTimer)
  dayRefreshTimer = null
}

function isPendingDiary(diary: DiaryListItem): diary is PendingDiary {
  return diary.id.startsWith('pending_diary_')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function addPendingDiary(mode: PendingDiary['mode']): string {
  const pending: PendingDiary = {
    id: `pending_diary_${mode}_${Date.now()}`,
    mode,
    date: toLocalDateYmd(),
    createdAt: Date.now(),
  }
  pendingDiaries.value = [pending, ...pendingDiaries.value]
  return pending.id
}

function removePendingDiary(id: string) {
  pendingDiaries.value = pendingDiaries.value.filter(item => item.id !== id)
}

function replacePendingDiary(id: string, diary: Diary) {
  removePendingDiary(id)
  diaries.value = [diary, ...diaries.value.filter(item => item.id !== diary.id)]
}

async function refreshTodayState() {
  page.value = 1
  noMore.value = false
  await Promise.all([loadDiaries(1), loadAnniversaryData(toLocalDateYmd())])
  currentDateKey.value = toLocalDateYmd()
}

function handleMaterialsChanged(payload?: { date?: string }) {
  const date = payload?.date || toLocalDateYmd()
  if (date !== toLocalDateYmd()) return
  void loadAnniversaryData(date)
}

// ── 加载数据 ──
onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 50
  await loadDiaries(1)
  await loadAnniversaryData(currentDateKey.value)
  uni.$on('materials:changed', handleMaterialsChanged)
  startDayRefreshWatcher()
})

onShow(async () => {
  const today = toLocalDateYmd()
  if (today === currentDateKey.value) return
  await refreshForNewDay(today)
})

onUnmounted(() => {
  uni.$off('materials:changed', handleMaterialsChanged)
  stopDayRefreshWatcher()
})

async function loadAnniversaryData(date: string = toLocalDateYmd()) {
  try {
    const [todayData, summary] = await Promise.all([
      getTodayAnniversaries(),
      getTodaySummary(date),
    ])
    todayAnniversaries.value = todayData?.anniversaries || []
    todayHistory.value = todayData?.thisDateInHistory || []
    todaySummary.value = summary
  } catch {
    todayAnniversaries.value = []
    todayHistory.value = []
    todaySummary.value = null
  }
}

function handleGenerateDiary() {
  if (generatingDiary.value) return
  generatingDiary.value = true
  const pendingId = addPendingDiary('generate')
  uni.showToast({ title: '已开始生成', icon: 'none' })
  void generateDiaryInBackground(pendingId)
}

async function generateDiaryInBackground(pendingId: string) {
  try {
    const today = toLocalDateYmd()
    const diary = await generateDiary(today, '多云 18°C')
    replacePendingDiary(pendingId, diary)
    await loadAnniversaryData(today)
    currentDateKey.value = today
    uni.showToast({ title: '日记已生成', icon: 'success' })
  } catch {
    removePendingDiary(pendingId)
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    generatingDiary.value = false
  }
}

async function handleRegenerateDiary() {
  if (regeneratingDiary.value) return
  const res = await uni.showModal({
    title: '确认重写',
    content: '确定要删除今日日记并重新生成吗？此操作不可恢复。',
    confirmText: '重写',
    confirmColor: '#E8855A',
    cancelText: '取消',
  })
  if (res.confirm !== true) return

  regeneratingDiary.value = true
  const pendingId = addPendingDiary('regenerate')
  const oldDiaryId = todaySummary.value?.diary_id
  if (oldDiaryId) {
    diaries.value = diaries.value.filter(diary => diary.id !== oldDiaryId)
  }
  uni.showToast({ title: '已开始重写', icon: 'none' })
  void regenerateDiaryInBackground(pendingId, oldDiaryId)
}

async function regenerateDiaryInBackground(pendingId: string, oldDiaryId?: string | null) {
  try {
    const today = toLocalDateYmd()
    if (oldDiaryId) {
      await deleteDiary(oldDiaryId)
    }
    const diary = await generateDiary(today, '多云 18°C')
    replacePendingDiary(pendingId, diary)
    await loadAnniversaryData(today)
    currentDateKey.value = today
    uni.showToast({ title: '日记已重写', icon: 'success' })
  } catch {
    removePendingDiary(pendingId)
    await refreshTodayState()
    uni.showToast({ title: '重写失败，请重试', icon: 'none' })
  } finally {
    regeneratingDiary.value = false
  }
}

async function loadDiaries(p: number, append = false) {
  loading.value = true
  try {
    const { list } = await getDiaries(p, 20)
    if (append) {
      diaries.value.push(...list)
    } else {
      diaries.value = list
    }
    noMore.value = list.length < 20
  } catch {
    if (!append) diaries.value = []
    noMore.value = true
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  noMore.value = false
  await Promise.all([loadDiaries(1), loadAnniversaryData(toLocalDateYmd())])
  currentDateKey.value = toLocalDateYmd()
  refreshing.value = false
  uni.showToast({ title: '刷新成功', icon: 'success' })
}

async function onLoadMore() {
  if (noMore.value || loading.value) return
  page.value++
  await loadDiaries(page.value, true)
}

// ── 按日期分组 ──
function getDateLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = d.toDateString() === today.toDateString()
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return '今天'
  if (isYesterday) return '昨天'

  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${m}月${day}日 ${w}`
}

interface DiaryGroup {
  label: string
  diaries: DiaryListItem[]
}

const groupedDiaries = computed<DiaryGroup[]>(() => {
  const map = new Map<string, DiaryListItem[]>()
  const list: DiaryListItem[] = [...pendingDiaries.value, ...diaries.value]
  const sorted = list.sort((a, b) => b.createdAt - a.createdAt)

  for (const diary of sorted) {
    const label = getDateLabel(diary.createdAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(diary)
  }

  return Array.from(map.entries()).map(([label, list]) => ({ label, diaries: list }))
})

// ── AI 洞察：穿插在第2和第5条 ──
function shouldShowInsight(groupIndex: number, diaryIndex: number): boolean {
  // 在每组第2条(索引1)和第5条(索引4)后插入
  return diaryIndex === 1 || diaryIndex === 4
}

const insightTexts = [
  '你连续 3 天心情不错，最近爱写美食日记 📝',
  '最近学习相关的日记变多了，雅思备考进入关键期 💪',
  '本周你记录了 2 次社交活动，社交指数稳步上升 🌱',
  '根据你的日记分析，这周的情绪波动较小，整体状态良好 ✨',
]

function getInsightText(groupIndex: number, diaryIndex: number): string {
  const idx = (groupIndex * 2 + (diaryIndex === 1 ? 0 : 1)) % insightTexts.length
  return insightTexts[idx]
}

function goAnniversary() {
  uni.navigateTo({ url: '/pages/anniversary/index' })
}

function formatMatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function matTypeIcon(type: string): string {
  if (type === 'image') return '📷'
  if (type === 'voice') return '🎤'
  return '📝'
}

function getTimelinePreview(mat: TodaySummary['materials'][number]): string {
  if (mat.type === 'chat') {
    return getAssistantPreview(mat.content || '', 24) || '对话素材'
  }
  const content = String(mat.content || '').replace(/\s+/g, ' ').trim()
  if (!content) {
    return mat.type === 'image' ? '图片素材' : '已记录素材'
  }
  return content.length > 24 ? `${content.slice(0, 24)}...` : content
}

// ── 跳转 ──
function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/diary/detail?id=${id}` })
}

function goWrite() {
  uni.navigateTo({ url: '/pages/write/index' })
}

function handleGreetingAction() {
  if (todaySummary.value?.has_diary && todaySummary.value?.diary_id) {
    goDetail(todaySummary.value.diary_id)
    return
  }
  goWrite()
}

function onSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function onTagClick(tag: string) {
  uni.showToast({ title: `#${tag}`, icon: 'none' })
}

function onActionClick(payload: { action: string; diaryId: string }) {
  if (payload.action === 'share') {
    uni.navigateTo({ url: `/pages/diary/share-card?id=${payload.diaryId}` })
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

/* ── AI 早安/晚安卡片 ── */
.greeting-card {
  margin: 16rpx 24rpx 0;
}

/* ── 纪念日提醒卡 ── */
.anniversary-card {
  margin: 16rpx 24rpx 0;
  background: linear-gradient(135deg, #FDF0E8, #FFF5EE);
  border-radius: 20rpx 24rpx 18rpx 22rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 2rpx solid rgba(232, 133, 90, 0.2);
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.08);
  &:active { opacity: 0.85; }
}

.ann-card-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ann-card-icon {
  font-size: 40rpx;
}

.ann-card-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.ann-card-title {
  font-size: 24rpx;
  color: #AE9D92;
}

.ann-card-name {
  font-size: 30rpx;
  color: #E8855A;
  font-weight: 600;
}

.ann-card-arrow {
  font-size: 40rpx;
  color: #E8855A;
}

/* ── 那年今日 ── */
.memory-card {
  margin: 12rpx 24rpx 0;
  background: rgba(174, 157, 146, 0.08);
  border-radius: 16rpx 20rpx 14rpx 18rpx;
  padding: 16rpx 24rpx;
  border: 1rpx dashed #D4C4B8;
  &:active { opacity: 0.85; }
}

.memory-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.memory-icon {
  font-size: 28rpx;
}

.memory-title {
  font-size: 24rpx;
  color: #AE9D92;
  font-weight: 500;
}

.memory-excerpt {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.5;
}

/* ── 今日素材入口 + 时间线 ── */
.today-section {
  margin: 12rpx 24rpx 0;
  background: #FFFFFF;
  border-radius: 20rpx 24rpx 16rpx 22rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.06);
}

.today-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.today-header-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.today-icon {
  font-size: 32rpx;
}

.today-count-text {
  font-size: 26rpx;
  color: #4A3628;
}

/* 素材时间线 */
.today-timeline {
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.timeline-entry {
  display: flex;
  gap: 14rpx;
  min-height: 40rpx;
}

.tl-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 6rpx;
}

.tl-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #E8855A;
  flex-shrink: 0;
}

.tl-line {
  width: 2rpx;
  flex: 1;
  min-height: 20rpx;
  background: repeating-linear-gradient(
    to bottom,
    #D4C4B8 0,
    #D4C4B8 6rpx,
    transparent 6rpx,
    transparent 12rpx
  );
  margin-top: 6rpx;
  margin-bottom: 6rpx;
}

.tl-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 12rpx;
  flex-wrap: nowrap;
  overflow: hidden;
}

.tl-time {
  font-size: 22rpx;
  color: #AE9D92;
  flex-shrink: 0;
}

.tl-type-icon {
  font-size: 22rpx;
  flex-shrink: 0;
}

.tl-text {
  font-size: 26rpx;
  color: #4A3628;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.tl-text-clamp {
  text-overflow: ellipsis;
}

.tl-emotion {
  font-size: 24rpx;
  flex-shrink: 0;
}

/* 生成日记按钮 */
.generate-diary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 20rpx;
  padding: 20rpx;
  &:active { opacity: 0.85; }

  &.generating {
    background: #D4C4B8;
  }
}

.gen-icon {
  font-size: 32rpx;
}

.gen-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 700;
}

/* 查看日记按钮 */
.view-diary-btn {
  background: rgba(232, 133, 90, 0.08);
  border-radius: 16rpx;
  padding: 16rpx;
  text-align: center;
  &:active { opacity: 0.8; }
}

.view-diary-text {
  font-size: 28rpx;
  color: #E8855A;
  font-weight: 600;
}

/* 日记操作按钮容器 */
.diary-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 重写日记按钮 */
.regenerate-btn {
  flex: 1;
  background: linear-gradient(135deg, #E8855A 0%, #F5A623 100%);
  border-radius: 16rpx;
  padding: 16rpx;
  text-align: center;
  &:active { opacity: 0.8; }
  &.regenerating { opacity: 0.6; }
}

.regenerate-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.material-entry-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(232, 133, 90, 0.1);
  border-radius: 16rpx;
  padding: 10rpx 20rpx;
  &:active { opacity: 0.7; }
}

.material-entry-add {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 600;
}

.greeting-inner {
  border-radius: 32rpx 40rpx 28rpx 36rpx;
  padding: 24rpx;
  position: relative;
  border: 1px solid rgba(232, 133, 90, 0.12);
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.08);
}

.greeting-morning {
  background: linear-gradient(135deg, #FDF0E8, #F7CDB5);
}

.greeting-night {
  background: linear-gradient(135deg, #E8E0F0, #D4C4E8);
}

.greeting-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.greeting-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
}

.greeting-close {
  padding: 4rpx 8rpx;
}

.greeting-desc {
  font-size: 28rpx;
  color: #4A3628;
  display: block;
  margin-bottom: 12rpx;
}

.greeting-todo {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12rpx;
  padding: 10rpx 16rpx;
}

.todo-label { font-size: 26rpx; color: #4A3628; flex: 1; }
.todo-arrow { font-size: 24rpx; color: #E8855A; }

.greeting-night-tip {
  font-size: 26rpx;
  color: #4A3628;
}

/* ── 日期分隔符 ── */
.date-separator {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 24rpx 24rpx 12rpx;
}

.sep-line {
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

.sep-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

/* ── AI 洞察卡（使用全局 .ai-insight-card-style） ── */
.ai-insight-card-style {
  margin: 0 24rpx 24rpx;
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 8rpx;
}

.insight-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #E8855A;
}

.insight-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  display: block;
}

/* ── 生成中日记卡片 ── */
.pending-diary-card {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border: 2rpx dashed rgba(232, 133, 90, 0.38);
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.pending-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.pending-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.pending-emoji {
  font-size: 32rpx;
  flex-shrink: 0;
}

.pending-title {
  font-size: 30rpx;
  color: #4A3628;
  font-weight: 700;
}

.pending-time {
  font-size: 26rpx;
  color: #AE9D92;
  flex-shrink: 0;
}

.pending-content {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 18rpx;
}

.pending-spinner {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 5rpx solid #F7D9C9;
  border-top-color: #E8855A;
  animation: pending-spin 0.9s linear infinite;
  flex-shrink: 0;
}

.pending-copy {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.pending-main {
  font-size: 28rpx;
  color: #4A3628;
  font-weight: 600;
}

.pending-sub {
  font-size: 24rpx;
  color: #AE9D92;
}

.pending-skeleton {
  height: 22rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #F6E9DF 0%, #FFF7F0 50%, #F6E9DF 100%);
  background-size: 240% 100%;
  animation: pending-shimmer 1.4s ease-in-out infinite;
}

.pending-skeleton-long {
  width: 88%;
  margin-bottom: 12rpx;
}

.pending-skeleton-short {
  width: 58%;
}

@keyframes pending-spin {
  to { transform: rotate(360deg); }
}

@keyframes pending-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* ── 加载状态 ── */
.loading-more {
  display: flex;
  justify-content: center;
  padding: 24rpx;
}

.loading-text {
  font-size: 26rpx;
  color: #AE9D92;
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 80rpx;
  gap: 12rpx;
}

.empty-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #F2B49B;
  margin-bottom: 8rpx;
}

.empty-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2C1F14;
}

.empty-sub {
  font-size: 28rpx;
  color: #AE9D92;
  text-align: center;
  line-height: 1.5;
}

.empty-btn {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 28rpx 36rpx 24rpx 40rpx;
  padding: 16rpx 48rpx;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.2);
}

.empty-btn-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* ── nav search ── */
.nav-search-btn {
  padding: 8rpx;
}

/* ── 底部留白 ── */
.bottom-spacer {
  height: 24rpx;
}
</style>
