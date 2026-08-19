import { API_BASE_URL } from '@/services/config'
import {
  createRealtimeVoiceTicket,
  type CreateVoiceTicketOptions,
  type VoiceTicket,
} from './voice-api'
import {
  createEventId,
  parseVoiceServerEvent,
  type ConfirmationDecision,
  type VoiceClientEvent,
  type VoiceEntryMode,
  type VoiceServerEvent,
} from './voice-protocol'
// #ifndef H5
import { UniVoiceSocket } from './uni-socket'
// #endif

export type VoiceSocketState = 'idle' | 'connecting' | 'open' | 'closed'

export interface VoiceSocketLike {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: any) => void,
  ): void
  removeEventListener?(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: any) => void,
  ): void
}

export type VoiceSocketFactory = (url: string) => VoiceSocketLike
export type VoiceTicketProvider = (
  options?: CreateVoiceTicketOptions,
) => Promise<VoiceTicket>

export interface VoiceSocketClientOptions {
  socketFactory?: VoiceSocketFactory
  ticketProvider?: VoiceTicketProvider
  apiBaseUrl?: string
  pageOrigin?: string
  onEvent?: (event: VoiceServerEvent) => void
  onState?: (state: VoiceSocketState) => void
  onSocketError?: (error: Error) => void
  onUnknownEvent?: (raw: unknown) => void
}

export interface ConnectVoiceOptions extends CreateVoiceTicketOptions {
  entryMode?: VoiceEntryMode
  resumeSessionId?: string | null
}

const SOCKET_OPEN = 1

/** 从 http(s) 地址里取出 scheme 与 host，不依赖 URL 构造函数（App 端可能没有） */
function parseOrigin(value: string): { secure: boolean; host: string } | null {
  const matched = String(value || '').match(/^(https?):\/\/([^/?#]+)/i)
  if (!matched) return null
  return { secure: matched[1].toLowerCase() === 'https', host: matched[2] }
}

export function buildVoiceWebSocketUrl(
  ticket: VoiceTicket,
  options: { apiBaseUrl?: string; pageOrigin?: string } = {},
): string {
  const configuredBase = options.apiBaseUrl ?? API_BASE_URL

  // App 端 API_BASE_URL 是绝对地址，直接取其 host；
  // H5 端是相对路径，退回页面自身的 origin。
  const origin = parseOrigin(configuredBase)
    || parseOrigin(options.pageOrigin || '')
    || parseOrigin(typeof window !== 'undefined' ? window.location.origin : '')

  if (!origin) {
    throw new Error('无法确定实时语音服务地址，请检查 API_BASE_URL 配置')
  }

  const protocol = origin.secure ? 'wss:' : 'ws:'
  const path = ticket.websocketPath.startsWith('/')
    ? ticket.websocketPath
    : `/${ticket.websocketPath}`
  return `${protocol}//${origin.host}${path}?ticket=${encodeURIComponent(ticket.ticket)}`
}

function defaultSocketFactory(url: string): VoiceSocketLike {
  // #ifdef H5
  return new WebSocket(url)
  // #endif

  // #ifndef H5
  // App 与小程序端没有全局 WebSocket，改走 uni.connectSocket
  return new UniVoiceSocket(url)
  // #endif
}

export class RealtimeVoiceSocketClient {
  private readonly socketFactory: VoiceSocketFactory
  private readonly ticketProvider: VoiceTicketProvider
  private readonly apiBaseUrl?: string
  private readonly pageOrigin?: string
  private readonly onEvent?: (event: VoiceServerEvent) => void
  private readonly onState?: (state: VoiceSocketState) => void
  private readonly onSocketError?: (error: Error) => void
  private readonly onUnknownEvent?: (raw: unknown) => void
  private socket: VoiceSocketLike | null = null
  private state: VoiceSocketState = 'idle'
  private closeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: VoiceSocketClientOptions = {}) {
    this.socketFactory = options.socketFactory || defaultSocketFactory
    this.ticketProvider = options.ticketProvider || createRealtimeVoiceTicket
    this.apiBaseUrl = options.apiBaseUrl
    this.pageOrigin = options.pageOrigin
    this.onEvent = options.onEvent
    this.onState = options.onState
    this.onSocketError = options.onSocketError
    this.onUnknownEvent = options.onUnknownEvent || (() => {
      console.warn('[realtime-voice] ignored unknown server event')
    })
  }

  get socketState(): VoiceSocketState {
    return this.state
  }

  private setState(state: VoiceSocketState) {
    this.state = state
    this.onState?.(state)
  }

  async connect(options: ConnectVoiceOptions = {}): Promise<VoiceTicket> {
    if (this.state === 'connecting' || this.state === 'open') {
      throw new Error('实时语音连接已经存在')
    }
    this.setState('connecting')
    const ticket = await this.ticketProvider(options)
    const url = buildVoiceWebSocketUrl(ticket, {
      apiBaseUrl: this.apiBaseUrl,
      pageOrigin: this.pageOrigin,
    })
    const socket = this.socketFactory(url)
    this.socket = socket

    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        this.setState('open')
        resolve()
      }
      const handleMessage = (message: MessageEvent | { data?: unknown }) => {
        const parsed = parseVoiceServerEvent(message.data)
        if (parsed) this.onEvent?.(parsed)
        else this.onUnknownEvent?.(message.data)
      }
      const handleError = () => {
        const error = new Error('实时语音 WebSocket 连接失败')
        this.onSocketError?.(error)
        if (this.state === 'connecting') reject(error)
      }
      const handleClose = () => {
        if (this.closeTimer) {
          clearTimeout(this.closeTimer)
          this.closeTimer = null
        }
        if (this.socket === socket) this.socket = null
        this.setState('closed')
      }
      socket.addEventListener('open', handleOpen)
      socket.addEventListener('message', handleMessage)
      socket.addEventListener('error', handleError)
      socket.addEventListener('close', handleClose)
    })

    this.send({
      type: 'session.start',
      eventId: createEventId('start'),
      voice: options.voice,
      resumeSessionId: options.resumeSessionId || null,
      entryMode: options.entryMode || 'general',
    })
    return ticket
  }

  private send(event: VoiceClientEvent): void {
    if (!this.socket || this.socket.readyState !== SOCKET_OPEN) {
      throw new Error('实时语音连接尚未就绪')
    }
    this.socket.send(JSON.stringify(event))
  }

  appendAudio(audio: string): void {
    this.send({
      type: 'audio.append',
      eventId: createEventId('audio'),
      audio,
    })
  }

  commitAudio(): void {
    this.send({
      type: 'audio.commit',
      eventId: createEventId('commit'),
    })
  }

  cancelResponse(): void {
    this.send({
      type: 'response.cancel',
      eventId: createEventId('cancel'),
    })
  }

  resolveConfirmation(
    confirmationId: string,
    decision: ConfirmationDecision,
  ): void {
    this.send({
      type: 'confirmation.resolve',
      eventId: createEventId('confirm'),
      confirmationId,
      decision,
    })
  }

  close(reason = 'user', notifyServer = true): void {
    const socket = this.socket
    if (!socket) return
    if (notifyServer && socket.readyState === SOCKET_OPEN) {
      this.send({
        type: 'session.close',
        eventId: createEventId('close'),
      })
      if (this.closeTimer) clearTimeout(this.closeTimer)
      this.closeTimer = setTimeout(() => {
        socket.close(1000, reason.slice(0, 80))
        if (this.socket === socket) this.socket = null
        this.setState('closed')
      }, 1200)
      return
    }
    socket.close(1000, reason.slice(0, 80))
    this.socket = null
    this.setState('closed')
  }
}
