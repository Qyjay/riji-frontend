export interface MockChatAttachment {
  type: 'image' | 'file' | 'voice'
  name: string
  url: string
  mimeType?: string
  size?: number
  thumbnailUrl?: string
}

export interface MockChatMessage {
  id: string
  sessionId?: string | null
  clientMessageId?: string | null
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments: MockChatAttachment[]
}

const historySeed: MockChatMessage[] = [
  {
    id: 'mock-user-1',
    sessionId: 'mock-session-1',
    clientMessageId: 'mock-client-1',
    role: 'user',
    content: '最近感觉压力好大，雅思和留学申请同时进行有点喘不过气来',
    timestamp: Date.now() - 3600000 * 8,
    attachments: [],
  },
  {
    id: 'mock-assistant-1',
    sessionId: 'mock-session-1',
    role: 'assistant',
    content: '我理解这种感觉。先把今天最重要的一件事拆出来，我们一起把它做小一点。',
    timestamp: Date.now() - 3600000 * 8 + 30000,
    attachments: [],
  },
]

export function getChatHistory(limit = 20) {
  const items = historySeed.slice(-limit)
  return { items, total: historySeed.length }
}

export function closeSession() {
  return { sessionClosed: true, materialGenerated: false, materialId: null }
}

export function getSessionMessages(sessionId: string) {
  return {
    session: {
      id: sessionId,
      title: '和 AI 聊天',
      summary: '聊了一些日常话题...',
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 3000000,
      messageCount: historySeed.length,
      mood: '平静',
      moodEmoji: '😌',
    },
    messages: historySeed.map((item) => ({
      ...item,
      sessionId,
    })),
  }
}

export async function chat(payload: { message: string; clientMessageId?: string | null; attachments?: MockChatAttachment[] }) {
  const now = Date.now()
  const sessionId = 'mock-session-1'
  const userMessage: MockChatMessage = {
    id: `mock-user-${now}`,
    sessionId,
    clientMessageId: payload.clientMessageId ?? null,
    role: 'user',
    content: payload.message,
    timestamp: now,
    attachments: payload.attachments ?? [],
  }
  const assistantMessage: MockChatMessage = {
    id: `mock-assistant-${now}`,
    sessionId,
    role: 'assistant',
    content: '我收到啦，我们继续聊。',
    timestamp: now + 1200,
    attachments: [],
  }
  historySeed.push(userMessage, assistantMessage)
  return {
    sessionId,
    userMessage,
    assistantMessage,
    materialGenerated: false,
    materialId: null,
  }
}
