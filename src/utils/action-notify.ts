/**
 * 用户操作成功后的通知文案、Deep Link、同事件去重。
 * 不依赖 uni / plus，方便 Node 单测。
 */

import { previewMessage } from './inbox-notify'

export type MemoryNotifyAction = 'delete' | 'edit' | 'pin' | 'unpin' | 'disable' | 'enable'

/** 去重窗口：只挡住同一次操作的重复触发（双击、重复回调），不挡住之后的同类操作 */
export const NOTIFY_CLAIM_WINDOW_MS = 3000
const CLAIMED_MAX = 300

const claimedAt = new Map<string, number>()

export interface ClaimOptions {
  now?: number
  windowMs?: number
  max?: number
}

/**
 * 领取一次通知资格。
 *
 * 用「最近一次领取时间」而不是永久集合：置顶→取消置顶→再置顶、
 * 停用→启用→再停用这类可逆操作，第二次也必须能提示。
 */
export function claimNotifyKey(key: unknown, options: ClaimOptions = {}): boolean {
  const id = String(key || '').trim()
  if (!id) return false

  const now = Number(options.now ?? Date.now())
  const windowMs = Math.max(0, Number(options.windowMs ?? NOTIFY_CLAIM_WINDOW_MS))
  const last = claimedAt.get(id)
  if (last !== undefined && now - last < windowMs) return false

  claimedAt.set(id, now)
  pruneClaims(now, windowMs, Number(options.max ?? CLAIMED_MAX))
  return true
}

function pruneClaims(now: number, windowMs: number, max: number): void {
  for (const [id, at] of claimedAt) {
    if (now - at >= windowMs) claimedAt.delete(id)
  }
  while (claimedAt.size > max) {
    const oldest = claimedAt.keys().next().value
    if (oldest === undefined) return
    claimedAt.delete(oldest)
  }
}

/** 仅供测试重置模块级状态 */
export function resetNotifyClaims(): void {
  claimedAt.clear()
}

export function memoryNotifyLink(): string {
  return 'avalin://profile/memory'
}

export function plazaPostNotifyLink(postId?: unknown): string {
  const id = String(postId || '').trim()
  if (!id) return 'avalin://plaza'
  return `avalin://plaza/post/${encodeURIComponent(id)}`
}

export function plazaTypeLabel(type: unknown): string {
  const value = String(type || '')
  if (value === 'buddy') return '找搭子'
  if (value === 'help') return '求助'
  if (value === 'share') return '分享'
  if (value === 'dating') return '恋爱'
  return '广场'
}

export function buildMemoryNotifyCopy(input: {
  action: MemoryNotifyAction
  content?: unknown
}): { title: string; content: string } {
  const preview = previewMessage(input.content, 24)
  const snippet = preview || '一条记忆'
  const title = '分身记忆已更新'
  if (input.action === 'delete') {
    return { title, content: `已删除 1 条记忆：${snippet}` }
  }
  if (input.action === 'edit') {
    return { title, content: `已修改记忆：${snippet}` }
  }
  if (input.action === 'pin') {
    return { title, content: `已置顶记忆：${snippet}` }
  }
  if (input.action === 'unpin') {
    return { title, content: `已取消置顶：${snippet}` }
  }
  if (input.action === 'disable') {
    return { title, content: `已停用记忆：${snippet}` }
  }
  if (input.action === 'enable') {
    return { title, content: `已启用记忆：${snippet}` }
  }
  return { title, content: `记忆已更新：${snippet}` }
}

export function buildPlazaNotifyCopy(input: {
  type?: unknown
  content?: unknown
  title?: unknown
}): { title: string; content: string } {
  const kind = plazaTypeLabel(input.type)
  const preview = previewMessage(input.title || input.content, 28)
  return {
    title: '帖子已发布',
    content: preview ? `${kind}：${preview}` : `已发布一条${kind}帖子`,
  }
}
