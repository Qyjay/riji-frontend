import type { RawMaterial } from '../api/material'

const now = Date.now()
const day = 86400000

const mockMaterials: RawMaterial[] = [
  {
    id: 'mat1',
    userId: 'user1',
    type: 'text',
    content: '今天在食堂吃到了超好吃的红烧肉，幸福感爆棚！肥而不腻，入口即化，感觉整个人都被治愈了。',
    mediaUrl: '',
    thumbnailUrl: '',
    location: { address: '南开大学东食堂' },
    emotion: { label: '开心', score: 0.88, emoji: '😊' },
    tags: ['美食', '幸福'],
    date: '2026-03-25',
    createdAt: now - 3600000,
  },
  {
    id: 'mat2',
    userId: 'user1',
    type: 'image',
    content: '图书馆阅览室的窗外，夕阳把天空染成橙红色，好美。',
    mediaUrl: 'https://picsum.photos/seed/mat2/800/600',
    thumbnailUrl: 'https://picsum.photos/seed/mat2/400/300',
    location: { address: '南开大学图书馆五楼' },
    emotion: { label: '平静', score: 0.72, emoji: '😌' },
    tags: ['风景', '学习'],
    date: '2026-03-25',
    createdAt: now - 7200000,
  },
  {
    id: 'mat3',
    userId: 'user1',
    type: 'voice',
    content: '今天终于把那道卡了我三天的算法题做出来了，开心到想哭，感觉自己还是可以的。',
    mediaUrl: 'https://example.com/voice/mat3.mp3',
    thumbnailUrl: '',
    location: { address: '宿舍' },
    emotion: { label: '激动', score: 0.91, emoji: '🎉' },
    tags: ['学习', '成就'],
    date: '2026-03-24',
    createdAt: now - day - 1800000,
  },
  {
    id: 'mat4',
    userId: 'user1',
    type: 'image',
    content: '和室友去了天大旁边新开的甜品店，芒果班戟超大一个。',
    mediaUrl: 'https://picsum.photos/seed/mat4/800/600',
    thumbnailUrl: 'https://picsum.photos/seed/mat4/400/300',
    location: { address: '天津大学旁甜品店', lat: 39.1082, lng: 117.1593 },
    emotion: { label: '幸福', score: 0.85, emoji: '🥰' },
    tags: ['美食', '社交'],
    date: '2026-03-24',
    createdAt: now - day - 3600000,
  },
]

export function createMaterial(data: {
  type: 'image' | 'voice' | 'text'
  content?: string
  mediaUrl?: string
  date?: string
}): RawMaterial {
  const newMaterial: RawMaterial = {
    id: `mat${Date.now()}`,
    userId: 'user1',
    type: data.type,
    content: data.content ?? '',
    mediaUrl: data.mediaUrl ?? '',
    thumbnailUrl: data.mediaUrl ? `${data.mediaUrl}?thumb=1` : '',
    location: {},
    emotion: { label: '平静', score: 0.5, emoji: '😐' },
    tags: [],
    date: data.date ?? new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  }
  mockMaterials.unshift(newMaterial)
  return newMaterial
}

export function getMaterials(date: string): RawMaterial[] {
  return mockMaterials.filter(m => m.date === date)
}

export function getMaterialDetail(id: string): RawMaterial {
  return mockMaterials.find(m => m.id === id) ?? mockMaterials[0]
}

export function updateMaterial(id: string, data: Partial<RawMaterial>): RawMaterial {
  const idx = mockMaterials.findIndex(m => m.id === id)
  if (idx >= 0) {
    mockMaterials[idx] = { ...mockMaterials[idx], ...data }
    return mockMaterials[idx]
  }
  return { ...mockMaterials[0], ...data }
}

export function deleteMaterial(_id: string): void {
  // mock: no-op
}

export function extractEmotion(_id: string): { label: string; score: number; emoji: string } {
  const emotions = [
    { label: '开心', score: 0.85, emoji: '😊' },
    { label: '幸福', score: 0.92, emoji: '🥰' },
    { label: '平静', score: 0.65, emoji: '😌' },
    { label: '激动', score: 0.78, emoji: '🎉' },
    { label: '感动', score: 0.82, emoji: '🥹' },
  ]
  return emotions[Math.floor(Math.random() * emotions.length)]
}

export function polishText(id: string, style: string): { polished: string } {
  const material = getMaterialDetail(id)
  const original = material.content

  const styleMap: Record<string, string> = {
    '文艺': `窗外的阳光柔柔地洒下来，${original}那一刻，时间仿佛停驻在了这温柔的瞬间。`,
    '幽默': `话说今天发生了一件大事！${original}（配合惊讶表情）这波操作，我自己都没想到！`,
    '简洁': original.length > 30 ? original.slice(0, 30) + '。' : original,
    '温暖': `生活里总有些小确幸让人心头一暖。${original}感恩今天，感恩遇见。`,
  }
  return { polished: styleMap[style] ?? original }
}

export function uploadVoice(_filePath: string): { url: string; transcription: string } {
  return {
    url: 'https://example.com/voice/mock-upload.mp3',
    transcription: '今天感觉心情还不错，阳光很好，图书馆的位子也抢到了，运气不错。',
  }
}
