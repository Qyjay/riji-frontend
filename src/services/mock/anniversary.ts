import type { Anniversary, TodayAnniversary } from '../api/anniversary'

const mockAnniversaries: Anniversary[] = [
  {
    id: 'ann1',
    userId: 'user1',
    title: '和小红认识纪念日',
    date: '03-25',
    year: 2024,
    source: 'ai_extracted',
    relatedPerson: '小红',
    diaryId: '3',
    createdAt: Date.now() - 86400000 * 365,
  },
  {
    id: 'ann2',
    userId: 'user1',
    title: '妈妈生日',
    date: '06-15',
    source: 'manual',
    relatedPerson: '妈妈',
    createdAt: Date.now() - 86400000 * 200,
  },
  {
    id: 'ann3',
    userId: 'user1',
    title: '雅思7.0出分纪念日',
    date: '03-15',
    year: 2025,
    source: 'ai_extracted',
    relatedPerson: '',
    diaryId: '9',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'ann4',
    userId: 'user1',
    title: '爸爸生日',
    date: '09-08',
    source: 'manual',
    relatedPerson: '爸爸',
    createdAt: Date.now() - 86400000 * 180,
  },
  {
    id: 'ann5',
    userId: 'user1',
    title: '开始写日记纪念日',
    date: '01-01',
    year: 2025,
    source: 'ai_extracted',
    relatedPerson: '',
    createdAt: Date.now() - 86400000 * 83,
  },
]

export function getAnniversaries(): Anniversary[] {
  return mockAnniversaries
}

export function createAnniversary(data: Partial<Anniversary>): Anniversary {
  const newAnn: Anniversary = {
    id: `ann${Date.now()}`,
    userId: 'user1',
    title: data.title ?? '新纪念日',
    date: data.date ?? '01-01',
    year: data.year,
    source: data.source ?? 'manual',
    relatedPerson: data.relatedPerson ?? '',
    diaryId: data.diaryId,
    createdAt: Date.now(),
  }
  mockAnniversaries.push(newAnn)
  return newAnn
}

export function updateAnniversary(id: string, data: Partial<Anniversary>): Anniversary {
  const idx = mockAnniversaries.findIndex(a => a.id === id)
  if (idx >= 0) {
    mockAnniversaries[idx] = { ...mockAnniversaries[idx], ...data }
    return mockAnniversaries[idx]
  }
  return { ...mockAnniversaries[0], ...data }
}

export function deleteAnniversary(_id: string): void {
  // mock: no-op
}

export function getTodayAnniversaries(): TodayAnniversary {
  const today = new Date()
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayAnniversaries = mockAnniversaries.filter(a => a.date === todayStr)

  return {
    anniversaries: todayAnniversaries,
    thisDateInHistory: [
      {
        yearsAgo: 1,
        diary: {
          id: '3',
          title: '和室友去天大吃火锅',
          content: '和室友去天大了！第一次在校外吃火锅，聊了好多关于未来的规划。虽然有点小争执，但总体是很棒的一天。',
          date: '2025-03-25',
          emotion: { label: '幸福', score: 88, emoji: '🥰' },
        },
      },
      {
        yearsAgo: 2,
        diary: {
          id: 'hist1',
          title: '第一次参加社团活动',
          content: '今天参加了文学社的第一次活动，认识了很多志同道合的朋友，感觉大学生活开始变得丰富多彩了。',
          date: '2024-03-25',
          emotion: { label: '开心', score: 82, emoji: '😊' },
        },
      },
    ],
  }
}
