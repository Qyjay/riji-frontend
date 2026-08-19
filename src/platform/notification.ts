/**
 * 本地系统通知
 *
 * 演示期不接厂商推送：优先 plus.push.createMessage，Push 模块没打进基座时
 * 退回 Android NotificationManager，两条路都走不通时降级成应用内提示。
 * 任何一层失败都会打日志，不允许静默丢消息。
 * H5 静默忽略，避免把调试 toast 当成通知。
 */

import { handleDeepLink } from './deeplink'
import { getSystemInfo } from './device'

export interface NotifyOptions {
  title: string
  content: string
  /** Deep Link，如 avalin://social/requests，点击通知后交给 handleDeepLink */
  payload?: string
  /** 系统通知发不出去时是否退化成 toast。调用方自己已经有提示的传 false */
  inAppFallback?: boolean
}

const ANDROID_CHANNEL_ID = 'avalin.local'
const ANDROID_CHANNEL_NAME = 'Avalin 消息'

let appForeground = true

/**
 * 发一条系统通知。
 *
 * 返回值表示「用户已经被告知」：系统通知发出，或退化成了应用内提示。
 * 返回 false 的事件调用方可以稍后重试（收件箱巡检就是这么做的）。
 */
export function notify(options: NotifyOptions): boolean {
  const title = String(options?.title || '').trim()
  const content = String(options?.content || '').trim()
  if (!title && !content) return false

  const normalized: NotifyOptions = {
    title: title || 'Avalin',
    content: content || title,
    payload: String(options?.payload || '').trim(),
    inAppFallback: options?.inAppFallback !== false,
  }

  let handled = false
  // #ifdef APP-PLUS
  handled = showAppNotification(normalized)
  if (!handled) handled = surfaceInApp(normalized)
  // #endif
  return handled
}

/** 注册通知点击，并在 Android 13+ 申请通知权限。App.onLaunch 调一次。 */
export function initNotifications(): void {
  // #ifdef APP-PLUS
  initAppNotifications()
  // #endif
}

/** App.vue 的 onShow / onHide 调用：后台时没法弹 toast，只能靠通知栏 */
export function setNotifyAppForeground(foreground: boolean): void {
  appForeground = foreground
}

// #ifdef APP-PLUS

/** plus.android 的声明是单参数的，实际运行时可变参，这里手动收窄 */
interface AndroidBridge {
  invoke: (obj: unknown, name: string, ...args: unknown[]) => unknown
  newObject: (classname: string, ...args: unknown[]) => unknown
  getAttribute: (obj: unknown, name: string) => unknown
  runtimeMainActivity: () => unknown
}

/** Android 平台常量，用字面量避免为了取一个常量去 importClass */
const ACTION_VIEW = 'android.intent.action.VIEW'
const NOTIFICATION_SERVICE = 'notification'
const IMPORTANCE_HIGH = 4
const FLAG_ACTIVITY_NEW_TASK = 0x10000000
const FLAG_ACTIVITY_SINGLE_TOP = 0x20000000
const FLAG_UPDATE_CURRENT = 0x08000000
const FLAG_IMMUTABLE = 0x04000000

let clickListenerBound = false
let permissionRequested = false
let blockedHintShown = false
const warnedReasons = new Set<string>()

function android(): AndroidBridge {
  return plus.android as unknown as AndroidBridge
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  const text = String(error || '')
  return text || '未知错误'
}

/** 同一个原因只报一次，避免 3.5s 一轮的巡检把日志刷满 */
function warnOnce(reason: string, message: string): void {
  if (warnedReasons.has(reason)) return
  warnedReasons.add(reason)
  console.error(`[notification] ${message}`)
}

function initAppNotifications(): void {
  bindPushClickListener()
  void ensureNotificationPermission()
}

function payloadToLink(payload: unknown): string {
  if (typeof payload === 'string') {
    const text = payload.trim()
    if (!text) return ''
    if (text.charAt(0) === '{') {
      try {
        return payloadToLink(JSON.parse(text))
      } catch {
        return text
      }
    }
    return text
  }
  if (payload && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>
    if (typeof rec.url === 'string') return rec.url
    if (typeof rec.link === 'string') return rec.link
    if (typeof rec.payload === 'string') return rec.payload
  }
  return ''
}

function bindPushClickListener(): void {
  if (clickListenerBound) return
  try {
    if (!plus.push || typeof plus.push.addEventListener !== 'function') {
      warnOnce('push-missing', 'plus.push 不存在，请在 manifest 模块配置勾选 Push 后重新制作自定义基座；本次改用原生通知')
      return
    }
    plus.push.addEventListener('click', (result) => {
      const msg = result as unknown as { payload?: unknown }
      const link = payloadToLink(msg?.payload ?? result)
      if (link) handleDeepLink(link)
    })
    clickListenerBound = true
  } catch (error) {
    // 原生通知走 scheme 唤起，点击仍然能落到 initDeepLink 的 newintent
    warnOnce('push-click', `注册 Push 点击监听失败：${describeError(error)}`)
  }
}

function readNotificationAuthorized(): 'authorized' | 'denied' | 'not determined' | 'unknown' {
  try {
    const setting = uni.getAppAuthorizeSetting()
    const value = String((setting as { notificationAuthorized?: string })?.notificationAuthorized || '')
    if (value === 'authorized' || value === 'denied' || value === 'not determined') return value
  } catch {
    // 旧基座可能没有该 API
  }
  return 'unknown'
}

/** Android 发行版本 → API 等级，反射读不到 SDK_INT 时兜底 */
const RELEASE_TO_SDK: Record<string, number> = {
  '7': 24, '8': 26, '9': 28, '10': 29, '11': 30,
  '12': 31, '13': 33, '14': 34, '15': 35, '16': 36,
}

let cachedSdkInt = -1

function readSdkFromSystemInfo(): number {
  const info = getSystemInfo() as unknown as { osVersion?: string; system?: string } | null
  const digits = String(info?.osVersion || info?.system || '').replace(/[^0-9.]/g, '')
  const major = digits.split('.')[0]
  return RELEASE_TO_SDK[major] || 0
}

/** 取不到时返回 0，调用方一律按「新系统」处理，宁可多建渠道也不能漏建 */
function androidSdkInt(): number {
  if (cachedSdkInt >= 0) return cachedSdkInt

  let sdk = 0
  try {
    sdk = Number(android().getAttribute('android.os.Build$VERSION', 'SDK_INT') || 0)
  } catch {
    sdk = 0
  }
  if (!sdk) sdk = readSdkFromSystemInfo()

  cachedSdkInt = sdk
  return sdk
}

/** Android 8 起通知必须挂在渠道上，没有渠道的通知会被系统直接丢掉 */
function requiresChannel(): boolean {
  const sdk = androidSdkInt()
  return sdk === 0 || sdk >= 26
}

function requestPostNotifications(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      plus.android.requestPermissions(
        ['android.permission.POST_NOTIFICATIONS'],
        (result: { granted?: string[] }) => {
          resolve((result?.granted || []).some((item) => String(item).indexOf('POST_NOTIFICATIONS') >= 0))
        },
        () => resolve(false),
      )
    } catch {
      resolve(false)
    }
  })
}

/**
 * Android 13+ 申请一次 POST_NOTIFICATIONS。
 *
 * 申请结果只用来决定要不要提示用户去设置里开，不作为「能否发通知」的开关——
 * 基座没声明该权限时系统会不弹框直接拒绝，一旦拿它当开关就会永久静默。
 */
async function ensureNotificationPermission(): Promise<boolean> {
  if (readNotificationAuthorized() === 'authorized') return true

  const sdk = androidSdkInt()
  // Android 13 以下没有运行时通知权限，开关只在系统设置里
  if (sdk > 0 && sdk < 33) return true

  if (permissionRequested) return false
  permissionRequested = true

  const granted = await requestPostNotifications()
  if (!granted) {
    warnOnce('permission', 'POST_NOTIFICATIONS 未授权：基座可能未声明该权限，或用户已拒绝')
  }
  return granted
}

function openNotificationSettings(): void {
  try {
    const bridge = android()
    const main = bridge.runtimeMainActivity()
    const intent = bridge.newObject('android.content.Intent', 'android.settings.APP_NOTIFICATION_SETTINGS')
    bridge.invoke(intent, 'putExtra', 'android.provider.extra.APP_PACKAGE', bridge.invoke(main, 'getPackageName'))
    bridge.invoke(intent, 'setFlags', FLAG_ACTIVITY_NEW_TASK)
    bridge.invoke(main, 'startActivity', intent)
  } catch (error) {
    console.error(`[notification] 打开系统通知设置失败：${describeError(error)}`)
    uni.showToast({ title: '请到「设置 → 通知与状态栏」里允许 Avalin 通知', icon: 'none', duration: 3000 })
  }
}

/** 系统开关被关掉时提示一次，别每轮巡检都弹 */
function promptEnableNotifications(): void {
  if (blockedHintShown || !appForeground) return
  blockedHintShown = true
  uni.showModal({
    title: '通知已被关闭',
    content: '开启后好友申请和新消息才会出现在通知栏。现在去系统设置里打开？',
    confirmText: '去开启',
    cancelText: '暂不',
    success: (res) => {
      if (res.confirm) openNotificationSettings()
    },
  })
}

function surfaceInApp(options: NotifyOptions): boolean {
  if (!options.inAppFallback || !appForeground) return false
  try {
    uni.showToast({
      title: options.content || options.title,
      icon: 'none',
      duration: 2600,
    })
    return true
  } catch {
    return false
  }
}

function showAppNotification(options: NotifyOptions): boolean {
  const payload = options.payload || 'avalin://messages'

  if (readNotificationAuthorized() === 'denied') {
    warnOnce('denied', '系统通知开关已关闭，通知栏不会显示')
    promptEnableNotifications()
    return false
  }

  try {
    if (plus.push && typeof plus.push.createMessage === 'function') {
      plus.push.createMessage(options.content, payload, {
        title: options.title,
        cover: false,
        sound: 'system',
      })
      return true
    }
  } catch (error) {
    warnOnce('push-create', `plus.push.createMessage 失败，改用原生通知：${describeError(error)}`)
  }

  try {
    createAndroidNotification(options.title, options.content, payload)
    return true
  } catch (error) {
    warnOnce('native', `原生通知创建失败：${describeError(error)}`)
    return false
  }
}

function stableNotifyId(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return (Math.abs(hash) % 90000) + 1000
}

/** 应用图标的资源 id。实例属性必须走 getAttribute，`.icon` 取不到值 */
function appIconResId(bridge: AndroidBridge, main: unknown): number {
  const info = bridge.invoke(main, 'getApplicationInfo')
  const icon = Number(bridge.getAttribute(info, 'icon') || 0)
  if (icon) return icon
  return Number(bridge.getAttribute(info, 'logo') || 0)
}

/**
 * 不依赖 Push 模块的兜底通知。
 *
 * 全程用 newObject / invoke / getAttribute：importClass 只让「已导入类」的实例支持
 * `.` 调用，Notification.Builder 是内部类（要写成 Notification$Builder），
 * ApplicationInfo.icon 是实例属性，这两处用 `.` 都会静默拿到 undefined。
 */
function createAndroidNotification(title: string, content: string, payload: string): void {
  const bridge = android()
  const main = bridge.runtimeMainActivity()
  if (!main) throw new Error('拿不到主 Activity')

  const nm = bridge.invoke(main, 'getSystemService', NOTIFICATION_SERVICE)
  if (!nm) throw new Error('拿不到 NotificationManager')

  const useChannel = requiresChannel()
  if (useChannel) {
    const channel = bridge.newObject(
      'android.app.NotificationChannel',
      ANDROID_CHANNEL_ID,
      ANDROID_CHANNEL_NAME,
      IMPORTANCE_HIGH,
    )
    if (!channel) throw new Error('创建通知渠道失败')
    bridge.invoke(channel, 'setDescription', '好友申请、聊天消息与记忆变更')
    bridge.invoke(channel, 'enableVibration', true)
    bridge.invoke(nm, 'createNotificationChannel', channel)
  }

  const intent = bridge.newObject('android.content.Intent', ACTION_VIEW)
  if (!intent) throw new Error('创建 Intent 失败')
  bridge.invoke(intent, 'setData', bridge.invoke('android.net.Uri', 'parse', payload))
  bridge.invoke(intent, 'setPackage', bridge.invoke(main, 'getPackageName'))
  bridge.invoke(intent, 'setFlags', FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP)

  // FLAG_IMMUTABLE 从 API 23 起可用，minSdkVersion 24 所以无需按版本区分
  const pending = bridge.invoke(
    'android.app.PendingIntent',
    'getActivity',
    main,
    stableNotifyId(payload),
    intent,
    FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE,
  )

  const builder = useChannel
    ? bridge.newObject('android.app.Notification$Builder', main, ANDROID_CHANNEL_ID)
    : bridge.newObject('android.app.Notification$Builder', main)
  if (!builder) throw new Error('创建 Notification.Builder 失败')

  const icon = appIconResId(bridge, main)
  if (!icon) throw new Error('取不到应用图标资源 id，小图标为空的通知会被系统丢弃')

  bridge.invoke(builder, 'setContentTitle', title)
  bridge.invoke(builder, 'setContentText', content)
  bridge.invoke(builder, 'setAutoCancel', true)
  bridge.invoke(builder, 'setSmallIcon', icon)
  if (pending) bridge.invoke(builder, 'setContentIntent', pending)

  const notification = bridge.invoke(builder, 'build')
  if (!notification) throw new Error('Notification.build() 返回空')

  bridge.invoke(nm, 'notify', stableNotifyId(`${payload}|${title}`), notification)
}

// #endif
