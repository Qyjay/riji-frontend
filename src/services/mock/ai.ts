import type { Fortune } from '../api/ai'

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
