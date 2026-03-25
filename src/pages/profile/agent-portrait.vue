<template>
  <view class="page-container">
    <CustomNavBar title="AI 智能体画像" leftIcon="back" @leftClick="uni.navigateBack()" />

    <view class="nav-placeholder" :style="{ height: navBarHeight + 'px' }" />

    <scroll-view scroll-y class="scroll-area" :style="{ height: scrollHeight + 'px' }">
      <view class="content-wrap">

        <!-- ── AI 头像区 ── -->
        <view class="card avatar-card">
          <DoodleIcon name="robot" :size="120" color="#E8855A" class="avatar-emoji" />
          <text class="avatar-tagline">AI 伙伴 · 已陪伴 23 天</text>
          <text class="avatar-understand">了解你 85%</text>
          <view class="progress-track">
            <view class="progress-fill" style="width: 85%;" />
          </view>
        </view>

        <!-- ── 兴趣标签云 ── -->
        <view class="card">
          <text class="card-section-title">── 兴趣标签云 ──</text>
          <view class="tag-cloud">
            <view
              v-for="tag in tags"
              :key="tag.label"
              class="tag"
              :class="tag.level"
            >
              <text :class="'tag-text tag-text-' + tag.level">
                {{ tag.label }} {{ tag.pct }}%
              </text>
            </view>
          </view>
        </view>

        <!-- ── 性格分析 ── -->
        <view class="card">
          <text class="card-section-title">── 性格分析 ──</text>
          <view class="traits-list">
            <view v-for="trait in traits" :key="trait.label" class="trait-row">
              <text class="trait-label">{{ trait.label }}</text>
              <view class="trait-track">
                <view
                  class="trait-fill"
                  :style="{
                    width: trait.value + '%',
                    background: traitColor(trait.value),
                  }"
                />
              </view>
              <text class="trait-pct">{{ trait.value }}%</text>
            </view>
          </view>
        </view>

        <!-- ── 日记风格偏好 ── -->
        <view class="card">
          <text class="card-section-title">── 日记风格偏好 ──</text>
          <view class="pref-list">
            <view v-for="pref in diaryPrefs" :key="pref.label" class="pref-row">
              <DoodleIcon :name="pref.iconName" :size="40" :color="pref.iconColor" class="pref-icon" />
              <text class="pref-label">{{ pref.label }}</text>
              <text class="pref-value">{{ pref.value }}</text>
            </view>
          </view>
        </view>

        <!-- ── 隐私设置 ── -->
        <view class="card">
          <text class="card-section-title">── 隐私设置 ──</text>
          <view class="privacy-list">
            <view v-for="sw in switchSettings" :key="sw.label" class="privacy-row">
              <text class="privacy-label">{{ sw.label }}</text>
              <switch
                :checked="sw.value"
                checked-color="#E8855A"
                @change="sw.value = $event.detail.value"
              />
            </view>

            <!-- 数据保留期限 -->
            <view class="privacy-row">
              <text class="privacy-label">数据保留期限</text>
              <picker
                :value="retentionIndex"
                :range="retentionOptions"
                @change="retentionIndex = Number($event.detail.value)"
              >
                <view class="picker-display">
                  <text class="picker-text">{{ retentionOptions[retentionIndex] }}</text>
                  <text class="picker-arrow">›</text>
                </view>
              </picker>
            </view>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

const navBarHeight = ref(88)
const scrollHeight = ref(600)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navBarHeight.value - 0
})

// ─── 兴趣标签 ───
interface Tag {
  label: string
  pct: number
  level: 'high' | 'mid' | 'low'
}

const tags: Tag[] = [
  { label: '美食',  pct: 35, level: 'high' },
  { label: '学习',  pct: 28, level: 'high' },
  { label: '编程',  pct: 25, level: 'high' },
  { label: '运动',  pct: 15, level: 'mid' },
  { label: '音乐',  pct: 12, level: 'mid' },
  { label: '阅读',  pct: 18, level: 'mid' },
  { label: '游戏',  pct: 10, level: 'mid' },
  { label: '社交',  pct: 8,  level: 'mid' },
  { label: '旅行',  pct: 5,  level: 'low' },
  { label: '摄影',  pct: 5,  level: 'low' },
  { label: '电影',  pct: 5,  level: 'low' },
  { label: '写作',  pct: 5,  level: 'low' },
]

// ─── 性格维度 ───
interface Trait {
  label: string
  value: number
}

const traits: Trait[] = [
  { label: '外向性', value: 78 },
  { label: '尽责性', value: 92 },
  { label: '开放性', value: 82 },
  { label: '亲和性', value: 88 },
  { label: '情绪稳定', value: 65 },
]

function traitColor(val: number): string {
  if (val < 60) return '#6B8EC4'
  if (val <= 80) return '#5BBF8E'
  return '#E8855A'
}

// ─── 日记风格偏好 ───
const diaryPrefs = [
  { iconName: 'heart',  iconColor: '#E8855A', label: '最爱话题',  value: '美食 (35%)' },
  { iconName: 'book',   iconColor: '#6B8EC4', label: '常记时段',  value: '21:00-22:00' },
  { iconName: 'pen',    iconColor: '#5BBF8E', label: '平均字数',  value: '156字/篇' },
  { iconName: 'camera', iconColor: '#AE9D92', label: '配图率',    value: '68%' },
  { iconName: 'star',   iconColor: '#E8C44E', label: '主旋律',    value: '积极向上' },
]

// ─── 隐私开关 ───
const switchSettings = reactive([
  { label: '允许 AI 分析日记',  value: true },
  { label: '允许推荐搭子',       value: true },
  { label: '显示性格分析',       value: true },
])

// ─── 数据保留期限 ───
const retentionOptions = ['30天', '90天', '180天', '365天']
const retentionIndex = ref(2) // 默认 180天
</script>

<style scoped>
/* ── 整体 ── */
.page-container {
  background-color: #FDF8F3;
}

.nav-placeholder {
}

.scroll-area {
}

.content-wrap {
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* ── 卡片通用 ── */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 36rpx 32rpx;
}

.card-section-title {
  display: block;
  font-size: 26rpx;
  color: #AE9D92;
  letter-spacing: 4rpx;
  text-align: center;
  margin-bottom: 32rpx;
}

/* ── AI 头像区 ── */
.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 40rpx;
}

.avatar-emoji {
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-tagline {
  font-size: 28rpx;
  color: #4A3628;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.avatar-understand {
  font-size: 24rpx;
  color: #AE9D92;
  margin-bottom: 20rpx;
}

.progress-track {
  width: 100%;
  height: 12rpx;
  background: #F0EAE4;
  border-radius: 100rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A 0%, #D4645C 100%);
  border-radius: 100rpx;
}

/* ── 兴趣标签云 ── */
.tag-cloud {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  border-radius: 100rpx;
  padding: 10rpx 22rpx;
}

.tag.high {
  background: #FDF0E8;
}

.tag.mid {
  background: #F5F2EF;
}

.tag.low {
  background: #ECEAE8;
}

.tag-text {
  font-weight: 500;
}

.tag-text-high {
  font-size: 28rpx;
  color: #E8855A;
}

.tag-text-mid {
  font-size: 26rpx;
  color: #4A3628;
}

.tag-text-low {
  font-size: 24rpx;
  color: #AE9D92;
}

/* ── 性格分析 ── */
.traits-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.trait-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.trait-label {
  font-size: 26rpx;
  color: #4A3628;
  width: 120rpx;
  flex-shrink: 0;
}

.trait-track {
  flex: 1;
  height: 12rpx;
  background: #F0EAE4;
  border-radius: 100rpx;
  overflow: hidden;
}

.trait-fill {
  height: 100%;
  border-radius: 100rpx;
  transition: width 0.5s ease;
}

.trait-pct {
  font-size: 24rpx;
  color: #AE9D92;
  width: 72rpx;
  text-align: right;
  flex-shrink: 0;
}

/* ── 日记风格偏好 ── */
.pref-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pref-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid rgba(174, 157, 146, 0.12);
  gap: 16rpx;
}

.pref-row:last-child {
  border-bottom: none;
}

.pref-icon {
  display: flex;
  align-items: center;
  width: 48rpx;
  text-align: center;
  flex-shrink: 0;
}

.pref-label {
  font-size: 26rpx;
  color: #4A3628;
  flex: 1;
}

.pref-value {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 500;
}

/* ── 隐私设置 ── */
.privacy-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.privacy-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1px solid rgba(174, 157, 146, 0.12);
}

.privacy-row:last-child {
  border-bottom: none;
}

.privacy-label {
  font-size: 28rpx;
  color: #2C1F14;
}

.picker-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6rpx;
  background: #FDF0E8;
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
}

.picker-text {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 500;
}

.picker-arrow {
  font-size: 28rpx;
  color: #E8855A;
}

/* ── 底部安全距离 ── */
.bottom-safe {
  height: 60rpx;
}
</style>
