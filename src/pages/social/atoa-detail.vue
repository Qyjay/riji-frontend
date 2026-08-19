<template>
  <view class="page">
    <CustomNavBar title="分身试聊" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-if="loading" class="content skeleton-wrap">
        <Skeleton :width="260" :height="44" :margin-bottom="18" />
        <Skeleton :width="'100%'" :height="24" :margin-bottom="12" />
        <Skeleton :width="'76%'" :height="24" :margin-bottom="36" />
        <Skeleton v-for="n in 4" :key="n" :width="n % 2 ? '76%' : '70%'" :height="96" :radius="18" :margin-bottom="20" />
      </view>

      <view v-else-if="probe" class="content">
        <view class="identity">
          <view class="identity-avatar">
            <image v-if="probe.userBAvatar" :src="resolveAvatarUrl(probe.userBAvatar)" mode="aspectFill" />
            <text v-else class="identity-letter">{{ probe.userBName.slice(0, 1) }}</text>
          </view>
          <view class="identity-copy">
            <text class="identity-name">{{ probe.userBName }}</text>
            <text class="identity-status">{{ probe.readableOutcome }}</text>
          </view>
          <view class="mutual-mark" :class="{ quiet: !probe.isMutual }">
            <text class="mutual-label">{{ probe.isMutual ? '双向合适' : '值得了解' }}</text>
          </view>
        </view>

        <view v-if="missionId" class="mission-context" @click="openMission">
          <DoodleIcon name="target" :size="30" color="#9B6144" />
          <view class="mission-context-copy">
            <text class="mission-context-label">这段试聊属于一项找人任务</text>
            <text class="mission-context-link">查看任务条件和其他候选</text>
          </view>
          <text class="mission-context-arrow">›</text>
        </view>

        <view class="evidence">
          <text class="evidence-title">为什么开始这段对话</text>
          <view v-for="(reason, index) in probe.reasonsA.slice(0, 3)" :key="reason" class="evidence-row">
            <text class="evidence-index">{{ index + 1 }}</text>
            <text class="evidence-copy">{{ reason }}</text>
          </view>
          <view v-if="probe.sharedTopics.length" class="evidence-topics">
            <text v-for="topic in probe.sharedTopics" :key="topic" class="topic">{{ topic }}</text>
          </view>
        </view>

        <view class="privacy-line">
          <DoodleIcon name="lock" :size="28" color="#5C8E70" />
          <text class="privacy-copy">本次仅使用双方授权的公开名片，没有读取或发送日记原文。</text>
        </view>

        <view class="conversation-heading">
          <text class="conversation-title">两个分身聊了什么</text>
          <text class="conversation-phase">第 {{ probe.interactionPhase }} 组</text>
        </view>

        <view class="conversation">
          <view
            v-for="(turn, index) in probe.conversation"
            :key="`${index}-${turn.role}`"
            class="turn"
            :class="turn.role === 'avatar_a' ? 'mine' : 'theirs'"
          >
            <text class="turn-speaker">{{ turn.role === 'avatar_a' ? '我的分身' : `${probe.userBName}的分身` }}</text>
            <view class="bubble">
              <text class="bubble-copy">{{ turn.content }}</text>
            </view>
          </view>
        </view>

        <view v-if="isTerminal" class="result-panel" :class="probe.outcome">
          <DoodleIcon :name="probe.outcome === 'connect_confirmed' ? 'check' : 'loading'" :size="42" :color="resultColor" />
          <view class="result-copy">
            <text class="result-title">{{ resultTitle }}</text>
            <text class="result-desc">{{ resultDescription }}</text>
          </view>
          <view v-if="probe.outcome === 'connect_confirmed' && probe.triggeredMatchId" class="chat-link" @click="openChat">
            <text class="chat-link-text">开始聊天</text>
          </view>
        </view>

        <view class="bottom-space" />
      </view>

      <view v-else class="error-state">
        <text class="error-title">这段对话暂时无法打开</text>
        <text class="error-desc">可能已被新一轮探路替代，返回分身中心刷新后再试。</text>
      </view>
    </scroll-view>

    <view v-if="probe && !isTerminal" class="decision-bar">
      <view class="decision-secondary" role="button" tabindex="0" :class="{ disabled: acting }" @click="blockProbe" @keyup.enter="blockProbe">
        <text class="decision-secondary-text">不合适</text>
      </view>
      <view class="decision-secondary continue" role="button" tabindex="0" :class="{ disabled: acting }" @click="continueChat" @keyup.enter="continueChat">
        <text class="decision-secondary-text">{{ continuing ? '续聊中' : '再聊一轮' }}</text>
      </view>
      <view class="decision-primary" role="button" tabindex="0" :class="{ disabled: acting }" @click="connect" @keyup.enter="connect">
        <text class="decision-primary-text">{{ connecting ? '发送中' : '想认识 TA' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import { continueAtoaConversation, decideAtoa, getAtoaProbes } from '@/services/api/avatar'
import type { AtoaProbe } from '@/services/api/avatar'
import { haptics } from '@/platform'
import { decodeQueryParam, withQuery } from '@/utils/query'
import { resolveAvatarUrl } from '@/utils/avatar'

const navHeight = ref(64)
const scrollHeight = ref(600)
const interactionId = ref('')
const sessionId = ref('')
const missionId = ref('')
const missionMode = ref('')
const probe = ref<AtoaProbe | null>(null)
const loading = ref(true)
const continuing = ref(false)
const connecting = ref(false)
const blocking = ref(false)
const acting = computed(() => continuing.value || connecting.value || blocking.value)
const isTerminal = computed(() => probe.value ? probe.value.outcome !== 'pending_user_decision' : false)
const resultTitle = computed(() => {
  const outcome = probe.value?.outcome
  if (outcome === 'connect_confirmed') return '你们已经成为搭子'
  if (outcome === 'connect_rejected') return '对方暂时没有接受'
  if (outcome === 'connected') return '申请已发出'
  if (outcome === 'blocked') return '已停止这段试聊'
  return '状态已更新'
})
const resultDescription = computed(() => {
  const outcome = probe.value?.outcome
  if (outcome === 'connect_confirmed') return '接下来由你们真人交流，分身不会代替你做承诺。'
  if (outcome === 'connect_rejected') return '这不会影响后续推荐，分身会继续寻找更合适的人。'
  if (outcome === 'connected') return '等待对方本人确认。确认前，分身不会继续推进关系。'
  if (outcome === 'blocked') return '双方匹配权重已降低，这段内容不会对对方展示。'
  return ''
})
const resultColor = computed(() => probe.value?.outcome === 'connect_confirmed' ? '#4D9A71' : '#B56A45')

onLoad((options: any) => {
  interactionId.value = decodeQueryParam(options?.id)
  sessionId.value = decodeQueryParam(options?.sessionId)
  missionId.value = decodeQueryParam(options?.missionId)
  missionMode.value = decodeQueryParam(options?.missionMode)
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(
    info.statusBarHeight ?? 0,
    info.uniPlatform === 'web' ? 36 : 20,
  ) + 44
  scrollHeight.value = info.windowHeight - navHeight.value - 96
})

onShow(() => {
  if (!interactionId.value || acting.value) return
  void loadProbe(Boolean(probe.value))
})

async function loadProbe(isRefresh = false) {
  if (!isRefresh) loading.value = true
  try {
    const probes = await getAtoaProbes(undefined, sessionId.value || undefined)
    if (acting.value) return
    probe.value = probes.find((item) => item.id === interactionId.value) || (isRefresh ? probe.value : null)
  } catch (error: any) {
    if (!isRefresh) {
      uni.showToast({ title: error?.message || '对话加载失败', icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function continueChat() {
  if (!probe.value || acting.value) return
  continuing.value = true
  try {
    const result = await continueAtoaConversation(probe.value.id)
    probe.value = {
      ...probe.value,
      outcome: result.outcome,
      interactionPhase: result.interactionPhase,
      conversation: result.conversation,
      updatedAt: result.updatedAt,
    }
  } catch (error: any) {
    uni.showToast({ title: error?.message || '续聊失败，请稍后重试', icon: 'none' })
  } finally {
    continuing.value = false
  }
}

async function blockProbe() {
  if (!probe.value || acting.value) return
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '停止这段试聊？',
      content: '对方不会看到这段对话，双方后续被推荐的权重也会降低。',
      confirmText: '停止试聊',
      cancelText: '继续看看',
      confirmColor: '#B85E42',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  blocking.value = true
  try {
    await decideAtoa(probe.value.id, 'block')
    probe.value = { ...probe.value, outcome: 'blocked', readableOutcome: '已打断' }
  } catch (error: any) {
    uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
  } finally {
    blocking.value = false
  }
}

async function connect() {
  if (!probe.value || acting.value) return
  connecting.value = true
  try {
    const topic = probe.value.sharedTopics[0]
    const message = topic
      ? `我们的分身聊到都喜欢${topic}，想继续认识一下。`
      : '我们的分身先聊过，想继续认识一下。'
    const result = await decideAtoa(probe.value.id, 'connect', message)
    probe.value = {
      ...probe.value,
      outcome: 'connected',
      readableOutcome: '已发出结交申请',
      triggeredMatchId: result.socialMatchId,
    }
    haptics.heavy()
  } catch (error: any) {
    uni.showToast({ title: error?.message || '申请发送失败', icon: 'none' })
  } finally {
    connecting.value = false
  }
}

function openChat() {
  if (!probe.value?.triggeredMatchId) return
  if (missionId.value && missionMode.value === 'short_term') {
    uni.navigateTo({
      url: withQuery('/pages/social/activity-room', { matchId: probe.value.triggeredMatchId }),
    })
    return
  }
  uni.navigateTo({
    url: withQuery('/pages/social/chat', {
      matchId: probe.value.triggeredMatchId,
      nickname: probe.value.userBName,
    }),
  })
}

function openMission() {
  if (!missionId.value) return
  uni.navigateTo({
    url: withQuery('/pages/social/mission-detail', { id: missionId.value }),
  })
}
</script>

<style lang="scss" scoped>
.page { height: 100%; background: #FDF8F3; }
[role='button']:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 24rpx 32rpx 0; }
.skeleton-wrap { display: flex; flex-direction: column; }
.identity { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 0 28rpx; border-bottom: 1rpx solid #E8DDD3; }
.mission-context { display: flex; align-items: center; gap: 14rpx; min-height: 86rpx; margin-top: 18rpx; padding: 14rpx 18rpx; border-radius: 19rpx; background: #F5ECE5; }
.mission-context-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3rpx; }
.mission-context-label { color: #5C493F; font-size: 23rpx; font-weight: 600; }
.mission-context-link { color: #8C6C5A; font-size: 20rpx; }
.mission-context-arrow { color: #A38C7F; font-size: 34rpx; }
.identity-avatar { width: 92rpx; height: 92rpx; border-radius: 50%; background: #F1DDD1; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.identity-avatar image { width: 100%; height: 100%; }
.identity-letter { font-size: 36rpx; color: #A55231; font-weight: 700; }
.identity-copy { flex: 1; min-width: 160rpx; display: flex; flex-direction: column; gap: 6rpx; }
.identity-name { font-size: 34rpx; color: #2F231C; font-weight: 700; white-space: nowrap; }
.identity-status { font-size: 23rpx; color: #806C60; }
.mutual-mark { flex-shrink: 0; padding: 10rpx 16rpx; border-radius: 18rpx; background: #E8F2EC; }
.mutual-mark.quiet { background: #F1E8E1; }
.mutual-label { font-size: 21rpx; color: #4C8161; font-weight: 600; }
.mutual-mark.quiet .mutual-label { color: #856E61; }
.evidence { padding: 30rpx 0 24rpx; }
.evidence-title { display: block; font-size: 29rpx; color: #392A22; font-weight: 650; margin-bottom: 18rpx; }
.evidence-row { display: flex; align-items: flex-start; gap: 14rpx; margin-bottom: 14rpx; }
.evidence-index { width: 34rpx; height: 34rpx; line-height: 34rpx; text-align: center; border-radius: 50%; background: #F3E1D6; color: #A45B39; font-size: 20rpx; flex-shrink: 0; }
.evidence-copy { flex: 1; font-size: 25rpx; line-height: 1.5; color: #66544A; }
.evidence-topics { display: flex; gap: 12rpx; flex-wrap: wrap; margin-top: 18rpx; }
.topic { padding: 8rpx 14rpx; border-radius: 16rpx; background: #F7EEE8; color: #925C42; font-size: 22rpx; }
.privacy-line { display: flex; gap: 12rpx; align-items: flex-start; padding: 20rpx; border-radius: 18rpx; background: #EDF5F0; }
.privacy-copy { flex: 1; color: #587063; font-size: 23rpx; line-height: 1.55; }
.conversation-heading { display: flex; justify-content: space-between; align-items: baseline; padding: 42rpx 0 24rpx; }
.conversation-title { font-size: 34rpx; color: #30231C; font-weight: 700; }
.conversation-phase { font-size: 22rpx; color: #907B6F; }
.conversation { display: flex; flex-direction: column; gap: 22rpx; }
.turn { display: flex; flex-direction: column; max-width: 84%; }
.turn.mine { align-self: flex-end; align-items: flex-end; }
.turn.theirs { align-self: flex-start; align-items: flex-start; }
.turn-speaker { font-size: 21rpx; color: #8A776B; margin-bottom: 8rpx; }
.bubble { padding: 20rpx 22rpx; border-radius: 22rpx; background: #FFFDFC; border: 1rpx solid #E6D9CE; }
.mine .bubble { background: #E8855A; border-color: #E8855A; border-bottom-right-radius: 8rpx; }
.theirs .bubble { border-bottom-left-radius: 8rpx; }
.bubble-copy { font-size: 27rpx; line-height: 1.55; color: #49372E; }
.mine .bubble-copy { color: #FFF9F5; }
.result-panel { display: flex; align-items: center; gap: 18rpx; margin-top: 36rpx; padding: 24rpx; border-radius: 22rpx; background: #F6EEE8; }
.result-panel.connect_confirmed { background: #EAF4EE; }
.result-copy { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.result-title { color: #392A22; font-size: 28rpx; font-weight: 650; }
.result-desc { color: #6F5D53; font-size: 23rpx; line-height: 1.5; }
.chat-link { min-height: 64rpx; display: flex; align-items: center; }
.chat-link-text { color: #A75A37; font-size: 24rpx; font-weight: 600; }
.bottom-space { height: 170rpx; }
.error-state { padding: 160rpx 52rpx; text-align: center; }
.error-title { display: block; font-size: 32rpx; color: #33251E; font-weight: 650; margin-bottom: 12rpx; }
.error-desc { font-size: 25rpx; color: #7A675C; line-height: 1.6; }
.decision-bar { position: fixed; left: 0; right: 0; bottom: 0; min-height: 112rpx; padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom)); background: #FFFDFC; border-top: 1rpx solid #E6D9CE; display: flex; gap: 12rpx; z-index: 100; }
.decision-secondary, .decision-primary { min-height: 84rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.decision-secondary { width: 150rpx; background: #F3EAE4; }
.decision-secondary.continue { width: 178rpx; }
.decision-primary { flex: 1; background: #D96F42; }
.decision-secondary-text { color: #67554B; font-size: 25rpx; font-weight: 600; }
.decision-primary-text { color: #FFF9F5; font-size: 26rpx; font-weight: 650; }
.disabled { opacity: 0.55; }
</style>
