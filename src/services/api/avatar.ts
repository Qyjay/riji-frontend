// ══════════════════════════════════════════════════════════════════
// API — AI 分身（记忆 / 状态 / 侧写）
// ══════════════════════════════════════════════════════════════════

import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/avatar'

// ── 类型定义 ──────────────────────────────────────────────────────

export interface AvatarMemory {
  id: string
  category: 'fact' | 'interest' | 'personality' | 'need' | 'habit' | 'relation'
  content: string
  source: 'diary' | 'chat' | 'manual' | 'behavior'
  sourceRef?: string
  confidence: number
  createdAt: number
  updatedAt: number
  isActive: boolean
  isPinned: boolean
  // need 专属字段
  needType?: 'buddy' | 'dating' | 'help' | 'activity'
  urgency?: 'active' | 'passive'
  expiry?: number
  matchStatus?: 'searching' | 'matched' | 'expired'
  tags?: string[]
}

export interface AvatarStatus {
  isActive: boolean
  browsedCount: number
  matchedCount: number
  chattingCount: number
  lastActiveAt: number
  enabledChannels: string[]
  enabledActions: string[]
  matchRange: {
    school: string
    distanceKm: number
    autoReplyDailyLimit?: number
    autoReplyIntervalMinutes?: number
    autoReplyMinScore?: number
  }
  surfFrequency: string
  surfWindow: { start: string; end: string; timezone: string }
  personalizedSurfPlan: Record<string, unknown>
  nextSurfAt: number
  lastSurfAt: number
  dailySurfCount: number
  dailyActionCount: number
  quietMode: boolean
  autoMatchEnabled: boolean
  autoCommentEnabled: boolean
  autoPublishEnabled: boolean
}

export interface AvatarProfile {
  summary: string
  diaryCount: number
  chatCount: number
  generatedAt: number
}

export interface AvatarCard {
  displayName: string
  publicSummary: string
  interestTags: string[]
  socialIntent: string[]
  conversationStyle: Record<string, unknown>
  boundaries: string[]
  visibility: string
  updatedAt: number
}

export interface AgentAction {
  id: string
  actionType: 'comment_post' | string
  targetType: 'plaza_post' | string
  targetId: string
  inputContext: Record<string, unknown>
  outputText: string
  status: 'draft' | 'published' | 'rejected' | string
  createdAt: number
  updatedAt: number
}

export interface AutoSurfResult {
  actions: AgentAction[]
  publishedCount: number
  draftCount: number
  skippedReason: string
}

export interface AtoaConversationTurn {
  role: 'avatar_a' | 'avatar_b'
  content: string
}

export interface AtoaProbe {
  id: string
  sessionId?: string
  userBId: string
  userBName: string
  userBAvatar: string
  interactionType: string
  outcome: 'pending_user_decision' | 'blocked' | 'connected' | 'connect_confirmed' | 'connect_rejected' | string
  readableOutcome: string
  scoreA: number
  scoreB: number
  sharedTopics: string[]
  reasonsA: string[]
  conversation: AtoaConversationTurn[]
  riskFlags: string[]
  interactionPhase: number
  userDecision?: string
  isMutual: boolean
  triggeredMatchId?: string
  createdAt: number
  updatedAt: number
}

export interface AtoaSession {
  id: string
  status: string
  candidateCount: number
  excludedCount: number
  pendingCount: number
  decidedCount: number
  surfLogId?: string
  createdAt: number
  updatedAt: number
}

export interface SurfJob {
  id: string
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  trigger: string
  attempts: number
  result: Record<string, any>
  errorMessage: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  updatedAt: number
}

export interface AtoaDecisionResult {
  outcome: string
  socialMatchId?: string
  replacementInteractionId?: string
}

// ── 记忆 ──────────────────────────────────────────────────────────

export async function getMemories(category?: string): Promise<AvatarMemory[]> {
  if (USE_MOCK) return mock.getMemories(category)
  const params = category ? `?category=${category}` : ''
  return request<AvatarMemory[]>({ url: `/avatar/memories${params}` })
}

export async function addMemory(data: { category: string; content: string }): Promise<AvatarMemory> {
  if (USE_MOCK) return mock.addMemory(data)
  return request<AvatarMemory>({ url: '/avatar/memories', method: 'POST', data })
}

export async function updateMemory(id: string, fields: Partial<AvatarMemory>): Promise<AvatarMemory | null> {
  if (USE_MOCK) return mock.updateMemory(id, fields)
  return request<AvatarMemory>({ url: `/avatar/memories/${id}`, method: 'PUT', data: fields })
}

export async function deleteMemory(id: string): Promise<void> {
  if (USE_MOCK) { mock.deleteMemory(id); return }
  await request({ url: `/avatar/memories/${id}`, method: 'DELETE' })
}

// ── 分身状态 ──────────────────────────────────────────────────────

export async function getAvatarStatus(): Promise<AvatarStatus> {
  if (USE_MOCK) return mock.getAvatarStatus()
  return request<AvatarStatus>({ url: '/avatar/status' })
}

export async function updateAvatarStatus(fields: Partial<AvatarStatus>): Promise<AvatarStatus> {
  if (USE_MOCK) return mock.updateAvatarStatus(fields)
  return request<AvatarStatus>({
    url: '/avatar/status',
    method: 'PUT',
    data: {
      is_active: fields.isActive,
      enabled_channels: fields.enabledChannels,
      enabled_actions: fields.enabledActions,
      match_range: fields.matchRange,
      surf_frequency: fields.surfFrequency,
      surf_window: fields.surfWindow,
      quiet_mode: fields.quietMode,
      auto_match_enabled: fields.autoMatchEnabled,
      auto_comment_enabled: fields.autoCommentEnabled,
      auto_publish_enabled: fields.autoPublishEnabled,
    },
  })
}

// ── AtoA 预社交 ──────────────────────────────────────────────────

export async function getAtoaProbes(outcome?: string, sessionId?: string): Promise<AtoaProbe[]> {
  if (USE_MOCK) return mock.getAtoaProbes(outcome)
  const params = new URLSearchParams()
  if (outcome) params.set('outcome', outcome)
  if (sessionId) params.set('session_id', sessionId)
  const query = params.toString() ? `?${params}` : ''
  return request<AtoaProbe[]>({ url: `/avatar/probe-log${query}` })
}

export async function getAtoaSessions(): Promise<AtoaSession[]> {
  if (USE_MOCK) return mock.getAtoaSessions()
  return request<AtoaSession[]>({ url: '/avatar/atoa/sessions' })
}

export async function continueAtoaConversation(interactionId: string): Promise<{
  id: string
  outcome: string
  interactionPhase: number
  newTurns: AtoaConversationTurn[]
  conversation: AtoaConversationTurn[]
  updatedAt: number
}> {
  if (USE_MOCK) return mock.continueAtoaConversation(interactionId)
  return request({
    url: `/avatar/atoa/${interactionId}/continue`,
    method: 'POST',
    timeout: 90000,
  })
}

export async function decideAtoa(
  interactionId: string,
  decision: 'block' | 'connect',
  openingMessage?: string,
): Promise<AtoaDecisionResult> {
  if (USE_MOCK) return mock.decideAtoa(interactionId, decision)
  return request<AtoaDecisionResult>({
    url: `/avatar/atoa/${interactionId}/decide`,
    method: 'POST',
    data: { decision, opening_message: openingMessage },
    timeout: 90000,
  })
}

export async function createSurfJob(): Promise<SurfJob> {
  if (USE_MOCK) return mock.createSurfJob()
  return request<SurfJob>({ url: '/avatar/surf/jobs', method: 'POST' })
}

export async function getSurfJob(jobId: string): Promise<SurfJob> {
  if (USE_MOCK) return mock.getSurfJob(jobId)
  return request<SurfJob>({ url: `/avatar/surf/jobs/${jobId}` })
}

export async function getLatestSurfJob(): Promise<SurfJob | null> {
  if (USE_MOCK) return mock.getLatestSurfJob()
  return request<SurfJob | null>({ url: '/avatar/surf/jobs/latest' })
}

// ── 分身侧写 ──────────────────────────────────────────────────────

/** 去除 AI 返回中的 <think>...</think> 标签，只保留正文 */
function stripThinkTags(profile: AvatarProfile): AvatarProfile {
  return {
    ...profile,
    summary: profile.summary.replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
  }
}

export async function getAvatarProfile(): Promise<AvatarProfile> {
  if (USE_MOCK) return stripThinkTags(mock.getAvatarProfile())
  const res = await request<AvatarProfile>({ url: '/avatar/profile' })
  return stripThinkTags(res)
}

export async function regenerateProfile(): Promise<AvatarProfile> {
  if (USE_MOCK) return stripThinkTags(mock.regenerateProfile())
  const res = await request<AvatarProfile>({
    url: '/avatar/profile/regenerate',
    method: 'POST',
    timeout: 90000,
  })
  return stripThinkTags(res)
}

// ── 分身名片 / 行动审批 ────────────────────────────────────────────

export async function getAvatarCard(): Promise<AvatarCard> {
  return request<AvatarCard>({ url: '/avatar/card' })
}

export async function regenerateAvatarCard(): Promise<AvatarCard> {
  return request<AvatarCard>({ url: '/avatar/card/regenerate', method: 'POST' })
}

export async function getAgentActions(status?: string): Promise<AgentAction[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<AgentAction[]>({ url: `/avatar/actions${query}` })
}

export async function createPlazaCommentDraft(postId: string, parentCommentId?: string | null): Promise<AgentAction> {
  return request<AgentAction>({
    url: '/avatar/actions/plaza-comment-draft',
    method: 'POST',
    data: { post_id: postId, parent_comment_id: parentCommentId },
  })
}

export async function runAutoSurf(limit = 1): Promise<AutoSurfResult> {
  return request<AutoSurfResult>({
    url: '/avatar/actions/auto-surf',
    method: 'POST',
    data: { limit },
    timeout: 30000,
  })
}

export async function approveAgentAction(actionId: string): Promise<AgentAction> {
  return request<AgentAction>({ url: `/avatar/actions/${actionId}/approve`, method: 'POST' })
}

export async function rejectAgentAction(actionId: string): Promise<AgentAction> {
  return request<AgentAction>({ url: `/avatar/actions/${actionId}/reject`, method: 'POST' })
}
