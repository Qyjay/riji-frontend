import type { Match, MatchRequest, Message, MatchRecommendation, MatchReport, BuddyRequest, UserPortrait } from '../api/social'

export function getMatches(): Match[] {
  return [
    {
      id: 'm1',
      nickname: '小明',
      avatar: '🧑‍🎓',
      school: '南开大学',
      commonTags: ['学习', '编程', '美食'],
      matchedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'm2',
      nickname: '小红',
      avatar: '🏃',
      school: '天津大学',
      commonTags: ['运动', '音乐', '美食'],
      matchedAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'm3',
      nickname: '小华',
      avatar: '🍳',
      school: '南开大学',
      commonTags: ['美食', '阅读', '写作'],
      matchedAt: Date.now() - 86400000 * 15,
    },
  ]
}

export function createMatchRequest(data: Partial<MatchRequest>): MatchRequest {
  return {
    id: `mr${Date.now()}`,
    fromUid: data.fromUid ?? 'me',
    toUid: data.toUid ?? '',
    status: 'pending',
    createdAt: Date.now(),
  }
}

const mockMessages: Record<string, Message[]> = {
  m1: [
    { id: 'msg1', matchId: 'm1', fromUid: 'u_xiaolu', content: '嗨！看到你也在准备留学，我们可以一起备考呀', timestamp: Date.now() - 86400000 * 2 - 3600000 },
    { id: 'msg2', matchId: 'm1', fromUid: 'me', content: '好呀！你现在准备到哪个阶段了？', timestamp: Date.now() - 86400000 * 2 - 3000000 },
    { id: 'msg3', matchId: 'm1', fromUid: 'u_xiaolu', content: '刚考完一次模考，听力还行但口语还差一点😅 你呢？', timestamp: Date.now() - 86400000 * 2 - 2400000 },
    { id: 'msg4', matchId: 'm1', fromUid: 'me', content: '我也是口语比较弱，要不我们约个时间一起练口语？', timestamp: Date.now() - 86400000 - 7200000 },
    { id: 'msg5', matchId: 'm1', fromUid: 'u_xiaolu', content: '太好了！周三晚上 8 点怎么样？在图书馆三楼讨论区', timestamp: Date.now() - 86400000 - 3600000 },
    { id: 'msg6', matchId: 'm1', fromUid: 'me', content: '没问题！到时候见～', timestamp: Date.now() - 86400000 - 3000000 },
  ],
  m2: [
    { id: 'msg7', matchId: 'm2', fromUid: 'u_xingkong', content: '你好呀，看到你最近日记里提到在准备雅思，加油！', timestamp: Date.now() - 86400000 * 5 },
    { id: 'msg8', matchId: 'm2', fromUid: 'me', content: '谢谢！你也是在备考吗？', timestamp: Date.now() - 86400000 * 5 + 600000 },
    { id: 'msg9', matchId: 'm2', fromUid: 'u_xingkong', content: '对，我考过一次了，有些经验可以分享～', timestamp: Date.now() - 86400000 * 4 },
  ],
}

export function getMessages(matchId: string): Message[] {
  return mockMessages[matchId] ?? []
}

export function sendMessage(matchId: string, content: string): Message {
  const msg: Message = {
    id: `msg_${Date.now()}`,
    matchId,
    fromUid: 'me',
    content,
    timestamp: Date.now(),
  }
  if (!mockMessages[matchId]) mockMessages[matchId] = []
  mockMessages[matchId].push(msg)
  return msg
}

export function getMatchRecommendations(): MatchRecommendation[] {
  return [
    {
      id: 'rec1',
      userId: 'u101',
      nickname: '晴天小熊',
      avatar: 'https://picsum.photos/seed/rec1/200/200',
      school: '南开大学',
      commonInterests: ['雅思备考', '美食探店', '追剧'],
      compatibility: 92,
    },
    {
      id: 'rec2',
      userId: 'u102',
      nickname: '月光码农',
      avatar: 'https://picsum.photos/seed/rec2/200/200',
      school: '天津大学',
      commonInterests: ['算法竞赛', '咖啡', '读书'],
      compatibility: 87,
    },
    {
      id: 'rec3',
      userId: 'u103',
      nickname: '文艺小鱼',
      avatar: 'https://picsum.photos/seed/rec3/200/200',
      school: '南开大学',
      commonInterests: ['写作', '电影', '留学申请'],
      compatibility: 83,
    },
    {
      id: 'rec4',
      userId: 'u104',
      nickname: '奔跑的风',
      avatar: 'https://picsum.photos/seed/rec4/200/200',
      school: '河北工业大学',
      commonInterests: ['长跑', '健身', '心理学'],
      compatibility: 76,
    },
    {
      id: 'rec5',
      userId: 'u105',
      nickname: '北辰星',
      avatar: 'https://picsum.photos/seed/rec5/200/200',
      school: '天津师范大学',
      commonInterests: ['日语学习', '动漫', '美食'],
      compatibility: 71,
    },
  ]
}

export function getMatchReport(_matchId: string): MatchReport {
  return {
    compatibility: 92,
    analysis: '你们都在为留学而努力奋斗，有相似的学习压力和成长烦恼。对美食的热爱和对生活细节的记录习惯让你们有很多共同话题。你们的性格一个偏感性，一个偏理性，可以很好地互补，一起成长。',
    commonPoints: ['都在准备雅思/托福', '都喜欢用文字记录生活', '对美食有共同热情', '都关注个人成长'],
    differences: ['作息时间不同（你偏夜猫子，对方偏早起）', '学习风格不同（你偏突击型，对方偏稳步型）'],
  }
}

export function respondMatch(_requestId: string, _accept: boolean): void {
  // mock: no-op
}

export function applyBuddy(targetId: string, reason: string): BuddyRequest {
  return {
    id: `buddy_${Date.now()}`,
    fromUid: 'me',
    toUid: targetId,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  }
}

export function respondBuddy(_requestId: string, _accept: boolean): void {
  // mock: no-op
}

export function getUserPortrait(): UserPortrait {
  return {
    preferences: [
      { category: '美食', items: ['红烧肉', '火锅', '日料'] },
      { category: '学习方式', items: ['番茄工作法', '刷题', '精读'] },
      { category: '娱乐', items: ['追剧', '跑步', '听音乐'] },
    ],
    personality: ['努力上进', '感性细腻', '有点小焦虑', '善于反思', '重感情'],
    relations: [
      { name: '小红', relation: '好友' },
      { name: '妈妈', relation: '家人' },
      { name: '室友小王', relation: '室友' },
    ],
    interests: ['雅思备考', '算法编程', '留学申请', '美食探店', '电影', '长跑'],
  }
}

export function refreshPortrait(): UserPortrait {
  return getUserPortrait()
}
