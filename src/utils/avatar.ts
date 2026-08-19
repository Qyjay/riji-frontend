import { API_BASE_URL } from '@/services/config'
import {
  resolveMediaUrl as resolveMediaUrlWithBase,
  resolveMediaUrls as resolveMediaUrlsWithBase,
} from '@/utils/media-url'

export const DEFAULT_AVATAR_URL = '/static/brand/logo-d-mascot.png'

export function resolveMediaUrl(input?: string | null): string {
  return resolveMediaUrlWithBase(input, API_BASE_URL)
}

export function resolveMediaUrls(inputs?: Array<string | null | undefined> | null): string[] {
  return resolveMediaUrlsWithBase(inputs, API_BASE_URL)
}

export function resolveAvatarUrl(avatar?: string | null): string {
  return resolveMediaUrl(avatar) || DEFAULT_AVATAR_URL
}
