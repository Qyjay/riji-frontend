import { API_BASE_URL, USE_MOCK } from '../config'
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

export interface SpeechToTextResult {
  text: string
  transcription: string
  segments?: Array<{ text: string; isLast?: boolean; reformation?: number }>
}

export async function speechToText(filePath: string): Promise<SpeechToTextResult> {
  if (USE_MOCK) {
    return {
      text: '今天感觉心情还不错，阳光很好，图书馆的位子也抢到了，运气不错。',
      transcription: '今天感觉心情还不错，阳光很好，图书馆的位子也抢到了，运气不错。',
      segments: [],
    }
  }

  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    uni.uploadFile({
      url: `${API_BASE_URL}/ai/asr`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const parsed = JSON.parse(res.data)
          if (parsed.code !== 0) {
            reject(new Error(parsed.message || '语音转写失败'))
            return
          }
          const data = parsed.data || {}
          const text = String(data.text || data.transcription || '').trim()
          resolve({
            ...data,
            text,
            transcription: text,
          })
        } catch {
          reject(new Error('解析语音转写响应失败'))
        }
      },
      fail: (error) => reject(new Error(error.errMsg || '语音转写失败')),
    })
  })
}

export async function speechToTextFile(file: File): Promise<SpeechToTextResult> {
  if (USE_MOCK) {
    return {
      text: '今天感觉心情还不错，阳光很好，图书馆的位子也抢到了，运气不错。',
      transcription: '今天感觉心情还不错，阳光很好，图书馆的位子也抢到了，运气不错。',
      segments: [],
    }
  }

  const token = uni.getStorageSync('token')
  const formData = new FormData()
  formData.append('file', file, file.name)
  const response = await fetch(`${API_BASE_URL}/ai/asr`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const parsed = await response.json()
  if (!response.ok || parsed.code !== 0) {
    throw new Error(parsed.message || `HTTP ${response.status}`)
  }
  const data = parsed.data || {}
  const text = String(data.text || data.transcription || '').trim()
  return {
    ...data,
    text,
    transcription: text,
  }
}

export async function generateFortune(): Promise<Fortune> {
  if (USE_MOCK) return mock.generateFortune()
  return request<Fortune>({ url: '/ai/fortune' })
}
