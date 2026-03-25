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
            <text class="level-title">探索者 Lv.12</text>
          </view>

          <!-- XP 进度条 -->
          <view class="xp-bar-wrap">
            <view class="xp-bar-bg">
              <view class="xp-bar-fill" :style="{ width: xpPercent + '%' }"></view>
            </view>
            <text class="xp-text">2450 / 3000 XP</text>
          </view>
          <text class="xp-hint">再写 18 篇日记升至 Lv.13</text>

          <!-- 底部统计 -->
          <view class="level-stats">
            <view class="stat-group">
              <text class="stat-item">总日记 <text class="stat-val">127</text></text>
              <text class="stat-sep">·</text>
              <text class="stat-item">总字数 <text class="stat-val">45.2k</text></text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-group">
              <text class="stat-item">连续打卡 <text class="stat-val">7 天</text></text>
              <text class="stat-sep">·</text>
              <text class="stat-item">最长 <text class="stat-val">23 天</text></text>
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
              <text class="bar-pct">{{ week.pct }}%</text>
              <view class="bar-outer">
                <view
                  class="bar-inner"
                  :style="{ height: (week.pct / maxPct * 100) + '%' }"
                ></view>
              </view>
              <text class="bar-label">{{ week.label }}</text>
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

// ===== XP / 等级 =====
const currentXP = 2450
const nextLevelXP = 3000
const xpPercent = computed(() => Math.round((currentXP / nextLevelXP) * 100))

// ===== 技能数据 =====
const skills = [
  { name: '写作', value: 85 },
  { name: '学习', value: 72 },
  { name: '社交', value: 45 },
  { name: '运动', value: 38 },
  { name: '创造', value: 65 },
  { name: '情感', value: 78 },
]

function skillColor(v: number): string {
  if (v > 80) return '#E8855A'
  if (v >= 60) return '#5BBF8E'
  return '#6B8EC4'
}

// ===== 成长曲线 =====
const weeks = [
  { label: 'W1', pct: 80 },
  { label: 'W2', pct: 95 },
  { label: 'W3', pct: 60 },
  { label: 'W4', pct: 75 },
]
const maxPct = computed(() => Math.max(...weeks.map(w => w.pct)))

// ===== 里程碑 =====
const milestones = [
  { name: '第 1 篇日记',  done: true,  date: '3月1日'  },
  { name: '连续 7 天',    done: true,  date: '3月7日'  },
  { name: '第 50 篇',     done: true,  date: '3月10日' },
  { name: '第 100 篇',    done: true,  date: '3月18日' },
  { name: '第 200 篇',    done: false, date: ''        },
  { name: 'Lv.20',        done: false, date: ''        },
]

// ===== 滚动高度 =====
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
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

/* ===== 底部留白 ===== */
.bottom-spacer {
  height: 48rpx;
}
</style>
