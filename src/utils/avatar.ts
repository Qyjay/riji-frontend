import { API_BASE_URL } from '@/services/config'

export const DEFAULT_AVATAR_URL = '/static/brand/logo-d-mascot.png'

const backendAssetBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '')

export function resolveAvatarUrl(avatar?: string | null): string {
  const raw = String(avatar || '').trim()
  if (!raw) return DEFAULT_AVATAR_URL
  if (/^(https?:|data:|blob:)/.test(raw)) return raw
  if (raw.startsWith('/static/')) return raw
  if (raw.startsWith('static/')) return `/${raw}`
  if (raw.startsWith('/')) return `${backendAssetBaseUrl}${raw}`
  return raw
}
