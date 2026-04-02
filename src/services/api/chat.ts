import { USE_MOCK } from '../config'
import { request } from '../request'

// ===== 类型定义 =====

export interface CloseSessionResult {
  sessionClosed: boolean
  materialGenerated: boolean
  materialId: string | null
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

export interface ChatSessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface SessionMessagesResult {
  session: ChatSessionDetail
  messages: ChatSessionMessage[]
}

// ===== API 函数 =====

/**
 * 关闭当前 open 的对话段（用户离开聊天页时调用）
 */
export async function closeSession(): Promise<CloseSessionResult> {
  if (USE_MOCK) {
    return { sessionClosed: true, materialGenerated: false, materialId: null }
  }
  return request<CloseSessionResult>({ url: '/chat/close-session', method: 'POST' })
}

/**
 * 获取对话段的原始消息列表（素材卡片「展开对话」时调用）
 */
export async function getSessionMessages(sessionId: string): Promise<SessionMessagesResult> {
  if (USE_MOCK) {
    return {
      session: {
        id: sessionId,
        title: '和 AI 聊天',
        summary: '聊了一些日常话题...',
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3000000,
        messageCount: 8,
        mood: '平静',
        moodEmoji: '😌',
      },
      messages: [
        { role: 'user', content: '今天天气真好', timestamp: Date.now() - 3600000 },
        { role: 'assistant', content: '是啊，适合出去走走！', timestamp: Date.now() - 3598000 },
        { role: 'user', content: '我下午想去海河边骑车', timestamp: Date.now() - 3500000 },
        { role: 'assistant', content: '听起来很棒！要注意防晒哦', timestamp: Date.now() - 3498000 },
      ],
    }
  }
  return request<SessionMessagesResult>({ url: `/chat/session/${sessionId}/messages` })
}
