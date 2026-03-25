<template>
  <view class="page">

    <CustomNavBar title="情绪日历" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- 日历 -->
      <view class="calendar-card">
        <!-- 月份切换 -->
        <view class="month-nav">
          <view class="month-btn" @click="prevMonth">
            <text>‹</text>
          </view>
          <text class="month-label">{{ year }}年{{ month + 1 }}月</text>
          <view class="month-btn" @click="nextMonth">
            <text>›</text>
          </view>
        </view>

        <!-- 星期头 -->
        <view class="weekday-row">
          <text v-for="d in weekdays" :key="d" class="weekday-cell">{{ d }}</text>
        </view>

        <!-- 日期网格 -->
        <view class="date-grid">
          <!-- 空白填充 -->
          <view v-for="_ in firstDayOfWeek" :key="'blank_' + _" class="date-cell date-cell--blank" />

          <!-- 日期格子 -->
          <view
            v-for="day in daysInMonth"
            :key="day"
            class="date-cell"
            :class="{
              'date-cell--today': isToday(day),
              'date-cell--has-diary': getDiaryForDay(day) !== null,
            }"
            :style="getDayStyle(day)"
            @click="selectDay(day)"
          >
            <text
              class="date-num"
              :class="{
                'date-num--today': isToday(day),
                'date-num--selected': selectedDay === day,
              }"
            >{{ day }}</text>
            <text v-if="getDiaryForDay(day)" class="date-emotion">{{ getDiaryForDay(day)!.emotion.emoji }}</text>
          </view>
        </view>
      </view>

      <!-- 情绪统计 -->
      <SectionTitle title="情绪统计" />
      <view class="stats-card">
        <view
          v-for="item in emotionStats"
          :key="item.emoji"
          class="stats-row"
        >
          <text class="stats-emoji">{{ item.emoji }}</text>
          <text class="stats-label">{{ item.label }}</text>
          <view class="stats-bar-wrap">
            <view
              class="stats-bar-fill"
              :style="{ width: (item.count / maxEmotionCount * 100) + '%', background: item.color }"
            />
          </view>
          <text class="stats-count">{{ item.count }}天</text>
        </view>
        <view class="avg-score">
          <text class="avg-label">平均情绪：</text>
          <text class="avg-value">{{ avgScore }}/10</text>
        </view>
      </view>

      <!-- 选中日期日记 -->
      <template v-if="selectedDiary">
        <SectionTitle :title="`${selectedDay}日日记`" />
        <DiaryCard :diary="selectedDiary" @click="onDiaryClick" />
      </template>

      <view class="bottom-spacer" />
    </scroll-view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DiaryCard from '@/components/DiaryCard.vue'
import type { Diary } from '@/services/api/diary'
import { mockDiaries } from '@/services/mock/diary'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

const SectionTitle = {
  props: { title: [String, Number] },
  template: `<view class="section-title-wrap"><text class="section-title">{{ title }}</text></view>`,
}

// ── 日历逻辑 ──
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth())
const selectedDay = ref<number | null>(null)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const daysInMonth = computed(() => {
  return new Date(year.value, month.value + 1, 0).getDate()
})

const firstDayOfWeek = computed(() => {
  return new Date(year.value, month.value, 1).getDay()
})

function prevMonth() {
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
  selectedDay.value = null
}

function nextMonth() {
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
  selectedDay.value = null
}

function isToday(day: number): boolean {
  const t = new Date()
  return year.value === t.getFullYear() && month.value === t.getMonth() && day === t.getDate()
}

// ── 日记数据 ──
const diaries = ref<Diary[]>(mockDiaries)

function getDiaryForDay(day: number): Diary | null {
  return diaries.value.find(d => {
    const d2 = new Date(d.createdAt)
    return d2.getFullYear() === year.value &&
           d2.getMonth() === month.value &&
           d2.getDate() === day
  }) ?? null
}

const emotionColors: Record<string, string> = {
  '😊': '#5BBF8E',
  '🥰': '#F2B49B',
  '😢': '#6B8EC4',
  '😤': '#E8A94E',
  '😴': '#D4C4B8',
  '😂': '#E8855A',
}

function getDayStyle(day: number) {
  const diary = getDiaryForDay(day)
  if (diary) {
    const color = emotionColors[diary.emotion.emoji] ?? '#E8855A'
    return { background: color + '33' }
  }
  return {}
}

function selectDay(day: number) {
  selectedDay.value = day
}

const selectedDiary = computed(() => {
  if (!selectedDay.value) return null
  return getDiaryForDay(selectedDay.value)
})

// ── 情绪统计 ──
const emotionStats = computed(() => {
  const map: Record<string, { label: string; count: number; color: string }> = {
    '😊': { label: '开心', count: 0, color: '#5BBF8E' },
    '🥰': { label: '幸福', count: 0, color: '#F2B49B' },
    '😢': { label: '焦虑', count: 0, color: '#6B8EC4' },
    '😤': { label: '激动', count: 0, color: '#E8A94E' },
    '😴': { label: '疲惫', count: 0, color: '#D4C4B8' },
    '😂': { label: '搞笑', count: 0, color: '#E8855A' },
  }
  diaries.value.forEach(d => {
    const e = d.emotion.emoji
    if (map[e]) map[e].count++
  })
  return Object.entries(map)
    .filter(([_, v]) => v.count > 0)
    .map(([emoji, v]) => ({ emoji, ...v }))
})

const maxEmotionCount = computed(() => Math.max(...emotionStats.value.map(s => s.count), 1))

const avgScore = computed(() => {
  if (diaries.value.length === 0) return '0'
  const avg = diaries.value.reduce((sum, d) => sum + d.emotion.score, 0) / diaries.value.length
  return avg.toFixed(1)
})

function onDiaryClick(id: string) {
  uni.navigateTo({ url: `/pages/diary/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 0 24rpx;
}

/* ── 日历卡片 ── */
.calendar-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  margin: 16rpx 0;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.month-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.6; }
  text { font-size: 40rpx; color: #E8855A; font-weight: 300; }
}

.month-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #2C1F14;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8rpx;
}

.weekday-cell {
  text-align: center;
  font-size: 24rpx;
  color: #AE9D92;
  padding: 8rpx 0;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
}

.date-cell {
  height: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  cursor: pointer;
  position: relative;
  gap: 2rpx;
  transition: background 0.15s;
  &:active { opacity: 0.8; }
}

.date-cell--blank { cursor: default; }

.date-cell--today {
  border: 2rpx solid #E8855A;
}

.date-num {
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1;
}

.date-num--today { color: #E8855A; font-weight: 700; }
.date-num--selected { color: #E8855A; }

.date-emotion {
  font-size: 22rpx;
  line-height: 1;
}

.date-cell--has-diary {
  background: #F5F0EB;
}

/* ── 标题 ── */
.section-title-wrap {
  padding: 20rpx 0 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

/* ── 情绪统计 ── */
.stats-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  &:last-of-type { margin-bottom: 0; }
}

.stats-emoji { font-size: 32rpx; flex-shrink: 0; width: 48rpx; text-align: center; }
.stats-label { font-size: 26rpx; color: #4A3628; width: 56rpx; flex-shrink: 0; }
.stats-count { font-size: 24rpx; color: #AE9D92; width: 56rpx; text-align: right; flex-shrink: 0; }

.stats-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: #F5F0EB;
  border-radius: 8rpx;
  overflow: hidden;
}

.stats-bar-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s;
}

.avg-score {
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F5F0EB;
  display: flex;
  align-items: center;
}

.avg-label { font-size: 28rpx; color: #4A3628; }
.avg-value { font-size: 32rpx; color: #E8855A; font-weight: 700; }

.bottom-spacer { height: 40rpx; }
</style>
