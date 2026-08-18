import type { MissionDraft, MissionMode, MissionStatus, SocialMission } from '@/services/api/mission'

const purposeLabels: Record<string, string> = {
  movie: '看电影',
  murder_mystery: '剧本杀',
  meal: '吃饭或探店',
  sport: '运动',
  exhibition: '看展',
  study: '学习或自习',
  travel: '旅行',
  game: '一起玩游戏',
  activity: '一起做件事',
  roommate: '找合租室友',
  dating: '认真认识恋爱对象',
  friendship: '认识长期朋友',
  study_partner: '找长期学习伙伴',
  sport_partner: '找长期运动伙伴',
  long_term: '慢慢认识一个人',
}

const statusLabels: Record<MissionStatus, string> = {
  draft: '待确认',
  searching: '正在寻找',
  posting: '招募中',
  probing: '分身正在问清楚',
  awaiting_user: '等你决定',
  awaiting_peer: '等待对方确认',
  connected: '已连接',
  completed: '已完成',
  paused: '已暂停',
  expired: '已到期',
  cancelled: '已关闭',
}

export function purposeLabel(purposeType: string): string {
  return purposeLabels[purposeType] || purposeType || '找朋友'
}

export function missionModeLabel(mode: MissionMode): string {
  return mode === 'short_term' ? '一起做件事' : '慢慢认识一个人'
}

export function missionStatusLabel(status: MissionStatus): string {
  return statusLabels[status] || status
}

export function missionStatusHint(mission: SocialMission): string {
  if (mission.status === 'awaiting_user') {
    return `有 ${mission.pendingCount || mission.candidateCount} 个候选等你判断`
  }
  if (mission.status === 'awaiting_peer') return '申请已发出，等待对方本人确认'
  if (mission.status === 'posting') return '招募帖已发布，分身会整理新的申请'
  if (mission.status === 'searching') return '分身正在搜索公开帖子和名片'
  if (mission.status === 'paused') return '任务已暂停，不会产生新的试聊'
  if (mission.status === 'connected') {
    return mission.mode === 'short_term' ? '已完成双方确认' : '已进入真人交流'
  }
  if (mission.status === 'draft') return '确认公开信息后再开始寻找'
  if (mission.status === 'expired') return '任务已过期，可以复制后修改时间'
  return missionStatusLabel(mission.status)
}

export function missionAccent(mode: MissionMode): string {
  return mode === 'short_term' ? '#6B8EB4' : '#D4728A'
}

export function missionSoftBackground(mode: MissionMode): string {
  return mode === 'short_term' ? '#EDF4FA' : '#F9EDF1'
}

export function draftStorageKey(mode: MissionMode): string {
  return `social_mission_draft_${mode}`
}

export function saveMissionDraft(draft: MissionDraft): void {
  uni.setStorageSync(draftStorageKey(draft.mode), draft)
}

export function readMissionDraft(mode: MissionMode): MissionDraft | null {
  const value = uni.getStorageSync(draftStorageKey(mode))
  return value && typeof value === 'object' ? value as MissionDraft : null
}

export function clearMissionDraft(mode: MissionMode): void {
  uni.removeStorageSync(draftStorageKey(mode))
}

export function formatMissionTime(mission: Pick<SocialMission, 'timeWindow'>): string {
  if (mission.timeWindow?.label) return mission.timeWindow.label
  if (!mission.timeWindow?.startAt) return '时间可商量'
  const date = new Date(mission.timeWindow.startAt)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function defaultMissionDraft(mode: MissionMode): MissionDraft {
  const now = Date.now()
  return {
    mode,
    purposeType: mode === 'short_term' ? 'activity' : 'friendship',
    title: mode === 'short_term' ? '一起做件事' : '慢慢认识一个人',
    description: '',
    source: 'guided_form',
    timeWindow: mode === 'short_term'
      ? { label: '时间可商量', flexibilityMinutes: 120 }
      : {},
    location: {
      label: '南开大学',
      radiusKm: mode === 'short_term' ? 5 : 10,
      precision: 'campus',
    },
    headcount: {
      current: 1,
      wanted: 1,
      allowWaitlist: true,
    },
    budget: { type: 'aa' },
    mustHaves: [],
    preferences: [],
    boundaries: [],
    publicMemoryIds: [],
    permissions: {
      search: true,
      atoaProbe: true,
      draftPost: true,
      draftReply: true,
      autoPublish: false,
      autoConnect: false,
    },
    searchStrategy: 'search_then_draft',
    expiresAt: now + (mode === 'short_term' ? 7 : 30) * 86400000,
  }
}
