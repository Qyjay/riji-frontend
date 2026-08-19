<template>
  <view class="page">
    <CustomNavBar title="任务候选" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <view class="filter-bar">
      <scroll-view scroll-x :show-scrollbar="false">
        <view class="filters">
          <view
            v-for="item in filters"
            :key="item.value"
            class="filter"
            :class="{ active: activeFilter === item.value }"
            @click="activeFilter = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view
      class="scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view class="content">
        <view v-if="mission" class="context">
          <text class="context-kicker">{{ missionModeLabel(mission.mode) }}</text>
          <text class="context-title">{{ mission.title }}</text>
          <text class="context-desc">按硬条件排序。内部评分只用于排序，不代表一个人的价值。</text>
        </view>

        <view v-if="loading" class="loading-list">
          <view v-for="index in 3" :key="index" class="loading-row">
            <Skeleton :width="72" :height="72" :radius="36" />
            <view class="loading-main">
              <Skeleton :width="220" :height="28" :margin-bottom="14" />
              <Skeleton :width="'100%'" :height="22" :margin-bottom="10" />
              <Skeleton :width="'75%'" :height="22" />
            </view>
          </view>
        </view>

        <view
          v-for="candidate in filteredCandidates"
          v-else
          :key="candidate.id"
          class="candidate"
        >
          <view class="candidate-head">
            <view class="avatar">
              <image v-if="candidate.targetUser?.avatar" :src="resolveAvatarUrl(candidate.targetUser.avatar)" mode="aspectFill" />
              <text v-else>{{ candidateName(candidate).slice(0, 1) }}</text>
            </view>
            <view class="identity">
              <text class="name">{{ candidateName(candidate) }}</text>
              <text class="meta">{{ candidate.targetUser?.school || candidate.targetPost?.authorSchool || '学校信息未公开' }}</text>
            </view>
            <view class="candidate-state" :style="{ background: stateBackground(candidate) }">
              <text :style="{ color: stateColor(candidate) }">{{ stateLabel(candidate) }}</text>
            </view>
          </view>

          <view v-if="candidate.targetPost" class="post-source">
            <text class="source-label">来自公开帖子</text>
            <text class="source-copy">{{ candidate.targetPost.content }}</text>
            <view class="source-meta">
              <text>{{ candidate.targetPost.location || '地点待确认' }}</text>
              <text v-for="tag in candidate.targetPost.tags.slice(0, 3)" :key="tag">#{{ tag }}</text>
            </view>
          </view>

          <view class="reason-block">
            <text class="block-title">适合点</text>
            <view v-for="reason in candidate.fitReasons.slice(0, 3)" :key="reason.text" class="reason-row">
              <DoodleIcon name="check" :size="25" color="#548365" />
              <text>{{ reason.text }}</text>
            </view>
          </view>

          <view v-if="candidate.questions.length" class="question-block">
            <text class="block-title">还需要确认</text>
            <text v-for="question in candidate.questions.slice(0, 2)" :key="question" class="question-row">· {{ question }}</text>
          </view>

          <view v-if="candidate.riskFlags.length" class="risk-block">
            <text>有 {{ candidate.riskFlags.length }} 项风险提示，试聊详情中可查看。</text>
          </view>

          <view class="candidate-actions">
            <view
              class="secondary-action"
              :class="{ disabled: actingId === candidate.id }"
              role="button"
              tabindex="0"
              @click="skipCandidate(candidate)"
              @keyup.enter="skipCandidate(candidate)"
            >
              <text>不合适</text>
            </view>
            <view
              class="primary-action"
              :class="{ disabled: actingId === candidate.id }"
              :style="{ background: accent }"
              role="button"
              tabindex="0"
              @click="probeOrOpen(candidate)"
              @keyup.enter="probeOrOpen(candidate)"
            >
              <text>{{ candidate.interactionId ? '查看试聊' : actingId === candidate.id ? '正在问清楚' : probeLabel }}</text>
            </view>
          </view>
        </view>

        <view v-if="!loading && !filteredCandidates.length" class="empty">
          <view class="empty-icon">
            <DoodleIcon name="search" :size="46" color="#9A725C" />
          </view>
          <text class="empty-title">{{ candidates.length ? '这个筛选下没有候选' : '还没有找到合适候选' }}</text>
          <text class="empty-desc">{{ candidates.length ? '切换到全部继续查看。' : '返回任务详情重新搜索，或准备一条招募帖。' }}</text>
        </view>

        <view class="privacy">
          <DoodleIcon name="lock" :size="28" color="#5A8069" />
          <text>分身试聊只核验当前任务。申请加入或认识对方前，仍会再次由你确认。</text>
        </view>
        <view class="bottom-space" />
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
import {
  getMission,
  getMissionCandidates,
  probeMissionCandidate,
  skipMissionCandidate,
} from '@/services/api/mission'
import type { MissionCandidate, SocialMission } from '@/services/api/mission'
import { missionAccent, missionModeLabel } from '@/utils/mission'
import { decodeQueryParam, withQuery } from '@/utils/query'
import { resolveAvatarUrl } from '@/utils/avatar'

const navHeight = ref(64)
const scrollHeight = ref(600)
const missionId = ref('')
const mission = ref<SocialMission | null>(null)
const candidates = ref<MissionCandidate[]>([])
const loading = ref(true)
const refreshing = ref(false)
const activeFilter = ref('all')
const actingId = ref('')
const filters = [
  { value: 'all', label: '全部' },
  { value: 'unprobed', label: '待核验' },
  { value: 'ready_for_user', label: '已试聊' },
  { value: 'request_sent', label: '已申请' },
]

const accent = computed(() => mission.value ? missionAccent(mission.value.mode) : '#E8855A')
const probeLabel = computed(() => mission.value?.mode === 'short_term' ? '让分身问问' : '先试聊一组')
const filteredCandidates = computed(() => {
  if (activeFilter.value === 'all') return candidates.value.filter(item => item.status !== 'user_skipped')
  if (activeFilter.value === 'unprobed') {
    return candidates.value.filter(item => !item.interactionId && item.status !== 'user_skipped')
  }
  return candidates.value.filter(item => item.status === activeFilter.value)
})

onLoad((options: any) => {
  missionId.value = decodeQueryParam(options?.missionId)
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value - 50
})

onShow(() => {
  if (missionId.value) void loadData()
})

async function loadData() {
  try {
    const [missionData, candidateData] = await Promise.all([
      getMission(missionId.value),
      getMissionCandidates(missionId.value),
    ])
    mission.value = missionData
    candidates.value = candidateData
  } catch (error: any) {
    uni.showToast({ title: error?.message || '候选加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await loadData()
}

function candidateName(candidate: MissionCandidate) {
  return candidate.targetUser?.name || candidate.targetPost?.authorName || '候选朋友'
}

function stateLabel(candidate: MissionCandidate) {
  const labels: Record<string, string> = {
    discovered: '待核验',
    ready_for_user: '等你决定',
    request_sent: '等待对方',
    peer_accepted: '已连接',
    peer_rejected: '未接受',
    blocked: '已停止',
  }
  return labels[candidate.status] || '待判断'
}

function stateColor(candidate: MissionCandidate) {
  if (candidate.status === 'peer_accepted') return '#4F7E60'
  if (candidate.status === 'ready_for_user') return accent.value
  return '#806B60'
}

function stateBackground(candidate: MissionCandidate) {
  if (candidate.status === 'peer_accepted') return '#E7F2EB'
  if (candidate.status === 'ready_for_user') return mission.value?.mode === 'short_term' ? '#EAF2F8' : '#F8EDEF'
  return '#F0E8E2'
}

async function probeOrOpen(candidate: MissionCandidate) {
  if (actingId.value) return
  if (candidate.interactionId) {
    openProbe(candidate.interactionId, mission.value?.atoaSessionId || '')
    return
  }
  actingId.value = candidate.id
  try {
    const result = await probeMissionCandidate(missionId.value, candidate.id)
    candidate.interactionId = result.interactionId
    candidate.status = result.candidate.status
    if (mission.value) mission.value.atoaSessionId = result.sessionId
    openProbe(result.interactionId, result.sessionId)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '分身暂时无法试聊', icon: 'none' })
  } finally {
    actingId.value = ''
  }
}

function openProbe(interactionId: string, sessionId: string) {
  uni.navigateTo({
    url: withQuery('/pages/social/atoa-detail', {
      id: interactionId,
      sessionId,
      missionId: missionId.value,
      missionMode: mission.value?.mode || '',
    }),
  })
}

async function skipCandidate(candidate: MissionCandidate) {
  if (actingId.value) return
  actingId.value = candidate.id
  const previousStatus = candidate.status
  candidate.status = 'user_skipped'
  try {
    await skipMissionCandidate(missionId.value, candidate.id)
  } catch (error: any) {
    candidate.status = previousStatus
    uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
  } finally {
    actingId.value = ''
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
[role='button']:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.filter-bar { height: 100rpx; padding: 14rpx 0; background: #FDF8F3; border-bottom: 1rpx solid #E5D9CF; }
.filters { display: inline-flex; gap: 10rpx; padding: 0 32rpx; }
.filter { min-width: 126rpx; height: 70rpx; padding: 0 20rpx; border-radius: 20rpx; color: #806C60; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.filter.active { color: #B65F3D; background: #F5E4DA; font-weight: 650; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 26rpx 32rpx 0; }
.context { padding: 10rpx 0 30rpx; border-bottom: 1rpx solid #E7DBD1; }
.context-kicker { display: block; color: #A2694B; font-size: 19rpx; letter-spacing: 2rpx; }
.context-title { display: block; color: #30231C; font-size: 38rpx; font-weight: 750; margin-top: 7rpx; }
.context-desc { display: block; color: #7C685D; font-size: 22rpx; line-height: 1.55; margin-top: 9rpx; }
.loading-row { display: flex; gap: 18rpx; padding: 28rpx 0; border-bottom: 1rpx solid #E7DBD1; }
.loading-main { flex: 1; }
.candidate { padding: 30rpx 0 34rpx; border-bottom: 1rpx solid #DDD0C5; }
.candidate-head { display: flex; align-items: center; gap: 16rpx; }
.avatar { width: 78rpx; height: 78rpx; border-radius: 50%; background: #F0DED3; overflow: hidden; color: #A45535; font-size: 30rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar image { width: 100%; height: 100%; }
.identity { flex: 1; min-width: 0; }
.name { display: block; color: #392A22; font-size: 30rpx; font-weight: 700; }
.meta { display: block; color: #8B776B; font-size: 21rpx; margin-top: 5rpx; }
.candidate-state { padding: 8rpx 13rpx; border-radius: 15rpx; font-size: 20rpx; font-weight: 600; }
.post-source { margin-top: 22rpx; padding: 20rpx 22rpx; border-radius: 20rpx; background: #F4ECE6; }
.source-label { display: block; color: #98715B; font-size: 19rpx; letter-spacing: 1rpx; }
.source-copy { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; color: #59463C; font-size: 24rpx; line-height: 1.55; margin-top: 8rpx; }
.source-meta { display: flex; gap: 12rpx; flex-wrap: wrap; color: #92705D; font-size: 20rpx; margin-top: 12rpx; }
.reason-block, .question-block { margin-top: 22rpx; }
.block-title { display: block; color: #49372E; font-size: 24rpx; font-weight: 650; margin-bottom: 10rpx; }
.reason-row { display: flex; align-items: flex-start; gap: 10rpx; margin-top: 9rpx; color: #5F4C42; font-size: 23rpx; line-height: 1.5; }
.question-row { display: block; color: #846A5C; font-size: 23rpx; line-height: 1.55; margin-top: 6rpx; }
.risk-block { margin-top: 16rpx; padding: 15rpx 18rpx; border-radius: 17rpx; background: #F7ECE8; color: #9D604F; font-size: 21rpx; }
.candidate-actions { display: flex; gap: 12rpx; margin-top: 25rpx; }
.secondary-action, .primary-action { min-height: 78rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 650; }
.secondary-action { width: 176rpx; background: #EEE5DE; color: #6D5A4F; }
.primary-action { flex: 1; color: #FFF9F5; }
.secondary-action.disabled, .primary-action.disabled { opacity: 0.5; }
.empty { padding: 100rpx 30rpx; display: flex; flex-direction: column; align-items: center; text-align: center; }
.empty-icon { width: 92rpx; height: 92rpx; border-radius: 28rpx; background: #F3E8E1; display: flex; align-items: center; justify-content: center; margin-bottom: 18rpx; }
.empty-title { color: #3A2C24; font-size: 29rpx; font-weight: 700; }
.empty-desc { color: #7D695E; font-size: 23rpx; line-height: 1.6; margin-top: 9rpx; }
.privacy { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 34rpx; padding: 20rpx; border-radius: 20rpx; background: #EDF5F0; color: #587062; font-size: 22rpx; line-height: 1.55; }
.bottom-space { height: 90rpx; }
</style>
