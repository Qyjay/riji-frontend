// ══════════════════════════════════════════════════════════════════
// Mock — AI 分身记忆 / 状态 / 侧写
// ══════════════════════════════════════════════════════════════════

import type { AvatarMemory, AvatarStatus, AvatarProfile } from '../api/avatar'

const now = Date.now()
const day = 86400000

// ── 分身记忆 ──────────────────────────────────────────────────────

export const mockMemories: AvatarMemory[] = [
  // 基本事实
  { id: 'mem1', category: 'fact', content: '南开大学大三，软件工程专业', source: 'diary', sourceRef: '1', confidence: 0.98, createdAt: now - 10 * day, updatedAt: now - 10 * day, isActive: true, isPinned: true },
  { id: 'mem2', category: 'fact', content: '在 MiniMax 开放平台做 AI 售前解决方案实习', source: 'chat', confidence: 0.95, createdAt: now - 8 * day, updatedAt: now - 8 * day, isActive: true, isPinned: false },
  { id: 'mem3', category: 'fact', content: '正在准备雅思考试，目标7分', source: 'diary', sourceRef: '2', confidence: 0.96, createdAt: now - 5 * day, updatedAt: now - 5 * day, isActive: true, isPinned: false },

  // 兴趣偏好
  { id: 'mem4', category: 'interest', content: '喜欢骑行，上周沿海河骑了20公里', source: 'diary', sourceRef: '5', confidence: 0.92, createdAt: now - 4 * day, updatedAt: now - 4 * day, isActive: true, isPinned: false },
  { id: 'mem5', category: 'interest', content: '热爱美食，经常去探店，最爱酸菜鱼和红烧肉', source: 'diary', sourceRef: '7', confidence: 0.94, createdAt: now - 6 * day, updatedAt: now - 6 * day, isActive: true, isPinned: false },
  { id: 'mem6', category: 'interest', content: '对摄影感兴趣，加入了学校摄影社', source: 'diary', sourceRef: '6', confidence: 0.88, createdAt: now - 5 * day, updatedAt: now - 5 * day, isActive: true, isPinned: false },
  { id: 'mem7', category: 'interest', content: '喜欢看科幻电影，想看《沙丘3》', source: 'diary', confidence: 0.85, createdAt: now - 2 * day, updatedAt: now - 2 * day, isActive: true, isPinned: false },

  // 性格特征
  { id: 'mem8', category: 'personality', content: '偏内向但对熟人很活跃，有轻微社恐但正在努力克服', source: 'diary', confidence: 0.78, createdAt: now - 7 * day, updatedAt: now - 7 * day, isActive: true, isPinned: false },
  { id: 'mem9', category: 'personality', content: '做事认真负责，代码洁癖，追求完美', source: 'chat', confidence: 0.82, createdAt: now - 6 * day, updatedAt: now - 6 * day, isActive: true, isPinned: false },
  { id: 'mem10', category: 'personality', content: '容易焦虑但善于自我调节，运动是主要的解压方式', source: 'diary', sourceRef: '2', confidence: 0.80, createdAt: now - 3 * day, updatedAt: now - 3 * day, isActive: true, isPinned: false },

  // 社交需求
  {
    id: 'mem11', category: 'need', content: '想找一起备考雅思的搭子', source: 'diary', sourceRef: '2', confidence: 0.93, createdAt: now - 2 * day, updatedAt: now - 2 * day, isActive: true, isPinned: true,
    needType: 'buddy', urgency: 'active', matchStatus: 'searching', tags: ['雅思', '学习'],
  },
  {
    id: 'mem12', category: 'need', content: '周末想去看《沙丘3》', source: 'chat', confidence: 0.90, createdAt: now - day, updatedAt: now - day, isActive: true, isPinned: false,
    needType: 'activity', urgency: 'active', expiry: now + 5 * day, matchStatus: 'matched', tags: ['电影', '周末'],
  },
  {
    id: 'mem13', category: 'need', content: '想找个周末一起骑行的伙伴', source: 'diary', sourceRef: '5', confidence: 0.87, createdAt: now - 3 * day, updatedAt: now - 3 * day, isActive: true, isPinned: false,
    needType: 'buddy', urgency: 'passive', matchStatus: 'searching', tags: ['骑行', '户外'],
  },

  // 生活习惯
  { id: 'mem14', category: 'habit', content: '夜猫子，通常22-23点写日记', source: 'behavior', confidence: 0.91, createdAt: now - 8 * day, updatedAt: now - 2 * day, isActive: true, isPinned: false },
  { id: 'mem15', category: 'habit', content: '常去二食堂吃饭，偏爱辣味', source: 'diary', confidence: 0.86, createdAt: now - 7 * day, updatedAt: now - 7 * day, isActive: true, isPinned: false },
  { id: 'mem16', category: 'habit', content: '每周运动2-3次，主要是跑步和骑行', source: 'diary', confidence: 0.84, createdAt: now - 5 * day, updatedAt: now - 5 * day, isActive: true, isPinned: false },

  // 关系网络
  { id: 'mem17', category: 'relation', content: '室友小王 — 常一起吃饭和打球', source: 'diary', confidence: 0.90, createdAt: now - 9 * day, updatedAt: now - 3 * day, isActive: true, isPinned: false },
  { id: 'mem18', category: 'relation', content: '妈妈 — 每周视频通话，是主要的情感支持', source: 'diary', sourceRef: '2', confidence: 0.95, createdAt: now - 7 * day, updatedAt: now - day, isActive: true, isPinned: false },
  { id: 'mem19', category: 'relation', content: '小红 — 好朋友，认识满一年', source: 'diary', sourceRef: '3', confidence: 0.88, createdAt: now - 8 * day, updatedAt: now - 8 * day, isActive: true, isPinned: false },
]

// ── 分身状态 ──────────────────────────────────────────────────────

export const mockAvatarStatus: AvatarStatus = {
  isActive: true,
  browsedCount: 47,
  matchedCount: 3,
  chattingCount: 1,
  lastActiveAt: now - 2 * 60000,
  enabledChannels: ['buddy', 'help', 'share'],
  enabledActions: ['reply_buddy', 'reply_help', 'push_match'],
  matchRange: { school: '南开大学', distanceKm: 3 },
}

// ── 分身侧写 ──────────────────────────────────────────────────────

export const mockAvatarProfile: AvatarProfile = {
  summary: '你是一个对技术充满热情的大三学生。日常喜欢泡图书馆刷算法题，但也不忘享受生活——骑行、摄影、和朋友吃火锅是你的三大快乐源泉。你看似安静内敛，但在熟悉的人面前会变得很话多。最近正在准备雅思和留学申请，压力不小但依然保持积极心态。你的日记风格偏治愈系，喜欢用细腻的文字记录生活中的小确幸。',
  diaryCount: 47,
  chatCount: 23,
  generatedAt: now - day,
}

// ── 查询函数 ──────────────────────────────────────────────────────

export function getMemories(category?: string): AvatarMemory[] {
  let list = [...mockMemories]
  if (category) list = list.filter(m => m.category === category)
  // pinned first, then by createdAt desc
  list.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return b.createdAt - a.createdAt
  })
  return list
}

export function addMemory(data: { category: string; content: string }): AvatarMemory {
  const mem: AvatarMemory = {
    id: `mem_${Date.now()}`,
    category: data.category as AvatarMemory['category'],
    content: data.content,
    source: 'manual',
    confidence: 1.0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
    isPinned: false,
  }
  mockMemories.unshift(mem)
  return mem
}

export function updateMemory(id: string, fields: Partial<AvatarMemory>): AvatarMemory | null {
  const mem = mockMemories.find(m => m.id === id)
  if (!mem) return null
  Object.assign(mem, fields, { updatedAt: Date.now() })
  return mem
}

export function deleteMemory(id: string): boolean {
  const idx = mockMemories.findIndex(m => m.id === id)
  if (idx < 0) return false
  mockMemories.splice(idx, 1)
  return true
}

export function getAvatarStatus(): AvatarStatus {
  return { ...mockAvatarStatus }
}

export function updateAvatarStatus(fields: Partial<AvatarStatus>): AvatarStatus {
  Object.assign(mockAvatarStatus, fields)
  return { ...mockAvatarStatus }
}

export function getAvatarProfile(): AvatarProfile {
  return { ...mockAvatarProfile }
}

export function regenerateProfile(): AvatarProfile {
  mockAvatarProfile.generatedAt = Date.now()
  return { ...mockAvatarProfile }
}
