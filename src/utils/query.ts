/**
 * 跨平台 query string 工具。
 *
 * App-Android 运行时没有 `URLSearchParams`，也不能依赖浏览器对
 * `uni.navigateTo` 查询参数的自动解码。这里用 `encodeURIComponent` /
 * `decodeURIComponent` 做成对的拼装与解析，H5 与 App 共用。
 */

export type QueryPrimitive = string | number | boolean
export type QueryValue = QueryPrimitive | null | undefined
export type QueryParams = Record<string, QueryValue>

function isEmptyQueryValue(value: QueryValue): value is null | undefined | '' {
  return value === undefined || value === null || value === ''
}

/** 把键值拼成 `a=1&b=2`（不含 `?`），空值会被跳过 */
export function buildQuery(params: QueryParams): string {
  const parts: string[] = []
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (isEmptyQueryValue(value)) continue
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }
  return parts.join('&')
}

/** 在路径后追加 query；没有任何有效参数时原样返回 path */
export function withQuery(path: string, params: QueryParams): string {
  const query = buildQuery(params)
  return query ? `${path}?${query}` : path
}

/**
 * 读取页面 `onLoad` 的 query 值。
 * 已解码的中文会原样返回；仍是 `%E9%99...` 的值会解码一次。
 */
export function decodeQueryParam(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  const raw = Array.isArray(value) ? String(value[0] ?? '') : String(value)
  if (!raw) return fallback
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
