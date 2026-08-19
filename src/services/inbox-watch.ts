/**
 * App 级收件箱巡检：发现新的好友/搭子申请，以及「不在该会话页」时的新聊天消息，弹出本地通知。
 *
 * 页面级 usePolling 在 onHide 会停，切后台后靠这里继续跑。
 * 聊天页 / 活动室只负责登记当前打开的 matchId，消息轮询仍由页面自己跑。
 */

import { getCurrentUser, isLoggedIn } from '@/services/api/auth'
import { getMatches, getMessages } from '@/services/api/social'
import type { Match, Message } from '@/services/api/social'
import { notify } from '@/platform/notification'
import { runBuddyPostTick } from './buddy-post-watch'
import { getActiveMatchId } from '@/utils/active-session'
import { createPolling, type PollingController } from '@/utils/polling'
import {
  INBOX_MESSAGE_FETCH_LIMIT,
  INBOX_MESSAGE_MATCH_LIMIT,
  INBOX_POLL_INTERVAL_MS,
  INBOX_POLL_MAX_INTERVAL_MS,
  buildMessageNotifyCopy,
  buildRequestNotifyCopy,
  chatNotifyLink,
  collectUnseen,
  isOwnMessage,
  parseStoredIdList,
  requestNotifyLink,
  shouldNotifyIncomingMessage,
} from '@/utils/inbox-notify'

const SEEN_REQUESTS_KEY = 'avalin_inbox_seen_requests'
const SEEN_MESSAGES_KEY = 'avalin_inbox_seen_messages'
const PRIMED_REQUESTS_KEY = 'avalin_inbox_primed_requests'
const PRIMED_MESSAGES_KEY = 'avalin_inbox_primed_messages'

let foreground = true
let ticking = false
let polling: PollingController | null = null
let seenRequests = new Set<string>()
let seenMessages = new Set<string>()
let primedRequests = false
let primedMessages = false
let storageLoaded = false

function readFlag(key: string): boolean {
  try {
    return uni.getStorageSync(key) === true
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    uni.setStorageSync(key, value)
  } catch {
    // 持久化失败只影响去重，不中断巡检
  }
}

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
    // 同上
  }
}

function ensureStorageLoaded(): void {
  if (storageLoaded) return
  seenRequests = loadIdSet(SEEN_REQUESTS_KEY)
  seenMessages = loadIdSet(SEEN_MESSAGES_KEY)
  primedRequests = readFlag(PRIMED_REQUESTS_KEY)
  primedMessages = readFlag(PRIMED_MESSAGES_KEY)
  storageLoaded = true
}

function persistRequests(nextSeen: Set<string>, nextPrimed: boolean): void {
  seenRequests = nextSeen
  primedRequests = nextPrimed
  saveIdSet(SEEN_REQUESTS_KEY, nextSeen)
  writeFlag(PRIMED_REQUESTS_KEY, nextPrimed)
}

function persistMessages(nextSeen: Set<string>, nextPrimed: boolean): void {
  seenMessages = nextSeen
  primedMessages = nextPrimed
  saveIdSet(SEEN_MESSAGES_KEY, nextSeen)
  writeFlag(PRIMED_MESSAGES_KEY, nextPrimed)
}

function notifyIncomingRequests(matches: Match[]): void {
  const incoming = matches.filter(
    (item) => item.status === 'pending' && item.requestDirection === 'incoming',
  )
  const diff = collectUnseen({
    seen: seenRequests,
    ids: incoming.map((item) => item.id),
    primed: primedRequests,
    notifyOnFirstBaseline: true,
  })
  persistRequests(diff.nextSeen, diff.nextPrimed)
  if (diff.newIds.length === 0) return

  const newest = new Set(diff.newIds)
  let postedFailed = false
  for (const match of incoming) {
    if (!newest.has(match.id)) continue
    const copy = buildRequestNotifyCopy({
      nickname: match.nickname,
      matchType: match.matchType || match.missionMode,
    })
    const posted = notify({
      title: copy.title,
      content: copy.content,
      payload: requestNotifyLink(),
    })
    if (!posted) {
      seenRequests.delete(match.id)
      postedFailed = true
    }
  }
  if (postedFailed) saveIdSet(SEEN_REQUESTS_KEY, seenRequests)
}

async function notifyIncomingMessages(matches: Match[]): Promise<void> {
  const accepted = matches
    .filter((item) => item.status === 'accepted')
    .slice(0, INBOX_MESSAGE_MATCH_LIMIT)
  if (accepted.length === 0) {
    const diff = collectUnseen({
      seen: seenMessages,
      ids: [],
      primed: primedMessages,
      notifyOnFirstBaseline: false,
    })
    persistMessages(diff.nextSeen, diff.nextPrimed)
    return
  }

  const currentUserId = getCurrentUser()?.id || ''
  const arrived: Array<{ match: Match; message: Message }> = []
  const ids: string[] = []

  for (const match of accepted) {
    try {
      const messages = await getMessages(match.id, INBOX_MESSAGE_FETCH_LIMIT)
      for (const message of messages) {
        if (!message?.id) continue
        ids.push(message.id)
        arrived.push({ match, message })
      }
    } catch {
      // 单个会话失败不影响其余会话
    }
  }

  const diff = collectUnseen({
    seen: seenMessages,
    ids,
    primed: primedMessages,
    notifyOnFirstBaseline: false,
  })
  persistMessages(diff.nextSeen, diff.nextPrimed)
  if (diff.newIds.length === 0) return

  const newest = new Set(diff.newIds)
  const activeMatchId = getActiveMatchId()
  let postedFailed = false
  for (const item of arrived) {
    if (!newest.has(item.message.id)) continue
    if (isOwnMessage(item.message.fromUid, currentUserId)) continue
    if (!shouldNotifyIncomingMessage({
      matchId: item.match.id,
      activeMatchId,
      appForeground: foreground,
    })) continue
    const copy = buildMessageNotifyCopy({
      nickname: item.match.nickname,
      content: item.message.content,
    })
    const posted = notify({
      title: copy.title,
      content: copy.content,
      payload: chatNotifyLink(item.match.id, item.match.nickname),
    })
    if (!posted) {
      seenMessages.delete(item.message.id)
      postedFailed = true
    }
  }
  if (postedFailed) saveIdSet(SEEN_MESSAGES_KEY, seenMessages)
}

async function runInboxTick(): Promise<void> {
  if (ticking) return
  if (!isLoggedIn()) return
  ticking = true
  try {
    ensureStorageLoaded()
    const matches = await getMatches(true)
    notifyIncomingRequests(matches)
    await notifyIncomingMessages(matches)
    await runBuddyPostTick({ matches, appForeground: foreground })
  } finally {
    ticking = false
  }
}

function ensureWatchStarted(): void {
  if (polling) {
    if (!polling.active) polling.start()
    return
  }
  polling = createPolling({
    intervalMs: INBOX_POLL_INTERVAL_MS,
    maxIntervalMs: INBOX_POLL_MAX_INTERVAL_MS,
    immediate: true,
    run: runInboxTick,
  })
  polling.start()
}

export function startInboxWatch(): void {
  // #ifdef APP-PLUS
  ensureWatchStarted()
  // #endif
}

export function stopInboxWatch(): void {
  polling?.stop()
}

export function onInboxAppShow(): void {
  foreground = true
  // #ifdef APP-PLUS
  ensureWatchStarted()
  void runInboxTick()
  // #endif
}

export function onInboxAppHide(): void {
  foreground = false
}
