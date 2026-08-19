<template>
  <view class="page">
    <CustomNavBar title="找人任务" left-icon="back" right-text="广场" @right-click="goPlaza" />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view
      class="scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view v-if="loading" class="content">
        <Skeleton :width="210" :height="28" :margin-bottom="18" />
        <Skeleton :width="'82%'" :height="48" :margin-bottom="18" />
        <Skeleton :width="'100%'" :height="120" :radius="18" />
      </view>

      <view v-else-if="mission" class="content">
        <view class="mission-head">
          <view class="mode-line">
            <view class="mode-mark" :style="{ background: softColor }">
              <DoodleIcon :name="mission.mode === 'short_term' ? 'calendar' : 'heart'" :size="34" :color="accent" />
            </view>
            <text class="mode-label">{{ missionModeLabel(mission.mode) }}</text>
            <view class="status-badge" :style="{ background: softColor }">
              <text class="status-copy" :style="{ color: accent }">{{ missionStatusLabel(mission.status) }}</text>
            </view>
          </view>
          <text class="mission-title">{{ mission.title }}</text>
          <text class="mission-description">{{ mission.description }}</text>
        </view>

        <view class="facts">
          <view class="fact">
            <DoodleIcon name="calendar" :size="28" color="#866D5F" />
            <text class="fact-copy">{{ formatMissionTime(mission) }}</text>
          </view>
          <view class="fact">
            <DoodleIcon name="pin" :size="28" color="#866D5F" />
            <text class="fact-copy">{{ mission.location.label || '地点可商量' }} · {{ mission.location.radiusKm }} km</text>
          </view>
          <view v-if="mission.mode === 'short_term'" class="fact">
            <DoodleIcon name="user" :size="28" color="#866D5F" />
            <text class="fact-copy">再找 {{ mission.headcount.wanted }} 人</text>
          </view>
        </view>

        <view class="progress-panel">
          <view class="progress-copy">
            <text class="progress-title">{{ missionStatusHint(mission) }}</text>
            <text class="progress-desc">{{ progressDescription }}</text>
          </view>
          <view v-if="busy" class="progress-spinner" />
        </view>

        <view class="funnel">
          <view class="funnel-item">
            <text class="funnel-value">{{ mission.candidateCount }}</text>
            <text class="funnel-label">合格候选</text>
          </view>
          <view class="funnel-line" />
          <view class="funnel-item">
            <text class="funnel-value">{{ probedCount }}</text>
            <text class="funnel-label">已试聊</text>
          </view>
          <view class="funnel-line" />
          <view class="funnel-item">
            <text class="funnel-value">{{ mission.pendingCount }}</text>
            <text class="funnel-label">等你决定</text>
          </view>
        </view>

        <view class="primary-row" role="button" tabindex="0" @click="openCandidates" @keyup.enter="openCandidates">
          <view>
            <text class="primary-row-title">查看候选和试聊</text>
            <text class="primary-row-desc">先看硬条件、适合点和待确认问题</text>
          </view>
          <text class="row-arrow">›</text>
        </view>

        <view class="section-heading">
          <view>
            <text class="section-kicker">LATEST</text>
            <text class="section-title">最近候选</text>
          </view>
          <text v-if="candidates.length" class="text-link" @click="openCandidates">查看全部</text>
        </view>

        <view v-if="candidates.length" class="candidate-preview">
          <view
            v-for="candidate in candidates.slice(0, 3)"
            :key="candidate.id"
            class="candidate-row"
            role="button"
            tabindex="0"
            @click="openCandidate(candidate)"
            @keyup.enter="openCandidate(candidate)"
          >
            <view class="candidate-avatar">
              <image v-if="candidate.targetUser?.avatar" :src="candidate.targetUser.avatar" mode="aspectFill" />
              <text v-else class="avatar-letter">{{ candidateName(candidate).slice(0, 1) }}</text>
            </view>
            <view class="candidate-main">
              <view class="candidate-name-line">
                <text class="candidate-name">{{ candidateName(candidate) }}</text>
                <text class="candidate-status">{{ candidateStatus(candidate) }}</text>
              </view>
              <text class="candidate-reason">{{ candidate.fitReasons[0]?.text || '公开条件与你的任务有交集' }}</text>
              <text class="candidate-question">{{ candidate.questions[0] || '分身可以先替你问清楚细节' }}</text>
            </view>
            <text class="row-arrow small">›</text>
          </view>
        </view>

        <view v-else class="empty-candidates">
          <text class="empty-title">当前没有同时满足条件的候选</text>
          <text class="empty-desc">{{ emptySuggestion }}</text>
          <view class="empty-actions">
            <view class="outline-action" :class="{ disabled: busy }" @click="runSearch">
              <text>{{ busy ? '正在搜索' : '重新搜索' }}</text>
            </view>
            <view
              v-if="mission.permissions.draftPost"
              class="solid-action"
              :style="{ background: accent }"
              @click="preparePost"
            >
              <text>准备招募帖</text>
            </view>
          </view>
        </view>

        <view v-if="mission.linkedPostId || postDraft" class="section-heading post-heading">
          <view>
            <text class="section-kicker">PLAZA</text>
            <text class="section-title">{{ mission.linkedPostId ? '招募帖已发布' : '招募帖草稿' }}</text>
          </view>
        </view>

        <view v-if="mission.linkedPostId" class="published-post" @click="openLinkedPost">
          <DoodleIcon name="check" :size="34" color="#4F8765" />
          <view class="published-copy">
            <text class="published-title">正在广场招募</text>
            <text class="published-desc">新的候选会继续汇总到这项任务</text>
          </view>
          <text class="row-arrow">›</text>
        </view>

        <view v-else-if="postDraft" class="post-draft">
          <textarea
            v-model="postDraft.content"
            class="post-textarea"
            maxlength="2000"
            :show-confirm-bar="false"
          />
          <view class="draft-meta">
            <text>{{ postDraft.location || '位置待确认' }}</text>
            <text>{{ postDraft.schoolOnly ? '仅本校可见' : '公开可见' }}</text>
          </view>
          <view class="draft-tags">
            <text v-for="tag in postDraft.tags" :key="tag" class="draft-tag">#{{ tag }}</text>
          </view>
          <view class="publish-action" :class="{ disabled: publishing }" @click="publishPost">
            <text>{{ publishing ? '正在发布' : '确认并发布' }}</text>
          </view>
        </view>

        <view class="section-heading control-heading">
          <view>
            <text class="section-kicker">CONTROL</text>
            <text class="section-title">任务控制</text>
          </view>
        </view>

        <view class="control-list">
          <view v-if="!isTerminal" class="control-row" @click="editCurrentMission">
            <DoodleIcon name="pen" :size="30" color="#7A675C" />
            <text class="control-copy">修改条件并重新搜索</text>
            <text class="row-arrow small">›</text>
          </view>
          <view
            v-if="mission.status === 'paused'"
            class="control-row"
            @click="resumeCurrentMission"
          >
            <DoodleIcon name="discover" :size="30" color="#6B8EB4" />
            <text class="control-copy">恢复寻找</text>
            <text class="row-arrow small">›</text>
          </view>
          <view
            v-else-if="!isTerminal"
            class="control-row"
            @click="pauseCurrentMission"
          >
            <DoodleIcon name="loading" :size="30" color="#8A7668" />
            <text class="control-copy">暂停寻找</text>
            <text class="row-arrow small">›</text>
          </view>
          <view v-if="!isTerminal" class="control-row danger" @click="closeCurrentMission">
            <DoodleIcon name="cross" :size="30" color="#A86150" />
            <text class="control-copy">关闭这项任务</text>
            <text class="row-arrow small">›</text>
          </view>
        </view>

        <view class="privacy-note">
          <DoodleIcon name="lock" :size="28" color="#5B826B" />
          <text>分身只使用本次授权摘要。发布、申请、接受关系和交换联系方式仍由你确认。</text>
        </view>

        <view class="bottom-space" />
      </view>

      <view v-else class="missing">
        <text class="missing-title">任务暂时无法打开</text>
        <text class="missing-desc">返回找朋友首页刷新后再试。</text>
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
  closeMission,
  createMissionPostDraft,
  getMission,
  getMissionCandidates,
  pauseMission,
  publishMissionPost,
  resumeMission,
  searchMission,
  startMission,
} from '@/services/api/mission'
import type { MissionCandidate, MissionPostDraft, SocialMission } from '@/services/api/mission'
import {
  formatMissionTime,
  missionAccent,
  missionModeLabel,
  missionSoftBackground,
  missionStatusHint,
  missionStatusLabel,
} from '@/utils/mission'

const navHeight = ref(64)
const scrollHeight = ref(600)
const missionId = ref('')
const mission = ref<SocialMission | null>(null)
const candidates = ref<MissionCandidate[]>([])
const loading = ref(true)
const refreshing = ref(false)
const busy = ref(false)
const publishing = ref(false)
const postDraft = ref<MissionPostDraft | null>(null)
const lastSuggestion = ref('')

const accent = computed(() => mission.value ? missionAccent(mission.value.mode) : '#E8855A')
const softColor = computed(() => mission.value ? missionSoftBackground(mission.value.mode) : '#F6E9E1')
const probedCount = computed(() => candidates.value.filter(item => Boolean(item.interactionId)).length)
const isTerminal = computed(() => mission.value
  ? ['completed', 'cancelled', 'expired'].includes(mission.value.status)
  : true)
const progressDescription = computed(() => {
  if (!mission.value) return ''
  if (mission.value.linkedPostId) return '招募帖已发布，同时继续检查新的公开机会。'
  if (mission.value.status === 'awaiting_user') return '分身已经做完初步筛选，下一步由你选择。'
  if (mission.value.status === 'awaiting_peer') return '对方确认前，分身不会继续推进关系。'
  return '你可以随时暂停，所有公开动作仍需要本人确认。'
})
const emptySuggestion = computed(() => lastSuggestion.value || (
  mission.value?.searchStrategy === 'search_only'
    ? '可以重新搜索，或调整时间、地点和非必要条件。'
    : '可以重新搜索，或让分身生成一条招募帖草稿。'
))

onLoad((options: any) => {
  missionId.value = options?.id || ''
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value
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
    uni.showToast({ title: error?.message || '任务加载失败', icon: 'none' })
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

function candidateStatus(candidate: MissionCandidate) {
  if (candidate.status === 'ready_for_user') return '已试聊'
  if (candidate.status === 'request_sent') return '已申请'
  if (candidate.status === 'peer_accepted') return '已连接'
  return '待核验'
}

function openCandidates() {
  uni.navigateTo({
    url: `/pages/social/candidates?missionId=${encodeURIComponent(missionId.value)}`,
  })
}

function openCandidate(candidate: MissionCandidate) {
  if (candidate.interactionId && mission.value?.atoaSessionId) {
    uni.navigateTo({
      url: `/pages/social/atoa-detail?id=${encodeURIComponent(candidate.interactionId)}&sessionId=${encodeURIComponent(mission.value.atoaSessionId)}&missionId=${encodeURIComponent(missionId.value)}&missionMode=${encodeURIComponent(mission.value.mode)}`,
    })
    return
  }
  openCandidates()
}

async function runSearch() {
  if (!mission.value || busy.value) return
  busy.value = true
  try {
    const result = mission.value.status === 'draft'
      ? await startMission(mission.value.id)
      : await searchMission(mission.value.id)
    mission.value = result.mission
    candidates.value = result.candidates
    lastSuggestion.value = result.suggestion
  } catch (error: any) {
    uni.showToast({ title: error?.message || '搜索失败，请稍后重试', icon: 'none' })
  } finally {
    busy.value = false
  }
}

async function preparePost() {
  if (!mission.value) return
  try {
    postDraft.value = await createMissionPostDraft(mission.value.id)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '草稿生成失败', icon: 'none' })
  }
}

async function publishPost() {
  if (!mission.value || !postDraft.value || publishing.value) return
  if (!postDraft.value.content.trim()) {
    uni.showToast({ title: '招募帖内容不能为空', icon: 'none' })
    return
  }
  publishing.value = true
  try {
    const post = await publishMissionPost(mission.value.id, postDraft.value)
    mission.value = await getMission(mission.value.id)
    postDraft.value = null
    uni.showToast({ title: '招募帖已发布', icon: 'success' })
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/plaza/detail?id=${encodeURIComponent(post.id)}` })
    }, 700)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '发布失败，请重试', icon: 'none' })
  } finally {
    publishing.value = false
  }
}

async function pauseCurrentMission() {
  if (!mission.value) return
  try {
    mission.value = await pauseMission(mission.value.id)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '暂停失败', icon: 'none' })
  }
}

async function resumeCurrentMission() {
  if (!mission.value) return
  try {
    mission.value = await resumeMission(mission.value.id)
    await runSearch()
  } catch (error: any) {
    uni.showToast({ title: error?.message || '恢复失败', icon: 'none' })
  }
}

function closeCurrentMission() {
  if (!mission.value) return
  uni.showModal({
    title: '关闭这项找人任务？',
    content: '关闭后不会产生新的候选和试聊，已建立的真人关系不受影响。',
    confirmText: '关闭任务',
    cancelText: '继续寻找',
    confirmColor: '#A86150',
    success: async (result) => {
      if (!result.confirm || !mission.value) return
      try {
        mission.value = await closeMission(mission.value.id)
      } catch (error: any) {
        uni.showToast({ title: error?.message || '关闭失败', icon: 'none' })
      }
    },
  })
}

function openLinkedPost() {
  if (!mission.value?.linkedPostId) return
  uni.navigateTo({
    url: `/pages/plaza/detail?id=${encodeURIComponent(mission.value.linkedPostId)}`,
  })
}

function editCurrentMission() {
  if (!mission.value) return
  uni.navigateTo({
    url: mission.value.mode === 'short_term'
      ? `/pages/social/mission-short?editId=${encodeURIComponent(mission.value.id)}`
      : `/pages/social/mission-long?editId=${encodeURIComponent(mission.value.id)}`,
  })
}

function goPlaza() {
  uni.navigateTo({ url: '/pages/discover/index' })
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
[role='button']:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 24rpx 32rpx 0; }
.mission-head { padding: 20rpx 0 30rpx; }
.mode-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 18rpx; }
.mode-mark { width: 58rpx; height: 58rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; }
.mode-label { color: #786358; font-size: 23rpx; }
.status-badge { margin-left: auto; padding: 8rpx 14rpx; border-radius: 15rpx; }
.status-copy { font-size: 21rpx; font-weight: 650; }
.mission-title { display: block; color: #2D211A; font-size: 45rpx; line-height: 1.25; font-weight: 750; margin-left: -2rpx; }
.mission-description { display: block; color: #715E54; font-size: 26rpx; line-height: 1.65; margin-top: 14rpx; }
.facts { display: flex; flex-wrap: wrap; gap: 12rpx 20rpx; padding: 22rpx 0; border-top: 1rpx solid #E7DBD1; border-bottom: 1rpx solid #E7DBD1; }
.fact { display: flex; align-items: center; gap: 8rpx; }
.fact-copy { color: #6F5B51; font-size: 23rpx; }
.progress-panel { display: flex; align-items: center; gap: 18rpx; margin-top: 30rpx; padding: 24rpx; border-radius: 23rpx; background: #F5ECE5; }
.progress-copy { flex: 1; }
.progress-title { display: block; color: #3D2E26; font-size: 28rpx; font-weight: 650; }
.progress-desc { display: block; color: #7A665B; font-size: 23rpx; line-height: 1.5; margin-top: 7rpx; }
.progress-spinner { width: 38rpx; height: 38rpx; border: 4rpx solid #E4CFC2; border-top-color: #D96F42; border-radius: 50%; animation: spin 900ms linear infinite; }
.funnel { display: flex; align-items: center; padding: 32rpx 0; }
.funnel-item { width: 150rpx; text-align: center; }
.funnel-value { display: block; color: #34271F; font-size: 36rpx; font-weight: 750; font-variant-numeric: tabular-nums; }
.funnel-label { display: block; color: #8A766B; font-size: 21rpx; margin-top: 4rpx; }
.funnel-line { flex: 1; height: 1rpx; background: #DCCFC4; }
.primary-row { min-height: 108rpx; padding: 20rpx 22rpx; border-radius: 22rpx; background: #E8855A; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.primary-row-title { display: block; color: #FFF9F5; font-size: 28rpx; font-weight: 700; }
.primary-row-desc { display: block; color: #FCE5DA; font-size: 21rpx; margin-top: 5rpx; }
.row-arrow { color: #A99387; font-size: 42rpx; }
.primary-row .row-arrow { color: #FFF9F5; }
.row-arrow.small { font-size: 34rpx; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; margin: 48rpx 0 16rpx; }
.section-heading.post-heading, .section-heading.control-heading { margin-top: 54rpx; }
.section-kicker { display: block; color: #A66D4F; font-size: 18rpx; letter-spacing: 2rpx; margin-bottom: 4rpx; }
.section-title { display: block; color: #33261F; font-size: 33rpx; font-weight: 700; }
.text-link { color: #A45C3D; font-size: 23rpx; min-height: 54rpx; display: flex; align-items: center; }
.candidate-row { min-height: 144rpx; display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 1rpx solid #E7DBD1; }
.candidate-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #F0DED3; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.candidate-avatar image { width: 100%; height: 100%; }
.avatar-letter { color: #A45B39; font-size: 30rpx; font-weight: 700; }
.candidate-main { flex: 1; min-width: 0; }
.candidate-name-line { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.candidate-name { color: #3C2D25; font-size: 28rpx; font-weight: 650; }
.candidate-status { color: #8F7566; font-size: 20rpx; }
.candidate-reason { display: block; color: #6E5A50; font-size: 23rpx; margin-top: 7rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.candidate-question { display: block; color: #9A765F; font-size: 21rpx; margin-top: 5rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty-candidates { padding: 34rpx 26rpx; border: 1rpx solid #DFD2C7; border-radius: 23rpx; background: #FFFDFC; }
.empty-title { display: block; color: #3B2C24; font-size: 28rpx; font-weight: 650; }
.empty-desc { display: block; color: #766258; font-size: 24rpx; line-height: 1.6; margin-top: 10rpx; }
.empty-actions { display: flex; gap: 12rpx; margin-top: 24rpx; }
.outline-action, .solid-action { flex: 1; min-height: 76rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; }
.outline-action { border: 1rpx solid #D9C9BE; color: #68554A; }
.outline-action.disabled { opacity: 0.5; }
.solid-action { color: #FFF9F5; }
.published-post { display: flex; align-items: center; gap: 16rpx; min-height: 104rpx; padding: 20rpx 22rpx; border-radius: 22rpx; background: #EAF4EE; }
.published-copy { flex: 1; }
.published-title { display: block; color: #375B46; font-size: 27rpx; font-weight: 650; }
.published-desc { display: block; color: #61806D; font-size: 22rpx; margin-top: 5rpx; }
.post-draft { padding: 22rpx; border-radius: 24rpx; border: 1rpx solid #E0D2C7; background: #FFFDFC; }
.post-textarea { width: 100%; min-height: 320rpx; color: #45342B; font-size: 26rpx; line-height: 1.65; }
.draft-meta { display: flex; justify-content: space-between; gap: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #EDE3DB; color: #806C60; font-size: 21rpx; }
.draft-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.draft-tag { color: #9A6043; font-size: 21rpx; }
.publish-action { min-height: 82rpx; border-radius: 21rpx; background: #D96F42; color: #FFF9F5; font-size: 25rpx; font-weight: 650; display: flex; align-items: center; justify-content: center; margin-top: 22rpx; }
.publish-action.disabled { opacity: 0.5; }
.control-row { min-height: 92rpx; display: flex; align-items: center; gap: 14rpx; border-bottom: 1rpx solid #E7DBD1; }
.control-copy { flex: 1; color: #544139; font-size: 25rpx; }
.control-row.danger .control-copy { color: #9D5948; }
.privacy-note { display: flex; align-items: flex-start; gap: 12rpx; padding: 20rpx; margin-top: 36rpx; border-radius: 20rpx; background: #EDF5F0; color: #587062; font-size: 22rpx; line-height: 1.55; }
.bottom-space { height: 80rpx; }
.missing { padding: 180rpx 44rpx; text-align: center; }
.missing-title { display: block; color: #392B23; font-size: 32rpx; font-weight: 700; }
.missing-desc { display: block; color: #7B685D; font-size: 24rpx; margin-top: 10rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
