import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/material'

export interface RawMaterial {
  id: string
  userId: string
  type: 'image' | 'voice' | 'text'
  content: string
  mediaUrl: string
  thumbnailUrl: string
  location: { lat?: number; lng?: number; address?: string }
  emotion: { label: string; score: number; emoji: string }
  tags: string[]
  date: string  // "2026-03-25"
  createdAt: number
}

export interface PolishRequest {
  style: '文艺' | '幽默' | '简洁' | '温暖'
}

export async function createMaterial(data: {
  type: 'image' | 'voice' | 'text'
  content?: string
  mediaUrl?: string
  date?: string
}): Promise<RawMaterial> {
  if (USE_MOCK) return mock.createMaterial(data)
  return request<RawMaterial>({ url: '/materials', method: 'POST', data })
}

export async function getMaterials(date: string): Promise<RawMaterial[]> {
  if (USE_MOCK) return mock.getMaterials(date)
  return request<RawMaterial[]>({ url: `/materials?date=${date}` })
}

export async function getMaterialDetail(id: string): Promise<RawMaterial> {
  if (USE_MOCK) return mock.getMaterialDetail(id)
  return request<RawMaterial>({ url: `/materials/${id}` })
}

export async function updateMaterial(id: string, data: Partial<RawMaterial>): Promise<RawMaterial> {
  if (USE_MOCK) return mock.updateMaterial(id, data)
  return request<RawMaterial>({ url: `/materials/${id}`, method: 'PUT', data })
}

export async function deleteMaterial(id: string): Promise<void> {
  if (USE_MOCK) return mock.deleteMaterial(id)
  return request<void>({ url: `/materials/${id}`, method: 'DELETE' })
}

export async function extractEmotion(id: string): Promise<{ label: string; score: number; emoji: string }> {
  if (USE_MOCK) return mock.extractEmotion(id)
  return request<{ label: string; score: number; emoji: string }>({ url: `/materials/${id}/emotion`, method: 'POST' })
}

export async function polishText(id: string, style: string): Promise<{ polished: string }> {
  if (USE_MOCK) return mock.polishText(id, style)
  return request<{ polished: string }>({ url: `/materials/${id}/polish`, method: 'POST', data: { style } })
}

export async function uploadVoice(filePath: string): Promise<{ url: string; transcription: string }> {
  if (USE_MOCK) return mock.uploadVoice(filePath)
  return request<{ url: string; transcription: string }>({ url: '/materials/voice', method: 'POST', data: { filePath } })
}
