<template>
  <view class="page">
    <CustomNavBar title="搜索" left-icon="back" @left-click="goBack" />

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- 搜索框区域 -->
    <view class="search-box-container">
      <view class="search-box doodle-box">
        <DoodleIcon name="search" color="#AE9D92" :size="36" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索日记内容、位置..."
          :focus="true"
          @input="onKeywordChange"
        />
        <view v-if="keyword" class="clear-btn press-feedback" @click="clearKeyword">
          <DoodleIcon name="cross" color="#AE9D92" :size="32" />
        </view>
      </view>
    </view>

    <!-- 筛选 Tab 栏 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab press-feedback"
        :class="{ active: activeTab === tab.key }"
        @click="toggleTab(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 筛选面板 -->
    <view v-if="activeTab" class="filter-panel doodle-box-v2">
      <!-- 时间面板 -->
      <view v-if="activeTab === 'time'" class="panel-content">
        <view class="quick-btns">
          <view
            v-for="btn in quickDateBtns"
            :key="btn.key"
            class="quick-btn press-feedback"
            :class="{ active: selectedQuickDate === btn.key }"
            @click="selectQuickDate(btn.key)"
          >
            <text class="quick-btn-text">{{ btn.label }}</text>
          </view>
        </view>
        <view class="custom-date">
          <text class="date-label">自定义范围</text>
          <view class="date-pickers">
            <picker mode="date" :value="customDateRange[0]" @change="onStartDateChange">
              <view class="date-picker-btn">
                <text class="date-picker-text">{{ customDateRange[0] || '开始日期' }}</text>
              </view>
            </picker>
            <text class="date-sep">—</text>
            <picker mode="date" :value="customDateRange[1]" @change="onEndDateChange">
              <view class="date-picker-btn">
                <text class="date-picker-text">{{ customDateRange[1] || '结束日期' }}</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 情绪面板 -->
      <view v-if="activeTab === 'emotion'" class="panel-content">
        <view class="emotion-grid">
          <view
            v-for="emo in emotionOptions"
            :key="emo.label"
            class="emotion-item press-feedback"
            :class="{ active: selectedEmotions.includes(emo.label) }"
            @click="toggleEmotion(emo.label)"
          >
            <text class="emotion-emoji">{{ emo.emoji }}</text>
            <text class="emotion-label">{{ emo.label }}</text>
          </view>
        </view>
      </view>

      <!-- 标签面板 -->
      <view v-if="activeTab === 'tag'" class="panel-content">
        <view class="tag-cloud">
          <view
            v-for="tag in allTags"
            :key="tag"
            class="tag-cloud-item press-feedback"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            <text class="tag-cloud-text">#{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 天气面板 -->
      <view v-if="activeTab === 'weather'" class="panel-content">
        <view class="weather-grid">
          <view
            v-for="w in weatherOptions"
            :key="w.label"
            class="weather-item press-feedback"
            :class="{ active: selectedWeathers.includes(w.label) }"
            @click="toggleWeather(w.label)"
          >
            <text class="weather-icon">{{ w.icon }}</text>
            <text class="weather-label">{{ w.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已选条件展示 -->
    <view v-if="hasActiveFilters" class="selected-filters">
      <scroll-view class="filters-scroll" scroll-x>
        <view class="filters-list">
          <view
            v-for="(chip, idx) in filterChips"
            :key="idx"
            class="filter-chip press-feedback"
            @click="removeFilter(chip)"
          >
            <text class="chip-text">{{ chip.label }}</text>
            <DoodleIcon name="cross" color="#E8855A" :size="24" />
          </view>
        </view>
      </scroll-view>
      <view class="clear-all-btn press-feedback" @click="clearAllFilters">
        <text class="clear-all-text">清除</text>
      </view>
    </view>

    <!-- 搜索结果列表 -->
    <scroll-view
      class="results-scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
    >
      <view v-if="searchResults.length > 0" class="results-list">
        <DiaryCard
          v-for="diary in searchResults"
          :key="diary.id"
          :diary="diary"
          @click="goDetail"
        />
      </view>

      <!-- 空状态 -->
      <view v-else-if="!searching && (keyword || hasActiveFilters)" class="empty-state">
        <view class="empty-icon-wrap doodle-box func-color-diary">
          <DoodleIcon name="search" color="#E8855A" :size="48" />
        </view>
        <text class="empty-title">没有找到相关日记</text>
        <text class="empty-sub">试试调整搜索条件</text>
      </view>

      <!-- 初始状态 -->
      <view v-else-if="!searching" class="empty-state">
        <view class="empty-icon-wrap doodle-box func-color-diary">
          <DoodleIcon name="search" color="#E8855A" :size="48" />
        </view>
        <text class="empty-title">搜索你的日记</text>
        <text class="empty-sub">输入关键词或使用筛选条件</text>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DiaryCard from '@/components/DiaryCard.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { searchDiaries } from '@/services/api/diary'
import type { Diary } from '@/services/api/diary'
import { mockDiaries } from '@/services/mock/diary'
import { toLocalDateYmd, shiftLocalDateYmd } from '@/utils/date'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)

// 搜索关键词
const keyword = ref('')
const searching = ref(false)
const searchResults = ref<Diary[]>([])
let searchTimer: number | null = null

// 筛选 Tab
type FilterTabKey = 'time' | 'emotion' | 'tag' | 'weather'
const activeTab = ref<FilterTabKey | null>(null)

const filterTabs = [
  { key: 'time' as FilterTabKey, icon: '📅', label: '时间' },
  { key: 'emotion' as FilterTabKey, icon: '😊', label: '情绪' },
  { key: 'tag' as FilterTabKey, icon: '🏷️', label: '标签' },
  { key: 'weather' as FilterTabKey, icon: '🌤️', label: '天气' },
]

// 时间筛选
const selectedQuickDate = ref<string | null>(null)
const customDateRange = ref<[string, string]>(['', ''])

const quickDateBtns = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'threeMonths', label: '三个月' },
]

// 情绪筛选
const selectedEmotions = ref<string[]>([])
const emotionOptions = [
  { emoji: '😊', label: '开心' },
  { emoji: '😢', label: '焦虑' },
  { emoji: '🥰', label: '幸福' },
  { emoji: '😴', label: '慵懒' },
  { emoji: '🤩', label: '兴奋' },
  { emoji: '😌', label: '平静' },
  { emoji: '😤', label: '烦躁' },
  { emoji: '💪', label: '活力' },
  { emoji: '😋', label: '满足' },
  { emoji: '📸', label: '兴奋' },
  { emoji: '✨', label: '期待' },
  { emoji: '😰', label: '焦虑' },
]

// 标签筛选
const selectedTags = ref<string[]>([])
const allTags = computed(() => {
  const tags = new Set<string>()
  mockDiaries.forEach(d => {
    d.tags?.forEach(t => tags.add(t))
  })
  return Array.from(tags)
})

// 天气筛选
const selectedWeathers = ref<string[]>([])
const weatherOptions = [
  { icon: '☀️', label: '晴' },
  { icon: '🌤️', label: '多云' },
  { icon: '☁️', label: '阴' },
  { icon: '🌧️', label: '雨' },
  { icon: '⛅', label: '多云转晴' },
]

// 已选条件 chips
interface FilterChip {
  type: 'emotion' | 'tag' | 'weather' | 'date'
  label: string
  value: string
}

const filterChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []

  // 日期范围
  if (selectedQuickDate.value) {
    const btn = quickDateBtns.find(b => b.key === selectedQuickDate.value)
    if (btn) {
      chips.push({ type: 'date', label: btn.label, value: btn.key })
    }
  } else if (customDateRange.value[0] || customDateRange.value[1]) {
    const start = customDateRange.value[0] || '...'
    const end = customDateRange.value[1] || '...'
    chips.push({ type: 'date', label: `${start} ~ ${end}`, value: 'custom' })
  }

  // 情绪
  selectedEmotions.value.forEach(emo => {
    chips.push({ type: 'emotion', label: emo, value: emo })
  })

  // 标签
  selectedTags.value.forEach(tag => {
    chips.push({ type: 'tag', label: `#${tag}`, value: tag })
  })

  // 天气
  selectedWeathers.value.forEach(w => {
    chips.push({ type: 'weather', label: w, value: w })
  })

  return chips
})

const hasActiveFilters = computed(() => filterChips.value.length > 0)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 180
})

function toggleTab(key: FilterTabKey) {
  activeTab.value = activeTab.value === key ? null : key
}

// 时间筛选
function selectQuickDate(key: string) {
  selectedQuickDate.value = key
  customDateRange.value = ['', '']
  performSearch()
}

function onStartDateChange(e: any) {
  customDateRange.value[0] = e.detail.value
  selectedQuickDate.value = null
  performSearch()
}

function onEndDateChange(e: any) {
  customDateRange.value[1] = e.detail.value
  selectedQuickDate.value = null
  performSearch()
}

// 情绪筛选
function toggleEmotion(label: string) {
  const idx = selectedEmotions.value.indexOf(label)
  if (idx > -1) {
    selectedEmotions.value.splice(idx, 1)
  } else {
    selectedEmotions.value.push(label)
  }
  performSearch()
}

// 标签筛选
function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx > -1) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
  performSearch()
}

// 天气筛选
function toggleWeather(label: string) {
  const idx = selectedWeathers.value.indexOf(label)
  if (idx > -1) {
    selectedWeathers.value.splice(idx, 1)
  } else {
    selectedWeathers.value.push(label)
  }
  performSearch()
}

// 移除单个筛选条件
function removeFilter(chip: FilterChip) {
  if (chip.type === 'date') {
    selectedQuickDate.value = null
    customDateRange.value = ['', '']
  } else if (chip.type === 'emotion') {
    const idx = selectedEmotions.value.indexOf(chip.value)
    if (idx > -1) selectedEmotions.value.splice(idx, 1)
  } else if (chip.type === 'tag') {
    const idx = selectedTags.value.indexOf(chip.value)
    if (idx > -1) selectedTags.value.splice(idx, 1)
  } else if (chip.type === 'weather') {
    const idx = selectedWeathers.value.indexOf(chip.value)
    if (idx > -1) selectedWeathers.value.splice(idx, 1)
  }
  performSearch()
}

// 清除全部筛选
function clearAllFilters() {
  selectedQuickDate.value = null
  customDateRange.value = ['', '']
  selectedEmotions.value = []
  selectedTags.value = []
  selectedWeathers.value = []
  performSearch()
}

// 关键词输入（防抖）
function onKeywordChange() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    performSearch()
  }, 300) as unknown as number
}

function clearKeyword() {
  keyword.value = ''
  performSearch()
}

// 执行搜索
async function performSearch() {
  searching.value = true

  // 构建日期范围
  let dateRange: [string, string] | undefined
  if (selectedQuickDate.value) {
    const now = new Date()
    const today = toLocalDateYmd(now)

    if (selectedQuickDate.value === 'today') {
      dateRange = [today, today]
    } else if (selectedQuickDate.value === 'week') {
      const weekAgo = shiftLocalDateYmd(now, -7)
      dateRange = [weekAgo, today]
    } else if (selectedQuickDate.value === 'month') {
      const monthAgo = shiftLocalDateYmd(now, -30)
      dateRange = [monthAgo, today]
    } else if (selectedQuickDate.value === 'threeMonths') {
      const threeMonthsAgo = shiftLocalDateYmd(now, -90)
      dateRange = [threeMonthsAgo, today]
    }
  } else if (customDateRange.value[0] || customDateRange.value[1]) {
    dateRange = [customDateRange.value[0] || '1900-01-01', customDateRange.value[1] || '2099-12-31']
  }

  try {
    const results = await searchDiaries({
      keyword: keyword.value || undefined,
      dateRange,
      emotions: selectedEmotions.value.length > 0 ? selectedEmotions.value : undefined,
      tags: selectedTags.value.length > 0 ? selectedTags.value : undefined,
      weathers: selectedWeathers.value.length > 0 ? selectedWeathers.value : undefined,
    })
    searchResults.value = results
  } catch (err) {
    console.error('搜索失败', err)
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/diary/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
@import '@/common/design-tokens.scss';
@import '@/common/doodle.scss';

.page {
  background: #FDF8F3;
  min-height: 100vh;
}

/* 搜索框 */
.search-box-container {
  padding: 16rpx 24rpx;
}

.search-box {
  background: #FFFFFF;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  border: 2rpx solid rgba(232, 133, 90, 0.15);
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.06);
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #4A3628;

  &::placeholder {
    color: #AE9D92;
  }
}

.clear-btn {
  padding: 4rpx;
}

/* 筛选 Tab */
.filter-tabs {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #FFFFFF;
  border-radius: 20rpx 24rpx 16rpx 22rpx;
  padding: 12rpx 20rpx;
  border: 2rpx solid rgba(232, 133, 90, 0.15);
  transition: all 0.2s;

  &.active {
    background: linear-gradient(135deg, #FDF0E8, #FFF5EE);
    border-color: #E8855A;
    box-shadow: 0 2rpx 8rpx rgba(232, 133, 90, 0.15);
  }

  &:active {
    transform: scale(0.96);
  }
}

.tab-icon {
  font-size: 28rpx;
}

.tab-label {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

/* 筛选面板 */
.filter-panel {
  margin: 0 24rpx 16rpx;
  background: #FFFFFF;
  padding: 24rpx;
  border: 2rpx solid rgba(232, 133, 90, 0.12);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 快捷日期按钮 */
.quick-btns {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.quick-btn {
  background: rgba(232, 133, 90, 0.08);
  border-radius: 16rpx;
  padding: 10rpx 20rpx;
  border: 2rpx solid transparent;

  &.active {
    background: #E8855A;
    border-color: #E8855A;

    .quick-btn-text {
      color: #FFFFFF;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.quick-btn-text {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 500;
}

/* 自定义日期 */
.custom-date {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.date-label {
  font-size: 24rpx;
  color: #8A7668;
}

.date-pickers {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.date-picker-btn {
  flex: 1;
  background: rgba(232, 133, 90, 0.08);
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  text-align: center;
}

.date-picker-text {
  font-size: 26rpx;
  color: #4A3628;
}

.date-sep {
  font-size: 26rpx;
  color: #AE9D92;
}

/* 情绪网格 */
.emotion-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.emotion-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  background: rgba(232, 133, 90, 0.06);
  border-radius: 16rpx;
  padding: 16rpx 8rpx;
  border: 2rpx solid transparent;

  &.active {
    background: rgba(232, 133, 90, 0.15);
    border-color: #E8855A;
  }

  &:active {
    transform: scale(0.95);
  }
}

.emotion-emoji {
  font-size: 36rpx;
}

.emotion-label {
  font-size: 22rpx;
  color: #4A3628;
}

/* 标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-cloud-item {
  background: rgba(232, 133, 90, 0.08);
  border-radius: 16rpx;
  padding: 10rpx 20rpx;
  border: 2rpx solid transparent;

  &.active {
    background: #E8855A;
    border-color: #E8855A;

    .tag-cloud-text {
      color: #FFFFFF;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.tag-cloud-text {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 500;
}

/* 天气网格 */
.weather-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.weather-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  background: rgba(232, 133, 90, 0.06);
  border-radius: 16rpx;
  padding: 16rpx 8rpx;
  border: 2rpx solid transparent;

  &.active {
    background: rgba(232, 133, 90, 0.15);
    border-color: #E8855A;
  }

  &:active {
    transform: scale(0.95);
  }
}

.weather-icon {
  font-size: 36rpx;
}

.weather-label {
  font-size: 22rpx;
  color: #4A3628;
}

/* 已选条件 */
.selected-filters {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
}

.filters-scroll {
  flex: 1;
  white-space: nowrap;
}

.filters-list {
  display: inline-flex;
  gap: 8rpx;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(232, 133, 90, 0.12);
  border-radius: 20rpx;
  padding: 8rpx 16rpx;
  border: 1px solid rgba(232, 133, 90, 0.3);

  &:active {
    opacity: 0.7;
  }
}

.chip-text {
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 500;
}

.clear-all-btn {
  background: rgba(174, 157, 146, 0.1);
  border-radius: 16rpx;
  padding: 8rpx 16rpx;

  &:active {
    opacity: 0.7;
  }
}

.clear-all-text {
  font-size: 24rpx;
  color: #8A7668;
}

/* 结果列表 */
.results-scroll {
  padding: 0 24rpx;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 空状态 */
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

.bottom-spacer {
  height: 40rpx;
}
</style>
