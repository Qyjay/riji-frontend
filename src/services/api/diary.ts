import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/diary'

export interface Diary {
  id: string
  title: string
  content: string
  date: string  // "2026-03-25"
  weather: string
  specialDate: string
  emotionSummary: {
    dominant: string
    trend: Array<{ hour: number; label: string; score: number }>
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

export async function generateDiary(date: string, weather?: string): Promise<Diary> {
  if (USE_MOCK) return mock.generateDiary(date, weather)
  return request<Diary>({ url: '/diaries/generate', method: 'POST', data: { date, weather } })
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

export async function updateDiary(id: string, content: string): Promise<Diary> {
  if (USE_MOCK) return mock.updateDiary(id, content)
  return request<Diary>({ url: `/diaries/${id}`, method: 'PUT', data: { content } })
}

export async function getEmotionTrend(id: string): Promise<{ dominant: string; trend: Array<{ hour: number; label: string; score: number }> }> {
  if (USE_MOCK) return mock.getEmotionTrend(id)
  return request<{ dominant: string; trend: Array<{ hour: number; label: string; score: number }> }>({ url: `/diaries/${id}/emotion-trend` })
}

export async function extractInfo(id: string): Promise<{ anniversaries: any[]; relations: any[]; preferences: any[] }> {
  if (USE_MOCK) return mock.extractInfo(id)
  return request<{ anniversaries: any[]; relations: any[]; preferences: any[] }>({ url: `/diaries/${id}/extract`, method: 'POST' })
}

export async function generateDerivative(id: string, type: 'comic' | 'novel' | 'share_card'): Promise<DiaryDerivative> {
  if (USE_MOCK) return mock.generateDerivative(id, type)
  return request<DiaryDerivative>({ url: `/diaries/${id}/derivative`, method: 'POST', data: { type } })
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
}

export async function getTodaySummary(date: string): Promise<TodaySummary> {
  if (USE_MOCK) return mock.getTodaySummary(date)
  return request<TodaySummary>({ url: `/diaries/today-summary?date=${date}` })
}
