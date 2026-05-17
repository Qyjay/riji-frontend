import { API_BASE_URL, USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/diary'

export interface EmotionTrendPoint {
  hour: number
  minute?: number
  time?: string
  label: string
  score: number
}

export interface Diary {
  id: string
  title: string
  content: string
  date: string  // "2026-03-25"
  weather: string
  specialDate: string
  aiComment?: string
  emotionSummary: {
    dominant: string
    trend: EmotionTrendPoint[]
  }
  materialIds: string[]
  style: string
  editCount: number
  maxEdits: number
  status: 'draft' | 'published'
  createdAt: number
  updatedAt: number
  // legacy fields (backward compat with existing pages)
  emotion: { emoji: string; label: string; score: number }
  images: string[]
  tags: string[]
  location: string
  hasComic: boolean
  hasBGM: boolean
}

export interface DiaryDerivative {
  id: string
  diaryId: string
  type: 'comic' | 'novel' | 'share_card'
  content: string
  mediaUrl: string
  shareScope: 'private' | 'friends' | 'public'
  createdAt: number
}

export type DiaryAiCommentStreamEvent =
  | { type: 'start' }
  | { type: 'chunk'; text: string }
  | { type: 'done'; aiComment: string }
  | { type: 'error'; message: string }

export async function generateDiary(date: string, weather?: string): Promise<Diary> {
  if (USE_MOCK) return mock.generateDiary(date, weather)
  return request<Diary>({ url: '/diaries/generate', method: 'POST', data: { date, weather }, timeout: 60000 })
}

export async function getDiaries(page = 1, pageSize = 10): Promise<{ list: Diary[]; total: number }> {
  if (USE_MOCK) return mock.getDiaries(page, pageSize)
  const res = await request<{ items: Diary[]; total: number }>({ url: `/diaries?page=${page}&page_size=${pageSize}` })
  return { list: res.items || [], total: res.total || 0 }
}

export async function getDiaryDetail(id: string): Promise<Diary> {
  if (USE_MOCK) return mock.getDiaryDetail(id)
  return request<Diary>({ url: `/diaries/${id}` })
}

export async function generateDiaryAiComment(id: string): Promise<{ aiComment: string }> {
  if (USE_MOCK) return { aiComment: '' }
  return request<{ aiComment: string }>({ url: `/diaries/${id}/ai-comment`, method: 'POST', timeout: 60000 })
}

export async function streamDiaryAiComment(
  id: string,
  handlers: {
    onEvent?: (event: DiaryAiCommentStreamEvent) => void
    onChunk?: (text: string) => void
    onDone?: (aiComment: string) => void
    onError?: (error: Error) => void
  } = {},
): Promise<void> {
  if (USE_MOCK) {
    for (const text of ['我', '正在', '认真读这篇日记，', '也看见了你今天的努力。']) {
      handlers.onChunk?.(text)
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    handlers.onDone?.('我正在认真读这篇日记，也看见了你今天的努力。')
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

    const emitEvent = (event: DiaryAiCommentStreamEvent) => {
      handlers.onEvent?.(event)
      if (event.type === 'chunk') handlers.onChunk?.(event.text)
      if (event.type === 'done') {
        handlers.onDone?.(event.aiComment)
        if (!settled) {
          settled = true
          resolve()
        }
      }
      if (event.type === 'error') finishWithError(new Error(event.message || 'AI 点评生成失败'))
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
        try {
          emitEvent(JSON.parse(dataLines.join('\n')) as DiaryAiCommentStreamEvent)
        } catch {
          // 等待后续分片补齐
        }
      })
    }

    xhr.open('POST', `${API_BASE_URL}/diaries/${id}/ai-comment/stream`, true)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'text'

    xhr.onprogress = processBuffer
    xhr.onload = () => {
      processBuffer()
      if (settled) return
      if (xhr.status >= 400) {
        finishWithError(new Error(`HTTP ${xhr.status}`))
        return
      }
      settled = true
      resolve()
    }
    xhr.onerror = () => {
      if (timedOut) return
      finishWithError(new Error('网络请求失败'))
    }
    xhr.send()

    setTimeout(() => {
      if (settled || xhr.readyState === 4) return
      timedOut = true
      xhr.abort()
      finishWithError(new Error('请求超时'))
    }, 90000)
  })
}

export async function updateDiary(id: string, content: string): Promise<Diary> {
  if (USE_MOCK) return mock.updateDiary(id, content)
  return request<Diary>({ url: `/diaries/${id}`, method: 'PUT', data: { content } })
}

export async function deleteDiary(id: string): Promise<void> {
  if (USE_MOCK) return
  return request<void>({ url: `/diaries/${id}`, method: 'DELETE' })
}

export async function getEmotionTrend(id: string): Promise<{ dominant: string; trend: EmotionTrendPoint[] }> {
  if (USE_MOCK) return mock.getEmotionTrend(id)
  return request<{ dominant: string; trend: EmotionTrendPoint[] }>({ url: `/diaries/${id}/emotion-trend` })
}

export async function extractInfo(id: string): Promise<{ anniversaries: any[]; relations: any[]; preferences: any[] }> {
  if (USE_MOCK) return mock.extractInfo(id)
  return request<{ anniversaries: any[]; relations: any[]; preferences: any[] }>({ url: `/diaries/${id}/extract`, method: 'POST' })
}

export async function generateDerivative(id: string, type: 'comic' | 'novel' | 'share_card'): Promise<DiaryDerivative> {
  if (USE_MOCK) return mock.generateDerivative(id, type)
  return request<DiaryDerivative>({
    url: `/diaries/${id}/derivative`,
    method: 'POST',
    data: { type },
    timeout: 120000,
  })
}

export async function getDerivatives(diaryId?: string): Promise<DiaryDerivative[]> {
  if (USE_MOCK) return mock.getDerivatives(diaryId)
  const url = diaryId ? `/derivatives?diary_id=${diaryId}` : '/derivatives'
  return request<DiaryDerivative[]>({ url })
}

export async function setDerivativeShare(id: string, scope: string): Promise<void> {
  if (USE_MOCK) return mock.setDerivativeShare(id, scope)
  return request<void>({ url: `/derivatives/${id}/share`, method: 'POST', data: { scope } })
}

export interface TodaySummary {
  date: string
  material_count: number
  materials: Array<{ id: string; type: string; content: string; createdAt: number; emotion?: { label: string; emoji: string; score: number } }>
  has_diary: boolean
  diary_id: string | null
  diary_status: string | null
  greeting_user_name?: string
  diary_count?: number
  dominant_emotion?: string
}

export async function getTodaySummary(date: string): Promise<TodaySummary> {
  if (USE_MOCK) return mock.getTodaySummary(date)
  return request<TodaySummary>({ url: `/diaries/today-summary?date=${date}` })
}

export interface SearchQuery {
  keyword?: string
  dateRange?: [string, string]
  emotions?: string[]
  tags?: string[]
  weathers?: string[]
}

export async function searchDiaries(query: SearchQuery): Promise<Diary[]> {
  if (USE_MOCK) return mock.searchDiaries(query)

  const params: string[] = []
  const push = (key: string, value?: string) => {
    const v = (value ?? '').trim()
    if (!v) return
    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
  }

  push('q', query.keyword)

  if (query.dateRange) {
    push('from', query.dateRange[0])
    push('to', query.dateRange[1])
  }

  if (query.emotions && query.emotions.length > 0) {
    push('emotion', query.emotions.join(','))
  }

  if (query.tags && query.tags.length > 0) {
    push('tag', query.tags.join(','))
  }

  if (query.weathers && query.weathers.length > 0) {
    push('weather', query.weathers.join(','))
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : ''
  const res = await request<{ items: Diary[] }>({
    url: `/diaries/search${queryString}`,
    method: 'GET',
  })
  return res.items || []
}
