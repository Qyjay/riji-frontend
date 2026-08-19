// ══════════════════════════════════════════════════════════════════
// API — 统一记忆系统
// ══════════════════════════════════════════════════════════════════

import { withQuery } from '@/utils/query'
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
  return request<{ items: MemoryDocument[] }>({
    url: withQuery('/memory/documents', {
      sourceType: params.sourceType,
      limit: params.limit,
      offset: params.offset,
    }),
  })
}

export async function getMemoryFacts(params: { category?: string; activeOnly?: boolean } = {}) {
  return request<{ items: MemoryFact[] }>({
    url: withQuery('/memory/facts', {
      category: params.category,
      activeOnly: typeof params.activeOnly === 'boolean' ? String(params.activeOnly) : undefined,
    }),
  })
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
