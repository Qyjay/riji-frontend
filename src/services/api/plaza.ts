// ══════════════════════════════════════════════════════════════════
// API — 广场（帖子 / 评论 / 推荐）
// ══════════════════════════════════════════════════════════════════

import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/plaza'

// ── 类型定义 ──────────────────────────────────────────────────────

export interface PlazaPost {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  authorSchool: string
  authorMajor: string
  authorGrade: string
  type: 'buddy' | 'help' | 'share' | 'dating'
  content: string
  images: string[]
  location: string
  tags: string[]
  likes: number
  comments: number
  agentResponses: number
  createdAt: number
  isFromAgent: boolean
  allowAgentReply: boolean
  schoolOnly: boolean
}

export interface PlazaComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  isAgent: boolean
  createdAt: number
}

export interface AgentConversationMessage {
  from: 'my_agent' | 'their_agent'
  content: string
  timestamp: number
}

export interface AgentMatch {
  id: string
  postId: string
  post: PlazaPost
  matchScore: number
  matchReasons: string[]
  agentConversation: AgentConversationMessage[]
  status: 'new' | 'viewed' | 'chatting' | 'dismissed'
  createdAt: number
}

// ── 帖子 ──────────────────────────────────────────────────────────

export async function getPlazaPosts(
  channel?: string,
  page = 1,
  pageSize = 10,
  keyword?: string,
): Promise<{ items: PlazaPost[]; total: number }> {
  if (USE_MOCK) return mock.getPlazaPosts(channel, page, pageSize, keyword)
  const params = new URLSearchParams()
  if (channel) params.set('channel', channel)
  if (keyword) params.set('q', keyword)
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  const res = await request<{ items: PlazaPost[]; total: number }>({ url: `/plaza/posts?${params}` })
  return res
}

export async function getPostDetail(id: string): Promise<PlazaPost | null> {
  if (USE_MOCK) return mock.getPostDetail(id)
  return request<PlazaPost>({ url: `/plaza/posts/${id}` })
}

export async function createPost(data: {
  type: PlazaPost['type']
  content: string
  images?: string[]
  location?: string
  tags?: string[]
  allowAgentReply?: boolean
  schoolOnly?: boolean
}): Promise<PlazaPost> {
  if (USE_MOCK) {
    return mock.createPost({
      authorId: 'me',
      authorName: '我',
      authorAvatar: 'https://i.pravatar.cc/150?u=me',
      authorSchool: '南开大学',
      authorMajor: '软件工程',
      authorGrade: '大三',
      type: data.type,
      content: data.content,
      images: data.images ?? [],
      location: data.location ?? '',
      tags: data.tags ?? [],
      isFromAgent: false,
      allowAgentReply: data.allowAgentReply ?? true,
      schoolOnly: data.schoolOnly ?? false,
    })
  }
  return request<PlazaPost>({ url: '/plaza/posts', method: 'POST', data })
}

export async function likePost(id: string): Promise<void> {
  if (USE_MOCK) return mock.likePost(id)
  await request({ url: `/plaza/posts/${id}/like`, method: 'POST' })
}

// ── 评论 ──────────────────────────────────────────────────────────

export async function getPostComments(postId: string): Promise<PlazaComment[]> {
  if (USE_MOCK) return mock.getPostComments(postId)
  return request<PlazaComment[]>({ url: `/plaza/posts/${postId}/comments` })
}

export async function addComment(postId: string, content: string, isAgent = false): Promise<PlazaComment> {
  if (USE_MOCK) return mock.addComment(postId, content, isAgent)
  return request<PlazaComment>({ url: `/plaza/posts/${postId}/comments`, method: 'POST', data: { content, isAgent } })
}

/** AI 分身自动生成评论：后端根据用户分身画像 + 帖子内容生成并发布 */
export async function agentComment(postId: string): Promise<PlazaComment> {
  if (USE_MOCK) return mock.agentComment(postId)
  const res = await request<{ comment: PlazaComment }>({ url: `/plaza/posts/${postId}/agent-comment`, method: 'POST' })
  return res.comment
}

// ── 分身推荐 ──────────────────────────────────────────────────────

export async function getAgentMatches(): Promise<AgentMatch[]> {
  if (USE_MOCK) return mock.getAgentMatches()
  return request<AgentMatch[]>({ url: '/avatar/matches' })
}

export async function dismissMatch(matchId: string): Promise<void> {
  if (USE_MOCK) return mock.dismissMatch(matchId)
  await request({ url: `/avatar/matches/${matchId}/action`, method: 'POST', data: { action: 'dismiss' } })
}

export async function acceptMatch(matchId: string): Promise<void> {
  if (USE_MOCK) return mock.acceptMatch(matchId)
  await request({ url: `/avatar/matches/${matchId}/action`, method: 'POST', data: { action: 'chat' } })
}
