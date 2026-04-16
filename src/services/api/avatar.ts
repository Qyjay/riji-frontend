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
  matchRange: { school: string; distanceKm: number }
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
  return request<AvatarStatus>({ url: '/avatar/status', method: 'PUT', data: fields })
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
  const res = await request<AvatarProfile>({ url: '/avatar/profile/regenerate', method: 'POST' })
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

export async function createPlazaCommentDraft(postId: string): Promise<AgentAction> {
  return request<AgentAction>({
    url: '/avatar/actions/plaza-comment-draft',
    method: 'POST',
    data: { post_id: postId },
  })
}

export async function approveAgentAction(actionId: string): Promise<AgentAction> {
  return request<AgentAction>({ url: `/avatar/actions/${actionId}/approve`, method: 'POST' })
}

export async function rejectAgentAction(actionId: string): Promise<AgentAction> {
  return request<AgentAction>({ url: `/avatar/actions/${actionId}/reject`, method: 'POST' })
}
