import type { RealtimeAudioAdapter } from './types'

// #ifdef H5
import {
  H5RealtimeAudioAdapter,
  primeH5RealtimeAudio,
} from './h5-audio'
// #endif

// #ifdef APP-PLUS
import { AppRealtimeAudioAdapter } from './app-audio'
// #endif

export async function primeRealtimeAudio(): Promise<void> {
  // #ifdef H5
  await primeH5RealtimeAudio()
  // #endif

  // App 端由 AudioRecord / AudioTrack 直接驱动，不需要预热用户手势上下文
}

export function getRealtimeAudioStartupMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name)) {
    return '请允许麦克风权限后重试'
  }
  if (['NotFoundError', 'DevicesNotFoundError'].includes(name)) {
    return '没有检测到麦克风输入设备'
  }
  if (name === 'AudioCaptureTimeoutError') {
    return '麦克风没有响应，请重试'
  }
  const message = error instanceof Error ? error.message : ''
  return message || '当前设备无法启动实时音频'
}

export function createRealtimeAudioAdapter(): RealtimeAudioAdapter {
  // 用变量赋值而非多个 return，保证条件编译裁剪后剩余代码依然完整
  let adapter: RealtimeAudioAdapter | null = null

  // #ifdef H5
  adapter = new H5RealtimeAudioAdapter()
  // #endif

  // #ifdef APP-PLUS
  adapter = new AppRealtimeAudioAdapter()
  // #endif

  if (!adapter) {
    throw new Error('当前平台尚未安装实时音频适配器')
  }
  return adapter
}

export type { RealtimeAudioAdapter } from './types'
