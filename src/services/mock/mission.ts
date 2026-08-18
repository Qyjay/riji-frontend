import type {
  MissionCandidate,
  MissionDraft,
  MissionParseResult,
  MissionPostDraft,
  MissionProbeResult,
  MissionSearchResult,
  MissionStatus,
  SocialMission,
} from '../api/mission'
import { createPost } from './plaza'

const now = Date.now()
const weekendStart = now + 3 * 86400000

const basePermissions = {
  search: true as const,
  atoaProbe: true as const,
  draftPost: true as const,
  draftReply: true as const,
  autoPublish: false as const,
  autoConnect: false as const,
}

const missions: SocialMission[] = [
  {
    id: 'mission_movie',
    mode: 'short_term',
    purposeType: 'movie',
    title: '周六看科幻电影',
    description: '想找一个周末一起看科幻电影的人，结束后可以一起吃饭。',
    source: 'natural_language',
    status: 'awaiting_user',
    timeWindow: { label: '本周六 19:30', startAt: weekendStart, endAt: weekendStart + 3 * 3600000 },
    location: { label: '南开大学附近', radiusKm: 5, precision: 'campus' },
    headcount: { current: 1, wanted: 1, allowWaitlist: true },
    budget: { type: 'aa' },
    mustHaves: [],
    preferences: ['科幻', '欢迎新朋友'],
    boundaries: ['先由分身问清楚时间'],
    publicMemoryIds: [],
    publicCardSnapshot: {
      displayName: '我的分身',
      publicSummary: '喜欢科幻电影，周末希望认识新朋友。',
      school: '南开大学',
      interestTags: ['电影', '科幻', '周末'],
      socialIntent: ['movie'],
      boundaries: ['先由分身问清楚时间'],
    },
    permissions: { ...basePermissions },
    searchStrategy: 'search_then_draft',
    candidateCount: 2,
    pendingCount: 2,
    atoaSessionId: 'session_1',
    expiresAt: weekendStart,
    createdAt: now - 3600000,
    updatedAt: now - 10 * 60000,
  },
  {
    id: 'mission_friend',
    mode: 'long_term',
    purposeType: 'friendship',
    title: '认识长期摄影朋友',
    description: '想认识能周末一起拍照，平时也愿意分享生活的人。',
    source: 'guided_form',
    status: 'searching',
    timeWindow: {},
    location: { label: '天津', radiusKm: 10, precision: 'city' },
    headcount: { current: 1, wanted: 1, allowWaitlist: false },
    budget: { type: 'aa' },
    mustHaves: ['尊重彼此时间'],
    preferences: ['摄影', '城市散步', '慢热'],
    boundaries: ['不急着交换联系方式'],
    publicMemoryIds: [],
    publicCardSnapshot: {
      displayName: '我的分身',
      publicSummary: '喜欢摄影和城市散步，希望慢慢认识长期朋友。',
      interestTags: ['摄影', '城市散步'],
      socialIntent: ['friendship'],
    },
    permissions: { ...basePermissions },
    searchStrategy: 'search_only',
    candidateCount: 1,
    pendingCount: 0,
    expiresAt: now + 30 * 86400000,
    createdAt: now - 2 * 86400000,
    updatedAt: now - 2 * 3600000,
  },
]

const candidateMap: Record<string, MissionCandidate[]> = {
  mission_movie: [
    {
      id: 'candidate_movie_1',
      missionId: 'mission_movie',
      targetUserId: 'user_xiaolu',
      targetPostId: 'p5',
      source: 'plaza_post',
      status: 'ready_for_user',
      hardConstraintResult: { activity: 'pass', time: 'pass', location: 'pass', availability: 'pass' },
      fitReasons: [
        { text: '想看的影片类型相同', source: 'public_post', confidence: 'confirmed' },
        { text: '本周六时间完全重叠', source: 'public_post', confidence: 'confirmed' },
        { text: '发布者与你同校', source: 'public_profile', confidence: 'confirmed' },
      ],
      questions: ['散场后是否一起吃饭？'],
      conflicts: [],
      riskFlags: [],
      internalScore: 91,
      interactionId: 'probe_movie',
      targetUser: {
        id: 'user_xiaolu',
        name: '林小鹿',
        avatar: '',
        school: '南开大学',
        major: '新闻传播',
        grade: '大三',
      },
      targetPost: {
        id: 'p5',
        authorId: 'user_xiaolu',
        authorName: '林小鹿',
        authorAvatar: '',
        authorSchool: '南开大学',
        type: 'buddy',
        content: '周六晚上想找一位同学一起看科幻电影，新朋友也欢迎。',
        location: '南开大学附近',
        tags: ['电影', '科幻', '周末'],
        createdAt: now - 2 * 3600000,
        allowAgentReply: true,
        schoolOnly: true,
        opportunityMode: 'short_term',
        category: 'movie',
        startAt: weekendStart,
        endAt: weekendStart + 3 * 3600000,
        slotsTotal: 2,
        slotsRemaining: 1,
        budget: { type: 'aa' },
        opportunityStatus: 'open',
      },
      createdAt: now - 20 * 60000,
      updatedAt: now - 10 * 60000,
    },
    {
      id: 'candidate_movie_2',
      missionId: 'mission_movie',
      targetUserId: 'user_chen',
      source: 'public_card',
      status: 'discovered',
      hardConstraintResult: { activity: 'pass', time: 'unknown', location: 'pass', availability: 'unknown' },
      fitReasons: [
        { text: '公开名片中也喜欢科幻电影', source: 'public_card', confidence: 'confirmed' },
        { text: '双方在同一所学校', source: 'public_profile', confidence: 'confirmed' },
      ],
      questions: ['周六晚上是否有空？', '更偏好哪家影院？'],
      conflicts: [],
      riskFlags: [],
      internalScore: 78,
      targetUser: {
        id: 'user_chen',
        name: '陈屿',
        avatar: '',
        school: '南开大学',
        major: '计算机科学',
        grade: '大二',
      },
      createdAt: now - 15 * 60000,
      updatedAt: now - 15 * 60000,
    },
  ],
  mission_friend: [],
}

function copyMission(mission: SocialMission): SocialMission {
  return JSON.parse(JSON.stringify(mission))
}

function findMission(id: string): SocialMission {
  const mission = missions.find(item => item.id === id)
  if (!mission) throw new Error('找人任务不存在')
  return mission
}

export function parseMission(text: string): MissionParseResult {
  const isLong = /长期|交友|朋友|合租|室友|恋爱/.test(text)
  const draft: MissionDraft = {
    mode: isLong ? 'long_term' : 'short_term',
    purposeType: isLong ? 'friendship' : (/剧本杀/.test(text) ? 'murder_mystery' : 'movie'),
    title: /剧本杀/.test(text) ? '周末剧本杀' : isLong ? '慢慢认识一个人' : '周末看电影',
    description: text,
    source: 'natural_language',
    timeWindow: isLong ? {} : { label: '本周末', startAt: weekendStart, endAt: weekendStart + 86400000 },
    location: { label: '南开大学', radiusKm: 5, precision: 'campus' },
    headcount: { current: 1, wanted: 1, allowWaitlist: true },
    budget: { type: 'aa' },
    mustHaves: [],
    preferences: /科幻/.test(text) ? ['科幻'] : [],
    boundaries: [],
    publicMemoryIds: [],
    permissions: { ...basePermissions },
    searchStrategy: 'search_then_draft',
    expiresAt: isLong ? now + 30 * 86400000 : weekendStart + 86400000,
  }
  return {
    draft,
    inferredFields: ['mode', 'purposeType', 'title'],
    questions: isLong ? ['更希望先线上聊，还是参加共同活动？'] : ['具体时间是否可以浮动？'],
  }
}

export function createMission(draft: MissionDraft): SocialMission {
  const mission: SocialMission = {
    ...JSON.parse(JSON.stringify(draft)),
    id: `mission_${Date.now()}`,
    status: 'draft',
    publicCardSnapshot: {
      displayName: '我的分身',
      publicSummary: draft.description,
      interestTags: draft.preferences,
      socialIntent: [draft.purposeType],
      boundaries: draft.boundaries,
    },
    candidateCount: 0,
    pendingCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  missions.unshift(mission)
  candidateMap[mission.id] = []
  return copyMission(mission)
}

export function getMissions(status?: MissionStatus): SocialMission[] {
  return missions.filter(item => !status || item.status === status).map(copyMission)
}

export function getMission(id: string): SocialMission {
  return copyMission(findMission(id))
}

export function updateMission(id: string, fields: Partial<MissionDraft>): SocialMission {
  const mission = findMission(id)
  Object.assign(mission, JSON.parse(JSON.stringify(fields)), { updatedAt: Date.now() })
  return copyMission(mission)
}

export function searchMission(id: string): MissionSearchResult {
  const mission = findMission(id)
  const candidates = candidateMap[id] || []
  mission.status = candidates.length ? 'awaiting_user' : 'searching'
  mission.candidateCount = candidates.length
  mission.pendingCount = candidates.filter(item => ['discovered', 'ready_for_user'].includes(item.status)).length
  mission.updatedAt = Date.now()
  return {
    mission: copyMission(mission),
    candidates: JSON.parse(JSON.stringify(candidates)),
    scannedCount: 12,
    matchedCount: candidates.length,
    suggestion: candidates.length ? `找到了 ${candidates.length} 个值得查看的候选。` : '暂无候选，可以准备招募帖。',
  }
}

export function setMissionStatus(id: string, status: MissionStatus): SocialMission {
  const mission = findMission(id)
  mission.status = status
  mission.updatedAt = Date.now()
  return copyMission(mission)
}

export function deleteMission(id: string): void {
  const index = missions.findIndex(item => item.id === id)
  if (index >= 0) missions.splice(index, 1)
  delete candidateMap[id]
}

export function getCandidates(id: string, status?: string): MissionCandidate[] {
  return (candidateMap[id] || [])
    .filter(item => !status || item.status === status)
    .map(item => JSON.parse(JSON.stringify(item)))
}

export function probeCandidate(missionId: string, candidateId: string): MissionProbeResult {
  const candidate = (candidateMap[missionId] || []).find(item => item.id === candidateId)
  if (!candidate) throw new Error('任务候选不存在')
  candidate.status = 'ready_for_user'
  candidate.interactionId = candidate.interactionId || 'probe_movie'
  findMission(missionId).atoaSessionId = 'session_1'
  return {
    candidate: JSON.parse(JSON.stringify(candidate)),
    interactionId: candidate.interactionId,
    sessionId: 'session_1',
  }
}

export function skipCandidate(missionId: string, candidateId: string): MissionCandidate {
  const candidate = (candidateMap[missionId] || []).find(item => item.id === candidateId)
  if (!candidate) throw new Error('任务候选不存在')
  candidate.status = 'user_skipped'
  return JSON.parse(JSON.stringify(candidate))
}

export function createPostDraft(missionId: string): MissionPostDraft {
  const mission = findMission(missionId)
  return {
    type: mission.mode === 'short_term' ? 'buddy' : 'dating',
    content: `${mission.title}\n\n${mission.description}\n时间：${mission.timeWindow.label || '可商量'}\n地点：${mission.location.label}附近\n\n由我的分身协助整理，发布前已由本人确认。`,
    location: mission.location.label,
    tags: [mission.title, ...mission.preferences].slice(0, 5),
    allowAgentReply: true,
    schoolOnly: mission.location.precision === 'campus',
  }
}

export function publishPost(missionId: string, draft: MissionPostDraft) {
  const mission = findMission(missionId)
  const post = createPost({
    authorId: 'mock-user-1',
    authorName: 'Mock 用户',
    authorAvatar: '',
    authorSchool: '南开大学',
    authorMajor: '软件工程',
    authorGrade: '大三',
    type: draft.type,
    content: draft.content,
    images: [],
    location: draft.location,
    tags: draft.tags,
    isFromAgent: true,
    allowAgentReply: draft.allowAgentReply,
    schoolOnly: draft.schoolOnly,
    missionId,
    opportunityMode: mission.mode,
    category: mission.purposeType,
    startAt: mission.timeWindow.startAt,
    endAt: mission.timeWindow.endAt,
    slotsRemaining: mission.headcount.wanted,
    slotsTotal: mission.headcount.current + mission.headcount.wanted,
    allowWaitlist: mission.headcount.allowWaitlist,
    budget: { ...mission.budget },
    requirements: [...mission.mustHaves, ...mission.boundaries],
    opportunityStatus: 'open',
    agentProbeEnabled: true,
  })
  mission.linkedPostId = post.id
  mission.status = 'posting'
  return post
}
