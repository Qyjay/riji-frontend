import type { Match, MatchRequest, Message, MatchRecommendation, MatchReport, BuddyRequest, UserPortrait } from '../api/social'

export function getMatches(): Match[] {
  return [
    {
      id: 'm1',
      nickname: '小鹿',
      avatar: 'https://picsum.photos/seed/match1/200/200',
      school: '天津大学',
      commonTags: ['学习', '留学'],
      matchedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'm2',
      nickname: '星空',
      avatar: 'https://picsum.photos/seed/match2/200/200',
      school: '南开大学',
      commonTags: ['雅思', '心情'],
      matchedAt: Date.now() - 86400000 * 7,
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

export function getMessages(): Message[] {
  return []
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
