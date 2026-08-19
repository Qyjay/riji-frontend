/**
 * 震动反馈
 *
 * H5 与不支持的机型上静默忽略，调用方无需做平台判断。
 * vivo OriginOS 对 uni.vibrateShort 的 type 参数支持良好，
 * 会映射到系统 HapticFeedback 的轻/中/重三档振感。
 */

import { isApp } from './device'

let _enabled = true

/** 读取用户设置，关闭后所有震动调用变为空操作 */
export function setHapticsEnabled(enabled: boolean): void {
  _enabled = enabled
  try {
    uni.setStorageSync('haptics_enabled', enabled)
  } catch {
    // 存储失败不影响本次会话内的开关状态
  }
}

export function isHapticsEnabled(): boolean {
  return _enabled
}

/** 应用启动时调用，恢复用户上次的选择 */
export function initHaptics(): void {
  try {
    const saved = uni.getStorageSync('haptics_enabled')
    if (saved === false) _enabled = false
  } catch {
    // 冷启动早期读不到存储时保持默认开启
  }
}

function vibrate(type: 'light' | 'medium' | 'heavy'): void {
  if (!_enabled || !isApp()) return
  try {
    uni.vibrateShort({ type } as UniApp.VibrateShortOptions)
  } catch {
    // 部分机型不支持 type 参数，降级为默认短震
    try {
      uni.vibrateShort({})
    } catch {
      // 完全不支持震动的设备直接忽略
    }
  }
}

export const haptics = {
  /** 轻触：切换 Tab、选中选项、列表点击 */
  light: () => vibrate('light'),

  /** 中等：确认提交、发送消息、拍照快门 */
  medium: () => vibrate('medium'),

  /** 强：删除、错误提示、匹配成功 */
  heavy: () => vibrate('heavy'),

  /** 长震：长按录音开始、重要告警 */
  long: () => {
    if (!_enabled || !isApp()) return
    try {
      uni.vibrateLong({})
    } catch {
      // 忽略不支持的设备
    }
  },
}
