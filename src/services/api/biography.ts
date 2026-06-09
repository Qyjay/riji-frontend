import { request } from '@/services/request'

export interface BiographyIllustration {
  diaryId: string
  imageUrl: string
  anchorPara: number
}

export interface BiographyChapter {
  id: string
  chapterIndex: number
  title: string
  content: string
  preview: string
  wordCount: number
  summary: string
  coverImageUrl: string
  illustrations: BiographyIllustration[]
  dateRangeStart: string
  dateRangeEnd: string
  sourceMaterialCount: number
  sourcePostCount: number
  status: 'generating' | 'done' | 'failed'
  createdAt: number
  updatedAt: number
}

export interface BiographyProgress {
  threshold: number
  chapterCount: number
  pendingDiaryCount: number
  neededForNext: number
  canGenerate: boolean
  nextChapterIndex: number
}

export interface Biography {
  chapters: BiographyChapter[]
  progress: BiographyProgress
}

export interface BiographyTask {
  taskId: string
  status: 'running' | 'done' | 'failed'
  chapterId?: string | null
  chapterIndex: number
  error: string
  createdAt: number
  updatedAt: number
}

export async function getBiography(): Promise<Biography> {
  return request<Biography>({ url: '/biography' })
}

export async function getBiographyChapter(chapterId: string): Promise<BiographyChapter> {
  return request<BiographyChapter>({ url: `/biography/chapters/${chapterId}` })
}

export async function createBiographyTask(): Promise<BiographyTask> {
  return request<BiographyTask>({ url: '/biography/chapters/task', method: 'POST' })
}

export async function getBiographyTask(taskId: string): Promise<BiographyTask> {
  return request<BiographyTask>({ url: `/biography/tasks/${taskId}` })
}
