<template>
  <view class="page page-root">

    <!-- ── 顶栏 ── -->
    <CustomNavBar title="我的">
      <template #right>
        <view class="navbar-settings" @click="openSettings">
          <DoodleIcon name="settings" :size="44" color="#4A3628" />
        </view>
      </template>
    </CustomNavBar>

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- ── 内容滚动区 ── -->
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- 用户卡片 -->
      <view class="profile-card" @click="goEditProfile">
        <view class="profile-avatar-wrap">
          <view class="profile-avatar">
            <image class="profile-avatar-img" src="/static/brand/logo-d-mascot.png" mode="aspectFill" />
          </view>
          <view class="profile-level-badge">
            <text class="profile-level-text">Lv.{{ profile.level }}</text>
          </view>
        </view>
        <view class="profile-info">
          <text class="profile-name">{{ profile.name }}</text>
          <text class="profile-school">{{ profile.school }} · {{ profile.major }} · 大三</text>
          <view class="profile-title-badge">
            <DoodleIcon name="star" :size="28" color="#FFFFFF" style="margin-right: 8rpx;" />
            <text class="profile-title-text">探索者</text>
          </view>
        </view>
        <view class="profile-edit-icon">
          <DoodleIcon name="pen" :size="36" color="rgba(255,255,255,0.85)" />
        </view>
        <text class="deco-star profile-deco-1">✦</text>
        <text class="deco-star profile-deco-2">✧</text>
      </view>

      <!-- 数据统计卡 -->
      <view class="stats-card">
        <view class="stat-item" @click="navTo('/pages/index/index')">
          <DoodleIcon name="book" :size="44" color="#E8855A" class="stat-icon" />
          <text class="stat-num font-mono">{{ profile.diaryCount }}</text>
          <text class="stat-label">日记</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item" @click="navTo('/pages/social/index')">
          <DoodleIcon name="user" :size="44" color="#5BBF8E" class="stat-icon" />
          <text class="stat-num font-mono">{{ buddyCount }}</text>
          <text class="stat-label">搭子</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item" @click="navTo('/pages/growth/achievements')">
          <DoodleIcon name="trophy" :size="44" color="#E8C44E" class="stat-icon" />
          <text class="stat-num font-mono">{{ achievementCount }}</text>
          <text class="stat-label">成就</text>
        </view>
      </view>

      <!-- 经验条 -->
      <view class="exp-card" @click="navTo('/pages/growth/index')">
        <view class="exp-header">
          <text class="exp-label font-handwrite">探索者 Lv.{{ profile.level }}</text>
          <text class="exp-value">{{ currentXP }} / {{ nextLevelXP }} XP</text>
        </view>
        <view class="exp-bar-bg">
          <view class="exp-bar-fill" :style="{ width: expPercent + '%' }" />
        </view>
        <view class="exp-bottom">
          <text class="exp-hint">{{ expHint }}</text>
          <text class="exp-arrow">查看详情 ›</text>
        </view>
      </view>

      <!-- 功能列表 -->
      <view class="menu-card">
        <view
          v-for="item in menuItems"
          :key="item.key"
          class="menu-item"
          @click="handleMenu(item)"
        >
          <view class="menu-icon-wrap" :style="{ background: item.iconBg }">
            <DoodleIcon :name="item.iconName" :size="40" :color="item.iconColor" />
          </view>
          <text class="menu-name">{{ item.name }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-btn" @click="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ── TabBar ── -->
    <TabBar :current="4" />

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getUserProfile } from '@/services/api/user'
import { getAchievements } from '@/services/api/user'
import type { UserProfile } from '@/services/api/user'
import type { Achievement } from '@/services/api/user'
import DoodleIcon from '@/components/DoodleIcon.vue'
import TabBar from '@/components/TabBar.vue'
import CustomNavBar from '@/components/CustomNavBar.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const debugInfo = ref({ windowHeight: 0, statusBarHeight: 0, screenHeight: 0, platform: '' })

const profile = ref<UserProfile>({
  name: 'Kylin',
  school: '南开大学',
  major: '软件工程',
  level: 12,
  diaryCount: 127,
  streakDays: 23,
  pomodoroCount: 247,
  avatar: '',
})

const achievements = ref<Achievement[]>([])
const buddyCount = ref(23)

const achievementCount = computed(() =>
  achievements.value.filter(a => a.unlocked).length
)

const currentXP = computed(() => 2450)
const nextLevelXP = computed(() => 3000)
const expPercent = computed(() => Math.round((currentXP.value / nextLevelXP.value) * 100))
const expHint = computed(() => `再写 ${nextLevelXP.value - currentXP.value} XP 升至 Lv.${profile.value.level + 1} 🌟`)

const menuItems = [
  { key: 'skill',   iconName: 'sparkle',  iconColor: '#5BBF8E', name: '技能树',     iconBg: 'rgba(91, 175, 133, 0.12)', path: '' },
  { key: 'report',  iconName: 'book',     iconColor: '#6B8EC4', name: '学期报告',   iconBg: 'rgba(123, 184, 212, 0.12)', path: '/pages/novel/index' },
  { key: 'about',   iconName: 'settings', iconColor: '#E8C44E', name: '关于 App',   iconBg: 'rgba(230, 184, 112, 0.12)', path: '/pages/settings/about' },
]

function handleMenu(item: any) {
  if (!item.path) {
    uni.showToast({ title: '复赛上线', icon: 'none' })
    return
  }
  uni.navigateTo({ url: item.path })
}

function navTo(path: string) {
  uni.navigateTo({ url: path })
}

function goEditProfile() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function openSettings() {
  uni.navigateTo({ url: '/pages/profile/settings' })
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出吗？',
    success(res) {
      if (res.confirm) uni.showToast({ title: '已退出', icon: 'success' })
    }
  })
}

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  debugInfo.value = {
    windowHeight: info.windowHeight,
    statusBarHeight: info.statusBarHeight ?? 20,
    screenHeight: info.screenHeight,
    platform: info.uniPlatform || info.platform || 'unknown'
  }
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 50
  try {
    profile.value = await getUserProfile()
  } catch {
    // keep default values
  }
  try {
    achievements.value = await getAchievements()
  } catch {
    achievements.value = []
  }
})
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
  width: 100%;
}

.page-scroll {
  -webkit-overflow-scrolling: touch;
  padding: 32rpx;
  padding-bottom: 130rpx;
}

/* ── 用户卡片 ── */
.profile-card {
  background: linear-gradient(135deg, #E8855A 0%, #F0A882 70%, #F7CDB5 100%);
  border-radius: 40rpx;
  padding: 48rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-bottom: 28rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(232, 133, 90, 0.28);
}

.profile-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 19998rpx;
  background: rgba(255,255,255,0.30);
  border: 5rpx solid rgba(255,255,255,0.60);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.profile-avatar-img { width: 100%; height: 100%; border-radius: 19998rpx; }

.profile-level-badge {
  position: absolute;
  bottom: -8rpx;
  right: -12rpx;
  background: #FFFFFF;
  border-radius: 19998rpx;
  padding: 4rpx 16rpx;
  box-shadow: 0 1px 4px rgba(44, 31, 20, 0.15);
}

.profile-level-text { font-size: 22rpx; color: #E8855A; font-weight: 700; }

.profile-info { flex: 1; }

.profile-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
  margin-bottom: 6rpx;
}

.profile-school {
  font-size: 24rpx;
  color: rgba(255,255,255,0.88);
  display: block;
  margin-bottom: 16rpx;
}

.profile-title-badge {
  background: rgba(255,255,255,0.22);
  border-radius: 19998rpx;
  padding: 6rpx 20rpx;
  display: inline-flex;
}

.profile-title-text { font-size: 24rpx; color: #FFFFFF; font-weight: 600; }

.deco-star { position: absolute; color: rgba(255,255,255,0.50); pointer-events: none; }
.profile-deco-1 { top: 24rpx; right: 36rpx; font-size: 32rpx; }
.profile-deco-2 { bottom: 28rpx; right: 72rpx; font-size: 20rpx; }

.profile-edit-icon {
  position: absolute;
  top: 24rpx;
  right: 28rpx;
  width: 56rpx;
  height: 56rpx;
  background: rgba(255,255,255,0.18);
  border-radius: 19998rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── 统计卡 ── */
.stats-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  box-shadow: 0 1px 6px rgba(44, 31, 20, 0.06);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  &:active { opacity: 0.7; }
}

.stat-icon { display: flex; align-items: center; justify-content: center; }
.stat-num { font-size: 44rpx; font-weight: 700; color: #2C1F14; font-family: "DIN Alternate", monospace; }
.stat-label { font-size: 24rpx; color: #857268; }

.stat-divider {
  width: 2rpx;
  height: 72rpx;
  background: rgba(44, 31, 20, 0.08);
}

/* ── 经验条 ── */
.exp-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 1px 6px rgba(44, 31, 20, 0.06);
}

.exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.exp-label { font-size: 28rpx; font-weight: 600; color: #2C1F14; }
.exp-value { font-size: 24rpx; color: #857268; font-family: "DIN Alternate", monospace; }

.exp-bar-bg {
  height: 16rpx;
  background: #F5EDE4;
  border-radius: 19998rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A, #F0A882);
  border-radius: 19998rpx;
  transition: width 0.8s ease;
}

.exp-hint { font-size: 24rpx; color: #AE9D92; }
.exp-bottom { display: flex; align-items: center; justify-content: space-between; }
.exp-arrow { font-size: 24rpx; color: #E8855A; font-weight: 500; }

/* ── 功能列表 ── */
.menu-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  overflow: hidden;
  margin-bottom: 32rpx;
  box-shadow: 0 1px 6px rgba(44, 31, 20, 0.06);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 30rpx 32rpx;
  border-bottom: 1px solid rgba(44, 31, 20, 0.05);
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:active { background: rgba(232, 133, 90, 0.05); }
}

.menu-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.menu-name { flex: 1; font-size: 30rpx; color: #2C1F14; font-weight: 500; }
.menu-arrow { font-size: 36rpx; color: #AE9D92; }

/* ── 退出 ── */
.logout-btn {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 30rpx;
  text-align: center;
  cursor: pointer;
  margin-bottom: 48rpx;
  &:active { background: #FEF3EE; }
}

.logout-text { font-size: 30rpx; color: #D95C4A; font-weight: 500; }

.font-handwrite {
  font-family: 'ZcoolKuaiLe', 'ZCOOL KuaiLe', 'STXingkai', 'KaiTi', 'PingFang SC', sans-serif !important;
}

.font-mono {
  font-family: "DIN Alternate", "SF Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.bottom-spacer { height: 40rpx; }
</style>
