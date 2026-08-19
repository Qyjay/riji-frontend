import { reactive } from 'vue'
import { DEFAULT_AVATAR_URL, resolveAvatarUrl, resolveMediaUrl } from '@/utils/avatar'

export const MEDIA_PLACEHOLDER_URL = '/static/illustrations/empty-no-diary.png'
export const PLAZA_MEDIA_BUILD_TAG = 'plaza-media-v3'

const overrides = reactive<Record<string, string>>({})
const inflight = new Set<string>()

let loggedBuildTag = false
function logBuildTagOnce() {
  if (loggedBuildTag) return
  loggedBuildTag = true
  console.log(`[${PLAZA_MEDIA_BUILD_TAG}] display helper ready`)
}

function isLocalAsset(url: string): boolean {
  return (
    url.startsWith('/static/') ||
    url.startsWith('static/') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('file:') ||
    url.startsWith('content:') ||
    url.startsWith('_doc/') ||
    url.startsWith('_www/')
  )
}

function placeholderFor(isAvatar: boolean): string {
  return isAvatar ? DEFAULT_AVATAR_URL : MEDIA_PLACEHOLDER_URL
}

export function displayMediaUrl(input?: string | null): string {
  logBuildTagOnce()
  const url = resolveMediaUrl(input)
  if (!url) return MEDIA_PLACEHOLDER_URL
  return overrides[url] || url
}

export function displayAvatarUrl(input?: string | null): string {
  logBuildTagOnce()
  const url = resolveAvatarUrl(input)
  return overrides[url] || url
}

export function onDisplayMediaError(input?: string | null, isAvatar = false): void {
  const url = isAvatar ? resolveAvatarUrl(input) : resolveMediaUrl(input)
  if (!url || isLocalAsset(url)) return

  const current = overrides[url]
  if (current && isLocalAsset(current)) {
    overrides[url] = placeholderFor(isAvatar)
    return
  }

  overrides[url] = placeholderFor(isAvatar)
  retryRemoteMedia(url, isAvatar)
}

function retryRemoteMedia(url: string, isAvatar: boolean): void {
  // #ifdef APP-PLUS
  if (inflight.has(url) || !/^https?:\/\//i.test(url)) return
  inflight.add(url)
  uni.downloadFile({
    url,
    success(res) {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
        overrides[url] = res.tempFilePath
        return
      }
      overrides[url] = placeholderFor(isAvatar)
    },
    fail() {
      overrides[url] = placeholderFor(isAvatar)
    },
    complete() {
      inflight.delete(url)
    },
  })
  // #endif
}
