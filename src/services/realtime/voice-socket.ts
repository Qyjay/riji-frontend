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

export function buildVoiceWebSocketUrl(
  ticket: VoiceTicket,
  options: { apiBaseUrl?: string; pageOrigin?: string } = {},
): string {
  const configuredBase = options.apiBaseUrl ?? API_BASE_URL
  const pageOrigin = options.pageOrigin
    || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1')
  const base = new URL(configuredBase || '/api', pageOrigin)
  const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  const path = ticket.websocketPath.startsWith('/')
    ? ticket.websocketPath
    : `/${ticket.websocketPath}`
  return `${protocol}//${base.host}${path}?ticket=${encodeURIComponent(ticket.ticket)}`
}

function defaultSocketFactory(url: string): VoiceSocketLike {
  return new WebSocket(url)
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
