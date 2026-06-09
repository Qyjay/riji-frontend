<template>
  <view class="page">
    <CustomNavBar title="我的成就" left-icon="back" />

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="scroll-area" :style="{ height: scrollHeight + 'px' }">
      <view class="content">

        <!-- ===== 顶部统计卡片 ===== -->
        <view class="card summary-card doodle-box-v2">
          <view class="summary-header">
            <view class="summary-title-row">
              <DoodleIcon name="trophy" color="#C8A86B" :size="40" />
              <text class="summary-title">已解锁</text>
            </view>
            <text class="summary-count"><text class="count-num">{{ unlockedAch }}</text> / {{ totalAch }}</text>
          </view>
          <view class="progress-bar-bg">
            <view class="progress-bar-fill" :style="{ width: unlockPercent + '%' }"></view>
          </view>
          <text class="progress-pct">{{ unlockPercent }}% 已解锁</text>
        </view>

        <!-- ===== 分类成就 ===== -->
        <view
          v-for="cat in categories"
          :key="cat.name"
          class="card cat-card"
        >
          <!-- 分类标题 -->
          <view class="cat-title-row">
            <view class="cat-line"></view>
            <text class="cat-title">{{ cat.name }}</text>
            <view class="cat-line"></view>
          </view>

          <!-- 成就网格 -->
          <view class="ach-grid">
            <view
              v-for="ach in cat.achievements"
              :key="ach.id"
              class="ach-card press-feedback"
              :class="{
                'ach-unlocked': ach.unlocked,
                'ach-locked': !ach.unlocked
              }"
              @click="handleAchClick(ach)"
            >
              <!-- 解锁徽章 -->
              <view v-if="ach.unlocked" class="ach-badge">
                <DoodleIcon name="check" color="#6BA87B" :size="24" :filtered="false" />
              </view>

              <!-- Icon -->
              <view class="ach-icon-wrap" :class="ach.unlocked ? 'ach-icon-unlocked' : 'ach-icon-locked'">
                <text class="ach-emoji" :class="{ 'ach-emoji-locked': !ach.unlocked }">{{ ach.icon }}</text>
              </view>

              <!-- 名称 -->
              <text class="ach-name">{{ ach.title }}</text>

              <!-- 描述 -->
              <text class="ach-desc">{{ ach.description }}</text>
            </view>
          </view>
        </view>

        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getAchievements, type Achievement as ApiAchievement } from '@/services/api/user'

// ===== 滚动高度 =====
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
  loadAchievements()
})

interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  unlocked: boolean
  unlockedAt?: number
}

interface Category {
  name: string
  achievements: Achievement[]
}

// 成就 ID → 分类映射
const CATEGORY_OF: Record<string, string> = {
  first_diary: '日记达人', diary_7: '日记达人', diary_30: '日记达人', diary_100: '日记达人',
  streak_14: '日记达人', streak_30: '日记达人', night_owl: '日记达人', early_bird: '日记达人',
  first_material: '素材收集', material_50: '素材收集', first_extract: '素材收集',
  first_pomodoro: '学习之星', pomodoro_10: '学习之星', pomodoro_50: '学习之星',
  first_comic: '创意达人', first_novel: '创意达人', first_share: '创意达人', style_variety: '创意达人',
  emotion_happy: '情绪探索',
  social_match: '社交蝴蝶', ai_chat_10: '社交蝴蝶',
  first_anniversary: '生活记录', portrait_complete: '生活记录', semester_report: '生活记录',
}
const CATEGORY_ORDER = ['日记达人', '学习之星', '素材收集', '创意达人', '情绪探索', '社交蝴蝶', '生活记录', '其他']

const allAchievements = ref<Achievement[]>([])

const totalAch = computed(() => allAchievements.value.length)
const unlockedAch = computed(() => allAchievements.value.filter(a => a.unlocked).length)
const unlockPercent = computed(() =>
  totalAch.value === 0 ? 0 : Math.round((unlockedAch.value / totalAch.value) * 100)
)

const categories = computed<Category[]>(() => {
  const map: Record<string, Achievement[]> = {}
  allAchievements.value.forEach(a => {
    const cat = CATEGORY_OF[a.id] ?? '其他'
    ;(map[cat] ||= []).push(a)
  })
  return CATEGORY_ORDER
    .filter(name => map[name]?.length)
    .map(name => ({ name, achievements: map[name] }))
})

async function loadAchievements() {
  try {
    const list = await getAchievements()
    allAchievements.value = list.map((a: ApiAchievement) => ({
      id: a.id,
      icon: a.icon,
      title: a.title,
      description: a.description,
      unlocked: a.unlocked,
      unlockedAt: a.unlockedAt,
    }))
  } catch (e) {
    allAchievements.value = []
  }
}

// ===== 点击成就 =====
function handleAchClick(ach: Achievement) {
  if (!ach.unlocked) return
  const dateStr = ach.unlockedAt
    ? new Date(ach.unlockedAt * 1000).toLocaleDateString('zh-CN')
    : ''
  uni.showModal({
    title: ach.title,
    content: dateStr ? `${ach.description}\n🗓️ 解锁于 ${dateStr}` : ach.description,
    confirmText: '知道了',
    showCancel: false,
  })
}
</script>

<style lang="scss" scoped>
/* ===== 页面 ===== */
.page {
  background: #FDF8F3;
}

.nav-placeholder {
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

/* ===== 顶部统计 ===== */
.summary-card {
  padding: 36rpx;
  border: 3rpx solid rgba(232, 133, 90, 0.15) !important;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.08) !important;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2C1F14;
}

.summary-count {
  font-size: 26rpx;
  color: #AE9D92;
}

.count-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #E8855A;
}

.progress-bar-bg {
  width: 100%;
  height: 16rpx;
  background: #F0EAE4;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A 0%, #F0A878 100%);
  border-radius: 8rpx;
  transition: width 0.6s ease;
}

.progress-pct {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ===== 分类标题 ===== */
.cat-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.cat-line {
  flex: 1;
  height: 1rpx;
  background: #E8E0D8;
}

.cat-title {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== 成就网格 ===== */
.ach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

/* ===== 成就卡片 ===== */
.ach-card {
  width: calc((100% - 32rpx) / 3);
  min-height: 200rpx;
  background: #FFFFFF;
  border-radius: 14rpx 18rpx 12rpx 16rpx;
  border: 1rpx solid #F0EAE4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 8rpx;
  position: relative;
  box-sizing: border-box;
  transition: transform 0.15s ease;
}

/* 已解锁 */
.ach-unlocked {
  background: #FFFFFF;
  border-color: rgba(232, 133, 90, 0.2);
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.08);
}

/* 未解锁 */
.ach-locked {
  opacity: 0.45;
  background: #FAFAFA;
}

/* 隐藏成就 */
.ach-hidden {
  opacity: 0.45;
  background: #F5F5F5;
  border-color: #E0E0E0;
}

/* 解锁徽章 */
.ach-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: rgba(107, 168, 123, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icon 容器 */
.ach-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx 16rpx 10rpx 14rpx;
  margin-bottom: 10rpx;
}

.ach-icon-unlocked {
  background: rgba(232, 133, 90, 0.08);
}

.ach-icon-locked {
  background: #F0EAE4;
}

.ach-emoji {
  font-size: 40rpx;
  line-height: 1;
}

.ach-emoji-locked {
  filter: grayscale(1);
  opacity: 0.6;
}

/* 成就名 */
.ach-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #2C1F14;
  text-align: center;
  margin-bottom: 6rpx;
  line-height: 1.3;
}

.ach-locked .ach-name,
.ach-hidden .ach-name {
  color: #AE9D92;
}

/* 描述/条件 */
.ach-desc {
  font-size: 18rpx;
  color: #AE9D92;
  text-align: center;
  line-height: 1.4;
  padding: 0 4rpx;
}

/* ===== 底部留白 ===== */
.bottom-spacer {
  height: 48rpx;
}
</style>
