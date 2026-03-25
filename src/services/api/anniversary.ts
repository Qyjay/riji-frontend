import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/anniversary'

export interface Anniversary {
  id: string
  userId: string
  title: string
  date: string  // "03-25" (月-日)
  year?: number
  source: 'manual' | 'ai_extracted'
  relatedPerson: string
  diaryId?: string
  createdAt: number
}

export interface TodayAnniversary {
  anniversaries: Anniversary[]
  thisDateInHistory: Array<{ diary: any; yearsAgo: number }>
}

export async function getAnniversaries(): Promise<Anniversary[]> {
  if (USE_MOCK) return mock.getAnniversaries()
  return request<Anniversary[]>({ url: '/anniversaries' })
}

export async function createAnniversary(data: Partial<Anniversary>): Promise<Anniversary> {
  if (USE_MOCK) return mock.createAnniversary(data)
  return request<Anniversary>({ url: '/anniversaries', method: 'POST', data })
}

export async function updateAnniversary(id: string, data: Partial<Anniversary>): Promise<Anniversary> {
  if (USE_MOCK) return mock.updateAnniversary(id, data)
  return request<Anniversary>({ url: `/anniversaries/${id}`, method: 'PUT', data })
}

export async function deleteAnniversary(id: string): Promise<void> {
  if (USE_MOCK) return mock.deleteAnniversary(id)
  return request<void>({ url: `/anniversaries/${id}`, method: 'DELETE' })
}

export async function getTodayAnniversaries(): Promise<TodayAnniversary> {
  if (USE_MOCK) return mock.getTodayAnniversaries()
  const res = await request<{ today: any[]; on_this_day: any[] }>({ url: '/anniversaries/today' })
  return {
    anniversaries: res.today || [],
    thisDateInHistory: (res.on_this_day || []).map((d: any) => ({ diary: d, yearsAgo: 0 })),
  }
}
