export interface VoiceUiError {
  code: string
  title: string
  message: string
  recoverable: boolean
  actionLabel?: string
}

const MESSAGES: Record<string, Omit<VoiceUiError, 'code'>> = {
  permission_denied: {
    title: '未获得麦克风权限',
    message: '请在浏览器或系统设置中允许 Avalin 使用麦克风。',
    recoverable: false,
    actionLabel: '返回文字对话',
  },
  audio_capture_unavailable: {
    title: '麦克风暂时不可用',
    message: '浏览器已获得权限，但没有拿到音频输入流。请切换输入设备、断开蓝牙耳机，或重启浏览器后重试。',
    recoverable: true,
    actionLabel: '重试',
  },
  audio_input_missing: {
    title: '没有可用的麦克风',
    message: '当前浏览器没有检测到可用输入设备，请接入或启用麦克风后重试。',
    recoverable: true,
    actionLabel: '重试',
  },
  audio_unsupported: {
    title: '浏览器不支持实时语音',
    message: '当前浏览器缺少实时音频能力，请换用最新版 Chrome 或 Edge。',
    recoverable: false,
    actionLabel: '返回文字对话',
  },
  feature_disabled: {
    title: '实时语音暂未开放',
    message: '你仍然可以继续使用文字对话。',
    recoverable: false,
    actionLabel: '返回文字对话',
  },
  invalid_ticket: {
    title: '通话凭证已失效',
    message: '请重新建立一次通话。',
    recoverable: true,
    actionLabel: '重新连接',
  },
  session_limit: {
    title: '当前已有通话',
    message: '请先结束其他设备上的实时语音，或稍后再试。',
    recoverable: true,
    actionLabel: '重试',
  },
  provider_reconnect_failed: {
    title: '未能恢复通话',
    message: '网络连接持续中断，请重新开始一次通话。',
    recoverable: true,
    actionLabel: '重新连接',
  },
  client_backpressure: {
    title: '音频发送过快',
    message: '当前网络无法及时发送语音，请重新连接后再试。',
    recoverable: true,
    actionLabel: '重新连接',
  },
  socket_error: {
    title: '连接中断',
    message: '没有收到服务端响应，请检查网络后重试。',
    recoverable: true,
    actionLabel: '重新连接',
  },
}

export function toVoiceUiError(
  code: string,
  message = '',
  recoverable = false,
): VoiceUiError {
  const known = MESSAGES[code]
  if (known) return { code, ...known }
  return {
    code: code || 'voice_error',
    title: '本次通话未能继续',
    message: message || '请重新建立通话，或返回文字对话。',
    recoverable,
    actionLabel: recoverable ? '重新连接' : '返回文字对话',
  }
}
