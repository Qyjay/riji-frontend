/**
 * 平台与设备探测
 *
 * 页面与 store 一律通过这里判断运行环境，不要在业务代码里散落
 * `typeof window` 之类的写法。
 */

export type RuntimePlatform = 'h5' | 'app-android' | 'app-ios' | 'mp' | 'unknown'

type SystemInfo = ReturnType<typeof uni.getSystemInfoSync>

let _cachedInfo: SystemInfo | null = null
let _cachedPlatform: RuntimePlatform | null = null

/** 系统信息，首次调用后缓存（同步接口在冷启动阶段开销不小） */
export function getSystemInfo(): SystemInfo | null {
  if (_cachedInfo) return _cachedInfo
  try {
    _cachedInfo = uni.getSystemInfoSync()
  } catch {
    _cachedInfo = null
  }
  return _cachedInfo
}

/** 当前运行平台 */
export function getPlatform(): RuntimePlatform {
  if (_cachedPlatform) return _cachedPlatform

  // 用赋值而非多个 return，保证条件编译裁剪后剩余代码依然完整
  let platform: RuntimePlatform = 'unknown'

  // #ifdef H5
  platform = 'h5'
  // #endif

  // #ifdef APP-PLUS
  platform = String(getSystemInfo()?.platform || '').toLowerCase() === 'ios'
    ? 'app-ios'
    : 'app-android'
  // #endif

  // #ifdef MP
  platform = 'mp'
  // #endif

  _cachedPlatform = platform
  return platform
}

export function isH5(): boolean {
  return getPlatform() === 'h5'
}

export function isApp(): boolean {
  const platform = getPlatform()
  return platform === 'app-android' || platform === 'app-ios'
}

export function isAndroid(): boolean {
  return getPlatform() === 'app-android'
}

/**
 * 是否 vivo / iQOO 机型。
 *
 * 用于决定是否展示 vivo 专属入口（小 V 语音技能引导、OriginOS 后台保活提示等），
 * 非 vivo 机型上这些入口应当隐藏而不是报错。
 */
export function isVivoDevice(): boolean {
  if (!isAndroid()) return false
  const info = getSystemInfo()
  const brand = String(info?.brand || '').toLowerCase()
  const model = String(info?.model || '').toLowerCase()
  return brand.includes('vivo') || brand.includes('iqoo')
    || model.includes('vivo') || model.includes('iqoo')
}

/** 供后端区分客户端来源，写入实时语音 ticket 与埋点 */
export function getClientPlatform(): string {
  return getPlatform()
}
