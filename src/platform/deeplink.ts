/**
 * Deep Link 路由
 *
 * 承接三类外部唤起：
 *   1. 小 V 语音技能：用户对手机说「记一条」，vivo 侧分发 avalin://write/quick
 *   2. 系统通知点击
 *   3. 其他 App / 浏览器跳转
 *
 * scheme 在 manifest.json 的 app-plus.distribute.android.schemes 中注册。
 * 项目没有全局路由守卫，所以未登录时必须把目标暂存，登录成功后再消费。
 */

import { isLoggedIn } from '@/services/api/auth'

const SCHEME = 'avalin'
const PENDING_KEY = 'pending_deeplink'

/** 解析结果：目标页面完整路径 + 打开方式 */
export interface DeepLinkTarget {
  url: string
  /** 首页级页面用 reLaunch 重置栈，二级页面用 navigateTo 保留返回 */
  mode: 'reLaunch' | 'navigateTo'
}

/** 无参数的固定入口。key 为 scheme 之后的路径，全小写 */
const STATIC_ROUTES: Record<string, DeepLinkTarget> = {
  '': { url: '/pages/index/index', mode: 'reLaunch' },
  'home': { url: '/pages/index/index', mode: 'reLaunch' },
  'index': { url: '/pages/index/index', mode: 'reLaunch' },

  // 记录类：小 V「记一条」「写日记」的落点
  'write': { url: '/pages/write/index', mode: 'navigateTo' },
  'write/quick': { url: '/pages/write/quick-capture', mode: 'navigateTo' },
  'quick': { url: '/pages/write/quick-capture', mode: 'navigateTo' },
  'write/backfill': { url: '/pages/write/backfill-pick', mode: 'navigateTo' },
  'write/retouch': { url: '/pages/write/retouch', mode: 'navigateTo' },

  // 对话类：小 V「和分身聊聊」
  'chat': { url: '/pages/chat/index', mode: 'navigateTo' },
  'chat/voice': { url: '/pages/chat/voice-call', mode: 'navigateTo' },
  'voice': { url: '/pages/chat/voice-call', mode: 'navigateTo' },

  // 日记与成长
  'diary/calendar': { url: '/pages/diary/emotion-calendar', mode: 'navigateTo' },
  'growth': { url: '/pages/growth/index', mode: 'navigateTo' },
  'novel': { url: '/pages/novel/index', mode: 'navigateTo' },
  'fortune': { url: '/pages/fortune/index', mode: 'navigateTo' },
  'anniversary': { url: '/pages/anniversary/index', mode: 'navigateTo' },
  'search': { url: '/pages/search/index', mode: 'navigateTo' },

  // 学习
  'study/pomodoro': { url: '/pages/study/pomodoro', mode: 'navigateTo' },
  'study/todo': { url: '/pages/study/todo', mode: 'navigateTo' },

  // 社交与消息
  'social': { url: '/pages/social/index', mode: 'reLaunch' },
  'social/find': { url: '/pages/social/find', mode: 'navigateTo' },
  'plaza': { url: '/pages/discover/index', mode: 'reLaunch' },
  'messages': { url: '/pages/messages/index', mode: 'reLaunch' },
  'profile': { url: '/pages/profile/index', mode: 'reLaunch' },
  'me': { url: '/pages/profile/index', mode: 'reLaunch' },
}

/** 带 id 的动态入口 */
const DYNAMIC_ROUTES: Array<{ pattern: RegExp; build: (id: string) => DeepLinkTarget }> = [
  {
    pattern: /^diary\/([^/]+)$/,
    build: (id) => ({ url: `/pages/diary/detail?id=${encodeURIComponent(id)}`, mode: 'navigateTo' }),
  },
  {
    pattern: /^social\/mission\/([^/]+)$/,
    build: (id) => ({ url: `/pages/social/mission-detail?id=${encodeURIComponent(id)}`, mode: 'navigateTo' }),
  },
  {
    pattern: /^plaza\/post\/([^/]+)$/,
    build: (id) => ({ url: `/pages/plaza/detail?id=${encodeURIComponent(id)}`, mode: 'navigateTo' }),
  },
]

/**
 * 把 deep link 解析成站内路径。
 *
 * 自定义 scheme 在各端对 `new URL()` 的支持不一致，这里用正则手工拆分。
 * 无法识别的链接返回 null，由调用方决定是否兜底到首页。
 */
export function resolveDeepLink(link: string): DeepLinkTarget | null {
  const raw = String(link || '').trim()
  if (!raw) return null

  const matched = raw.match(/^([a-z][a-z0-9+.-]*):\/\/([^?#]*)(?:\?([^#]*))?/i)
  if (!matched) return null

  const scheme = matched[1].toLowerCase()
  // https 形态保留给未来的 Android App Link（https://avalin.cn/app/xxx）
  if (scheme !== SCHEME && scheme !== 'http' && scheme !== 'https') return null

  let path = (matched[2] || '').replace(/^\/+|\/+$/g, '').toLowerCase()
  const query = matched[3] || ''

  // App Link 形态需要剥掉域名和 /app 前缀
  if (scheme === 'http' || scheme === 'https') {
    path = path.replace(/^[^/]+\/?/, '').replace(/^app\/?/, '')
  }

  let target = STATIC_ROUTES[path] || null

  if (!target) {
    for (const route of DYNAMIC_ROUTES) {
      const hit = path.match(route.pattern)
      if (hit) {
        target = route.build(hit[1])
        break
      }
    }
  }

  if (!target) return null

  // 透传原始 query，便于埋点区分来源（如 ?from=jovi）
  if (query) {
    const separator = target.url.includes('?') ? '&' : '?'
    target = { ...target, url: `${target.url}${separator}${query}` }
  }

  return target
}

function navigate(target: DeepLinkTarget): void {
  const fail = () => {
    // 目标页可能因为未注册或参数非法打不开，兜底回首页而不是留在空白页
    uni.reLaunch({ url: '/pages/index/index' })
  }

  if (target.mode === 'reLaunch') {
    uni.reLaunch({ url: target.url, fail })
  } else {
    uni.navigateTo({ url: target.url, fail })
  }
}

function savePending(link: string): void {
  try {
    uni.setStorageSync(PENDING_KEY, link)
  } catch {
    // 存储失败则本次唤起丢失，不阻塞启动
  }
}

/**
 * 处理一条 deep link。
 * 未登录时暂存，等 consumePendingDeepLink() 在登录成功后接手。
 */
export function handleDeepLink(link: string): boolean {
  const target = resolveDeepLink(link)
  if (!target) return false

  if (!isLoggedIn()) {
    savePending(link)
    return false
  }

  navigate(target)
  return true
}

/** 登录成功后调用，消费启动时暂存的链接。返回是否发生了跳转 */
export function consumePendingDeepLink(): boolean {
  let link = ''
  try {
    link = uni.getStorageSync(PENDING_KEY) || ''
    if (link) uni.removeStorageSync(PENDING_KEY)
  } catch {
    return false
  }

  if (!link) return false

  const target = resolveDeepLink(link)
  if (!target) return false

  navigate(target)
  return true
}

/** 读取冷启动参数并注册热启动监听。在 App.vue 的 onLaunch 中调用一次 */
export function initDeepLink(): void {
  // #ifdef APP-PLUS
  try {
    const launchArgs = plus.runtime.arguments
    if (launchArgs) {
      handleDeepLink(launchArgs)
      // 不清空会导致后续 onShow / newintent 重复跳转
      plus.runtime.arguments = ''
    }
  } catch {
    // 非 deep link 冷启动时 arguments 为空，属正常情况
  }

  try {
    // globalEvent 未包含在 @dcloudio/types 的 Plus 声明里，这里手动收窄类型
    const globalEvent = (plus as unknown as {
      globalEvent?: { addEventListener: (name: string, callback: () => void) => void }
    }).globalEvent

    // 应用已在后台时再次被唤起，走 newintent 而不是 arguments
    globalEvent?.addEventListener('newintent', () => {
      try {
        const args = plus.runtime.arguments
        if (args) {
          handleDeepLink(args)
          // 不清空会导致下次 onShow 重复跳转
          plus.runtime.arguments = ''
        }
      } catch {
        // 忽略解析失败的 intent
      }
    })
  } catch {
    // 低版本基座可能没有 globalEvent，忽略
  }
  // #endif

  // #ifdef H5
  // H5 用 ?deeplink=avalin://xxx 形式便于本地联调
  try {
    const search = window.location.search || ''
    const hit = search.match(/[?&]deeplink=([^&]+)/)
    if (hit) handleDeepLink(decodeURIComponent(hit[1]))
  } catch {
    // 忽略解析失败
  }
  // #endif
}
