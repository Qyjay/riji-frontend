<template>
  <view class="voice-page">
    <VoiceCallHeader :status-bar-height="statusBarHeight" @back="handleBack" />

    <VoiceErrorState
      v-if="error && phase === 'error'"
      :error="error"
      @retry="startSession"
      @leave="leaveToChat"
    />

    <VoiceCallSummary
      v-else-if="phase === 'closed'"
      :summary="summary || {}"
      @mission="openMission"
      @back="leaveToChat"
    />

    <template v-else>
      <VoiceSignal
        :phase="phase"
        :input-level="inputLevel"
        :output-level="outputLevel"
        :tool-label="activeTool?.label"
      />

      <scroll-view
        class="conversation-scroll"
        scroll-y
        :scroll-top="scrollTop"
        :show-scrollbar="false"
      >
        <VoiceTranscript
          :mode="entryMode"
          :items="visibleTranscripts"
          :active-user-text="activeUserText"
          :active-assistant-text="activeAssistantText"
        />
        <VoiceEvidenceList :items="evidence" @open="openEvidence" />
        <VoiceToolStatus
          :tool-label="activeTool?.label"
          :mission-summary="missionSummary"
          :questions="missionQuestions"
        />
        <button
          v-if="navigationSuggestion"
          class="navigation-action"
          role="button"
          tabindex="0"
          @click="realtimeStore.openSuggestion"
          @keyup.enter="realtimeStore.openSuggestion"
          @keyup.space="realtimeStore.openSuggestion"
        >
          {{ navigationSuggestion.label }}
          <text aria-hidden="true">›</text>
        </button>
        <view class="scroll-tail" />
      </scroll-view>

      <view v-if="error && error.recoverable" class="inline-error" role="alert">
        <text>{{ error.message }}</text>
      </view>

      <VoiceConfirmation
        :confirmation="confirmation"
        :resolving="phase === 'thinking'"
        @resolve="resolveConfirmation"
      />

      <VoiceControls
        :mic-enabled="isMicEnabled"
        :speaker-enabled="isSpeakerEnabled"
        :disabled="phase === 'connecting' || phase === 'requesting_permission' || phase === 'reconnecting'"
        :ending="phase === 'closing'"
        @toggle-mic="realtimeStore.toggleMic"
        @toggle-speaker="realtimeStore.toggleSpeaker"
        @end="realtimeStore.close('user')"
      />
    </template>
  </view>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'

import VoiceCallHeader from '@/components/voice/VoiceCallHeader.vue'
import VoiceCallSummary from '@/components/voice/VoiceCallSummary.vue'
import VoiceConfirmation from '@/components/voice/VoiceConfirmation.vue'
import VoiceControls from '@/components/voice/VoiceControls.vue'
import VoiceErrorState from '@/components/voice/VoiceErrorState.vue'
import VoiceEvidenceList from '@/components/voice/VoiceEvidenceList.vue'
import VoiceSignal from '@/components/voice/VoiceSignal.vue'
import VoiceToolStatus from '@/components/voice/VoiceToolStatus.vue'
import VoiceTranscript from '@/components/voice/VoiceTranscript.vue'
import { createRealtimeAudioAdapter } from '@/services/realtime/audio'
import { FakeRealtimeAudioAdapter } from '@/services/realtime/audio/fake-audio'
import { createDemoVoiceSocket } from '@/services/realtime/voice-demo'
import { RealtimeVoiceSocketClient } from '@/services/realtime/voice-socket'
import type {
  ConfirmationDecision,
  VoiceEntryMode,
} from '@/services/realtime/voice-protocol'
import {
  isSafeVoiceDeepLink,
  useRealtimeVoiceStore,
} from '@/stores/realtime-voice'

const realtimeStore = useRealtimeVoiceStore()
const {
  phase,
  inputLevel,
  outputLevel,
  visibleTranscripts,
  activeUserText,
  activeAssistantText,
  activeTool,
  evidence,
  missionSummary,
  missionQuestions,
  confirmation,
  navigationSuggestion,
  isMicEnabled,
  isSpeakerEnabled,
  error,
  summary,
} = storeToRefs(realtimeStore)

const statusBarHeight = ref(20)
const scrollTop = ref(0)
const entryMode = ref<VoiceEntryMode>('general')
const demoMode = ref(false)
const demoScenario = ref<'memory' | 'mission'>('memory')
let hiddenCloseTimer: ReturnType<typeof setTimeout> | null = null
let leaving = false

onLoad((options?: Record<string, string | undefined>) => {
  entryMode.value = options?.mode === 'social_mission' ? 'social_mission' : 'general'
  demoMode.value = Boolean(import.meta.env.DEV && options?.demo === '1')
  demoScenario.value = entryMode.value === 'social_mission' ? 'mission' : 'memory'
})

watch(
  () => [
    visibleTranscripts.value.length,
    activeUserText.value,
    activeAssistantText.value,
    evidence.value.length,
    Boolean(missionSummary.value),
  ],
  () => {
    nextTick(() => {
      scrollTop.value += 100000
    })
  },
  { flush: 'post' },
)

function configureDependencies() {
  realtimeStore.configure({
    createAudio: () => (
      demoMode.value
        ? new FakeRealtimeAudioAdapter()
        : createRealtimeAudioAdapter()
    ),
    createSocket: (handlers) => (
      demoMode.value
        ? createDemoVoiceSocket(handlers, demoScenario.value) as any
        : new RealtimeVoiceSocketClient(handlers)
    ),
  })
}

async function startSession() {
  try {
    configureDependencies()
    // 不传 clientPlatform，由 voice-api 按运行平台自动上报
    await realtimeStore.connect({
      entryMode: entryMode.value,
    })
  } catch {
    // Store exposes the specific permission, service or network error.
  }
}

async function closeBeforeNavigation() {
  if (hiddenCloseTimer) {
    clearTimeout(hiddenCloseTimer)
    hiddenCloseTimer = null
  }
  await realtimeStore.close('navigate')
}

async function openEvidence(path: string) {
  if (!isSafeVoiceDeepLink(path)) return
  await closeBeforeNavigation()
  uni.navigateTo({ url: path })
}

async function openMission() {
  const missionId = summary.value?.missionId
  if (!missionId) return
  uni.redirectTo({
    url: `/pages/social/mission-detail?id=${encodeURIComponent(missionId)}`,
  })
}

function resolveConfirmation(decision: ConfirmationDecision) {
  realtimeStore.resolveConfirmation(decision)
}

async function handleBack() {
  if (leaving) return
  leaving = true
  await closeBeforeNavigation()
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages/chat/index' })
}

async function leaveToChat() {
  await closeBeforeNavigation()
  uni.redirectTo({ url: '/pages/chat/index' })
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = Math.max(info.statusBarHeight || 0, 20)
  void startSession()
})

onHide(() => {
  void realtimeStore.stopCapture()
  if (hiddenCloseTimer) clearTimeout(hiddenCloseTimer)
  hiddenCloseTimer = setTimeout(() => {
    void realtimeStore.close('background_timeout')
  }, 30000)
})

onShow(() => {
  if (hiddenCloseTimer) {
    clearTimeout(hiddenCloseTimer)
    hiddenCloseTimer = null
  }
  if (realtimeStore.isActive && phase.value !== 'reconnecting') {
    void realtimeStore.startCapture()
  }
})

onUnload(() => {
  void realtimeStore.close('unload')
})

onUnmounted(() => {
  if (hiddenCloseTimer) clearTimeout(hiddenCloseTimer)
  void realtimeStore.close('unmount')
})
</script>

<style scoped lang="scss">
.voice-page {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, #fdf8f3 0%, #faf2eb 48%, #fdf8f3 100%);
  color: #2f231c;
}
.conversation-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.scroll-tail { height: 28rpx; }
.navigation-action {
  width: calc(100% - 64rpx);
  min-height: 88rpx;
  margin: 0 32rpx 26rpx;
  padding: 0 22rpx;
  border: 1px solid #b9cbbd;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #486653;
  font-size: 24rpx;
  font-weight: 700;
  background: #f1f6f2;
}
.navigation-action::after { border: 0; }
.navigation-action:active { background: #e5eee7; }
.navigation-action:focus-visible { outline: 2px solid #52765e; outline-offset: 2px; }
.inline-error {
  flex: 0 0 auto;
  min-height: 58rpx;
  padding: 12rpx 32rpx;
  color: #8f433d;
  font-size: 21rpx;
  line-height: 1.5;
  text-align: center;
  background: #f5e4e1;
}
@media (orientation: landscape) {
  .voice-page { max-width: 1120rpx; margin: 0 auto; }
}
</style>
