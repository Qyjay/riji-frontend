/**
 * 用 uni.connectSocket 实现 VoiceSocketLike
 *
 * App 端没有全局 WebSocket 构造函数，必须走 uni 的 SocketTask。
 * 这里把回调式的 SocketTask 包装成浏览器 WebSocket 那套 addEventListener 语义，
 * 让 RealtimeVoiceSocketClient 在两个平台上共用同一份逻辑。
 */

import type { VoiceSocketLike } from './voice-socket'

type SocketEventType = 'open' | 'message' | 'error' | 'close'
type Listener = (event: any) => void

const CONNECTING = 0
const OPEN = 1
const CLOSING = 2
const CLOSED = 3

export class UniVoiceSocket implements VoiceSocketLike {
  readyState = CONNECTING

  private task: UniApp.SocketTask | null = null
  private listeners: Record<SocketEventType, Listener[]> = {
    open: [],
    message: [],
    error: [],
    close: [],
  }

  // 连接建立前调用 send 会失败，这里先缓存，onOpen 后按序补发
  private pendingMessages: string[] = []

  constructor(url: string) {
    const task = uni.connectSocket({
      url,
      // 不传 multiple 时部分平台不返回 SocketTask，只能用全局 uni.onSocketMessage
      multiple: true,
      complete: () => {},
    }) as unknown as UniApp.SocketTask

    this.task = task

    task.onOpen(() => {
      this.readyState = OPEN
      const queued = this.pendingMessages
      this.pendingMessages = []
      queued.forEach((data) => {
        try {
          this.task?.send({ data })
        } catch {
          // 补发失败交由上层的重连逻辑处理
        }
      })
      this.emit('open', {})
    })

    task.onMessage((result: { data?: any }) => {
      this.emit('message', { data: result?.data })
    })

    task.onError((error: any) => {
      this.emit('error', error)
    })

    task.onClose((result: any) => {
      this.readyState = CLOSED
      this.emit('close', result || {})
    })
  }

  send(data: string): void {
    if (this.readyState === CONNECTING) {
      this.pendingMessages.push(data)
      return
    }
    if (this.readyState !== OPEN || !this.task) return
    this.task.send({ data })
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === CLOSED || this.readyState === CLOSING) return
    this.readyState = CLOSING
    this.pendingMessages = []
    try {
      this.task?.close({ code, reason })
    } catch {
      // 已经断开时忽略
      this.readyState = CLOSED
    }
  }

  addEventListener(type: SocketEventType, listener: Listener): void {
    this.listeners[type].push(listener)
  }

  removeEventListener(type: SocketEventType, listener: Listener): void {
    const list = this.listeners[type]
    const index = list.indexOf(listener)
    if (index >= 0) list.splice(index, 1)
  }

  private emit(type: SocketEventType, event: any): void {
    // 复制一份，避免监听器在回调中反注册导致遍历错乱
    this.listeners[type].slice().forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`[realtime-voice] socket ${type} listener failed`, error)
      }
    })
  }
}
