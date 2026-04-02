import type { CloseSessionResult, SessionMessagesResult } from '../api/chat'

export function closeSession(): CloseSessionResult {
  return { sessionClosed: true, materialGenerated: false, materialId: null }
}

export function getSessionMessages(sessionId: string): SessionMessagesResult {
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
