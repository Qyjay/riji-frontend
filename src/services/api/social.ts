import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/social'

export interface Match {
  id: string
  nickname: string
  avatar: string
  school: string
  commonTags: string[]
  matchedAt: number
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

export async function getMatches(): Promise<Match[]> {
  if (USE_MOCK) return mock.getMatches()
  return request<Match[]>({ url: '/social/matches' })
}

export async function createMatchRequest(data: Partial<MatchRequest>): Promise<MatchRequest> {
  if (USE_MOCK) return mock.createMatchRequest(data)
  return request<MatchRequest>({ url: '/social/match-requests', method: 'POST', data })
}

export async function getMessages(matchId: string, limit = 50, before?: string): Promise<Message[]> {
  if (USE_MOCK) return mock.getMessages()
  const query = before ? `?limit=${limit}&before=${before}` : `?limit=${limit}`
  return request<Message[]>({ url: `/social/messages/${matchId}${query}` })
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
  return request<BuddyRequest>({ url: '/social/buddy', method: 'POST', data: { target_user_id: targetId } })
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
