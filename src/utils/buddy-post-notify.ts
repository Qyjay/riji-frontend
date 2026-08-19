/**
 * 搭子在广场发新帖的通知纯逻辑：搭子名录、增量筛选、文案、合并阈值。
 * 不依赖 uni / plus，方便 Node 单测。
 */

import { plazaTypeLabel } from './action-notify'
import { collectUnseen, displayPersonName, previewMessage } from './inbox-notify'

/** 每轮取回的帖子条数。广场按 createdAt 倒序返回，够覆盖一轮间隔内的新增 */
export const BUDDY_POST_FETCH_LIMIT = 20
/** 广场拉取节流：收件箱 3.5s 一轮，发帖不像私聊那样急，隔轮取一次即可 */
export const BUDDY_POST_FETCH_INTERVAL_MS = 7000
/** 同一轮新帖达到该条数就合并成一条汇总，避免连弹 */
export const BUDDY_POST_DIGEST_THRESHOLD = 3
export const BUDDY_POST_MAX_SEEN = 200

/** 广场列表页与帖子详情页；前台停在这些页面时不打扰 */
export const PLAZA_BROWSING_ROUTES = [
  'pages/discover/index',
  'pages/plaza/detail',
  'pages/plaza/post',
]

export interface BuddyDirectory {
  /** 带 userId 的搭子，按 id 精确关联 */
  userIds: Set<string>
  /** 缺 userId 的搭子：昵称 key → 该昵称下所有搭子的学校 key，空串表示对方学校未知 */
  schools: Map<string, Set<string>>
}

export interface BuddyLike {
  userId?: unknown
  nickname?: unknown
  school?: unknown
  status?: unknown
}

export interface BuddyPostLike {
  id?: unknown
  authorId?: unknown
  authorName?: unknown
  authorSchool?: unknown
  type?: unknown
  content?: unknown
}

export function normalizeIdentityKey(raw: unknown): string {
  return displayPersonName(raw, '').replace(/\s+/g, '').toLowerCase()
}

/**
 * 由已接受的匹配构建搭子名录。
 *
 * /social/matches 带上对方 userId 后，它和广场帖子的 authorId 是同一套 id，能精确关联；
 * 旧版本后端不返回 userId，这类记录退回「昵称 + 学校」——两者在后端都取自同一条
 * User 记录（name or username、school）。逐条记录各走各的路径，不整体退回模糊模式。
 */
export function buildBuddyDirectory(matches: readonly BuddyLike[]): BuddyDirectory {
  const userIds = new Set<string>()
  const schools = new Map<string, Set<string>>()
  for (const item of matches) {
    if (String(item?.status || '') !== 'accepted') continue
    const userId = String(item?.userId || '')
    if (userId) {
      userIds.add(userId)
      continue
    }
    const nameKey = normalizeIdentityKey(item?.nickname)
    if (!nameKey) continue
    const bucket = schools.get(nameKey) || new Set<string>()
    bucket.add(normalizeIdentityKey(item?.school))
    schools.set(nameKey, bucket)
  }
  return { userIds, schools }
}

/**
 * authorId 命中 userId 名录即算搭子；只有缺 userId 的搭子才按昵称判定，
 * 两边学校都非空且不同时排除。同名同校但 id 不同的人因此不会被误判。
 */
export function isBuddyAuthor(
  directory: BuddyDirectory,
  input: { authorId?: unknown; authorName?: unknown; authorSchool?: unknown },
): boolean {
  const authorId = String(input?.authorId || '')
  if (authorId && directory.userIds.has(authorId)) return true

  const nameKey = normalizeIdentityKey(input?.authorName)
  if (!nameKey) return false
  const bucket = directory.schools.get(nameKey)
  if (!bucket) return false

  const schoolKey = normalizeIdentityKey(input?.authorSchool)
  if (!schoolKey || bucket.has('')) return true
  return bucket.has(schoolKey)
}

export function isOwnPost(
  post: BuddyPostLike,
  self: { userId?: unknown; name?: unknown },
): boolean {
  const authorId = String(post?.authorId || '')
  const selfId = String(self?.userId || '')
  if (authorId && selfId) return authorId === selfId

  const selfName = normalizeIdentityKey(self?.name)
  return Boolean(selfName) && normalizeIdentityKey(post?.authorName) === selfName
}

/**
 * 挑出本轮要通知的搭子新帖。
 *
 * 基线记的是本轮取回的全部帖子 id，而不只是搭子的：刚通过一个搭子申请时，
 * 对方在广场的历史帖已经在基线里，不会一口气刷出一堆通知。
 */
export function selectBuddyPosts<T extends BuddyPostLike>(input: {
  posts: readonly T[]
  directory: BuddyDirectory
  selfUserId?: unknown
  selfName?: unknown
  seen: ReadonlySet<string>
  primed: boolean
  maxSeen?: number
}): { newPosts: T[]; nextSeen: Set<string>; nextPrimed: boolean } {
  const ids = input.posts.map((post) => String(post?.id || '')).filter(Boolean)
  const diff = collectUnseen({
    seen: input.seen,
    ids,
    primed: input.primed,
    notifyOnFirstBaseline: false,
    maxSeen: input.maxSeen ?? BUDDY_POST_MAX_SEEN,
  })

  const fresh = new Set(diff.newIds)
  const self = { userId: input.selfUserId, name: input.selfName }
  const newPosts = input.posts.filter((post) => {
    const id = String(post?.id || '')
    if (!id || !fresh.has(id)) return false
    if (isOwnPost(post, self)) return false
    return isBuddyAuthor(input.directory, {
      authorId: post?.authorId,
      authorName: post?.authorName,
      authorSchool: post?.authorSchool,
    })
  })

  return { newPosts, nextSeen: diff.nextSeen, nextPrimed: diff.nextPrimed }
}

export function buildBuddyPostNotifyCopy(post: BuddyPostLike): { title: string; content: string } {
  const name = displayPersonName(post?.authorName, '搭子')
  const kind = plazaTypeLabel(post?.type)
  const preview = previewMessage(post?.content, 28)
  return {
    title: '搭子发了新帖',
    content: preview ? `${name}·${kind}：${preview}` : `${name} 在广场发了一条${kind}帖子`,
  }
}

export function buildBuddyPostsDigestCopy(
  posts: readonly BuddyPostLike[],
): { title: string; content: string } {
  const count = posts.length
  const latest = posts[0]
  const name = displayPersonName(latest?.authorName, '搭子')
  const preview = previewMessage(latest?.content, 20)
  const head = `你的搭子发布了 ${count} 条新帖`
  return {
    title: '搭子有新动态',
    content: preview ? `${head}，最新一条来自 ${name}：${preview}` : head,
  }
}

/**
 * 搭子新帖要不要弹系统通知。
 * 后台一律弹；前台仅当用户没在广场列表或帖子详情页时弹——正在刷广场的人
 * 下拉就能看到，再弹通知只是打扰。
 */
export function shouldNotifyBuddyPost(input: {
  appForeground: boolean
  activeRoute?: unknown
}): boolean {
  if (!input.appForeground) return true
  const route = String(input.activeRoute || '').replace(/^\/+/, '')
  if (!route) return true
  return PLAZA_BROWSING_ROUTES.indexOf(route) < 0
}
