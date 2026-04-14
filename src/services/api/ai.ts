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

export async function textToSpeech(text: string, voice?: string): Promise<string> {
  if (USE_MOCK) return mock.textToSpeech(text, voice)
  return request<string>({ url: '/ai/tts', method: 'POST', data: { text, voice } })
}

export async function generateFortune(): Promise<Fortune> {
  if (USE_MOCK) return mock.generateFortune()
  return request<Fortune>({ url: '/ai/fortune' })
}
