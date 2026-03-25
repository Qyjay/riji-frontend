<template>
  <view class="page page-root">
    <CustomNavBar title="今日运势" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="page-scroll" :style="{ height: scrollHeight + 'px' }">
      <!-- 主卡片 -->
      <view class="main-card">
        <DoodleIcon name="crystal" :size="112" color="rgba(255,255,255,0.85)" class="main-crystal" />
        <view class="main-stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star-icon"
            :class="{ 'star-icon--filled': i <= fortune.overall }"
          >★</text>
        </view>
        <text class="main-title">今日运势</text>
        <text class="main-score">综合指数 {{ overallScore }}/100</text>
      </view>

      <!-- 详细分析 -->
      <view class="section-label">详细分析</view>
      <view class="analysis-card">
        <view class="analysis-item">
          <view class="analysis-header">
            <DoodleIcon name="book" :size="36" color="#6B8EC4" class="analysis-emoji" />
            <text class="analysis-name">学业运</text>
            <view class="analysis-stars">
              <text
                v-for="i in 5"
                :key="i"
                class="mini-star"
                :class="{ 'mini-star--filled': i <= fortune.study }"
              >★</text>
            </view>
          </view>
          <text class="analysis-desc">适合攻克难题，避免分心</text>
        </view>
        <view class="analysis-divider" />
        <view class="analysis-item">
          <view class="analysis-header">
            <DoodleIcon name="heart" :size="36" color="#E8A4B8" class="analysis-emoji" />
            <text class="analysis-name">社交运</text>
            <view class="analysis-stars">
              <text
                v-for="i in 5"
                :key="i"
                class="mini-star"
                :class="{ 'mini-star--filled': i <= fortune.social }"
              >★</text>
            </view>
          </view>
          <text class="analysis-desc">可能遇到志同道合的人</text>
        </view>
        <view class="analysis-divider" />
        <view class="analysis-item">
          <view class="analysis-header">
            <DoodleIcon name="run" :size="36" color="#5BBF8E" class="analysis-emoji" />
            <text class="analysis-name">健康运</text>
            <view class="analysis-stars">
              <text
                v-for="i in 5"
                :key="i"
                class="mini-star"
                :class="{ 'mini-star--filled': i <= fortune.health }"
              >★</text>
            </view>
          </view>
          <text class="analysis-desc">注意休息，适量运动</text>
        </view>
        <view class="analysis-divider" />
        <!-- 幸运指引 -->
        <view class="luck-section">
          <text class="luck-title">幸运指引</text>
          <view class="luck-items">
            <view class="luck-item">
              <text class="luck-label">幸运色</text>
              <view class="luck-color-wrap">
                <view class="luck-color-dot" :style="{ background: luckyColorHex }" />
                <text class="luck-value">{{ fortune.luckyColor }}</text>
              </view>
            </view>
            <view class="luck-item">
              <text class="luck-label">幸运数字</text>
              <text class="luck-value">{{ fortune.luckyNumber }}</text>
            </view>
            <view class="luck-item">
              <text class="luck-label">幸运食物</text>
              <text class="luck-value">酸菜鱼</text>
            </view>
          </view>
        </view>
      </view>

      <!-- AI 日记建议 -->
      <view class="section-label">AI 日记建议</view>
      <view class="suggest-card">
        <text class="suggest-quote">"{{ aiSuggestion }}"</text>
      </view>

      <!-- 分享按钮 -->
      <view class="share-btn" @click="handleShare">
        <DoodleIcon name="share" :size="36" color="#FFFFFF" style="margin-right: 12rpx;" />
        <text class="share-btn-text">分享运势卡</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { generateFortune } from '@/services/api/ai'
import type { Fortune } from '@/services/api/ai'
import DoodleIcon from '@/components/DoodleIcon.vue'

const fortune = ref<Fortune>({
  overall: 4,
  study: 4,
  social: 5,
  health: 3,
  tip: '今天适合去图书馆',
  luckyColor: '暖橙色',
  luckyNumber: 7,
})

const overallScore = computed(() => fortune.value.overall * 20)

const luckyColorHex = computed(() => {
  const colorMap: Record<string, string> = {
    '暖橙色': '#E8855A',
    '天空蓝': '#6B8EC4',
    '森林绿': '#5BBF8E',
    '玫瑰粉': '#E8A4B8',
    '阳光黄': '#E8C44E',
  }
  return colorMap[fortune.value.luckyColor] ?? '#E8855A'
})

const aiSuggestion = computed(() =>
  `根据你最近的日记和今日运势：今天适合去图书馆自习，学业运旺盛，效率会很高。记得带个小零食补充能量～ 🍵`
)

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
  try {
    fortune.value = await generateFortune()
  } catch {
    // keep default null, UI shows skeleton/empty state
  }
})
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 32rpx 32rpx 64rpx;
}

.main-card {
  background: linear-gradient(135deg, #2C1F14 0%, #5C3D2E 50%, #E8855A 100%);
  border-radius: 32rpx;
  padding: 64rpx 48rpx 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 8px 32px rgba(44, 31, 20, 0.25);
  margin-bottom: 40rpx;
}

.main-crystal { display: flex; align-items: center; justify-content: center; line-height: 1; }

.main-stars {
  display: flex;
  gap: 8rpx;
}

.star-icon {
  font-size: 44rpx;
  color: rgba(255, 255, 255, 0.3);
}

.star-icon--filled {
  color: #FFD700;
}

.main-title {
  font-size: 32rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.90);
}

.main-score {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.section-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #AE9D92;
  margin-bottom: 20rpx;
  margin-top: 8rpx;
}

.analysis-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 40rpx;
}

.analysis-item {
  padding: 32rpx 36rpx;
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.analysis-emoji { display: flex; align-items: center; }

.analysis-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
}

.analysis-stars {
  display: flex;
  gap: 2rpx;
}

.mini-star {
  font-size: 26rpx;
  color: #E8DDD5;
}

.mini-star--filled {
  color: #E8A94E;
}

.analysis-desc {
  font-size: 26rpx;
  color: #857268;
  padding-left: 52rpx;
}

.analysis-divider {
  height: 2rpx;
  background: rgba(44, 31, 20, 0.05);
  margin: 0 36rpx;
}

.luck-section {
  padding: 32rpx 36rpx;
  background: #FDF8F3;
}

.luck-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C1F14;
  display: block;
  margin-bottom: 24rpx;
}

.luck-items {
  display: flex;
  justify-content: space-between;
}

.luck-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.luck-label {
  font-size: 22rpx;
  color: #AE9D92;
}

.luck-color-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.luck-color-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.luck-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C1F14;
}

.suggest-card {
  background: #FDF0E8;
  border-radius: 16rpx;
  padding: 36rpx 40rpx;
  margin-bottom: 40rpx;
  border-left: 4rpx solid #E8855A;
}

.suggest-quote {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.8;
}

.share-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 40rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(232, 133, 90, 0.35);
  &:active { transform: scale(0.98); }
}

.share-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
