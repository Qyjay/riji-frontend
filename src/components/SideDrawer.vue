<template>
  <view class="drawer-teleport-wrapper">
      <view v-if="visible" class="drawer-overlay" @click="close">
        <view class="drawer-panel" @click.stop>
          <!-- 用户卡片 -->
          <view class="user-card">
            <image
              class="user-avatar"
              :src="userAvatar"
              mode="aspectFill"
            />
            <view class="user-info">
              <text class="user-name">{{ userName }}</text>
              <text class="user-school">{{ userSchool }}</text>
              <text class="user-stats">{{ userStats }}</text>
            </view>
          </view>

          <view class="divider" />

          <!-- 导航列表 -->
          <view class="nav-list">
            <view class="nav-item" @click="navigate('emotion-calendar')">
              <text class="nav-icon">📅</text>
              <text class="nav-label">日记日历</text>
            </view>
            <view class="nav-item" @click="navigate('emotion-calendar')">
              <text class="nav-icon">📊</text>
              <text class="nav-label">情绪统计</text>
            </view>
            <view class="nav-item" @click="navigate('growth')">
              <text class="nav-icon">🌱</text>
              <text class="nav-label">成长轨迹</text>
            </view>
            <view class="nav-item" @click="navigate('achievements')">
              <text class="nav-icon">🏆</text>
              <text class="nav-label">我的成就</text>
            </view>
            <view class="nav-item" @click="navigate('novel')">
              <text class="nav-icon">📖</text>
              <text class="nav-label">自传小说</text>
            </view>
          </view>

          <view class="divider" />

          <!-- AI洞察卡 -->
          <view class="insight-card">
            <text class="insight-title">🔮 今日运势</text>
            <text class="insight-stars">★★★★☆</text>
            <text class="insight-tip">今天适合去图书馆</text>
          </view>

          <view class="divider" />

          <!-- 设置 -->
          <view class="nav-item" @click="navigate('settings')">
            <text class="nav-icon">⚙️</text>
            <text class="nav-label">设置</text>
          </view>
        </view>
      </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getUserProfile, type UserProfile } from '@/services/api/user'
import { API_BASE_URL } from '@/services/config'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const fallbackProfile: UserProfile = {
  name: '同学',
  school: '',
  major: '',
  level: 1,
  diaryCount: 0,
  streakDays: 0,
  pomodoroCount: 0,
  avatar: '',
}

const profile = ref<UserProfile>({ ...fallbackProfile })
const loadingProfile = ref(false)

const userName = computed(() => {
  const name = String(profile.value.name || '').trim()
  return name || '同学'
})

const userSchool = computed(() => {
  const school = String(profile.value.school || '').trim()
  const major = String(profile.value.major || '').trim()
  if (school && major) return `${school} · ${major}`
  return school || major || '欢迎回来'
})

const userStats = computed(() => {
  const diaryCount = Number(profile.value.diaryCount || 0)
  const streakDays = Number(profile.value.streakDays || 0)
  return `📔 ${diaryCount}篇日记  🔥 ${streakDays}天连续`
})

const userAvatar = computed(() => {
  const avatar = String(profile.value.avatar || '').trim()
  if (!avatar) {
    return 'https://picsum.photos/seed/draweravatar/160/160'
  }
  if (/^https?:\/\//.test(avatar)) {
    return avatar
  }
  if (avatar.startsWith('/')) {
    const host = API_BASE_URL.replace(/\/api\/?$/, '')
    return `${host}${avatar}`
  }
  return avatar
})

async function loadProfile() {
  if (loadingProfile.value) return
  loadingProfile.value = true
  try {
    const data = await getUserProfile()
    profile.value = {
      ...fallbackProfile,
      ...data,
    }
  } catch {
    // 忽略加载失败，保留兜底信息。
  } finally {
    loadingProfile.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void loadProfile()
    }
  },
  { immediate: true },
)

function close() {
  emit('update:visible', false)
}

function navigate(page: string) {
  close()
  const urlMap: Record<string, string> = {
    'emotion-calendar': '/pages/diary/emotion-calendar',
    'growth': '/pages/growth/index',
    'achievements': '/pages/growth/achievements',
    'novel': '/pages/novel/index',
    'settings': '/pages/profile/settings',
  }
  const url = urlMap[page]
  if (url) {
    uni.navigateTo({ url })
  }
}
</script>

<style lang="scss" scoped>
.drawer-teleport-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 9998;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.4);
}

.drawer-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 75vw;
  background: #FFFFFF;
  padding-top: env(safe-area-inset-top);
  overflow-y: auto;
}

.user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx 48rpx;
  gap: 16rpx;
}

.user-avatar {
  width: 144rpx;
  height: 144rpx;
  border-radius: 50%;
  border: 6rpx solid #E8855A;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.user-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #2C1F14;
}

.user-school {
  font-size: 26rpx;
  color: #4A3628;
}

.user-stats {
  font-size: 24rpx;
  color: #AE9D92;
  margin-top: 8rpx;
}

.divider {
  height: 2rpx;
  background: rgba(0, 0, 0, 0.06);
  margin: 16rpx 32rpx;
}

.nav-list {
  padding: 16rpx 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 48rpx;
  transition: background 0.15s;
}

.nav-item:active {
  background: rgba(232, 133, 90, 0.08);
}

.nav-icon {
  font-size: 40rpx;
}

.nav-label {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 500;
}

.insight-card {
  padding: 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.insight-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.insight-stars {
  font-size: 32rpx;
  color: #E8855A;
  letter-spacing: 4rpx;
}

.insight-tip {
  font-size: 26rpx;
  color: #4A3628;
}

/* 动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.3s ease-out;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(-100%);
}
</style>
