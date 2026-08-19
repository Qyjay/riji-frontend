<template>
  <view class="page">
    <CustomNavBar
      title="找朋友"
      left-icon="back"
      right-text="广场"
      @right-click="go('/pages/discover/index')"
    />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view
      class="scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view class="content">
        <view class="hero">
          <view class="agent-line">
            <view class="agent-dot" :class="{ paused: status && !status.isActive }" />
            <text>{{ status?.isActive === false ? '分身已暂停' : '分身可以开始找人' }}</text>
          </view>
          <text class="hero-title">你现在想找什么样的人？</text>
          <text class="hero-desc">说目的就好。分身先找机会、问清楚，最后由你决定。</text>

          <view
            class="intent-entry press-feedback"
            role="button"
            tabindex="0"
            @click="go('/pages/social/find')"
            @keyup.enter="go('/pages/social/find')"
          >
            <DoodleIcon name="chat" :size="34" color="#9A715B" />
            <text class="intent-placeholder">例如：周末想找一个人看电影</text>
            <view class="intent-send">
              <DoodleIcon name="send" :size="30" color="#FFF9F5" />
            </view>
          </view>

          <view class="mode-actions">
            <view
              class="mode-action short press-feedback"
              role="button"
              tabindex="0"
              @click="go('/pages/social/mission-short')"
              @keyup.enter="go('/pages/social/mission-short')"
            >
              <DoodleIcon name="calendar" :size="34" color="#587FA2" />
              <view>
                <text class="mode-name">一起做件事</text>
                <text class="mode-desc">短期活动</text>
              </view>
            </view>
            <view
              class="mode-action long press-feedback"
              role="button"
              tabindex="0"
              @click="go('/pages/social/mission-long')"
              @keyup.enter="go('/pages/social/mission-long')"
            >
              <DoodleIcon name="heart" :size="34" color="#B65E79" />
              <view>
                <text class="mode-name">慢慢认识</text>
                <text class="mode-desc">长期关系</text>
              </view>
            </view>
          </view>
        </view>

        <view class="section-heading">
          <view>
            <text class="section-kicker">IN PROGRESS</text>
            <text class="section-title">正在进行</text>
          </view>
          <text class="section-count">{{ activeMissions.length }}</text>
        </view>

        <view v-if="loading" class="mission-loading">
          <Skeleton :width="240" :height="30" :margin-bottom="16" />
          <Skeleton :width="'100%'" :height="24" :margin-bottom="12" />
          <Skeleton :width="'78%'" :height="24" />
        </view>

        <view v-else-if="activeMissions.length" class="mission-list">
          <view
            v-for="mission in activeMissions"
            :key="mission.id"
            class="mission-row"
            role="button"
            tabindex="0"
            @click="openMission(mission)"
            @keyup.enter="openMission(mission)"
          >
            <view class="mission-mark" :style="{ background: missionSoftBackground(mission.mode) }">
              <DoodleIcon
                :name="mission.mode === 'short_term' ? 'calendar' : 'heart'"
                :size="36"
                :color="missionAccent(mission.mode)"
              />
            </view>
            <view class="mission-main">
              <view class="mission-title-line">
                <text class="mission-title">{{ mission.title }}</text>
                <text class="mission-state" :style="{ color: missionAccent(mission.mode) }">
                  {{ missionStatusLabel(mission.status) }}
                </text>
              </view>
              <text class="mission-hint">{{ missionStatusHint(mission) }}</text>
              <view class="mission-meta">
                <text>{{ formatMissionTime(mission) }}</text>
                <text>{{ mission.location.label || '范围待确认' }}</text>
                <text v-if="mission.pendingCount">{{ mission.pendingCount }} 个待判断</text>
              </view>
            </view>
            <text class="row-arrow">›</text>
          </view>
        </view>

        <view v-else class="mission-empty">
          <view class="empty-symbol">
            <DoodleIcon name="target" :size="46" color="#A16B4E" />
          </view>
          <view class="empty-copy">
            <text class="empty-title">还没有正在进行的找人任务</text>
            <text class="empty-desc">发起后，搜索、试聊和申请进度都会汇总在这里。</text>
          </view>
          <view class="empty-link" @click="go('/pages/social/find')">
            <text>发起找人</text>
          </view>
        </view>

        <view class="section-heading decision-heading">
          <view>
            <text class="section-kicker">YOUR DECISION</text>
            <text class="section-title">等你决定</text>
          </view>
          <view v-if="decisionCount" class="count-badge"><text>{{ decisionCount }}</text></view>
        </view>

        <view v-if="decisionMissions.length" class="decision-list">
          <view
            v-for="mission in decisionMissions.slice(0, 3)"
            :key="mission.id"
            class="decision-row"
            @click="openCandidates(mission)"
          >
            <view>
              <text class="decision-title">{{ mission.title }}</text>
              <text class="decision-desc">
                有 {{ mission.pendingCount || mission.candidateCount }} 个候选需要你判断
              </text>
            </view>
            <view class="decision-action"><text>查看</text></view>
          </view>
        </view>

        <view
          v-for="probe in pendingProbes.slice(0, decisionMissions.length ? 1 : 3)"
          :key="probe.id"
          class="probe-row"
          @click="openLegacyProbe(probe)"
        >
          <view class="probe-avatar">
            <image v-if="probe.userBAvatar" :src="resolveAvatarUrl(probe.userBAvatar)" mode="aspectFill" />
            <text v-else>{{ probe.userBName.slice(0, 1) }}</text>
          </view>
          <view class="probe-main">
            <text class="probe-name">{{ probe.userBName }}</text>
            <text class="probe-summary">{{ conversationPreview(probe) }}</text>
            <text class="probe-meta">分身已试聊 {{ probe.interactionPhase }} 组</text>
          </view>
          <text class="row-arrow">›</text>
        </view>

        <view v-if="!decisionCount && !loading" class="decision-empty">
          <text class="decision-empty-title">没有需要立刻处理的事项</text>
          <text class="decision-empty-desc">
            分身可以找人和试聊，但不会替你发出申请或建立关系。
          </text>
        </view>

        <view class="control-note">
          <DoodleIcon name="lock" :size="30" color="#5A826B" />
          <text>日记原文、精确位置和联系方式不会由分身自动发送。</text>
          <text class="control-link" @click="go('/pages/profile/avatar-memory')">管理</text>
        </view>

        <view class="section-heading relation-heading">
          <view>
            <text class="section-kicker">CONNECTIONS</text>
            <text class="section-title">关系进度</text>
          </view>
          <text class="text-link" @click="go('/pages/social/request-status')">查看全部</text>
        </view>

        <view class="relation-strip">
          <view
            class="relation-item"
            role="button"
            tabindex="0"
            @click="go('/pages/social/request-status?filter=pending')"
            @keyup.enter="go('/pages/social/request-status?filter=pending')"
          >
            <text class="relation-value">{{ pendingMatches.length }}</text>
            <text class="relation-label">等待确认</text>
          </view>
          <view class="relation-divider" />
          <view
            class="relation-item"
            role="button"
            tabindex="0"
            @click="go('/pages/social/request-status?filter=accepted')"
            @keyup.enter="go('/pages/social/request-status?filter=accepted')"
          >
            <text class="relation-value">{{ acceptedMatches.length }}</text>
            <text class="relation-label">已连接</text>
          </view>
          <view class="relation-divider" />
          <view class="relation-item" @click="go('/pages/discover/index')">
            <DoodleIcon name="discover" :size="35" color="#8C6D5D" />
            <text class="relation-label">逛广场</text>
          </view>
        </view>

        <view class="bottom-space" />
      </view>
    </scroll-view>
    <TabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import TabBar from '@/components/TabBar.vue'
import { getAvatarStatus, getAtoaProbes } from '@/services/api/avatar'
import type { AtoaProbe, AvatarStatus } from '@/services/api/avatar'
import { getMatches } from '@/services/api/social'
import type { Match } from '@/services/api/social'
import { getMissions } from '@/services/api/mission'
import type { SocialMission } from '@/services/api/mission'
import {
  formatMissionTime,
  missionAccent,
  missionSoftBackground,
  missionStatusHint,
  missionStatusLabel,
} from '@/utils/mission'
import { withQuery } from '@/utils/query'
import { resolveAvatarUrl } from '@/utils/avatar'

const navHeight = ref(64)
const scrollHeight = ref(600)
const loading = ref(true)
const refreshing = ref(false)
const status = ref<AvatarStatus | null>(null)
const missions = ref<SocialMission[]>([])
const probes = ref<AtoaProbe[]>([])
const matches = ref<Match[]>([])

const activeMissions = computed(() => missions.value.filter(item =>
  !['completed', 'cancelled', 'expired'].includes(item.status),
))
const decisionMissions = computed(() => activeMissions.value.filter(item =>
  item.status === 'awaiting_user' || item.pendingCount > 0,
))
const pendingProbes = computed(() =>
  probes.value.filter(item => item.outcome === 'pending_user_decision'),
)
const pendingMatches = computed(() => matches.value.filter(item => item.status === 'pending'))
const acceptedMatches = computed(() => matches.value.filter(item => item.status === 'accepted'))
const decisionCount = computed(() =>
  decisionMissions.value.reduce((total, item) => total + Math.max(1, item.pendingCount), 0)
  + pendingProbes.value.length,
)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(
    info.statusBarHeight ?? 0,
    info.uniPlatform === 'web' ? 36 : 20,
  ) + 44
  scrollHeight.value = info.windowHeight - navHeight.value - 50
})

onShow(() => {
  void loadData()
})

async function loadData() {
  try {
    const [statusData, missionData, probeData, matchData] = await Promise.all([
      getAvatarStatus(),
      getMissions(),
      getAtoaProbes(),
      getMatches(true),
    ])
    status.value = statusData
    missions.value = missionData
    probes.value = probeData
    matches.value = matchData
  } catch (error: any) {
    uni.showToast({ title: error?.message || '找朋友数据加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await loadData()
}

function go(path: string) {
  uni.navigateTo({ url: path })
}

function openMission(mission: SocialMission) {
  uni.navigateTo({
    url: withQuery('/pages/social/mission-detail', { id: mission.id }),
  })
}

function openCandidates(mission: SocialMission) {
  uni.navigateTo({
    url: withQuery('/pages/social/candidates', { missionId: mission.id }),
  })
}

function openLegacyProbe(probe: AtoaProbe) {
  uni.navigateTo({
    url: withQuery('/pages/social/atoa-detail', {
      id: probe.id,
      sessionId: probe.sessionId || '',
    }),
  })
}

function conversationPreview(probe: AtoaProbe) {
  const last = probe.conversation[probe.conversation.length - 1]
  return last?.content || '分身已完成初步了解，点开查看。'
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
[role='button']:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 24rpx 32rpx 0; }
.hero { padding: 24rpx 0 42rpx; border-bottom: 1rpx solid #E6DAD0; }
.agent-line { display: flex; align-items: center; gap: 9rpx; color: #765F53; font-size: 22rpx; margin-bottom: 12rpx; }
.agent-dot { width: 13rpx; height: 13rpx; border-radius: 50%; background: #5A9A72; }
.agent-dot.paused { background: #A9978D; }
.hero-title { display: block; color: #2D211A; font-size: 45rpx; line-height: 1.25; font-weight: 750; margin-left: -2rpx; }
.hero-desc { display: block; color: #756158; font-size: 25rpx; line-height: 1.6; margin-top: 12rpx; }
.intent-entry { min-height: 96rpx; margin-top: 28rpx; padding: 0 16rpx 0 22rpx; border: 1rpx solid #DDCFC4; border-radius: 27rpx; background: #FFFDFC; display: flex; align-items: center; gap: 13rpx; }
.intent-placeholder { flex: 1; color: #9A887D; font-size: 24rpx; }
.intent-send { width: 62rpx; height: 62rpx; border-radius: 20rpx; background: #D96F42; display: flex; align-items: center; justify-content: center; }
.mode-actions { display: flex; gap: 14rpx; margin-top: 16rpx; }
.mode-action { flex: 1; min-width: 0; min-height: 98rpx; padding: 0 14rpx; border-radius: 23rpx; display: flex; align-items: center; gap: 8rpx; }
.mode-action.short { background: #EDF4FA; }
.mode-action.long { background: #F9EDF1; }
.mode-name { display: block; color: #3C2D25; font-size: 22rpx; font-weight: 650; white-space: nowrap; }
.mode-desc { display: block; color: #836F63; font-size: 19rpx; margin-top: 3rpx; white-space: nowrap; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; margin: 46rpx 0 16rpx; }
.section-heading.decision-heading { margin-top: 54rpx; }
.section-heading.relation-heading { margin-top: 50rpx; }
.section-kicker { display: block; color: #A66D4F; font-size: 18rpx; letter-spacing: 2rpx; margin-bottom: 4rpx; }
.section-title { display: block; color: #32251E; font-size: 34rpx; font-weight: 720; }
.section-count { color: #8B776B; font-size: 24rpx; }
.count-badge { min-width: 44rpx; height: 38rpx; padding: 0 12rpx; border-radius: 19rpx; background: #E8855A; color: #FFF9F5; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.mission-loading { padding: 26rpx; border-radius: 22rpx; background: #FFFDFC; border: 1rpx solid #E3D6CC; }
.mission-row { display: flex; align-items: center; gap: 16rpx; min-height: 148rpx; padding: 21rpx 0; border-bottom: 1rpx solid #E6DAD0; }
.mission-mark { width: 74rpx; height: 74rpx; border-radius: 23rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mission-main { flex: 1; min-width: 0; }
.mission-title-line { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.mission-title { color: #3B2C24; font-size: 28rpx; font-weight: 680; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mission-state { font-size: 20rpx; white-space: nowrap; font-weight: 600; }
.mission-hint { display: block; color: #736057; font-size: 23rpx; line-height: 1.45; margin-top: 7rpx; }
.mission-meta { display: flex; gap: 13rpx; flex-wrap: wrap; color: #947D70; font-size: 19rpx; margin-top: 7rpx; }
.row-arrow { color: #A9958A; font-size: 38rpx; }
.mission-empty { display: flex; align-items: center; gap: 16rpx; min-height: 132rpx; padding: 20rpx; border-radius: 22rpx; border: 1rpx solid #E1D4C9; background: #FFFDFC; }
.empty-symbol { width: 68rpx; height: 68rpx; border-radius: 21rpx; background: #F5E9E1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.empty-copy { flex: 1; min-width: 0; }
.empty-title { display: block; color: #45342B; font-size: 25rpx; font-weight: 650; }
.empty-desc { display: block; color: #806C60; font-size: 21rpx; line-height: 1.45; margin-top: 5rpx; }
.empty-link { min-height: 64rpx; padding: 0 13rpx; color: #A55D3D; font-size: 22rpx; font-weight: 650; display: flex; align-items: center; }
.decision-row { min-height: 104rpx; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 18rpx 0; border-bottom: 1rpx solid #E6DAD0; }
.decision-title { display: block; color: #45332A; font-size: 26rpx; font-weight: 650; }
.decision-desc { display: block; color: #826E62; font-size: 21rpx; margin-top: 5rpx; }
.decision-action { min-width: 94rpx; height: 58rpx; border-radius: 17rpx; background: #F3E3DA; color: #A25D3F; font-size: 22rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.probe-row { display: flex; align-items: center; gap: 15rpx; min-height: 126rpx; padding: 18rpx 0; border-bottom: 1rpx solid #E6DAD0; }
.probe-avatar { width: 70rpx; height: 70rpx; border-radius: 50%; background: #F0DED3; overflow: hidden; color: #A45535; font-size: 28rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.probe-avatar image { width: 100%; height: 100%; }
.probe-main { flex: 1; min-width: 0; }
.probe-name { display: block; color: #44332A; font-size: 26rpx; font-weight: 650; }
.probe-summary { display: block; color: #715E54; font-size: 22rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 5rpx; }
.probe-meta { display: block; color: #9A8377; font-size: 19rpx; margin-top: 4rpx; }
.decision-empty { padding: 28rpx 24rpx; border-radius: 22rpx; background: #F5ECE5; }
.decision-empty-title { display: block; color: #46352C; font-size: 26rpx; font-weight: 650; }
.decision-empty-desc { display: block; color: #7D695E; font-size: 22rpx; line-height: 1.5; margin-top: 6rpx; }
.control-note { display: flex; align-items: flex-start; gap: 11rpx; margin-top: 34rpx; padding: 19rpx; border-radius: 19rpx; background: #EDF5F0; color: #5A7263; font-size: 21rpx; line-height: 1.5; }
.control-note > text:nth-child(2) { flex: 1; }
.control-link { color: #3F7755; font-weight: 650; }
.text-link { color: #A45D3E; font-size: 22rpx; min-height: 50rpx; display: flex; align-items: center; }
.relation-strip { display: flex; align-items: stretch; min-height: 124rpx; padding: 18rpx 0; border-top: 1rpx solid #E2D5CB; border-bottom: 1rpx solid #E2D5CB; }
.relation-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5rpx; }
.relation-value { color: #3C2D25; font-size: 34rpx; font-weight: 750; font-variant-numeric: tabular-nums; }
.relation-label { color: #806C60; font-size: 21rpx; }
.relation-divider { width: 1rpx; background: #E1D5CB; }
.bottom-space { height: 180rpx; }
</style>
