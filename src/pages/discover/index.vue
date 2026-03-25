<template>
  <view class="page">

    <!-- CustomNavBar -->
    <CustomNavBar title="发现" left-icon="avatar" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- 内容滚动区 -->
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- 运势横幅 -->
      <view class="fortune-banner doodle-box press-feedback stagger-item" @click="go('/pages/fortune/index')">
        <view class="fortune-banner-bg" />
        <view class="fortune-banner-content">
          <view class="fortune-banner-left">
            <view class="fortune-title-row">
              <DoodleIcon name="crystal" color="#D4728A" :size="40" />
              <text class="fortune-title">今日运势</text>
            </view>
            <view class="fortune-stars-row">
              <text class="fortune-label">学业</text>
              <text class="fortune-stars">
                <text v-for="i in 5" :key="i" :class="i <= 4 ? 'star-on' : 'star-off'">★</text>
              </text>
              <text class="fortune-label" style="margin-left: 20rpx">社交</text>
              <text class="fortune-stars">
                <text v-for="i in 5" :key="i" :class="i <= 5 ? 'star-on' : 'star-off'">★</text>
              </text>
            </view>
            <text class="fortune-desc">"今天适合去图书馆"  </text>
            <view class="fortune-cta">
              <text>查看详情</text>
              <text style="margin-left: 4rpx">→</text>
            </view>
          </view>
          <view class="fortune-orb">
            <DoodleIcon name="crystal" color="#D4728A" :size="96" />
          </view>
        </view>
      </view>

      <!-- AI 创作工具 -->
      <SectionTitle title="AI 创作工具" />
      <view class="feature-grid">
        <view
          v-for="(item, idx) in aiTools"
          :key="item.key"
          class="feature-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.06) + 's' }"
          @click="handleClick(item.key, item.toast)"
        >
          <view class="func-icon-box" :class="[item.boxClass, item.radiusClass]" :style="{ borderColor: item.borderColor }">
            <DoodleIcon :name="item.iconName" :color="item.iconColor" :size="52" />
          </view>
          <text class="feature-name">{{ item.name }}</text>
        </view>
      </view>

      <!-- 学习工具 -->
      <SectionTitle title="学习工具" />
      <view class="feature-grid">
        <view
          v-for="(item, idx) in studyTools"
          :key="item.key"
          class="feature-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.06) + 's' }"
          @click="handleClick(item.key, item.toast)"
        >
          <view class="func-icon-box" :class="[item.boxClass, item.radiusClass]" :style="{ borderColor: item.borderColor }">
            <DoodleIcon :name="item.iconName" :color="item.iconColor" :size="52" />
          </view>
          <text class="feature-name">{{ item.name }}</text>
          <view v-if="item.toast" class="coming-badge">
            <text class="coming-text">{{ item.toast }}</text>
          </view>
        </view>
      </view>

      <!-- 社交与成长 -->
      <SectionTitle title="社交与成长" />
      <view class="feature-grid">
        <view
          v-for="(item, idx) in socialGrowth"
          :key="item.key"
          class="feature-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.06) + 's' }"
          @click="handleClick(item.key, item.toast)"
        >
          <view class="func-icon-box" :class="[item.boxClass, item.radiusClass]" :style="{ borderColor: item.borderColor }">
            <DoodleIcon :name="item.iconName" :color="item.iconColor" :size="52" />
          </view>
          <text class="feature-name">{{ item.name }}</text>
        </view>
      </view>

      <!-- 更多 -->
      <SectionTitle title="更多" />
      <view class="feature-grid">
        <view
          v-for="(item, idx) in moreItems"
          :key="item.key"
          class="feature-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.06) + 's' }"
          @click="handleClick(item.key, item.toast)"
        >
          <view class="func-icon-box" :class="[item.boxClass, item.radiusClass]" :style="{ borderColor: item.borderColor }">
            <DoodleIcon :name="item.iconName" :color="item.iconColor" :size="52" />
          </view>
          <text class="feature-name">{{ item.name }}</text>
          <view v-if="item.toast" class="coming-badge">
            <text class="coming-text">{{ item.toast }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- TabBar -->
    <TabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { h } from 'vue'
import TabBar from '@/components/TabBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 50
})

// 内部组件：段落标题（使用 render 函数，避免运行时编译）
const SectionTitle = {
  props: { title: String },
  setup(props: { title: string }) {
    return () => h('view', { class: 'section-title-wrap' }, [
      h('text', { class: 'section-title section-title-underline' }, props.title)
    ])
  },
}

// ── 功能数据（按规范配色表） ──
const aiTools = [
  { key: 'comic',        iconName: 'grid',    iconColor: '#5CA06E', borderColor: '#9BC8A8', boxClass: 'func-color-comic',   radiusClass: 'doodle-box-v3', name: '漫画生成', toast: '' },
  { key: 'share-card',   iconName: 'share',   iconColor: '#D4728A', borderColor: '#E8A0B4', boxClass: 'func-color-fortune', radiusClass: 'doodle-box-v4', name: '分享卡片', toast: '' },
  { key: 'style-engine', iconName: 'wand',    iconColor: '#9B72C8', borderColor: '#C4A8E8', boxClass: 'func-color-novel',   radiusClass: 'doodle-box-v2', name: '文风引擎', toast: '' },
]

const studyTools = [
  { key: 'pomodoro',   iconName: 'tomato',   iconColor: '#E8855A', borderColor: '#F2B49B', boxClass: 'func-color-diary',  radiusClass: 'doodle-box',    name: '番茄钟',   toast: '' },
  { key: 'todo',       iconName: 'list',     iconColor: '#C87290', borderColor: '#E8B4C4', boxClass: 'func-color-todo',   radiusClass: 'doodle-box-v4', name: '待办清单', toast: '' },
  { key: 'classnote',  iconName: 'camera',   iconColor: '#6BA87B', borderColor: '#9BC8A8', boxClass: 'func-color-study',  radiusClass: 'doodle-box-v3', name: '课堂笔记', toast: '复赛上线' },
]

const socialGrowth = [
  { key: 'match',        iconName: 'handshake', iconColor: '#6B8EB4', borderColor: '#B4CCE8', boxClass: 'func-color-social',  radiusClass: 'doodle-box-v2', name: '找搭子',   toast: '' },
  { key: 'growth',       iconName: 'chart',     iconColor: '#C8A86B', borderColor: '#E8C49B', boxClass: 'func-color-growth',  radiusClass: 'doodle-box',    name: '成长轨迹', toast: '' },
  { key: 'achievements', iconName: 'trophy',    iconColor: '#C8A86B', borderColor: '#E8C49B', boxClass: 'func-color-growth',  radiusClass: 'doodle-box-v3', name: '成就系统', toast: '' },
]

const moreItems = [
  { key: 'novel',  iconName: 'novel', iconColor: '#9B72C8', borderColor: '#C4A8E8', boxClass: 'func-color-novel', radiusClass: 'doodle-box-v2', name: '自传小说', toast: '' },
  { key: 'audio',  iconName: 'voice', iconColor: '#9B72C8', borderColor: '#C4A8E8', boxClass: 'func-color-novel', radiusClass: 'doodle-box-v4', name: '有声日记', toast: '开发中' },
  { key: 'bgm',    iconName: 'music', iconColor: '#9B72C8', borderColor: '#C4A8E8', boxClass: 'func-color-novel', radiusClass: 'doodle-box',    name: '日记BGM',  toast: '开发中' },
]

// ── 路由 ──
const routes: Record<string, string> = {
  comic:          '/pages/diary/comic',
  'share-card':   '/pages/diary/share-card',
  'style-engine': '/pages/diary/style-engine',
  pomodoro:       '/pages/study/pomodoro',
  todo:           '/pages/study/todo',
  match:          '/pages/social/match',
  growth:         '/pages/growth/index',
  achievements:   '/pages/growth/achievements',
  novel:          '/pages/novel/index',
}

function handleClick(key: string, toast?: string) {
  if (toast) {
    uni.showToast({ title: toast, icon: 'none' })
    return
  }
  const path = routes[key]
  if (path) {
    uni.navigateTo({ url: path })
  }
}

function go(url: string) {
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 0 16rpx 120rpx;
  -webkit-overflow-scrolling: touch;
}

/* ── 运势横幅 ── */
.fortune-banner {
  background: linear-gradient(135deg, #FDF0E8 0%, #F7CDB5 100%);
  margin: 16rpx 0 24rpx;
  padding: 28rpx 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 2px 4px 0 rgba(232, 133, 90, 0.12), 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  cursor: pointer;
  border: 3rpx solid rgba(232, 133, 90, 0.2);
}

.fortune-banner-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 50%, rgba(232, 133, 90, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

.fortune-banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.fortune-banner-left { flex: 1; }

.fortune-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.fortune-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2C1F14;
}

.fortune-stars-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.fortune-label {
  font-size: 24rpx;
  color: #4A3628;
  margin-right: 6rpx;
}

.fortune-stars {
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.star-on { color: #E8855A; }
.star-off { color: #D4C4B8; }

.fortune-desc {
  font-size: 24rpx;
  color: #4A3628;
  display: block;
  margin-bottom: 10rpx;
  opacity: 0.8;
}

.fortune-cta {
  display: inline-flex;
  align-items: center;
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 600;
}

.fortune-orb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(212, 114, 138, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* ── 段落标题 ── */
.section-title-wrap {
  padding: 24rpx 8rpx 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2C1F14;
}

/* ── 功能网格 ── */
.feature-grid {
  display: flex;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

/* 用 CSS var 覆盖 stagger delay */
.stagger-item {
  animation-delay: var(--delay, 0s) !important;
}

.feature-item {
  flex: 1;
  min-height: 160rpx;
  background: #FFFFFF;
  border-radius: 18rpx 14rpx 20rpx 12rpx;
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(232, 133, 90, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  cursor: pointer;
  padding: 16rpx 8rpx;
  position: relative;
  overflow: visible;
}

.func-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-width: 1.5px;
  border-style: solid;
  margin-bottom: 2rpx;
}

.feature-name {
  font-size: 24rpx;
  color: #4A3628;
  text-align: center;
  font-weight: 500;
}

.coming-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  background: #C87290;
  border-radius: 8rpx 10rpx 8rpx 6rpx;
  padding: 2rpx 8rpx;
}

.coming-text {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.bottom-spacer {
  height: 40rpx;
}
</style>
