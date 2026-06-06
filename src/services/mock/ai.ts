import type { Fortune, LlmModel, LlmModelListResult, LlmModelPayload } from '../api/ai'

let mockModels: LlmModel[] = [
  {
    id: 'builtin:vivo',
    name: 'VIVO Doubao',
    providerType: 'builtin_vivo',
    baseUrl: 'https://api-ai.vivo.com.cn',
    model: 'Doubao-Seed-2.0-mini',
    isBuiltin: true,
    isEnabled: true,
    hasApiKey: true,
  },
  {
    id: 'builtin:minimax',
    name: 'MiniMax',
    providerType: 'builtin_minimax',
    baseUrl: 'https://api.minimaxi.com',
    model: 'MiniMax-M2.7-highspeed',
    isBuiltin: true,
    isEnabled: true,
    hasApiKey: true,
  },
  {
    id: 'builtin:ark:deepseekv4-flash',
    name: 'DeepSeek V4 Flash',
    providerType: 'builtin_ark',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'ep-20260603141535-z2l7c',
    isBuiltin: true,
    isEnabled: true,
    hasApiKey: true,
  },
  {
    id: 'builtin:ark:deepseekv4-pro',
    name: 'DeepSeek V4 Pro',
    providerType: 'builtin_ark',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'ep-20260528104127-tn2f7',
    isBuiltin: true,
    isEnabled: true,
    hasApiKey: true,
  },
]

export function textToSpeech(_text: string, _voice?: string): string {
  return 'https://example.com/tts/mock-audio.mp3'
}

export function generateFortune(): Fortune {
  return {
    overall: 4,
    study: 4,
    social: 5,
    health: 3,
    tip: '今天适合去图书馆认真学习，下午有意外惊喜',
    luckyColor: '暖橙色',
    luckyNumber: 7,
  }
}

export function getLlmModels(): LlmModelListResult {
  return {
    items: mockModels,
    defaultChatModelId: 'builtin:vivo',
  }
}

export function createLlmModel(payload: LlmModelPayload): LlmModel {
  const item: LlmModel = {
    id: `mock-model-${Date.now()}`,
    name: payload.name,
    providerType: payload.providerType,
    baseUrl: payload.baseUrl,
    model: payload.model,
    isBuiltin: false,
    isEnabled: true,
    hasApiKey: Boolean(payload.apiKey),
  }
  mockModels = [item, ...mockModels]
  return item
}

export function updateLlmModel(id: string, payload: Partial<LlmModelPayload>): LlmModel {
  const index = mockModels.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('模型不存在')
  const current = mockModels[index]
  const next: LlmModel = {
    ...current,
    name: payload.name ?? current.name,
    providerType: payload.providerType ?? current.providerType,
    baseUrl: payload.baseUrl ?? current.baseUrl,
    model: payload.model ?? current.model,
    hasApiKey: payload.apiKey ? true : current.hasApiKey,
  }
  mockModels.splice(index, 1, next)
  return next
}

export function deleteLlmModel(id: string): void {
  mockModels = mockModels.filter((item) => item.id !== id || item.isBuiltin)
}
