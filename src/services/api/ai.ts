import { USE_MOCK, API_BASE_URL } from '../config'
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

/** SSE 流式对话，使用 XMLHttpRequest + onprogress，支持 H5 和 Android */
export async function chatStream(
  message: string,
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (err: Error) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    if (!token) {
      onError?.(new Error('未登录，请先登录'))
      reject(new Error('未登录'))
      return
    }

    const fullUrl = `${API_BASE_URL}/chat/stream`
    let lastLen = 0

    const xhr = new XMLHttpRequest()
    xhr.open('POST', fullUrl, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'text'
    xhr.withCredentials = false

    // 生成请求 ID，用于区分是否是最新请求
    const requestId = Date.now().toString()
    console.log(`[chatStream] 请求 ${requestId} 开始:`, message.substring(0, 50))

    xhr.onprogress = () => {
      const text = xhr.responseText || ''
      if (text.length > lastLen) {
        // 提取自上次位置之后的所有 SSE data 行
        const newChunk = text.slice(lastLen)
        lastLen = text.length

        // 解析 SSE：格式 data: {"type": "chunk", "text": "..."}\n\n
        const lines = newChunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') {
                onChunk(data.text)
              } else if (data.type === 'done') {
                console.log(`[chatStream] 请求 ${requestId} 完成`)
              } else if (data.type === 'error') {
                onError?.(new Error(data.message))
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    }

    xhr.onload = () => {
      console.log(`[chatStream] 请求 ${requestId} onload, status:`, xhr.status)
      if (xhr.status >= 400) {
        onError?.(new Error(`HTTP ${xhr.status}`))
      }
      onDone?.()
      resolve('')
    }

    xhr.onerror = () => {
      console.log(`[chatStream] 请求 ${requestId} onerror`)
      onError?.(new Error('网络请求失败'))
      reject(new Error('网络请求失败'))
    }

    xhr.send(JSON.stringify({ message }))

    // 超时处理（60秒）
    setTimeout(() => {
      if (xhr.readyState > 0 && xhr.readyState < 4) {
        xhr.abort()
        onError?.(new Error('请求超时'))
        reject(new Error('请求超时'))
      }
    }, 60000)
  })
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
