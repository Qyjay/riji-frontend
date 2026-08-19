import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/social'

export interface Match {
  id: string
  /** 对方用户 id；旧版本后端不返回，此时只能按昵称关联 */
  userId?: string
  nickname: string
  avatar: string
  school: string
  commonTags: string[]
  matchedAt: number
  status: 'pending' | 'accepted' | 'rejected'
  matchType: 'long_term' | 'buddy' | string
  requestDirection: 'incoming' | 'outgoing'
  reason: string
  missionId?: string
  missionTitle?: string
  missionMode?: 'short_term' | 'long_term'
}

export interface MatchRequest {
  id: string
  fromUid: string
  toUid: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

export interface Message {
  id: string
  matchId: string
  fromUid: string
  content: string
  timestamp: number
}

export interface MatchRecommendation {
  id: string
  userId: string
  nickname: string
  avatar: string
  school: string
  commonInterests: string[]
  compatibility: number  // 0-100
}

export interface MatchReport {
  compatibility: number
  analysis: string
  commonPoints: string[]
  differences: string[]
}

export interface BuddyRequest {
  id: string
  fromUid: string
  toUid: string
  reason: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

export interface UserPortrait {
  preferences: Array<{ category: string; items: string[] }>
  personality: string[]
  relations: Array<{ name: string; relation: string }>
  interests: string[]
}

export interface ActivityParticipant {
  id: string
  name: string
  avatar: string
  school: string
  isOrganizer: boolean
}

export interface ActivityRoom {
  matchId: string
  missionId: string
  title: string
  status: 'active' | 'completed'
  timeWindow: {
    label?: string
    startAt?: number
    endAt?: number
  }
  location: {
    label?: string
    radiusKm?: number
  }
  budget: {
    type?: string
    min?: number
    max?: number
  }
  linkedPostId?: string
  participants: ActivityParticipant[]
  createdAt: number
  completedAt?: number
}

function readableMatchReason(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') return parsed.trim()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return text
    if (typeof parsed.analysis === 'string' && parsed.analysis.trim()) {
      return parsed.analysis.trim()
    }
    const points = Array.isArray(parsed.common_points)
      ? parsed.common_points
      : Array.isArray(parsed.commonPoints)
        ? parsed.commonPoints
        : []
    const labels = points.map((item: unknown) => String(item).trim()).filter(Boolean)
    return labels.length ? `共同点：${labels.slice(0, 3).join('、')}` : ''
  } catch {
    return text
  }
}

export async function getMatches(includePending = false): Promise<Match[]> {
  const items = USE_MOCK
    ? await mock.getMatches(includePending)
    : await request<Match[]>({ url: `/social/matches?include_pending=${includePending}` })
  return items.map((item) => ({
    ...item,
    reason: readableMatchReason(item.reason),
  }))
}

export async function createMatchRequest(data: Partial<MatchRequest>): Promise<MatchRequest> {
  if (USE_MOCK) return mock.createMatchRequest(data)
  return request<MatchRequest>({ url: '/social/match-requests', method: 'POST', data })
}

export async function getMessages(matchId: string, limit = 50, before?: string): Promise<Message[]> {
  if (USE_MOCK) return mock.getMessages(matchId)
  const query = before ? `?limit=${limit}&before=${before}` : `?limit=${limit}`
  return request<Message[]>({ url: `/social/messages/${matchId}${query}` })
}

export async function sendMessage(matchId: string, content: string): Promise<Message> {
  if (USE_MOCK) return mock.sendMessage(matchId, content)
  return request<Message>({ url: `/social/messages/${matchId}`, method: 'POST', data: { content } })
}

export async function getMatchRecommendations(): Promise<MatchRecommendation[]> {
  if (USE_MOCK) return mock.getMatchRecommendations()
  // 后端暂无此接口，返回空数组
  return []
}

export async function getMatchReport(matchId: string): Promise<MatchReport> {
  if (USE_MOCK) return mock.getMatchReport(matchId)
  return request<MatchReport>({ url: `/social/matches/${matchId}/report` })
}

export async function respondMatch(requestId: string, accept: boolean): Promise<void> {
  if (USE_MOCK) return mock.respondMatch(requestId, accept)
  return request<void>({ url: `/social/match-requests/${requestId}/respond`, method: 'POST', data: { accept } })
}

export async function applyBuddy(targetId: string, reason: string): Promise<BuddyRequest> {
  if (USE_MOCK) return mock.applyBuddy(targetId, reason)
  return request<BuddyRequest>({ url: '/social/buddy', method: 'POST', data: { target_user_id: targetId, reason } })
}

export async function respondBuddy(requestId: string, accept: boolean): Promise<void> {
  if (USE_MOCK) return mock.respondBuddy(requestId, accept)
  return request<void>({ url: `/social/buddy/${requestId}/respond`, method: 'POST', data: { accept } })
}

export async function getUserPortrait(): Promise<UserPortrait> {
  if (USE_MOCK) return mock.getUserPortrait()
  return request<UserPortrait>({ url: '/user/portrait' })
}

export async function refreshPortrait(): Promise<UserPortrait> {
  if (USE_MOCK) return mock.refreshPortrait()
  return request<UserPortrait>({ url: '/user/portrait/refresh', method: 'POST' })
}

export function getActivityRoom(matchId: string): Promise<ActivityRoom> {
  if (USE_MOCK) return Promise.resolve(mock.getActivityRoom(matchId))
  return request<ActivityRoom>({
    url: `/social/activity-rooms/${encodeURIComponent(matchId)}`,
  })
}

export function completeActivityRoom(matchId: string): Promise<ActivityRoom> {
  if (USE_MOCK) return Promise.resolve(mock.completeActivityRoom(matchId))
  return request<ActivityRoom>({
    url: `/social/activity-rooms/${encodeURIComponent(matchId)}/complete`,
    method: 'POST',
  })
}
