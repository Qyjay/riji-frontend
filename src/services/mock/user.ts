import type { UserProfile, Achievement, GrowthData, Settings, SemesterReport } from '../api/user'

export function getUserProfile(): UserProfile {
  return {
    name: 'Kylin',
    school: '南开大学',
    major: '软件工程',
    level: 12,
    diaryCount: 127,
    streakDays: 23,
    pomodoroCount: 247,
    avatar: 'https://picsum.photos/seed/avatar/200/200',
    styleTags: ['文艺', '治愈'],
    customStylePrompt: '用温暖细腻的文字记录生活，捕捉每个平凡瞬间里的美好。',
  }
}

export function getAgentPortrait(): string {
  return 'https://picsum.photos/seed/agent/400/400'
}

export function getGrowthData(): GrowthData {
  return {
    diaries: [
      { date: '2026-03-01', count: 2 },
      { date: '2026-03-05', count: 1 },
      { date: '2026-03-08', count: 3 },
      { date: '2026-03-10', count: 1 },
      { date: '2026-03-12', count: 2 },
      { date: '2026-03-15', count: 1 },
      { date: '2026-03-18', count: 2 },
      { date: '2026-03-20', count: 1 },
      { date: '2026-03-22', count: 3 },
    ],
    emotions: [
      { label: '开心', count: 45 },
      { label: '平静', count: 32 },
      { label: '焦虑', count: 18 },
      { label: '幸福', count: 15 },
      { label: '疲惫', count: 12 },
    ],
    tags: [
      { label: '学习', count: 48 },
      { label: '心情', count: 35 },
      { label: '社交', count: 22 },
      { label: '美食', count: 18 },
      { label: '运动', count: 8 },
    ],
    pomodoros: [
      { date: '2026-03-01', count: 5 },
      { date: '2026-03-05', count: 8 },
      { date: '2026-03-08', count: 3 },
      { date: '2026-03-10', count: 6 },
      { date: '2026-03-12', count: 4 },
      { date: '2026-03-15', count: 7 },
      { date: '2026-03-18', count: 2 },
      { date: '2026-03-20', count: 5 },
      { date: '2026-03-22', count: 6 },
    ],
    streak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  }
}

export function getAchievements(): Achievement[] {
  return [
    { id: 'a1', title: '初次书写', description: '写下第一篇日记', icon: '✏️', unlocked: true, unlockedAt: Date.now() - 86400000 * 100 },
    { id: 'a2', title: '连续7天', description: '连续写日记7天', icon: '🔥', unlocked: true, unlockedAt: Date.now() - 86400000 * 80 },
    { id: 'a3', title: '情绪大师', description: '记录10种不同情绪', icon: '🎭', unlocked: true, unlockedAt: Date.now() - 86400000 * 50 },
    { id: 'a4', title: '番茄达人', description: '完成50个番茄钟', icon: '🍅', unlocked: true, unlockedAt: Date.now() - 86400000 * 30 },
    { id: 'a5', title: '百篇日记', description: '写满100篇日记', icon: '📔', unlocked: true, unlockedAt: Date.now() - 86400000 * 20 },
    { id: 'a6', title: '社交达人', description: '与AI对话超过100次', icon: '💬', unlocked: true, unlockedAt: Date.now() - 86400000 * 10 },
    { id: 'a7', title: '连续30天', description: '连续写日记30天', icon: '🔥', unlocked: true, unlockedAt: Date.now() - 86400000 * 5 },
    { id: 'a8', title: '自传作者', description: '生成第一篇AI小说章节', icon: '📖', unlocked: true, unlockedAt: Date.now() - 86400000 * 2 },
    { id: 'a9', title: '成就达人', description: '解锁10个成就', icon: '🏆', unlocked: false },
    { id: 'a10', title: '心情画家', description: '生成10张心情漫画', icon: '🎨', unlocked: false },
    { id: 'a11', title: 'BGM制作人', description: '生成5首日记BGM', icon: '🎵', unlocked: false },
    { id: 'a12', title: '灵魂伴侣', description: '与AI对话超过500次', icon: '🤝', unlocked: false },
    { id: 'a13', title: '学年报告', description: '查看学期报告', icon: '📊', unlocked: false },
    { id: 'a14', title: '完美主义者', description: '连续90天写日记', icon: '💎', unlocked: false },
    { id: 'a15', title: '千日达人', description: '写满1000篇日记', icon: '👑', unlocked: false },
    { id: 'a16', title: '故事大王', description: '生成100章小说', icon: '📚', unlocked: false },
    { id: 'a17', title: '情绪分析师', description: '查看12个月情绪报告', icon: '🔮', unlocked: false },
    { id: 'a18', title: '学习狂人', description: '完成500个番茄钟', icon: '⚡', unlocked: false },
    { id: 'a19', title: '全能写手', description: '尝试所有日记风格', icon: '🎯', unlocked: false },
    { id: 'a20', title: '社交名流', description: '成功匹配10个笔友', icon: '🌟', unlocked: false },
    { id: 'a21', title: '早起鸟', description: '早上6点前写日记', icon: '🐦', unlocked: false },
    { id: 'a22', title: '夜猫子', description: '凌晨12点后写日记', icon: '🦉', unlocked: false },
    { id: 'a23', title: '旅行者', description: '在10个不同地点写日记', icon: '🗺️', unlocked: false },
    { id: 'a24', title: '收藏家', description: '收藏100张照片到日记', icon: '📷', unlocked: false },
  ]
}

export function getSettings(): Settings {
  return {
    theme: 'light',
    notifications: true,
    autoBGM: false,
    diaryPrivacy: 'private',
    language: 'zh-CN',
  }
}

export function updateSettings(data: Partial<Settings>): Settings {
  return { ...getSettings(), ...data }
}

export function updateUserProfile(data: Partial<UserProfile>): UserProfile {
  return { ...getUserProfile(), ...data }
}

export function updateStyleTags(_tags: string[]): void {
  // mock: no-op
}

export function updateCustomStylePrompt(_prompt: string): void {
  // mock: no-op
}

export function getSemesterReport(): SemesterReport {
  return {
    totalDiaries: 127,
    totalPomodoros: 247,
    topEmotions: [
      { label: '开心', count: 45 },
      { label: '平静', count: 32 },
      { label: '焦虑', count: 18 },
    ],
    topTags: [
      { label: '学习', count: 48 },
      { label: '心情', count: 35 },
      { label: '社交', count: 22 },
    ],
    writingTime: 38,
    avgEmotion: 72,
    streak: 23,
    achievements: 8,
    highlights: [
      '连续写日记23天，打破个人记录！',
      '雅思首考7.0，提前完成目标',
      '完成247个番茄钟，学习效率显著提升',
    ],
  }
}
