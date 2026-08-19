<template>
  <view class="page">
    <CustomNavBar title="关系进度" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: filter === tab.key }" @click="filter = tab.key">
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">
        <view v-if="loading" class="loading-list">
          <view v-for="n in 3" :key="n" class="loading-row">
            <Skeleton variant="circle" :width="72" :height="72" />
            <view class="loading-copy">
              <Skeleton :width="180" :height="28" :margin-bottom="12" />
              <Skeleton :width="'100%'" :height="22" />
            </view>
          </view>
        </view>

        <view v-else-if="visibleMatches.length">
          <view v-for="match in visibleMatches" :key="match.id" class="match-row">
            <view class="avatar">
              <image v-if="match.avatar" :src="match.avatar" mode="aspectFill" />
              <text v-else class="avatar-letter">{{ match.nickname.slice(0, 1) }}</text>
            </view>
            <view class="match-main">
              <view class="name-line">
                <text class="name">{{ match.nickname }}</text>
                <text class="state" :class="match.status">{{ stateLabel(match) }}</text>
              </view>
              <text class="school">{{ match.school || '学校信息未公开' }}</text>
              <text v-if="match.reason" class="reason">{{ match.reason }}</text>
              <view v-if="match.status === 'pending' && match.requestDirection === 'incoming'" class="actions">
                <view class="action reject" @click="respond(match, false)">
                  <text class="reject-label">暂不认识</text>
                </view>
                <view class="action accept" @click="respond(match, true)">
                  <text class="accept-label">接受申请</text>
                </view>
              </view>
              <view
                v-else-if="match.status === 'accepted'"
                class="chat-action"
                role="button"
                tabindex="0"
                @click="openChat(match)"
                @keyup.enter="openChat(match)"
              >
                <text class="chat-label">{{ match.missionMode === 'short_term' ? '进入活动房间' : '开始真人聊天' }}</text>
                <text class="chat-arrow">›</text>
              </view>
              <text v-else-if="match.status === 'pending'" class="pending-note">需要对方本人确认，分身不会代替 TA 接受。</text>
            </view>
          </view>
        </view>

        <view v-else class="empty">
          <DoodleIcon name="handshake" :size="58" color="#B88870" />
          <text class="empty-title">{{ emptyTitle }}</text>
          <text class="empty-desc">AtoA 只负责降低破冰成本，关系建立仍由双方本人确认。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import { getMatches, respondBuddy } from '@/services/api/social'
import type { Match } from '@/services/api/social'

const navHeight = ref(64)
const scrollHeight = ref(600)
const loading = ref(true)
const matches = ref<Match[]>([])
const filter = ref<'all' | 'pending' | 'accepted'>('all')
const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'pending' as const, label: '待确认' },
  { key: 'accepted' as const, label: '已连接' },
]
const visibleMatches = computed(() => filter.value === 'all'
  ? matches.value
  : matches.value.filter((item) => item.status === filter.value))
const emptyTitle = computed(() => filter.value === 'pending' ? '没有等待确认的申请' : '这里还没有关系记录')

onLoad((options: any) => {
  if (options?.filter === 'pending' || options?.filter === 'accepted') {
    filter.value = options.filter
  }
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(
    info.statusBarHeight ?? 0,
    info.uniPlatform === 'web' ? 36 : 20,
  ) + 44
  scrollHeight.value = info.windowHeight - navHeight.value - 50
})

onShow(() => {
  void loadMatches()
})

async function loadMatches() {
  loading.value = true
  try {
    matches.value = await getMatches(true)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '关系进度加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function stateLabel(match: Match) {
  if (match.status === 'accepted') return '双方已确认'
  return match.requestDirection === 'incoming' ? '等你决定' : '等待对方'
}

async function respond(match: Match, accept: boolean) {
  try {
    await respondBuddy(match.id, accept)
    match.status = accept ? 'accepted' : 'rejected'
    if (!accept) matches.value = matches.value.filter((item) => item.id !== match.id)
    uni.showToast({ title: accept ? '已接受申请' : '已婉拒申请', icon: 'none' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
  }
}

function openChat(match: Match) {
  if (match.missionMode === 'short_term' && match.missionId) {
    uni.navigateTo({
      url: `/pages/social/activity-room?matchId=${encodeURIComponent(match.id)}`,
    })
    return
  }
  uni.navigateTo({
    url: `/pages/social/chat?matchId=${encodeURIComponent(match.id)}&nickname=${encodeURIComponent(match.nickname)}&avatar=${encodeURIComponent(match.avatar || '')}`,
  })
}
</script>

<style lang="scss" scoped>
.page { height: 100%; background: #FDF8F3; }
.tabs { height: 88rpx; padding: 0 32rpx; display: flex; align-items: stretch; gap: 34rpx; border-bottom: 1rpx solid #E7DAD0; }
.tab { position: relative; display: flex; align-items: center; min-width: 90rpx; justify-content: center; }
.tab.active::after { content: ''; position: absolute; left: 14rpx; right: 14rpx; bottom: 0; height: 4rpx; border-radius: 2rpx; background: #D96F42; }
.tab-label { font-size: 26rpx; color: #7D6A5F; }
.tab.active .tab-label { color: #3B2B23; font-weight: 650; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 16rpx 32rpx 40rpx; }
.loading-row { display: flex; gap: 20rpx; padding: 28rpx 0; border-bottom: 1rpx solid #E8DCD2; }
.loading-copy { flex: 1; }
.match-row { display: flex; align-items: flex-start; gap: 20rpx; padding: 28rpx 0; border-bottom: 1rpx solid #E8DCD2; }
.avatar { width: 84rpx; height: 84rpx; border-radius: 50%; overflow: hidden; background: #F1DDD1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar image { width: 100%; height: 100%; }
.avatar-letter { font-size: 32rpx; color: #A55231; font-weight: 700; }
.match-main { flex: 1; min-width: 0; }
.name-line { display: flex; justify-content: space-between; gap: 16rpx; align-items: center; }
.name { color: #32251E; font-size: 30rpx; font-weight: 650; }
.state { padding: 7rpx 12rpx; border-radius: 14rpx; background: #F2E7DF; color: #816B5E; font-size: 20rpx; }
.state.accepted { background: #E7F2EB; color: #487B5D; }
.school { display: block; color: #917D70; font-size: 22rpx; margin: 6rpx 0 12rpx; }
.reason { display: block; color: #615047; font-size: 25rpx; line-height: 1.55; }
.actions { display: flex; justify-content: flex-end; gap: 12rpx; margin-top: 20rpx; }
.action { min-height: 70rpx; padding: 0 24rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; }
.reject { background: #F1E9E3; }
.accept { background: #D96F42; }
.reject-label { color: #715F55; font-size: 24rpx; font-weight: 600; }
.accept-label { color: #FFF9F5; font-size: 24rpx; font-weight: 650; }
.chat-action { min-height: 70rpx; margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; border-top: 1rpx solid #EEE3DA; }
.chat-label { color: #A95835; font-size: 24rpx; font-weight: 600; }
.chat-arrow { color: #B9A99E; font-size: 38rpx; }
.pending-note { display: block; color: #88746A; font-size: 22rpx; line-height: 1.5; margin-top: 16rpx; }
.empty { padding: 160rpx 52rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.empty-title { font-size: 31rpx; color: #392A22; font-weight: 650; margin: 22rpx 0 10rpx; }
.empty-desc { font-size: 24rpx; color: #7B685D; line-height: 1.6; }
</style>
