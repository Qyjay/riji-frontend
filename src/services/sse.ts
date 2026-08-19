/**
 * SSE 流式请求
 *
 * H5 用 XMLHttpRequest 的 onprogress 增量读取 responseText；
 * App 端没有 XMLHttpRequest，改用 uni.request 的 enableChunked + onChunkReceived，
 * 分片以 ArrayBuffer 形式到达，需要自己做增量 UTF-8 解码与 SSE 分帧。
 *
 * 两端共用同一套分帧与事件回调逻辑，调用方只需提供 url、body 和事件处理器。
 */

import { API_BASE_URL } from './config'

export interface SseStreamOptions<T> {
  /** 相对 API_BASE_URL 的路径，如 '/chat/stream' */
  path: string
  /** 省略则发送无 body 的 POST，并且不带 Content-Type */
  body?: unknown
  /** 整体超时，默认 90 秒 */
  timeoutMs?: number
  onEvent: (event: T) => void
}

// 以下解码逻辑只服务于 App 端的 ArrayBuffer 分片，H5 端不打进包里
// #ifndef H5

/** UTF-8 多字节字符可能被分片切断，这里跨分片保留不完整的尾部字节 */
class Utf8StreamDecoder {
  private pending: Uint8Array = new Uint8Array(0)

  decode(chunk: ArrayBuffer | Uint8Array): string {
    const incoming = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)

    let bytes: Uint8Array
    if (this.pending.length) {
      bytes = new Uint8Array(this.pending.length + incoming.length)
      bytes.set(this.pending, 0)
      bytes.set(incoming, this.pending.length)
    } else {
      bytes = incoming
    }

    const boundary = findCharBoundary(bytes)
    this.pending = boundary < bytes.length ? bytes.slice(boundary) : new Uint8Array(0)

    return boundary > 0 ? decodeUtf8(bytes.subarray(0, boundary)) : ''
  }

  /** 流结束时取出残留字节，避免丢掉最后一个字符 */
  flush(): string {
    if (!this.pending.length) return ''
    const text = decodeUtf8(this.pending)
    this.pending = new Uint8Array(0)
    return text
  }
}

/** 返回可安全解码的字节长度：末尾若是不完整的多字节序列则排除在外 */
function findCharBoundary(bytes: Uint8Array): number {
  const length = bytes.length
  if (!length) return 0

  // 多字节序列最长 4 字节，最多往前回溯 3 个字节即可
  for (let back = 1; back <= 4 && back <= length; back += 1) {
    const index = length - back
    const byte = bytes[index]

    // continuation byte（10xxxxxx）不是序列开头，继续往前找
    if ((byte & 0xC0) === 0x80) continue

    let needed = 1
    if ((byte & 0x80) === 0) needed = 1
    else if ((byte & 0xE0) === 0xC0) needed = 2
    else if ((byte & 0xF0) === 0xE0) needed = 3
    else if ((byte & 0xF8) === 0xF0) needed = 4

    // 该字符的字节已齐 -> 整个数组都可解码；否则从这个字符起留到下次
    return back >= needed ? length : index
  }

  return length
}

const nativeDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null

function decodeUtf8(bytes: Uint8Array): string {
  if (nativeDecoder) return nativeDecoder.decode(bytes)

  // App 端可能没有 TextDecoder，退回手工解码
  let result = ''
  let index = 0
  while (index < bytes.length) {
    const byte = bytes[index]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
      index += 1
    } else if ((byte & 0xE0) === 0xC0) {
      result += String.fromCharCode(((byte & 0x1F) << 6) | (bytes[index + 1] & 0x3F))
      index += 2
    } else if ((byte & 0xF0) === 0xE0) {
      result += String.fromCharCode(
        ((byte & 0x0F) << 12) | ((bytes[index + 1] & 0x3F) << 6) | (bytes[index + 2] & 0x3F),
      )
      index += 3
    } else {
      const codePoint = ((byte & 0x07) << 18)
        | ((bytes[index + 1] & 0x3F) << 12)
        | ((bytes[index + 2] & 0x3F) << 6)
        | (bytes[index + 3] & 0x3F)
      const offset = codePoint - 0x10000
      result += String.fromCharCode(0xD800 + (offset >> 10), 0xDC00 + (offset & 0x3FF))
      index += 4
    }
  }
  return result
}

// #endif

/**
 * SSE 分帧器：按空行切分事件块，提取 data: 行并解析 JSON。
 * 不完整的块留在缓冲区等待后续分片。
 */
class SseFramer<T> {
  private buffer = ''

  constructor(private readonly onEvent: (event: T) => void) {}

  push(text: string): void {
    if (!text) return
    this.buffer += text

    const blocks = this.buffer.split('\n\n')
    this.buffer = blocks.pop() || ''
    blocks.forEach((block) => this.emitBlock(block))
  }

  /** 流结束时处理最后一个没有以空行结尾的块 */
  flush(): void {
    const remaining = this.buffer
    this.buffer = ''
    if (remaining.trim()) this.emitBlock(remaining)
  }

  private emitBlock(block: string): void {
    const raw = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n')

    if (!raw) return

    let event: T
    try {
      event = JSON.parse(raw) as T
    } catch {
      // 忽略无法解析的分片，服务端偶发的心跳或注释行会走到这里
      return
    }
    // 回调放在 try 外，避免业务异常被误当成解析失败而静默
    this.onEvent(event)
  }
}

function getAuthToken(): string {
  try {
    return uni.getStorageSync('token') || ''
  } catch {
    return ''
  }
}

export function requestSseStream<T>(options: SseStreamOptions<T>): Promise<void> {
  const token = getAuthToken()
  if (!token) {
    return Promise.reject(new Error('未登录，请先登录'))
  }

  const url = `${API_BASE_URL}${options.path}`
  const timeoutMs = options.timeoutMs ?? 90000

  // #ifdef H5
  return streamViaXhr<T>(url, token, options, timeoutMs)
  // #endif

  // #ifndef H5
  return streamViaUniRequest<T>(url, token, options, timeoutMs)
  // #endif
}

// ── H5：XMLHttpRequest ─────────────────────────────────────
// #ifdef H5

function streamViaXhr<T>(
  url: string,
  token: string,
  options: SseStreamOptions<T>,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const framer = new SseFramer<T>(options.onEvent)
    let consumedLength = 0
    let settled = false
    let timedOut = false

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const drain = () => {
      const incoming = xhr.responseText.slice(consumedLength)
      consumedLength = xhr.responseText.length
      framer.push(incoming)
    }

    xhr.open('POST', url, true)
    // 无 body 的接口不要带 Content-Type，否则 FastAPI 会尝试解析空 JSON
    if (options.body !== undefined) {
      xhr.setRequestHeader('Content-Type', 'application/json')
    }
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'text'

    xhr.onprogress = () => drain()

    xhr.onload = () => {
      drain()
      if (settled) return
      if (xhr.status >= 400) {
        fail(new Error(`HTTP ${xhr.status}`))
        return
      }
      framer.flush()
      settled = true
      resolve()
    }

    xhr.onerror = () => {
      if (timedOut) return
      fail(new Error('网络请求失败'))
    }

    xhr.send(options.body === undefined ? null : JSON.stringify(options.body))

    setTimeout(() => {
      if (settled || xhr.readyState === 4) return
      timedOut = true
      xhr.abort()
      fail(new Error('请求超时'))
    }, timeoutMs)
  })
}

// #endif

// ── App / 小程序：uni.request + enableChunked ───────────────
// #ifndef H5

/** onChunkReceived 的分片，App 端为 ArrayBuffer */
interface ChunkResult {
  data?: ArrayBuffer | Uint8Array | string
}

interface ChunkedRequestTask {
  abort?: () => void
  onChunkReceived?: (callback: (result: ChunkResult) => void) => void
}

function streamViaUniRequest<T>(
  url: string,
  token: string,
  options: SseStreamOptions<T>,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const framer = new SseFramer<T>(options.onEvent)
    const decoder = new Utf8StreamDecoder()
    let settled = false
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      clearTimer()
      reject(error)
    }

    const succeed = () => {
      if (settled) return
      settled = true
      clearTimer()
      framer.push(decoder.flush())
      framer.flush()
      resolve()
    }

    const header: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (options.body !== undefined) {
      header['Content-Type'] = 'application/json'
    }

    const task = uni.request({
      url,
      method: 'POST',
      data: options.body as any,
      header,
      // App 端专有：开启后响应以分片形式通过 onChunkReceived 到达
      enableChunked: true,
      responseType: 'text',
      timeout: timeoutMs,
      success: (response) => {
        if (response.statusCode >= 400) {
          fail(new Error(`HTTP ${response.statusCode}`))
          return
        }
        // 分片模式下 data 通常为空；若平台未支持 chunked 则这里会拿到完整响应体
        if (typeof response.data === 'string' && response.data) {
          framer.push(response.data)
        }
        succeed()
      },
      fail: (error) => {
        if (timedOut) return
        fail(new Error(error?.errMsg || '网络请求失败'))
      },
    } as UniApp.RequestOptions) as unknown as ChunkedRequestTask

    if (typeof task?.onChunkReceived === 'function') {
      task.onChunkReceived((result) => {
        const data = result?.data
        if (!data) return
        if (typeof data === 'string') {
          framer.push(data)
          return
        }
        framer.push(decoder.decode(data))
      })
    }

    timer = setTimeout(() => {
      if (settled) return
      timedOut = true
      try {
        task?.abort?.()
      } catch {
        // 忽略已结束的请求
      }
      fail(new Error('请求超时'))
    }, timeoutMs)
  })
}

// #endif
