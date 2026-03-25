import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/ai'

export interface Fortune {
  overall: number
  study: number
  social: number
  health: number
  tip: string
  luckyColor: string
  luckyNumber: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export async function chat(message: string): Promise<string> {
  if (USE_MOCK) return mock.chat(message)
  return request<string>({ url: '/chat', method: 'POST', data: { message } })
}

export async function getChatHistory(page = 1, pageSize = 20): Promise<{ list: ChatMessage[]; total: number }> {
  if (USE_MOCK) return mock.getChatHistory(page, pageSize)
  const res = await request<{ items: any[]; total: number }>({ url: `/chat/history?limit=${pageSize}` })
  return { list: res.items || [], total: res.total || 0 }
}

export async function textToSpeech(text: string, voice?: string): Promise<string> {
  if (USE_MOCK) return mock.textToSpeech(text, voice)
  return request<string>({ url: '/ai/tts', method: 'POST', data: { text, voice } })
}

export async function generateFortune(): Promise<Fortune> {
  if (USE_MOCK) return mock.generateFortune()
  return request<Fortune>({ url: '/ai/fortune' })
}
