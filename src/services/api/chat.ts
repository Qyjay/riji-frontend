import { API_BASE_URL, USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/chat'

export interface ChatAttachment {
  type: 'image' | 'file' | 'voice' | 'web'
  name: string
  url: string
  mimeType?: string
  size?: number
  thumbnailUrl?: string
  snippet?: string
  domain?: string
  publishedAt?: string
  source?: string
}

export interface ChatMessage {
  id: string
  sessionId?: string | null
  clientMessageId?: string | null
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments: ChatAttachment[]
}

export interface ChatSessionDetail {
  id: string
  title: string
  summary: string
  startTime: number
  endTime: number | null
  messageCount: number
  mood: string
  moodEmoji: string
}

export interface ChatHistoryResult {
  items: ChatMessage[]
  total: number
}

export type ChatSessionMessage = ChatMessage

export interface SessionMessagesResult {
  session: ChatSessionDetail
  messages: ChatSessionMessage[]
}

export interface CloseSessionResult {
  sessionClosed: boolean
  materialGenerated: boolean
  materialId: string | null
}

export interface ChatSendPayload {
  message: string
  clientMessageId?: string | null
  useWebSearch?: boolean
  attachments?: ChatAttachment[]
}

export interface ChatSendResult {
  sessionId: string
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  materialGenerated: boolean
  materialId: string | null
}

export interface UploadChatFileResult {
  url: string
  name: string
  size: number
  mimeType: string
}

export type ChatStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'ack'; clientMessageId?: string | null; message: ChatMessage }
  | { type: 'web_search'; results: ChatAttachment[] }
  | { type: 'chunk'; text: string }
  | { type: 'done'; message: ChatMessage }
  | { type: 'error'; message: string }

function normalizeMessage(message: Partial<ChatMessage>): ChatMessage {
  return {
    id: message.id || `msg-${Date.now()}`,
    sessionId: message.sessionId ?? null,
    clientMessageId: message.clientMessageId ?? null,
    role: (message.role as 'user' | 'assistant') || 'assistant',
    content: message.content || '',
    timestamp: message.timestamp || Date.now(),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }
}

async function uploadFromBrowser(file: File, endpoint: string): Promise<any> {
  const token = uni.getStorageSync('token')
  const formData = new FormData()
  formData.append('file', file, file.name)
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const payload = await response.json()
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || `HTTP ${response.status}`)
  }
  return payload.data
}

async function uploadFromPath(filePath: string, endpoint: string): Promise<any> {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${endpoint}`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const payload = JSON.parse(res.data)
          if (payload.code === 0) {
            resolve(payload.data)
          } else {
            reject(new Error(payload.message || '上传失败'))
          }
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail: () => reject(new Error('上传失败')),
    })
  })
}

export async function uploadChatFile(file: string | File): Promise<UploadChatFileResult> {
  if (typeof File !== 'undefined' && file instanceof File) {
    return uploadFromBrowser(file, '/upload/chat-file')
  }
  return uploadFromPath(file as string, '/upload/chat-file')
}

export async function getChatHistory(limit = 50): Promise<ChatHistoryResult> {
  if (USE_MOCK) {
    return mock.getChatHistory(limit)
  }
  const result = await request<ChatHistoryResult>({ url: `/chat/history?limit=${limit}` })
  return {
    items: (result.items || []).map(normalizeMessage),
    total: result.total || 0,
  }
}

export async function sendChat(payload: ChatSendPayload): Promise<ChatSendResult> {
  if (USE_MOCK) {
    const result = await mock.chat(payload)
    return {
      sessionId: result.sessionId,
      userMessage: normalizeMessage(result.userMessage),
      assistantMessage: normalizeMessage(result.assistantMessage),
      materialGenerated: result.materialGenerated,
      materialId: result.materialId,
    }
  }
  const result = await request<ChatSendResult>({ url: '/chat', method: 'POST', data: payload })
  return {
    sessionId: result.sessionId,
    userMessage: normalizeMessage(result.userMessage),
    assistantMessage: normalizeMessage(result.assistantMessage),
    materialGenerated: result.materialGenerated,
    materialId: result.materialId,
  }
}

export async function closeSession(): Promise<CloseSessionResult> {
  if (USE_MOCK) {
    return mock.closeSession()
  }
  return request<CloseSessionResult>({ url: '/chat/close-session', method: 'POST' })
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessagesResult> {
  if (USE_MOCK) {
    return mock.getSessionMessages(sessionId)
  }
  const result = await request<SessionMessagesResult>({ url: `/chat/session/${sessionId}/messages` })
  return {
    session: result.session,
    messages: (result.messages || []).map(normalizeMessage),
  }
}

export async function chatStream(
  payload: ChatSendPayload,
  handlers: {
    onEvent?: (event: ChatStreamEvent) => void
    onSession?: (sessionId: string) => void
    onAck?: (message: ChatMessage, clientMessageId?: string | null) => void
    onChunk?: (text: string) => void
    onDone?: (message: ChatMessage) => void
    onError?: (error: Error) => void
  } = {},
): Promise<void> {
  if (USE_MOCK) {
    const now = Date.now()
    const sessionId = 'mock-session-stream'
    const ackMessage = normalizeMessage({
      id: `mock-user-${now}`,
      sessionId,
      clientMessageId: payload.clientMessageId ?? null,
      role: 'user',
      content: payload.message,
      timestamp: now,
      attachments: payload.attachments || [],
    })
    const doneMessage = normalizeMessage({
      id: `mock-assistant-${now}`,
      sessionId,
      role: 'assistant',
      content: '我收到啦，我们继续聊。',
      timestamp: now + 1000,
      attachments: [],
    })
    handlers.onEvent?.({ type: 'session', sessionId })
    handlers.onSession?.(sessionId)
    handlers.onEvent?.({ type: 'ack', clientMessageId: payload.clientMessageId ?? null, message: ackMessage })
    handlers.onAck?.(ackMessage, payload.clientMessageId ?? null)
    for (const text of ['我', '收到', '啦', '，', '我们继续聊。']) {
      handlers.onEvent?.({ type: 'chunk', text })
      handlers.onChunk?.(text)
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    handlers.onEvent?.({ type: 'done', message: doneMessage })
    handlers.onDone?.(doneMessage)
    return
  }

  const token = uni.getStorageSync('token')
  if (!token) {
    const error = new Error('未登录，请先登录')
    handlers.onError?.(error)
    throw error
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let consumedLength = 0
    let buffer = ''
    let settled = false
    let timedOut = false

    const finishWithError = (error: Error) => {
      if (settled) return
      settled = true
      handlers.onError?.(error)
      reject(error)
    }

    const emitEvent = (event: ChatStreamEvent) => {
      handlers.onEvent?.(event)
      if (event.type === 'session') handlers.onSession?.(event.sessionId)
      if (event.type === 'ack') handlers.onAck?.(normalizeMessage(event.message), event.clientMessageId)
      if (event.type === 'chunk') handlers.onChunk?.(event.text)
      if (event.type === 'done') handlers.onDone?.(normalizeMessage(event.message))
      if (event.type === 'error') finishWithError(new Error(event.message || '流式响应失败'))
    }

    const processBuffer = () => {
      const incoming = xhr.responseText.slice(consumedLength)
      consumedLength = xhr.responseText.length
      buffer += incoming

      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      blocks.forEach((block) => {
        const dataLines = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())

        if (!dataLines.length) return
        const raw = dataLines.join('\n')
        try {
          const event = JSON.parse(raw) as ChatStreamEvent
          emitEvent(event)
        } catch {
          // 忽略不完整分片，等待下个 onprogress
        }
      })
    }

    xhr.open('POST', `${API_BASE_URL}/chat/stream`, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'text'

    xhr.onprogress = () => {
      processBuffer()
    }

    xhr.onload = () => {
      processBuffer()
      if (settled) return
      if (xhr.status >= 400) {
        finishWithError(new Error(`HTTP ${xhr.status}`))
        return
      }
      if (buffer.trim()) {
        try {
          const raw = buffer
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n')
          if (raw) {
            emitEvent(JSON.parse(raw) as ChatStreamEvent)
          }
        } catch {
          // ignore trailing partial block
        }
      }
      if (!settled) {
        settled = true
        resolve()
      }
    }

    xhr.onerror = () => {
      if (timedOut) return
      finishWithError(new Error('网络请求失败'))
    }

    xhr.send(JSON.stringify(payload))

    setTimeout(() => {
      if (settled || xhr.readyState === 4) return
      timedOut = true
      xhr.abort()
      finishWithError(new Error('请求超时'))
    }, 90000)
  })
}
