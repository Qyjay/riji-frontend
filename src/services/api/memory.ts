// ══════════════════════════════════════════════════════════════════
// API — 统一记忆系统
// ══════════════════════════════════════════════════════════════════

import { request } from '../request'

export interface MemoryDocument {
  id: string
  sourceType: string
  sourceId: string
  title: string
  content: string
  summary: string
  visibility: string
  memoryScope: string
  occurredAt: number
  createdAt: number
  updatedAt: number
  tags: string[]
}

export interface MemoryFact {
  id: string
  category: string
  content: string
  subject: string
  predicate: string
  object: string
  confidence: number
  stability: string
  isActive: boolean
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

export interface MemoryFactInput {
  category: string
  content: string
  subject?: string
  predicate?: string
  object?: string
  confidence?: number
  stability?: string
  isPinned?: boolean
}

export interface MemoryExportPayload {
  version: number
  documents: MemoryDocument[]
  facts: MemoryFact[]
  profiles: unknown[]
  avatarCards: unknown[]
  agentActions: unknown[]
}

export async function getMemoryDocuments(params: { sourceType?: string; limit?: number; offset?: number } = {}) {
  const search = new URLSearchParams()
  if (params.sourceType) search.set('sourceType', params.sourceType)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  const suffix = search.toString() ? `?${search}` : ''
  return request<{ items: MemoryDocument[] }>({ url: `/memory/documents${suffix}` })
}

export async function getMemoryFacts(params: { category?: string; activeOnly?: boolean } = {}) {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  if (typeof params.activeOnly === 'boolean') search.set('activeOnly', String(params.activeOnly))
  const suffix = search.toString() ? `?${search}` : ''
  return request<{ items: MemoryFact[] }>({ url: `/memory/facts${suffix}` })
}

export async function createMemoryFact(data: MemoryFactInput) {
  return request<MemoryFact>({ url: '/memory/facts', method: 'POST', data })
}

export async function updateMemoryFact(id: string, fields: Partial<MemoryFactInput> & { isActive?: boolean }) {
  return request<MemoryFact>({ url: `/memory/facts/${id}`, method: 'PUT', data: fields })
}

export async function deleteMemoryFact(id: string) {
  return request<void>({ url: `/memory/facts/${id}`, method: 'DELETE' })
}

export async function exportMemory() {
  return request<MemoryExportPayload>({ url: '/memory/export' })
}

export async function deleteAllMemory() {
  return request<void>({ url: '/memory/all', method: 'DELETE' })
}
