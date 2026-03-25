<template>
  <view class="page">
    <CustomNavBar title="搭子匹配" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        class="tab-item press-feedback"
        :class="{ 'tab-active': activeTab === 'long' }"
        @click="activeTab = 'long'; swiperCurrent = 0"
      >
        <text class="tab-text">长期匹配</text>
        <view v-if="activeTab === 'long'" class="tab-indicator" />
      </view>
      <view
        class="tab-item press-feedback"
        :class="{ 'tab-active': activeTab === 'short' }"
        @click="activeTab = 'short'; swiperCurrent = 0"
      >
        <text class="tab-text">短期搭子</text>
        <view v-if="activeTab === 'short'" class="tab-indicator" />
      </view>
    </view>

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">

        <!-- ── 匹配推荐 ── -->
        <view class="section-card">
          <text class="section-title">── {{ activeTab === 'long' ? '长期匹配推荐' : '今日搭子推荐' }} ──</text>

          <swiper
            class="rec-swiper"
            :current="swiperCurrent"
            circular
            previous-margin="40rpx"
            next-margin="40rpx"
            @change="onSwiperChange"
          >
            <swiper-item
              v-for="user in currentRecommendations"
              :key="user.id"
              class="swiper-item-wrap"
            >
              <view class="rec-card">
                <!-- 头像区 -->
                <view class="rec-avatar-row">
                  <view class="rec-avatar">
                    <text class="rec-avatar-emoji">{{ user.avatar }}</text>
                  </view>
                  <view class="rec-avatar-info">
                    <text class="rec-name">{{ user.name }}</text>
                    <text class="rec-meta">{{ user.school }} · {{ user.major }}</text>
                    <text class="rec-grade">{{ user.grade }}</text>
                  </view>
                  <!-- 匹配度角标 -->
                  <view class="rec-score-badge">
                    <text class="rec-score-num">{{ user.matchScore }}</text>
                    <text class="rec-score-unit">%</text>
                  </view>
                </view>

                <!-- 匹配度进度条 -->
                <view class="rec-match-row">
                  <text class="rec-match-label">兼容度</text>
                  <view class="rec-progress-wrap">
                    <view
                      class="rec-progress-bar"
                      :style="{ width: user.matchScore + '%' }"
                    />
                  </view>
                  <text class="rec-match-score">{{ user.matchScore }}%</text>
                </view>

                <!-- 兴趣标签 -->
                <view class="rec-interests">
                  <view
                    v-for="tag in user.interests"
                    :key="tag"
                    class="rec-tag"
                  >
                    <text class="rec-tag-text">{{ tag }}</text>
                  </view>
                </view>

                <!-- 学习时段 -->
                <view class="rec-study-row">
                  <text class="rec-study-icon">⏰</text>
                  <text class="rec-study-text">{{ activeTab === 'long' ? '学习时段' : '可用时间' }}：{{ user.studyTime }}</text>
                </view>

                <!-- 操作按钮 -->
                <view class="rec-btns">
                  <view class="rec-btn rec-btn-primary" @click="onSayHi(user)">
                    <text class="rec-btn-text">{{ activeTab === 'long' ? '👋 打招呼' : '🤝 申请搭子' }}</text>
                  </view>
                  <view class="rec-btn rec-btn-report" @click="showMatchReport(user)">
                    <text class="rec-btn-text rec-btn-text-report">📊 报告</text>
                  </view>
                  <view class="rec-btn rec-btn-secondary" @click="onNext">
                    <text class="rec-btn-text rec-btn-text-sec">⏭ 下一位</text>
                  </view>
                </view>
              </view>
            </swiper-item>
          </swiper>
        </view>

        <!-- ── 我的搭子 ── -->
        <view class="section-card">
          <text class="section-title">── 我的搭子 ({{ buddies.length }}) ──</text>

          <view
            v-for="buddy in buddies"
            :key="buddy.id"
            class="buddy-row"
            :class="{ 'buddy-row-border': buddy.id > 1 }"
            @click="onBuddyClick(buddy.name)"
          >
            <view class="buddy-avatar">
              <text class="buddy-avatar-emoji">{{ buddy.avatar }}</text>
            </view>
            <view class="buddy-info">
              <text class="buddy-name">{{ buddy.name }}</text>
              <text class="buddy-type">{{ buddy.type }}</text>
            </view>
            <view class="buddy-right">
              <text class="buddy-last">{{ buddy.lastActive }}</text>
              <view class="buddy-status">
                <view
                  class="buddy-dot"
                  :class="buddy.online ? 'buddy-dot-online' : 'buddy-dot-offline'"
                />
                <text class="buddy-status-text" :class="buddy.online ? 'buddy-online-text' : ''">
                  {{ buddy.online ? '在线' : '离线' }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>

    <!-- ── 匹配报告弹窗 ── -->
    <view v-if="showReport" class="overlay" @click="showReport = false">
      <view class="report-sheet" @click.stop>
        <view class="report-header">
          <text class="report-title">AI 匹配报告</text>
          <view class="report-close press-feedback" @click="showReport = false">
            <text class="close-icon">✕</text>
          </view>
        </view>

        <view v-if="reportUser" class="report-user-row">
          <text class="report-avatar-text">{{ reportUser.avatar }}</text>
          <view class="report-user-info">
            <text class="report-name">{{ reportUser.name }}</text>
            <text class="report-meta">综合兼容度 {{ reportUser.matchScore }}%</text>
          </view>
        </view>

        <view class="report-dimensions">
          <view v-for="dim in reportDimensions" :key="dim.label" class="dim-row">
            <text class="dim-label">{{ dim.label }}</text>
            <view class="dim-bar-wrap">
              <view class="dim-bar" :style="{ width: dim.score + '%', background: dim.color }" />
            </view>
            <text class="dim-score">{{ dim.score }}%</text>
          </view>
        </view>

        <view class="report-analysis">
          <text class="analysis-title">AI 分析</text>
          <text class="analysis-text">{{ reportAnalysis }}</text>
        </view>

        <view v-if="activeTab === 'short'" class="apply-section">
          <text class="apply-label">申请理由（选填）</text>
          <input
            v-model="applyReason"
            class="apply-input"
            placeholder="告诉对方你想搭伴的原因..."
            :placeholder-style="'color: #D4C4B8;'"
          />
        </view>

        <view class="report-action-btn press-feedback" @click="confirmAction">
          <text class="report-action-text">{{ activeTab === 'long' ? '发送招呼' : '发送申请' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const activeTab = ref<'long' | 'short'>('long')

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 50 // tab bar height
})

// ── 推荐用户（长期匹配） ──
const recommendations = [
  {
    id: 1, name: '小明', avatar: '🧑‍🎓', school: '南开大学', major: '计算机科学',
    grade: '大三', matchScore: 92, interests: ['学习', '编程', '美食'], studyTime: '20:00-23:00',
  },
  {
    id: 2, name: '小红', avatar: '👩‍🎓', school: '天津大学', major: '软件工程',
    grade: '大二', matchScore: 87, interests: ['运动', '音乐', '美食'], studyTime: '19:00-22:00',
  },
  {
    id: 3, name: '小华', avatar: '🧑‍💻', school: '南开大学', major: '人工智能',
    grade: '研一', matchScore: 85, interests: ['编程', '阅读', '写作'], studyTime: '21:00-00:00',
  },
]

// ── 短期搭子推荐 ──
const shortTermRecs = [
  {
    id: 11, name: '阿楠', avatar: '🧑‍🍳', school: '南开大学', major: '经济学',
    grade: '大四', matchScore: 88, interests: ['美食探店', '下午茶'], studyTime: '今日空闲 14:00-17:00',
  },
  {
    id: 12, name: '晓雯', avatar: '👩‍🎨', school: '天津美院', major: '设计',
    grade: '研二', matchScore: 76, interests: ['展览', '摄影', '骑行'], studyTime: '今日空闲 周末全天',
  },
]

const currentRecommendations = computed(() =>
  activeTab.value === 'long' ? recommendations : shortTermRecs
)

// ── 我的搭子 ──
const buddies = [
  { id: 1, name: '小明', avatar: '🧑‍🎓', type: '学习搭子', lastActive: '今天 14:30', online: true },
  { id: 2, name: '小红', avatar: '🏃', type: '运动搭子', lastActive: '昨天 06:30', online: false },
  { id: 3, name: '小华', avatar: '🍳', type: '美食搭子', lastActive: '3月21日', online: false },
]

// ── Swiper ──
const swiperCurrent = ref(0)

function onSwiperChange(e: any) {
  swiperCurrent.value = e.detail.current
}

function onNext() {
  const len = currentRecommendations.value.length
  swiperCurrent.value = (swiperCurrent.value + 1) % len
}

// ── 匹配报告 ──
const showReport = ref(false)
const reportUser = ref<any>(null)
const applyReason = ref('')

const reportDimensions = computed(() => {
  if (!reportUser.value) return []
  const base = reportUser.value.matchScore
  return [
    { label: '学习风格', score: Math.min(99, base + 3), color: '#E8855A' },
    { label: '兴趣爱好', score: Math.min(99, base - 5), color: '#6B8EC4' },
    { label: '作息时间', score: Math.min(99, base + 8), color: '#5BBF8E' },
    { label: '情绪状态', score: Math.min(99, base - 2), color: '#C8A86B' },
  ]
})

const reportAnalysis = computed(() => {
  if (!reportUser.value) return ''
  return `根据你们的日记内容和生活记录，${reportUser.value.name}与你在学习方式和兴趣爱好上高度契合。你们都喜欢在晚间学习，情绪状态也比较稳定。建议你们可以先从线上互动开始，慢慢建立联系。`
})

function showMatchReport(user: any) {
  reportUser.value = user
  showReport.value = true
}

function onSayHi(user: any) {
  if (activeTab.value === 'short') {
    showMatchReport(user)
  } else {
    uni.showToast({ title: `已向 ${user.name} 打招呼！`, icon: 'success' })
  }
}

function confirmAction() {
  showReport.value = false
  if (activeTab.value === 'short') {
    uni.showToast({ title: `搭子申请已发送！`, icon: 'success' })
  } else {
    uni.showToast({ title: `招呼已发出！`, icon: 'success' })
  }
}

function onBuddyClick(name: string) {
  uni.showToast({ title: `${name}的聊天功能开发中`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {}

/* Tab 切换 */
.tab-bar {
  display: flex;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(44, 31, 20, 0.06);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0 0;
  position: relative;
  cursor: pointer;
}

.tab-text {
  font-size: 28rpx;
  color: #AE9D92;
  font-weight: 500;
  padding-bottom: 16rpx;
  .tab-active & { color: #E8855A; font-weight: 700; }
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 4rpx;
  width: 60rpx;
  background: #E8855A;
  border-radius: 2rpx 2rpx 0 0;
}

.scroll {}

.content {
  padding: 24rpx 32rpx 0;
}

/* 分组卡片 */
.section-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 0 32rpx 32rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.section-title {
  display: block;
  font-size: 24rpx;
  color: #AE9D92;
  font-weight: 600;
  letter-spacing: 2rpx;
  text-align: center;
  padding: 24rpx 0 20rpx;
}

/* ── Swiper ── */
.rec-swiper {
  height: 660rpx;
  margin: 0 -20rpx;
}

.swiper-item-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16rpx;
  height: 100%;
}

/* 推荐卡片 */
.rec-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(232, 133, 90, 0.12);
  padding: 40rpx;
  border: 1.5rpx solid rgba(232, 133, 90, 0.1);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  height: 620rpx;
  box-sizing: border-box;
}

/* 头像行 */
.rec-avatar-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
}

.rec-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #FDF0E8 0%, #FEF3EE 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rec-avatar-emoji {
  font-size: 88rpx;
  line-height: 1;
}

.rec-avatar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.rec-name {
  font-size: 40rpx;
  color: #2C1F14;
  font-weight: 700;
}

.rec-meta {
  font-size: 26rpx;
  color: #4A3628;
}

.rec-grade {
  font-size: 24rpx;
  color: #AE9D92;
}

.rec-score-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #E8855A 0%, #F0A882 100%);
  border-radius: 16rpx;
  padding: 8rpx 16rpx;
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.rec-score-num {
  font-size: 36rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.rec-score-unit {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 匹配度进度条 */
.rec-match-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.rec-match-label {
  font-size: 26rpx;
  color: #AE9D92;
  width: 64rpx;
  flex-shrink: 0;
}

.rec-progress-wrap {
  flex: 1;
  height: 8rpx;
  background: #F5EDE4;
  border-radius: 9999rpx;
  overflow: hidden;
}

.rec-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #E8855A 0%, #F0A882 100%);
  border-radius: 9999rpx;
  transition: width 0.6s ease;
}

.rec-match-score {
  font-size: 26rpx;
  color: #E8855A;
  font-weight: 600;
  width: 56rpx;
  text-align: right;
  flex-shrink: 0;
}

/* 兴趣标签 */
.rec-interests {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.rec-tag {
  background: rgba(232, 133, 90, 0.1);
  border-radius: 12rpx;
  padding: 8rpx 20rpx;
}

.rec-tag-text {
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 500;
}

/* 学习时段 */
.rec-study-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
}

.rec-study-icon {
  font-size: 32rpx;
}

.rec-study-text {
  font-size: 26rpx;
  color: #4A3628;
}

/* 操作按钮 */
.rec-btns {
  display: flex;
  gap: 12rpx;
  margin-top: auto;
}

.rec-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.1s;

  &:active {
    opacity: 0.8;
    transform: scale(0.97);
  }
}

.rec-btn-primary {
  background: linear-gradient(135deg, #E8855A 0%, #F0A882 100%);
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.3);
}

.rec-btn-report {
  background: rgba(107, 142, 196, 0.1);
  border: 2rpx solid rgba(107, 142, 196, 0.3);
}

.rec-btn-secondary {
  background: #F5EDE4;
}

.rec-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.rec-btn-text-report {
  color: #6B8EC4;
  font-size: 24rpx;
}

.rec-btn-text-sec {
  color: #4A3628;
}

/* ── 搭子列表 ── */
.buddy-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 0;
  transition: opacity 0.15s;

  &:active { opacity: 0.7; }
}

.buddy-row-border {
  border-top: 1rpx solid rgba(174, 157, 146, 0.15);
}

.buddy-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #FDF0E8 0%, #FEF3EE 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.buddy-avatar-emoji {
  font-size: 72rpx;
  line-height: 1;
}

.buddy-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.buddy-name {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 600;
}

.buddy-type {
  font-size: 24rpx;
  color: #AE9D92;
}

.buddy-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.buddy-last {
  font-size: 24rpx;
  color: #AE9D92;
}

.buddy-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.buddy-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 9999rpx;
}

.buddy-dot-online { background: #5BBF8E; }
.buddy-dot-offline { background: #AE9D92; }

.buddy-status-text { font-size: 22rpx; color: #AE9D92; }
.buddy-online-text { color: #5BBF8E; }

.bottom-safe { height: 40rpx; }

/* ── 弹窗 ── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.report-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  max-height: 85vh;
  overflow-y: auto;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.report-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C1F14;
}

.report-close {
  padding: 8rpx;
  &:active { opacity: 0.6; }
}

.close-icon {
  font-size: 36rpx;
  color: #AE9D92;
}

.report-user-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.report-avatar-text {
  font-size: 64rpx;
}

.report-user-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.report-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #2C1F14;
}

.report-meta {
  font-size: 26rpx;
  color: #E8855A;
}

.report-dimensions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.dim-label {
  font-size: 24rpx;
  color: #4A3628;
  width: 80rpx;
  flex-shrink: 0;
}

.dim-bar-wrap {
  flex: 1;
  height: 12rpx;
  background: #F5EDE4;
  border-radius: 9999rpx;
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  border-radius: 9999rpx;
  transition: width 0.5s ease;
}

.dim-score {
  font-size: 24rpx;
  color: #AE9D92;
  width: 56rpx;
  text-align: right;
  flex-shrink: 0;
}

.report-analysis {
  background: #F5F0EB;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.analysis-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #E8855A;
  display: block;
  margin-bottom: 8rpx;
}

.analysis-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  display: block;
}

.apply-section {
  margin-bottom: 20rpx;
}

.apply-label {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.apply-input {
  width: 100%;
  height: 80rpx;
  background: #FDF8F3;
  border: 2rpx solid #EAE0D6;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #2C1F14;
  box-sizing: border-box;
}

.report-action-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 44rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
}

.report-action-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}
</style>
