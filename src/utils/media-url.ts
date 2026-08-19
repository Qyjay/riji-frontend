/**
 * 把后端返回的媒体地址转成各端都能加载的 src。
 *
 * App 端没有页面 origin：`/uploads/xxx` 这种相对路径在 H5 能显示，
 * 在真机 `<image>` 上会静默失败。明文 `http://`（含旧公网 IP）也会被
 * Android 9+ 拦截。这里统一拼到当前 API host，并在需要时改成 https。
 *
 * 纯函数，不读全局配置，方便单测；运行时包装见 `@/utils/avatar`。
 */

export function getAssetHost(apiBaseUrl: string): string {
  const base = String(apiBaseUrl || '').trim().replace(/\/+$/, '')
  if (!base || base === '/api') return ''
  return base.replace(/\/api$/i, '')
}

const LOCAL_SCHEME = /^(data:|blob:|file:|content:|wxfile:|fd:)/i
const LOCAL_UNI_ROOT = /^(_doc\/|_www\/|_downloads\/|_documents\/)/i
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(1[6-9]|2\d|3[01])(?:\.\d+){2})$/i
const LEGACY_HOSTS = new Set(['115.190.218.167', 'avalin.cn'])

function hostnameOf(hostWithPort: string): string {
  const trimmed = hostWithPort.replace(/^\[/, '').replace(/\]$/, '')
  const colon = trimmed.lastIndexOf(':')
  if (colon > 0 && trimmed.indexOf(':') === colon) {
    return trimmed.slice(0, colon).toLowerCase()
  }
  return trimmed.toLowerCase()
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  return PRIVATE_HOST.test(hostname)
}

function joinHostPath(assetHost: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return assetHost ? `${assetHost}${normalized}` : normalized
}

function toUploadsPath(raw: string): string | null {
  if (raw.startsWith('/api/uploads/')) return raw.slice(4)
  if (raw.startsWith('/uploads/')) return raw
  if (raw.startsWith('uploads/')) return `/${raw}`
  return null
}

/**
 * @param input 后端字段、本地路径或已是绝对地址
 * @param apiBaseUrl 当前 API_BASE_URL，例如 `https://www.avalin.cn/api` 或 H5 的 `/api`
 */
export function resolveMediaUrl(input?: string | null, apiBaseUrl = ''): string {
  const raw = String(input || '').trim()
  if (!raw) return ''

  if (LOCAL_SCHEME.test(raw) || LOCAL_UNI_ROOT.test(raw)) return raw

  if (raw.startsWith('/static/') || raw.startsWith('static/')) {
    return raw.startsWith('/') ? raw : `/${raw}`
  }

  const assetHost = getAssetHost(apiBaseUrl)

  const abs = raw.match(/^(https?):\/\/([^/?#]+)(.*)$/i)
  if (abs) {
    const scheme = abs[1].toLowerCase()
    const host = abs[2]
    const rest = abs[3] || ''
    const hostname = hostnameOf(host)

    if (LEGACY_HOSTS.has(hostname)) {
      return joinHostPath(assetHost, rest || '/')
    }

    if (scheme === 'http' && !isPrivateOrLoopbackHost(hostname)) {
      return `https://${host}${rest}`
    }
    return raw
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`
  }

  const uploadsPath = toUploadsPath(raw)
  if (uploadsPath) {
    return joinHostPath(assetHost, uploadsPath)
  }

  // Android 相册/缓存路径（/storage/...）以及其它未知相对路径，原样返回。
  return raw
}

export function resolveMediaUrls(
  inputs?: Array<string | null | undefined> | null,
  apiBaseUrl = '',
): string[] {
  if (!Array.isArray(inputs)) return []
  return inputs.map((item) => resolveMediaUrl(item, apiBaseUrl)).filter(Boolean)
}
