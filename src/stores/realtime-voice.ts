import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { RealtimeAudioAdapter } from '@/services/realtime/audio/types'
import { arrayBufferToBase64, base64ToArrayBuffer, calculateRms } from '@/services/realtime/audio/pcm'
import { toVoiceUiError, type VoiceUiError } from '@/services/realtime/voice-errors'
import {
  RealtimeVoiceSocketClient,
  type ConnectVoiceOptions,
  type VoiceSocketState,
} from '@/services/realtime/voice-socket'
import type {
  ConfirmationDecision,
  MissionVoiceSummary,
  VoiceConfirmation,
  VoiceEvidence,
  VoicePhase,
  VoiceServerEvent,
  VoiceSessionSummary,
} from '@/services/realtime/voice-protocol'

export interface VoiceTranscriptItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export interface VoiceToolState {
  name: string
  label: string
}

export interface VoiceNavigationSuggestion {
  path: string
  label: string
}

export interface RealtimeVoiceDependencies {
  createSocket?: (
    handlers: {
      onEvent: (event: VoiceServerEvent) => void
      onState: (state: VoiceSocketState) => void
      onSocketError: (error: Error) => void
    },
  ) => RealtimeVoiceSocketClient
  createAudio?: () => RealtimeAudioAdapter
  now?: () => number
}

const PHASES = new Set<VoicePhase>([
  'idle',
  'requesting_permission',
  'connecting',
  'ready',
  'listening',
  'thinking',
  'speaking',
  'interrupted',
  'tool_running',
  'awaiting_confirmation',
  'reconnecting',
  'closing',
  'closed',
  'error',
])

const TOOL_LABELS: Record<string, string> = {
  search_personal_memory: '正在查找记忆',
  get_memory_document: '正在读取日记',
  draft_social_mission: '正在整理找人条件',
  create_social_mission_draft: '正在保存私有草稿',
  start_social_mission: '正在搜索合适的人',
  list_social_missions: '正在读取任务',
  get_social_mission_progress: '正在查看任务进度',
}

const SAFE_ROUTES = [
  '/pages/index/index',
  '/pages/chat/index',
  '/pages/social/index',
  '/pages/social/find',
  '/pages/social/mission-detail',
  '/pages/diary/detail',
  '/pages/profile/avatar-memory',
]

export function isSafeVoiceDeepLink(path: string): boolean {
  const pathname = String(path || '').split('?')[0]
  return SAFE_ROUTES.includes(pathname)
}

export const useRealtimeVoiceStore = defineStore('realtime-voice', () => {
  const phase = ref<VoicePhase>('idle')
  const sessionId = ref('')
  const providerSessionId = ref('')
  const socketState = ref<VoiceSocketState>('idle')
  const micPermission = ref<'unknown' | 'granted' | 'denied'>('unknown')
  const isMicEnabled = ref(true)
  const isSpeakerEnabled = ref(true)
  const inputLevel = ref(0)
  const outputLevel = ref(0)
  const transcripts = ref<VoiceTranscriptItem[]>([])
  const activeUserText = ref('')
  const activeAssistantText = ref('')
  const audioQueueSize = ref(0)
  const activeTool = ref<VoiceToolState | undefined>()
  const evidence = ref<VoiceEvidence[]>([])
  const missionSummary = ref<MissionVoiceSummary | undefined>()
  const missionQuestions = ref<string[]>([])
  const confirmation = ref<VoiceConfirmation | undefined>()
  const navigationSuggestion = ref<VoiceNavigationSuggestion | undefined>()
  const reconnectAttempt = ref(0)
  const error = ref<VoiceUiError | undefined>()
  const summary = ref<VoiceSessionSummary | undefined>()
  const callStartedAt = ref(0)

  let dependencies: RealtimeVoiceDependencies = {}
  let socket: RealtimeVoiceSocketClient | null = null
  let audio: RealtimeAudioAdapter | null = null
  let closing = false

  const now = () => dependencies.now?.() ?? Date.now()
  const visibleTranscripts = computed(() => transcripts.value.slice(-20))
  const isActive = computed(
    () => !['idle', 'closed', 'error'].includes(phase.value),
  )
  const durationSec = computed(() => {
    if (summary.value?.durationSec !== undefined) return summary.value.durationSec
    if (!callStartedAt.value) return 0
    return Math.max(0, Math.floor((now() - callStartedAt.value) / 1000))
  })

  function configure(next: RealtimeVoiceDependencies) {
    dependencies = next
  }

  function setPhase(next: VoicePhase) {
    if (PHASES.has(next)) phase.value = next
  }

  function finalizeTranscript(role: 'user' | 'assistant', text: string, id: string) {
    const clean = text.trim()
    if (!clean) return
    if (!transcripts.value.some((item) => item.id === id)) {
      transcripts.value.push({
        id,
        role,
        text: clean,
        timestamp: now(),
      })
      if (transcripts.value.length > 20) {
        transcripts.value = transcripts.value.slice(-20)
      }
    }
    if (role === 'user') activeUserText.value = ''
    else activeAssistantText.value = ''
  }

  function interruptLocally() {
    audio?.interruptPlayback()
    audioQueueSize.value = 0
    outputLevel.value = 0
    if (phase.value === 'speaking' || phase.value === 'thinking') {
      setPhase('interrupted')
      try {
        socket?.cancelResponse()
      } catch {
        // Socket may already be recovering; local audio must still stop immediately.
      }
    }
  }

  function handleToolResult(event: Extract<VoiceServerEvent, { type: 'tool.result' }>) {
    activeTool.value = undefined
    const display = event.display
    if (display.kind === 'memory_evidence') {
      evidence.value = display.items.slice(0, 3)
    } else if (display.kind === 'memory_document') {
      evidence.value = [display.item]
    } else if (
      display.kind === 'mission_draft'
      || display.kind === 'mission_created'
    ) {
      missionSummary.value = display.summary
      missionQuestions.value = display.kind === 'mission_draft'
        ? display.questions.slice(0, 3)
        : []
    } else if (display.kind === 'mission_progress' && display.mission) {
      missionSummary.value = {
        activity: display.mission.title,
        scope: `找到 ${display.matchedCount || display.mission.candidateCount || 0} 个候选`,
        notice: display.suggestion || '需要由你本人查看并决定',
      }
    }
  }

  function handleServerEvent(event: VoiceServerEvent) {
    sessionId.value = event.sessionId || sessionId.value
    switch (event.type) {
      case 'session.ready':
        providerSessionId.value = event.providerSessionId
        reconnectAttempt.value = 0
        setPhase('ready')
        void startCapture()
        break
      case 'session.state':
        setPhase(event.state)
        break
      case 'asr.started':
        interruptLocally()
        setPhase('listening')
        break
      case 'asr.delta':
        activeUserText.value += event.text
        break
      case 'asr.done':
        finalizeTranscript(
          'user',
          event.text || activeUserText.value,
          event.itemId || event.eventId,
        )
        break
      case 'assistant.text.delta':
        activeAssistantText.value += event.text
        break
      case 'assistant.text.done':
        finalizeTranscript(
          'assistant',
          event.text || activeAssistantText.value,
          event.itemId || event.eventId,
        )
        break
      case 'assistant.audio.started':
        setPhase('speaking')
        break
      case 'assistant.audio.delta': {
        const pcm = base64ToArrayBuffer(event.audio)
        audio?.enqueuePlayback(pcm)
        audioQueueSize.value += 1
        outputLevel.value = calculateRms(new Int16Array(pcm))
        break
      }
      case 'assistant.audio.done':
        audio?.flushPlayback()
        audioQueueSize.value = 0
        outputLevel.value = 0
        setPhase('listening')
        break
      case 'tool.started':
        activeTool.value = {
          name: event.name,
          label: TOOL_LABELS[event.name] || '正在完成这项操作',
        }
        setPhase('tool_running')
        break
      case 'tool.result':
        handleToolResult(event)
        break
      case 'confirmation.required':
        confirmation.value = event.confirmation
        setPhase('awaiting_confirmation')
        break
      case 'confirmation.resolved':
        if (confirmation.value?.id === event.confirmationId) {
          confirmation.value = undefined
        }
        setPhase(event.decision === 'approve' ? 'thinking' : 'listening')
        break
      case 'navigation.suggested':
        if (isSafeVoiceDeepLink(event.path)) {
          navigationSuggestion.value = { path: event.path, label: event.label }
        }
        break
      case 'session.reconnecting':
        reconnectAttempt.value = event.attempt
        void audio?.stopCapture()
        audio?.interruptPlayback()
        setPhase('reconnecting')
        break
      case 'client.slow_down':
        error.value = toVoiceUiError(
          'network_slow',
          '网络发送速度较慢，正在减少音频缓存。',
          true,
        )
        break
      case 'response.canceled':
        setPhase('listening')
        break
      case 'session.closed':
        summary.value = event.summary || {}
        setPhase('closed')
        void disposeResources(false)
        break
      case 'error':
        error.value = toVoiceUiError(event.code, event.message, event.recoverable)
        if (!event.recoverable) setPhase('error')
        break
      default:
        break
    }
  }

  function createSocket() {
    const handlers = {
      onEvent: handleServerEvent,
      onState: (next: VoiceSocketState) => {
        socketState.value = next
      },
      onSocketError: (socketError: Error) => {
        error.value = toVoiceUiError('socket_error', socketError.message, true)
        if (phase.value !== 'closed') setPhase('error')
      },
    }
    return dependencies.createSocket
      ? dependencies.createSocket(handlers)
      : new RealtimeVoiceSocketClient(handlers)
  }

  function audioErrorCode(reason: unknown): string {
    const name = reason instanceof Error ? reason.name : ''
    const message = reason instanceof Error ? reason.message : String(reason || '')
    if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name)) {
      return 'permission_denied'
    }
    if (['NotFoundError', 'DevicesNotFoundError'].includes(name)) {
      return 'audio_input_missing'
    }
    if (message.includes('不支持')) return 'audio_unsupported'
    return 'audio_capture_unavailable'
  }

  async function requestPermission() {
    setPhase('requesting_permission')
    try {
      await audio?.requestPermission()
      micPermission.value = 'granted'
    } catch (reason) {
      const code = audioErrorCode(reason)
      micPermission.value = code === 'permission_denied' ? 'denied' : 'unknown'
      const message = reason instanceof Error ? reason.message : ''
      error.value = toVoiceUiError(code, message, code !== 'permission_denied')
      setPhase('error')
      throw error.value
    }
  }

  async function connect(options: ConnectVoiceOptions = {}) {
    await disposeResources()
    reset()
    audio = dependencies.createAudio?.() || null
    socket = createSocket()
    if (!audio) throw new Error('当前平台没有可用的实时音频适配器')
    try {
      await requestPermission()
      setPhase('connecting')
      callStartedAt.value = now()
      await socket.connect(options)
    } catch (reason) {
      if (!error.value) {
        const message = reason instanceof Error ? reason.message : '连接失败'
        error.value = toVoiceUiError('socket_error', message, true)
        setPhase('error')
      }
      throw reason
    }
  }

  async function startCapture() {
    if (!audio || micPermission.value !== 'granted') return
    await audio.startCapture((pcm, level) => {
      inputLevel.value = level
      if (!isMicEnabled.value || socketState.value !== 'open') return
      try {
        socket?.appendAudio(arrayBufferToBase64(pcm))
      } catch {
        // Socket state handler will surface connection errors.
      }
    })
    setPhase('listening')
  }

  async function stopCapture() {
    inputLevel.value = 0
    await audio?.stopCapture()
  }

  function commitAudio() {
    socket?.commitAudio()
  }

  function toggleMic() {
    isMicEnabled.value = !isMicEnabled.value
    audio?.setMicEnabled(isMicEnabled.value)
    if (!isMicEnabled.value) inputLevel.value = 0
  }

  function toggleSpeaker() {
    isSpeakerEnabled.value = !isSpeakerEnabled.value
    audio?.setSpeakerEnabled(isSpeakerEnabled.value)
    if (!isSpeakerEnabled.value) {
      outputLevel.value = 0
      audioQueueSize.value = 0
    }
  }

  function resolveConfirmation(decision: ConfirmationDecision) {
    const current = confirmation.value
    if (!current || current.expiresAt <= now()) return
    socket?.resolveConfirmation(current.id, decision)
  }

  async function openSuggestion() {
    const suggestion = navigationSuggestion.value
    if (!suggestion || !isSafeVoiceDeepLink(suggestion.path)) return
    await close('navigate')
    uni.navigateTo({ url: suggestion.path })
  }

  async function disposeResources(notifyServer = true) {
    await audio?.dispose()
    audio = null
    if (socketState.value !== 'closed') socket?.close('dispose', notifyServer)
    socket = null
    socketState.value = 'closed'
  }

  async function waitForServerClose(timeoutMs = 1300): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (phase.value === 'closed') return true
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return phase.value === 'closed'
  }

  async function close(reason = 'user') {
    if (closing || phase.value === 'closed') return
    closing = true
    setPhase('closing')
    try {
      await stopCapture()
      audio?.interruptPlayback()
      socket?.close(reason)
      const serverClosed = await waitForServerClose()
      if (!serverClosed) {
        summary.value = summary.value || {
          durationSec: durationSec.value,
          memoryCount: evidence.value.length,
          missionId: navigationSuggestion.value?.path.includes('mission-detail')
            ? navigationSuggestion.value.path.split('id=')[1] || null
            : null,
        }
        setPhase('closed')
      }
      await disposeResources(false)
    } finally {
      closing = false
    }
  }

  function reset() {
    phase.value = 'idle'
    sessionId.value = ''
    providerSessionId.value = ''
    socketState.value = 'idle'
    micPermission.value = 'unknown'
    isMicEnabled.value = true
    isSpeakerEnabled.value = true
    inputLevel.value = 0
    outputLevel.value = 0
    transcripts.value = []
    activeUserText.value = ''
    activeAssistantText.value = ''
    audioQueueSize.value = 0
    activeTool.value = undefined
    evidence.value = []
    missionSummary.value = undefined
    missionQuestions.value = []
    confirmation.value = undefined
    navigationSuggestion.value = undefined
    reconnectAttempt.value = 0
    error.value = undefined
    summary.value = undefined
    callStartedAt.value = 0
  }

  return {
    phase,
    sessionId,
    providerSessionId,
    socketState,
    micPermission,
    isMicEnabled,
    isSpeakerEnabled,
    inputLevel,
    outputLevel,
    transcripts,
    visibleTranscripts,
    activeUserText,
    activeAssistantText,
    audioQueueSize,
    activeTool,
    evidence,
    missionSummary,
    missionQuestions,
    confirmation,
    navigationSuggestion,
    reconnectAttempt,
    error,
    summary,
    durationSec,
    isActive,
    configure,
    requestPermission,
    connect,
    startCapture,
    stopCapture,
    commitAudio,
    cancelResponse: interruptLocally,
    toggleMic,
    toggleSpeaker,
    resolveConfirmation,
    handleServerEvent,
    openSuggestion,
    close,
    reset,
  }
})
