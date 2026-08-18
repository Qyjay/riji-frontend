import type { RealtimeAudioAdapter } from './types'
import {
  H5RealtimeAudioAdapter,
  primeH5RealtimeAudio,
} from './h5-audio'

export async function primeRealtimeAudio(): Promise<void> {
  // #ifdef H5
  await primeH5RealtimeAudio()
  // #endif
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
  return message || '当前浏览器无法启动实时音频'
}

export function createRealtimeAudioAdapter(): RealtimeAudioAdapter {
  // #ifdef H5
  return new H5RealtimeAudioAdapter()
  // #endif

  // #ifndef H5
  throw new Error('当前平台尚未安装实时音频适配器')
  // #endif
}

export type { RealtimeAudioAdapter } from './types'
