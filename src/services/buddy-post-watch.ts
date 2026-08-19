/**
 * 搭子广场发帖巡检：已成为搭子的人在广场发新帖时弹本地通知。
 *
 * 挂在收件箱巡检的每一轮上，复用它已经取回的匹配列表，自己只多拉一次广场首页。
 * 冷启动只建基线，之后才对增量发通知。
 */

import { getCurrentUser } from '@/services/api/auth'
import { getPlazaPosts } from '@/services/api/plaza'
import type { PlazaPost } from '@/services/api/plaza'
import type { Match } from '@/services/api/social'
import { notify } from '@/platform/notification'
import { plazaPostNotifyLink } from '@/utils/action-notify'
import { parseStoredIdList } from '@/utils/inbox-notify'
import {
  BUDDY_POST_DIGEST_THRESHOLD,
  BUDDY_POST_FETCH_INTERVAL_MS,
  BUDDY_POST_FETCH_LIMIT,
  BUDDY_POST_MAX_SEEN,
  buildBuddyDirectory,
  buildBuddyPostNotifyCopy,
  buildBuddyPostsDigestCopy,
  selectBuddyPosts,
  shouldNotifyBuddyPost,
} from '@/utils/buddy-post-notify'

const SEEN_POSTS_KEY = 'avalin_buddy_seen_posts'
const PRIMED_POSTS_KEY = 'avalin_buddy_primed_posts'

let seenPosts = new Set<string>()
let primedPosts = false
let storageLoaded = false
let lastFetchAt = 0

function loadIdSet(key: string): Set<string> {
  try {
    return new Set(parseStoredIdList(uni.getStorageSync(key)))
  } catch {
    return new Set()
  }
}

function saveIdSet(key: string, seen: Set<string>): void {
  try {
    uni.setStorageSync(key, JSON.stringify(Array.from(seen)))
  } catch {
    // 持久化失败只影响去重，不中断巡检
  }
}

function ensureStorageLoaded(): void {
  if (storageLoaded) return
  seenPosts = loadIdSet(SEEN_POSTS_KEY)
  try {
    primedPosts = uni.getStorageSync(PRIMED_POSTS_KEY) === true
  } catch {
    primedPosts = false
  }
  storageLoaded = true
}

function persist(nextSeen: Set<string>, nextPrimed: boolean): void {
  seenPosts = nextSeen
  primedPosts = nextPrimed
  saveIdSet(SEEN_POSTS_KEY, nextSeen)
  try {
    uni.setStorageSync(PRIMED_POSTS_KEY, nextPrimed)
  } catch {
    // 同上
  }
}

/** 取栈顶页面路由。App 端 options 拿不到，但 route 是可靠的 */
function currentRoute(): string {
  try {
    const pages = getCurrentPages()
    const top = pages[pages.length - 1] as unknown as { route?: string } | undefined
    return String(top?.route || '')
  } catch {
    return ''
  }
}

/** 通知没发出去的帖子退回未读，下一轮重试 */
function forget(posts: readonly PlazaPost[]): void {
  for (const post of posts) seenPosts.delete(String(post?.id || ''))
  saveIdSet(SEEN_POSTS_KEY, seenPosts)
}

export async function runBuddyPostTick(input: {
  matches: readonly Match[]
  appForeground: boolean
}): Promise<void> {
  ensureStorageLoaded()

  const now = Date.now()
  if (lastFetchAt && now - lastFetchAt < BUDDY_POST_FETCH_INTERVAL_MS) return
  lastFetchAt = now

  let posts: PlazaPost[] = []
  try {
    const res = await getPlazaPosts(undefined, 1, BUDDY_POST_FETCH_LIMIT)
    posts = res?.items || []
  } catch {
    // 广场拉取失败时基线保持不变，下一轮重试
    return
  }
  if (posts.length === 0) return

  const self = getCurrentUser()
  const diff = selectBuddyPosts({
    posts,
    directory: buildBuddyDirectory(input.matches),
    selfUserId: self?.id,
    selfName: self?.name,
    seen: seenPosts,
    primed: primedPosts,
    maxSeen: BUDDY_POST_MAX_SEEN,
  })
  persist(diff.nextSeen, diff.nextPrimed)
  if (diff.newPosts.length === 0) return

  if (!shouldNotifyBuddyPost({
    appForeground: input.appForeground,
    activeRoute: currentRoute(),
  })) return

  if (diff.newPosts.length >= BUDDY_POST_DIGEST_THRESHOLD) {
    const copy = buildBuddyPostsDigestCopy(diff.newPosts)
    const posted = notify({
      title: copy.title,
      content: copy.content,
      payload: plazaPostNotifyLink(''),
    })
    if (!posted) forget(diff.newPosts)
    return
  }

  const failed: PlazaPost[] = []
  for (const post of diff.newPosts) {
    const copy = buildBuddyPostNotifyCopy(post)
    const posted = notify({
      title: copy.title,
      content: copy.content,
      payload: plazaPostNotifyLink(post.id),
    })
    if (!posted) failed.push(post)
  }
  if (failed.length) forget(failed)
}
