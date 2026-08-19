/**
 * 收件箱通知的纯逻辑：文案、去重、Deep Link。
 * 不依赖 uni / plus，方便 Node 单测。
 */

import { decodeQueryParam } from './query'

export const INBOX_POLL_INTERVAL_MS = 3500
export const INBOX_POLL_MAX_INTERVAL_MS = 12000
export const INBOX_MAX_SEEN = 300
export const INBOX_MESSAGE_MATCH_LIMIT = 4
export const INBOX_MESSAGE_FETCH_LIMIT = 5

export function displayPersonName(raw: unknown, fallback = '有人'): string {
  const name = decodeQueryParam(raw, '').trim()
  return name || fallback
}

export function previewMessage(content: unknown, max = 36): string {
  const text = decodeQueryParam(content, '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function isBuddyMatchType(matchType: unknown): boolean {
  const value = String(matchType || '')
  return value === 'buddy' || value === 'short_term'
}

export function buildRequestNotifyCopy(input: {
  nickname?: unknown
  matchType?: unknown
}): { title: string; content: string } {
  const name = displayPersonName(input.nickname)
  if (isBuddyMatchType(input.matchType)) {
    return {
      title: '新的搭子申请',
      content: `${name} 想和你成为搭子`,
    }
  }
  return {
    title: '新的好友申请',
    content: `${name} 想和你成为好友`,
  }
}

export function buildMessageNotifyCopy(input: {
  nickname?: unknown
  content?: unknown
}): { title: string; content: string } {
  const name = displayPersonName(input.nickname, '好友')
  const preview = previewMessage(input.content)
  return {
    title: '新的聊天消息',
    content: preview ? `${name}：${preview}` : `${name} 给你发来一条消息`,
  }
}

export function isOwnMessage(fromUid: unknown, currentUserId: unknown): boolean {
  const from = String(fromUid || '')
  if (!from) return false
  if (from === 'me') return true
  const self = String(currentUserId || '')
  return Boolean(self) && from === self
}

/**
 * 聊天消息要不要弹系统通知。
 * 后台一律弹；前台仅当用户没停在该 matchId 的聊天页 / 活动室时弹。
 */
export function shouldNotifyIncomingMessage(input: {
  matchId?: unknown
  activeMatchId?: unknown
  appForeground: boolean
}): boolean {
  const matchId = String(input.matchId || '').trim()
  if (!matchId) return false
  if (!input.appForeground) return true
  return matchId !== String(input.activeMatchId || '').trim()
}

export function requestNotifyLink(): string {
  return 'avalin://social/requests'
}

export function chatNotifyLink(matchId: string, nickname: unknown): string {
  const id = String(matchId || '')
  const name = displayPersonName(nickname, '搭子')
  return `avalin://social/chat?matchId=${encodeURIComponent(id)}&nickname=${encodeURIComponent(name)}`
}

export function rememberIds(
  seen: ReadonlySet<string>,
  ids: readonly string[],
  max = INBOX_MAX_SEEN,
): Set<string> {
  const next = new Set(seen)
  for (const raw of ids) {
    const id = String(raw || '')
    if (id) next.add(id)
  }
  if (next.size <= max) return next
  return new Set(Array.from(next).slice(-max))
}

/**
 * 计算本轮需要弹通知的 id。
 * primed=false 表示进程/安装后的第一次快照：默认只记不弹，避免把历史消息刷出来。
 * 申请可以选 notifyOnFirstBaseline，方便演示时已有待处理申请也能弹出一次。
 */
export function collectUnseen(input: {
  seen: ReadonlySet<string>
  ids: readonly string[]
  primed: boolean
  notifyOnFirstBaseline?: boolean
  maxSeen?: number
}): { newIds: string[]; nextSeen: Set<string>; nextPrimed: boolean } {
  const ids = input.ids.map((id) => String(id || '')).filter(Boolean)
  const maxSeen = input.maxSeen ?? INBOX_MAX_SEEN

  if (!input.primed) {
    const newIds = input.notifyOnFirstBaseline
      ? ids.filter((id) => !input.seen.has(id))
      : []
    return {
      newIds,
      nextSeen: rememberIds(input.seen, ids, maxSeen),
      nextPrimed: true,
    }
  }

  const newIds: string[] = []
  for (const id of ids) {
    if (!input.seen.has(id)) newIds.push(id)
  }
  return {
    newIds,
    nextSeen: rememberIds(input.seen, ids, maxSeen),
    nextPrimed: true,
  }
}

export function parseStoredIdList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((item) => String(item || '')).filter(Boolean)
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || '')).filter(Boolean)
      : []
  } catch {
    return []
  }
}
