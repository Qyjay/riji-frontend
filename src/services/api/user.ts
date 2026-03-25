import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/user'

export interface UserProfile {
  name: string
  school: string
  major: string
  level: number
  diaryCount: number
  streakDays: number
  pomodoroCount: number
  avatar: string
  styleTags?: string[]
  customStylePrompt?: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: number
}

export interface GrowthData {
  diaries: { date: string; count: number }[]
  emotions: { label: string; count: number }[]
  tags: { label: string; count: number }[]
  pomodoros: { date: string; count: number }[]
  streak: number[]
}

export interface Settings {
  theme: 'light' | 'dark'
  notifications: boolean
  autoBGM: boolean
  diaryPrivacy: 'private' | 'friends' | 'public'
  language: string
}

export interface SemesterReport {
  totalDiaries: number
  totalPomodoros: number
  topEmotions: { label: string; count: number }[]
  topTags: { label: string; count: number }[]
  writingTime: number
  avgEmotion: number
  streak: number
  achievements: number
  highlights: string[]
}

export async function getUserProfile(): Promise<UserProfile> {
  if (USE_MOCK) return mock.getUserProfile()
  return request<UserProfile>({ url: '/user/profile' })
}

export async function getAgentPortrait(): Promise<string> {
  if (USE_MOCK) return mock.getAgentPortrait()
  return request<string>({ url: '/user/agent-portrait' })
}

export async function getGrowthData(): Promise<GrowthData> {
  if (USE_MOCK) return mock.getGrowthData()
  return request<GrowthData>({ url: '/user/growth' })
}

export async function getAchievements(): Promise<Achievement[]> {
  if (USE_MOCK) return mock.getAchievements()
  return request<Achievement[]>({ url: '/user/achievements' })
}

export async function getSettings(): Promise<Settings> {
  if (USE_MOCK) return mock.getSettings()
  return request<Settings>({ url: '/user/settings' })
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  if (USE_MOCK) return mock.updateSettings(data)
  return request<Settings>({ url: '/user/settings', method: 'POST', data })
}

export async function getSemesterReport(): Promise<SemesterReport> {
  if (USE_MOCK) return mock.getSemesterReport()
  return request<SemesterReport>({ url: '/user/semester-report' })
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  if (USE_MOCK) return mock.updateUserProfile(data)
  return request<UserProfile>({ url: '/user/profile', method: 'POST', data })
}

export async function updateStyleTags(tags: string[]): Promise<void> {
  if (USE_MOCK) return mock.updateStyleTags(tags)
  // 后端暂无独立接口，通过 updateProfile 保存
  await request<void>({ url: '/user/profile', method: 'POST', data: { style_tags: tags } })
}

export async function updateCustomStylePrompt(prompt: string): Promise<void> {
  if (USE_MOCK) return mock.updateCustomStylePrompt(prompt)
  // 后端暂无独立接口，通过 updateProfile 保存
  await request<void>({ url: '/user/profile', method: 'POST', data: { custom_style_prompt: prompt } })
}
