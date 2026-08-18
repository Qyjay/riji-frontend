export type VoicePhase =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'tool_running'
  | 'awaiting_confirmation'
  | 'reconnecting'
  | 'closing'
  | 'closed'
  | 'error'

export type VoiceEntryMode = 'general' | 'social_mission'
export type ConfirmationDecision = 'approve' | 'reject'

export interface VoiceEventBase {
  type: string
  eventId: string
}

export interface SessionStartEvent extends VoiceEventBase {
  type: 'session.start'
  voice?: string
  resumeSessionId?: string | null
  entryMode: VoiceEntryMode
}

export interface AudioAppendEvent extends VoiceEventBase {
  type: 'audio.append'
  audio: string
}

export interface AudioCommitEvent extends VoiceEventBase {
  type: 'audio.commit'
}

export interface ResponseCancelEvent extends VoiceEventBase {
  type: 'response.cancel'
}

export interface ConfirmationResolveEvent extends VoiceEventBase {
  type: 'confirmation.resolve'
  confirmationId: string
  decision: ConfirmationDecision
}

export interface SessionCloseEvent extends VoiceEventBase {
  type: 'session.close'
}

export type VoiceClientEvent =
  | SessionStartEvent
  | AudioAppendEvent
  | AudioCommitEvent
  | ResponseCancelEvent
  | ConfirmationResolveEvent
  | SessionCloseEvent

interface ServerEventBase extends VoiceEventBase {
  sessionId: string
  timestamp: number
}

export interface SessionReadyEvent extends ServerEventBase {
  type: 'session.ready'
  providerSessionId: string
}

export interface SessionStateEvent extends ServerEventBase {
  type: 'session.state'
  state: Exclude<VoicePhase, 'requesting_permission' | 'closed' | 'error'>
}

export interface TranscriptEvent extends ServerEventBase {
  type:
    | 'asr.delta'
    | 'asr.done'
    | 'assistant.text.delta'
    | 'assistant.text.done'
  text: string
  itemId?: string
}

export interface AsrStartedEvent extends ServerEventBase {
  type: 'asr.started'
}

export interface AudioLifecycleEvent extends ServerEventBase {
  type:
    | 'assistant.audio.started'
    | 'assistant.audio.done'
    | 'audio.committed'
    | 'response.done'
    | 'response.canceled'
  ttsType?: string
  statusCode?: string
  usage?: Record<string, number>
}

export interface AssistantAudioDeltaEvent extends ServerEventBase {
  type: 'assistant.audio.delta'
  audio: string
  sequence: number
}

export interface ToolStartedEvent extends ServerEventBase {
  type: 'tool.started'
  toolCallId: string
  name: string
}

export interface ToolResultEvent extends ServerEventBase {
  type: 'tool.result'
  name: string
  display: VoiceToolDisplay
}

export interface VoiceConfirmation {
  id: string
  action: string
  riskLevel: 'R2'
  title: string
  summary: string[]
  expiresAt: number
  approveLabel: string
  rejectLabel: string
}

export interface ConfirmationRequiredEvent extends ServerEventBase {
  type: 'confirmation.required'
  confirmation: VoiceConfirmation
}

export interface ConfirmationResolvedEvent extends ServerEventBase {
  type: 'confirmation.resolved'
  confirmationId: string
  decision: ConfirmationDecision
  channel: 'screen' | 'voice'
}

export interface NavigationSuggestedEvent extends ServerEventBase {
  type: 'navigation.suggested'
  path: string
  label: string
}

export interface SessionReconnectingEvent extends ServerEventBase {
  type: 'session.reconnecting'
  attempt: number
  maxAttempts: number
}

export interface ClientSlowDownEvent extends ServerEventBase {
  type: 'client.slow_down'
  queuedFrames: number
  maxFrames: number
}

export interface VoiceErrorEvent extends ServerEventBase {
  type: 'error'
  code: string
  message: string
  recoverable: boolean
}

export interface VoiceSessionSummary {
  durationSec?: number
  memoryCount?: number
  missionId?: string | null
}

export interface SessionClosedEvent extends ServerEventBase {
  type: 'session.closed'
  reason: string
  summary: VoiceSessionSummary
}

export type VoiceServerEvent =
  | SessionReadyEvent
  | SessionStateEvent
  | TranscriptEvent
  | AsrStartedEvent
  | AudioLifecycleEvent
  | AssistantAudioDeltaEvent
  | ToolStartedEvent
  | ToolResultEvent
  | ConfirmationRequiredEvent
  | ConfirmationResolvedEvent
  | NavigationSuggestedEvent
  | SessionReconnectingEvent
  | ClientSlowDownEvent
  | VoiceErrorEvent
  | SessionClosedEvent

export interface VoiceEvidence {
  sourceType: string
  title: string
  snippet: string
  occurredAt: number
  deepLink: string
}

export interface MissionVoiceSummary {
  activity?: string
  time?: string
  location?: string
  headcount?: string
  scope?: string
  notice?: string
}

export type VoiceToolDisplay =
  | {
      kind: 'memory_evidence'
      items: VoiceEvidence[]
    }
  | {
      kind: 'memory_document'
      item: VoiceEvidence
    }
  | {
      kind: 'mission_draft'
      draftId: string
      summary: MissionVoiceSummary
      questions: string[]
      readyForConfirmation: boolean
    }
  | {
      kind: 'mission_created'
      missionId: string
      status: string
      summary: MissionVoiceSummary
    }
  | {
      kind: 'mission_progress'
      mission?: {
        id: string
        title: string
        status: string
        candidateCount: number
        pendingCount: number
        deepLink: string
      }
      scannedCount?: number
      matchedCount?: number
      candidates?: unknown[]
      suggestion?: string
    }

const SERVER_EVENT_TYPES = new Set([
  'session.ready',
  'session.state',
  'asr.started',
  'asr.delta',
  'asr.done',
  'assistant.text.delta',
  'assistant.text.done',
  'assistant.audio.started',
  'assistant.audio.delta',
  'assistant.audio.done',
  'audio.committed',
  'tool.started',
  'tool.result',
  'confirmation.required',
  'confirmation.resolved',
  'navigation.suggested',
  'response.done',
  'response.canceled',
  'session.reconnecting',
  'client.slow_down',
  'session.closed',
  'error',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isVoiceServerEvent(value: unknown): value is VoiceServerEvent {
  if (!isObject(value)) return false
  if (typeof value.type !== 'string' || !SERVER_EVENT_TYPES.has(value.type)) return false
  if (typeof value.eventId !== 'string') return false
  if (typeof value.sessionId !== 'string') return false
  if (typeof value.timestamp !== 'number') return false
  if (value.type === 'assistant.audio.delta') return typeof value.audio === 'string'
  if (value.type === 'error') {
    return (
      typeof value.code === 'string'
      && typeof value.message === 'string'
      && typeof value.recoverable === 'boolean'
    )
  }
  if (value.type === 'confirmation.required') return isObject(value.confirmation)
  if (value.type === 'tool.result') {
    return typeof value.name === 'string' && isObject(value.display)
  }
  return true
}

export function parseVoiceServerEvent(raw: string | unknown): VoiceServerEvent | null {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  return isVoiceServerEvent(value) ? value : null
}

export function createEventId(prefix = 'voice'): string {
  const random = Math.random().toString(36).slice(2, 9)
  return `${prefix}-${Date.now()}-${random}`
}
