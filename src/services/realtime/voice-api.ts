import { request } from '@/services/request'

export interface VoiceAudioFormat {
  type: string
  sampleRate: number
  channels: number
  bitsPerSample: number
  recommendedFrameMs?: number
}

export interface VoiceHealth {
  enabled: boolean
  configured: boolean
  provider: string
  activeSessions: number
  maxSessions: number
  metrics: Record<string, number>
}

export interface VoiceTicket {
  ticket: string
  expiresAt: number
  websocketPath: string
  input: VoiceAudioFormat
  output: VoiceAudioFormat
}

export interface CreateVoiceTicketOptions {
  voice?: string
  outputFormat?: 'pcm_s16le'
  clientPlatform?: 'h5' | 'app-android'
}

export function getRealtimeVoiceHealth(): Promise<VoiceHealth> {
  return request<VoiceHealth>({
    url: '/realtime-voice/health',
  })
}

export function createRealtimeVoiceTicket(
  options: CreateVoiceTicketOptions = {},
): Promise<VoiceTicket> {
  return request<VoiceTicket>({
    url: '/realtime-voice/tickets',
    method: 'POST',
    data: {
      voice: options.voice || '',
      output_format: options.outputFormat || 'pcm_s16le',
      client_platform: options.clientPlatform || 'h5',
    },
  })
}
