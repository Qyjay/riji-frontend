/**
 * 漫画衍生结果校验。
 *
 * 旧版后端在文生图失败时会静默回落 placehold.co，图上写着 "Diary Comic"。
 * 库里可能仍有这类历史记录；前端必须把它当成生成失败，不能当作成功结果展示。
 */

const FALLBACK_MARKERS = [
  'placehold.co',
  'text=diary+comic',
  'text=mock+ai+image',
]

export function isFallbackComicUrl(url?: string | null): boolean {
  const raw = String(url || '').trim().toLowerCase()
  if (!raw) return false
  return FALLBACK_MARKERS.some((marker) => raw.includes(marker))
}

export function describeComicRequestError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error || '')
  if (/timeout|超时|timed?\s*out/i.test(msg)) return '请求超时，请稍后重试'
  if (/网络|fail to|network|request:fail/i.test(msg)) return '网络异常，请检查网络后重试'
  if (/不存在/.test(msg)) return '找不到这篇日记，请从日记详情重新进入'
  if (/登录|过期|未授权|401/.test(msg)) return '登录已过期，请重新登录'
  if (msg && msg.length > 0 && msg.length <= 40 && !/^HTTP/i.test(msg)) return msg
  return fallback
}
