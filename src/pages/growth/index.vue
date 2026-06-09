<template>
  <view class="page">
    <CustomNavBar title="成长轨迹" left-icon="back" />

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="scroll-area" :style="{ height: scrollHeight + 'px' }">
      <view class="content">
        <!-- ===== 等级卡片 ===== -->
        <view class="card level-card">
          <view class="level-header">
            <DoodleIcon name="star" :size="56" color="#E8855A" class="level-star" />
            <text class="level-title">{{ growth?.title || '探索者' }} Lv.{{ growth?.level || 1 }}</text>
          </view>

          <!-- XP 进度条 -->
          <view class="xp-bar-wrap">
            <view class="xp-bar-bg">
              <view class="xp-bar-fill" :style="{ width: xpPercent + '%' }"></view>
            </view>
            <text class="xp-text">{{ currentXP }} / {{ nextLevelXP }} XP</text>
          </view>
          <text class="xp-hint">还差 {{ growth?.xpToNextLevel || 0 }} XP 升至 Lv.{{ (growth?.level || 1) + 1 }}</text>

          <!-- 底部统计 -->
          <view class="level-stats">
            <view class="stat-group">
              <text class="stat-item">总日记 <text class="stat-val">{{ growth?.stats.diaryCount || 0 }}</text></text>
              <text class="stat-sep">·</text>
              <text class="stat-item">总字数 <text class="stat-val">{{ formatNumber(growth?.stats.wordCount || 0) }}</text></text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-group">
              <text class="stat-item">连续打卡 <text class="stat-val">{{ growth?.stats.streakDays || 0 }} 天</text></text>
              <text class="stat-sep">·</text>
              <text class="stat-item">最长 <text class="stat-val">{{ growth?.stats.longestStreak || 0 }} 天</text></text>
            </view>
          </view>
        </view>

        <!-- ===== 今日成长 ===== -->
        <view class="section-title">── 今日成长 ──</view>
        <view class="card today-card">
          <view class="today-main">
            <text class="today-xp">+{{ growth?.todayXp || 0 }} XP</text>
            <text class="today-label">来自今天的真实记录、学习、创作和互动</text>
          </view>
          <view class="breakdown-grid">
            <view v-for="item in visibleBreakdown" :key="item.label" class="breakdown-chip">
              <text class="breakdown-name">{{ item.label }}</text>
              <text class="breakdown-xp">{{ item.xp }} XP</text>
            </view>
          </view>
        </view>

        <!-- ===== 技能雷达图 ===== -->
        <view class="section-title">── 技能雷达图 ──</view>
        <view class="card skill-card">
          <view
            v-for="skill in skills"
            :key="skill.name"
            class="skill-row"
          >
            <text class="skill-label">{{ skill.name }}</text>
            <view class="skill-bar-bg">
              <view
                class="skill-bar-fill"
                :style="{
                  width: skill.value + '%',
                  background: skillColor(skill.value)
                }"
              ></view>
            </view>
            <text class="skill-value">{{ skill.value }}</text>
          </view>
        </view>

        <!-- ===== 成长曲线 ===== -->
        <view class="section-title">── 成长曲线 ──</view>
        <view class="card chart-card">
          <view class="bar-chart">
            <view
              v-for="week in weeks"
              :key="week.label"
              class="bar-col"
            >
              <text class="bar-pct">{{ week.xp }}</text>
              <view class="bar-outer">
                <view
                  class="bar-inner"
                  :style="{ height: (week.xp / maxChartXp * 100) + '%' }"
                ></view>
              </view>
              <text class="bar-label">{{ week.label }}</text>
            </view>
          </view>
        </view>

        <!-- ===== 成长轨迹 ===== -->
        <view class="section-title">── 成长轨迹 ──</view>
        <view class="card timeline-card">
          <view v-if="timeline.length === 0" class="empty-hint">还没有成长事件。继续记录后，这里会自动出现真实轨迹。</view>
          <view
            v-for="item in pagedTimeline"
            :key="`${item.type}-${item.sourceId}-${item.date}`"
            class="timeline-row"
          >
            <view class="timeline-dot" />
            <view class="timeline-body">
              <view class="timeline-title-row">
                <text class="timeline-title">{{ item.title }}</text>
                <text class="timeline-xp">+{{ item.xp }} XP</text>
              </view>
              <text class="timeline-desc">{{ item.description }}</text>
              <text class="timeline-date">{{ item.date }}</text>
            </view>
          </view>
          <view v-if="totalTimelinePages > 1" class="timeline-pager">
            <view class="timeline-page-btn" :class="{ disabled: timelinePage === 1 }" @click="goPrevTimelinePage">
              <text>上一组</text>
            </view>
            <text class="timeline-page-count">{{ timelinePage }} / {{ totalTimelinePages }}</text>
            <view class="timeline-page-btn" :class="{ disabled: timelinePage === totalTimelinePages }" @click="goNextTimelinePage">
              <text>下一组</text>
            </view>
          </view>
        </view>

        <!-- ===== 里程碑 ===== -->
        <view class="section-title">── 里程碑 ──</view>
        <view class="card milestone-card">
          <view
            v-for="(m, idx) in milestones"
            :key="idx"
            class="milestone-row"
            :class="{ 'milestone-locked': !m.done }"
          >
            <view class="milestone-left">
              <DoodleIcon
                :name="m.done ? 'target' : 'lock'"
                :size="40"
                :color="m.done ? '#5BBF8E' : '#AE9D92'"
                class="milestone-icon"
              />
              <view
                class="milestone-dot"
                :style="{ background: m.done ? '#5BBF8E' : '#D0C8C0' }"
              ></view>
              <text class="milestone-name">{{ m.name }}</text>
            </view>
            <text class="milestone-date" :style="{ color: m.done ? '#5BBF8E' : '#AE9D92' }">
              {{ m.done ? m.date : '???' }}
            </text>
          </view>
        </view>

        <!-- 底部留白 -->
        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getGrowthData } from '@/services/api/user'
import type { GrowthData } from '@/services/api/user'

// ===== XP / 等级 =====
const growth = ref<GrowthData | null>(null)
const currentXP = computed(() => growth.value?.xpInCurrentLevel || 0)
const nextLevelXP = computed(() => growth.value
  ? Math.max(1, growth.value.nextLevelXp - growth.value.currentLevelXp)
  : 100
)
const xpPercent = computed(() => growth.value?.progressPercent || 0)

// ===== 技能数据 =====
const skills = computed(() => growth.value?.skills || [])
const visibleBreakdown = computed(() => {
  return (growth.value?.xpBreakdown || []).filter(item => item.xp > 0)
})

function skillColor(v: number): string {
  if (v > 80) return '#E8855A'
  if (v >= 60) return '#5BBF8E'
  return '#6B8EC4'
}

// ===== 成长曲线 =====
const weeks = computed(() => {
  const chart = growth.value?.chart || []
  return chart.slice(-7)
})
const maxChartXp = computed(() => Math.max(1, ...weeks.value.map(w => w.xp)))

// ===== 里程碑 =====
const milestones = computed(() => growth.value?.milestones || [])
const timeline = computed(() => growth.value?.timeline || [])
const TIMELINE_PAGE_SIZE = 5
const timelinePage = ref(1)
const totalTimelinePages = computed(() => Math.max(1, Math.ceil(timeline.value.length / TIMELINE_PAGE_SIZE)))
const pagedTimeline = computed(() => {
  const start = (timelinePage.value - 1) * TIMELINE_PAGE_SIZE
  return timeline.value.slice(start, start + TIMELINE_PAGE_SIZE)
})

function formatNumber(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function goPrevTimelinePage() {
  if (timelinePage.value > 1) {
    timelinePage.value -= 1
  }
}

function goNextTimelinePage() {
  if (timelinePage.value < totalTimelinePages.value) {
    timelinePage.value += 1
  }
}

// ===== 滚动高度 =====
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
  try {
    growth.value = await getGrowthData()
  } catch {
    growth.value = null
    uni.showToast({ title: '成长数据加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
/* ===== 页面 ===== */
.page {
  background: #FDF8F3;
}

.scroll-area {
}

.content {
  padding: 16rpx 32rpx 0;
}

/* ===== 卡片通用 ===== */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 32rpx;
  margin-bottom: 24rpx;
}

/* ===== 分区标题 ===== */
.section-title {
  font-size: 26rpx;
  color: #AE9D92;
  text-align: center;
  letter-spacing: 4rpx;
  margin-bottom: 20rpx;
}

/* ===== 等级卡片 ===== */
.level-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.level-star {
  display: flex;
  align-items: center;
}

.level-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2C1F14;
}

.xp-bar-wrap {
  margin-bottom: 12rpx;
}

.xp-bar-bg {
  width: 100%;
  height: 16rpx;
  background: #F0EAE4;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 10rpx;
}

.xp-bar-fill {
  height: 100%;
  background: #E8855A;
  border-radius: 8rpx;
  transition: width 0.6s ease;
}

.xp-text {
  font-size: 22rpx;
  color: #4A3628;
  font-weight: 600;
}

.xp-hint {
  font-size: 22rpx;
  color: #AE9D92;
  margin-bottom: 28rpx;
  display: block;
}

.level-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.stat-divider {
  width: 1rpx;
  height: 28rpx;
  background: #E8E0D8;
  margin: 0 16rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #AE9D92;
}

.stat-val {
  color: #4A3628;
  font-weight: 600;
}

.stat-sep {
  color: #D0C8C0;
  font-size: 22rpx;
}

/* ===== 今日成长 ===== */
.today-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.today-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.today-xp {
  font-size: 42rpx;
  color: #E8855A;
  font-weight: 800;
}

.today-label {
  font-size: 24rpx;
  color: #8A7568;
  line-height: 1.45;
}

.breakdown-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.breakdown-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #FFF6EE;
  border: 1rpx solid rgba(232, 133, 90, 0.16);
}

.breakdown-name {
  font-size: 22rpx;
  color: #8A7568;
}

.breakdown-xp {
  font-size: 22rpx;
  color: #E8855A;
  font-weight: 700;
}

/* ===== 技能卡片 ===== */
.skill-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.skill-label {
  font-size: 24rpx;
  color: #4A3628;
  width: 70rpx;
  flex-shrink: 0;
}

.skill-bar-bg {
  flex: 1;
  height: 14rpx;
  background: #F0EAE4;
  border-radius: 7rpx;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  border-radius: 7rpx;
  transition: width 0.6s ease;
}

.skill-value {
  font-size: 22rpx;
  color: #4A3628;
  font-weight: 600;
  width: 48rpx;
  text-align: right;
  flex-shrink: 0;
}

/* ===== 成长曲线 ===== */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 280rpx;
  padding-top: 40rpx;
  position: relative;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}

.bar-pct {
  font-size: 20rpx;
  color: #4A3628;
  font-weight: 600;
  margin-bottom: 8rpx;
  flex-shrink: 0;
}

.bar-outer {
  flex: 1;
  width: 48rpx;
  background: #F0EAE4;
  border-radius: 8rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bar-inner {
  width: 100%;
  background: linear-gradient(180deg, #E8855A 0%, #F0A878 100%);
  border-radius: 8rpx 8rpx 0 0;
  transition: height 0.6s ease;
}

.bar-label {
  font-size: 22rpx;
  color: #AE9D92;
  margin-top: 10rpx;
  flex-shrink: 0;
}

/* ===== 里程碑 ===== */
.milestone-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #F5EFE9;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.milestone-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.milestone-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.milestone-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.milestone-name {
  font-size: 26rpx;
  color: #2C1F14;
}

.milestone-locked .milestone-name {
  color: #AE9D92;
}

.milestone-date {
  font-size: 22rpx;
  font-weight: 600;
}

/* ===== 成长轨迹 ===== */
.timeline-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.timeline-row {
  display: flex;
  gap: 16rpx;
}

.timeline-dot {
  width: 18rpx;
  height: 18rpx;
  margin-top: 8rpx;
  border-radius: 50%;
  background: #E8855A;
  flex-shrink: 0;
}

.timeline-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #F5EFE9;
}

.timeline-row:last-child .timeline-body {
  border-bottom: none;
  padding-bottom: 0;
}

.timeline-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.timeline-title {
  font-size: 26rpx;
  color: #2C1F14;
  font-weight: 700;
}

.timeline-xp {
  font-size: 22rpx;
  color: #E8855A;
  font-weight: 700;
  flex-shrink: 0;
}

.timeline-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #8A7568;
  line-height: 1.45;
}

.timeline-date {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #AE9D92;
}

.empty-hint {
  font-size: 24rpx;
  color: #AE9D92;
  line-height: 1.5;
}

.timeline-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
  padding-top: 6rpx;
}

.timeline-page-btn {
  flex: 1;
  height: 62rpx;
  border-radius: 18rpx;
  background: #FFF6EE;
  color: #E8855A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
  font-weight: 700;
}

.timeline-page-btn.disabled {
  opacity: 0.38;
}

.timeline-page-count {
  min-width: 82rpx;
  text-align: center;
  font-size: 22rpx;
  color: #AE9D92;
  font-weight: 700;
}

/* ===== 底部留白 ===== */
.bottom-spacer {
  height: 48rpx;
}
</style>
