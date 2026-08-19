/**
 * 平台能力抽象层
 *
 * 业务代码统一从这里取平台相关能力，平台差异内聚在各子模块内部，
 * 避免 `#ifdef` 和 `typeof window` 散落到几十个页面里。
 */

export {
  getPlatform,
  getSystemInfo,
  getClientPlatform,
  isAndroid,
  isApp,
  isH5,
  isVivoDevice,
  type RuntimePlatform,
} from './device'

export {
  haptics,
  initHaptics,
  isHapticsEnabled,
  setHapticsEnabled,
} from './haptics'

export {
  consumePendingDeepLink,
  handleDeepLink,
  initDeepLink,
  resolveDeepLink,
  type DeepLinkTarget,
} from './deeplink'

export {
  initNotifications,
  notify,
  setNotifyAppForeground,
  type NotifyOptions,
} from './notification'
