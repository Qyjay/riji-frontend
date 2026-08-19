import { request } from '../request'
import { USE_MOCK } from '../config'
import * as mock from '../mock/mission'
import type { PlazaPost } from './plaza'

export type MissionMode = 'short_term' | 'long_term'
export type MissionStatus =
  | 'draft'
  | 'searching'
  | 'posting'
  | 'probing'
  | 'awaiting_user'
  | 'awaiting_peer'
  | 'connected'
  | 'completed'
  | 'paused'
  | 'expired'
  | 'cancelled'

export interface MissionTimeWindow {
  label?: string
  startAt?: number
  endAt?: number
  flexibilityMinutes?: number
  recurringRule?: string
}

export interface MissionLocation {
  label: string
  latitude?: number
  longitude?: number
  radiusKm: number
  precision: 'city' | 'district' | 'campus' | 'venue'
}

export interface MissionHeadcount {
  current: number
  wanted: number
  allowWaitlist: boolean
}

export interface MissionBudget {
  type: 'free' | 'aa' | 'range' | 'host'
  min?: number
  max?: number
}

export interface MissionPermissions {
  search: boolean
  atoaProbe: boolean
  draftPost: boolean
  draftReply: boolean
  autoPublish: false
  autoConnect: false
}

export interface MissionDraft {
  mode: MissionMode
  purposeType: string
  title: string
  description: string
  source: 'natural_language' | 'guided_form' | 'diary_suggestion' | 'plaza_post' | 'history'
  timeWindow: MissionTimeWindow
  location: MissionLocation
  headcount: MissionHeadcount
  budget: MissionBudget
  mustHaves: string[]
  preferences: string[]
  boundaries: string[]
  publicMemoryIds: string[]
  permissions: MissionPermissions
  searchStrategy: 'search_only' | 'post_only' | 'search_then_draft'
  expiresAt?: number
}

export interface SocialMission extends MissionDraft {
  id: string
  status: MissionStatus
  publicCardSnapshot: {
    displayName?: string
    publicSummary?: string
    school?: string
    interestTags?: string[]
    socialIntent?: string[]
    conversationStyle?: Record<string, unknown>
    boundaries?: string[]
  }
  linkedPostId?: string
  atoaSessionId?: string
  candidateCount: number
  pendingCount: number
  createdAt: number
  updatedAt: number
}

export interface MissionParseResult {
  draft: MissionDraft
  inferredFields: string[]
  questions: string[]
}

export interface MissionEvidence {
  text: string
  source: string
  confidence: 'confirmed' | 'inferred' | string
}

export interface MissionCandidate {
  id: string
  missionId: string
  targetUserId?: string
  targetPostId?: string
  source: 'plaza_post' | 'public_card' | string
  status: string
  hardConstraintResult: Record<string, 'pass' | 'fail' | 'unknown'>
  fitReasons: MissionEvidence[]
  questions: string[]
  conflicts: MissionEvidence[]
  riskFlags: string[]
  internalScore: number
  interactionId?: string
  targetUser?: {
    id: string
    name: string
    avatar: string
    school: string
    major: string
    grade: string
  }
  targetPost?: {
    id: string
    authorId: string
    authorName: string
    authorAvatar: string
    authorSchool: string
    type: string
    content: string
    location: string
    tags: string[]
    createdAt: number
    allowAgentReply: boolean
    schoolOnly: boolean
    missionId?: string
    opportunityMode?: 'short_term' | 'long_term'
    category?: string
    startAt?: number
    endAt?: number
    applyDeadline?: number
    slotsTotal?: number
    slotsRemaining?: number
    allowWaitlist?: boolean
    budget?: Record<string, unknown>
    requirements?: string[]
    opportunityStatus?: string
  }
  createdAt: number
  updatedAt: number
}

export interface MissionSearchResult {
  mission: SocialMission
  candidates: MissionCandidate[]
  scannedCount: number
  matchedCount: number
  suggestion: string
}

export interface MissionProbeResult {
  candidate: MissionCandidate
  interactionId: string
  sessionId: string
}

export interface MissionPostDraft {
  type: PlazaPost['type']
  content: string
  location: string
  tags: string[]
  allowAgentReply: boolean
  schoolOnly: boolean
}

export async function parseMission(text: string): Promise<MissionParseResult> {
  if (USE_MOCK) return mock.parseMission(text)
  return request<MissionParseResult>({
    url: '/social/missions/parse',
    method: 'POST',
    data: { text },
    timeout: 30000,
  })
}

export async function createMission(draft: MissionDraft): Promise<SocialMission> {
  if (USE_MOCK) return mock.createMission(draft)
  return request<SocialMission>({
    url: '/social/missions',
    method: 'POST',
    data: {
      mode: draft.mode,
      purpose_type: draft.purposeType,
      title: draft.title,
      description: draft.description,
      source: draft.source,
      time_window: draft.timeWindow,
      location: draft.location,
      headcount: draft.headcount,
      budget: draft.budget,
      must_haves: draft.mustHaves,
      preferences: draft.preferences,
      boundaries: draft.boundaries,
      public_memory_ids: draft.publicMemoryIds,
      permissions: draft.permissions,
      search_strategy: draft.searchStrategy,
      expires_at: draft.expiresAt,
    },
  })
}

export async function getMissions(status?: MissionStatus): Promise<SocialMission[]> {
  if (USE_MOCK) return mock.getMissions(status)
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<SocialMission[]>({ url: `/social/missions${query}` })
}

export async function getMission(missionId: string): Promise<SocialMission> {
  if (USE_MOCK) return mock.getMission(missionId)
  return request<SocialMission>({ url: `/social/missions/${missionId}` })
}

export async function updateMission(
  missionId: string,
  fields: Partial<MissionDraft>,
): Promise<SocialMission> {
  if (USE_MOCK) return mock.updateMission(missionId, fields)
  const data: Record<string, unknown> = {}
  if (fields.purposeType !== undefined) data.purpose_type = fields.purposeType
  if (fields.title !== undefined) data.title = fields.title
  if (fields.description !== undefined) data.description = fields.description
  if (fields.timeWindow !== undefined) data.time_window = fields.timeWindow
  if (fields.location !== undefined) data.location = fields.location
  if (fields.headcount !== undefined) data.headcount = fields.headcount
  if (fields.budget !== undefined) data.budget = fields.budget
  if (fields.mustHaves !== undefined) data.must_haves = fields.mustHaves
  if (fields.preferences !== undefined) data.preferences = fields.preferences
  if (fields.boundaries !== undefined) data.boundaries = fields.boundaries
  if (fields.publicMemoryIds !== undefined) data.public_memory_ids = fields.publicMemoryIds
  if (fields.permissions !== undefined) data.permissions = fields.permissions
  if (fields.searchStrategy !== undefined) data.search_strategy = fields.searchStrategy
  if (fields.expiresAt !== undefined) data.expires_at = fields.expiresAt
  return request<SocialMission>({
    url: `/social/missions/${missionId}`,
    method: 'PATCH',
    data,
  })
}

export async function startMission(missionId: string): Promise<MissionSearchResult> {
  if (USE_MOCK) return mock.searchMission(missionId)
  return request<MissionSearchResult>({
    url: `/social/missions/${missionId}/start`,
    method: 'POST',
    timeout: 90000,
  })
}

export async function searchMission(missionId: string): Promise<MissionSearchResult> {
  if (USE_MOCK) return mock.searchMission(missionId)
  return request<MissionSearchResult>({
    url: `/social/missions/${missionId}/search`,
    method: 'POST',
    timeout: 90000,
  })
}

export async function pauseMission(missionId: string): Promise<SocialMission> {
  if (USE_MOCK) return mock.setMissionStatus(missionId, 'paused')
  return request<SocialMission>({
    url: `/social/missions/${missionId}/pause`,
    method: 'POST',
  })
}

export async function resumeMission(missionId: string): Promise<SocialMission> {
  if (USE_MOCK) return mock.setMissionStatus(missionId, 'searching')
  return request<SocialMission>({
    url: `/social/missions/${missionId}/resume`,
    method: 'POST',
  })
}

export async function closeMission(missionId: string): Promise<SocialMission> {
  if (USE_MOCK) return mock.setMissionStatus(missionId, 'cancelled')
  return request<SocialMission>({
    url: `/social/missions/${missionId}/close`,
    method: 'POST',
  })
}

export async function deleteMission(missionId: string): Promise<void> {
  if (USE_MOCK) return mock.deleteMission(missionId)
  return request<void>({
    url: `/social/missions/${missionId}`,
    method: 'DELETE',
  })
}

export async function getMissionCandidates(
  missionId: string,
  status?: string,
): Promise<MissionCandidate[]> {
  if (USE_MOCK) return mock.getCandidates(missionId, status)
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<MissionCandidate[]>({
    url: `/social/missions/${missionId}/candidates${query}`,
  })
}

export async function probeMissionCandidate(
  missionId: string,
  candidateId: string,
): Promise<MissionProbeResult> {
  if (USE_MOCK) return mock.probeCandidate(missionId, candidateId)
  return request<MissionProbeResult>({
    url: `/social/missions/${missionId}/candidates/${candidateId}/probe`,
    method: 'POST',
    timeout: 90000,
  })
}

export async function skipMissionCandidate(
  missionId: string,
  candidateId: string,
): Promise<MissionCandidate> {
  if (USE_MOCK) return mock.skipCandidate(missionId, candidateId)
  return request<MissionCandidate>({
    url: `/social/missions/${missionId}/candidates/${candidateId}/skip`,
    method: 'POST',
  })
}

export async function createMissionPostDraft(missionId: string): Promise<MissionPostDraft> {
  if (USE_MOCK) return mock.createPostDraft(missionId)
  return request<MissionPostDraft>({
    url: `/social/missions/${missionId}/post-draft`,
    method: 'POST',
  })
}

export async function publishMissionPost(
  missionId: string,
  draft: MissionPostDraft,
): Promise<PlazaPost> {
  if (USE_MOCK) return mock.publishPost(missionId, draft)
  return request<PlazaPost>({
    url: `/social/missions/${missionId}/publish`,
    method: 'POST',
    data: {
      content: draft.content,
      location: draft.location,
      tags: draft.tags,
      school_only: draft.schoolOnly,
      allow_agent_reply: draft.allowAgentReply,
    },
  })
}
