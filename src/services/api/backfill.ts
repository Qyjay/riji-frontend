import { USE_MOCK } from '../config'
import { request } from '../request'
import { requestSseStream } from '../sse'

export interface BackfillPhotoPayload {
  url: string
  takenAt: number
  userNote?: string
  location?: string
}

export interface BackfillResultItem {
  date: string
  diaryId: string
  merged: boolean
}

export interface BackfillTask {
  taskId: string
  date: string
  status: 'running' | 'done' | 'failed'
  diaryId?: string | null
  results?: BackfillResultItem[]
  error: string
  createdAt: number
  updatedAt: number
}

export interface BackfillDiaryPayload {
  date: string
  photos: BackfillPhotoPayload[]
  interviewTranscript?: string
  weather?: string
}

/** 创建异步补写日记任务 */
export async function startBackfillTask(payload: BackfillDiaryPayload): Promise<BackfillTask> {
  if (USE_MOCK) {
    return {
      taskId: `mock-backfill-${Date.now()}`,
      date: payload.date,
      status: 'running',
      diaryId: null,
      error: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
  return request<BackfillTask>({
    url: '/diaries/backfill-task',
    method: 'POST',
    data: payload,
    timeout: 20000,
  })
}

/** 查询补写日记任务状态 */
export async function getBackfillTask(taskId: string): Promise<BackfillTask> {
  if (USE_MOCK) {
    return {
      taskId,
      date: '',
      status: 'done',
      diaryId: 'mock-diary-1',
      error: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
  return request<BackfillTask>({ url: `/diaries/backfill-task/${taskId}` })
}

export interface BackfillInterviewMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 预生成访谈问题（问卷式收集，避免逐轮等待） */
export async function getBackfillQuestions(payload: {
  date: string
  photos: BackfillPhotoPayload[]
}): Promise<string[]> {
  if (USE_MOCK) {
    return [
      '这一天你主要和谁在一起？当时的氛围是怎样的？',
      '照片里发生的事，让你印象最深的瞬间是什么？',
      '那天你的心情有什么变化吗？',
    ]
  }
  const res = await request<{ questions: string[] }>({
    url: '/diaries/backfill-questions',
    method: 'POST',
    data: payload,
    timeout: 30000,
  })
  return res.questions || []
}

export type BackfillInterviewEvent =
  | { type: 'start' }
  | { type: 'chunk'; text: string }
  | { type: 'done'; text: string; finished: boolean }
  | { type: 'error'; message: string }

/** AI 分身追问（SSE 流式），返回分身的下一句话 */
export async function streamBackfillInterview(
  payload: { date: string; photos: BackfillPhotoPayload[]; messages: BackfillInterviewMessage[] },
  handlers: {
    onChunk?: (text: string) => void
    onDone?: (text: string, finished: boolean) => void
    onError?: (error: Error) => void
  } = {},
): Promise<void> {
  if (USE_MOCK) {
    const reply = '听起来那天挺特别的，能跟我说说当时是和谁在一起吗？'
    for (const ch of reply) {
      handlers.onChunk?.(ch)
      await new Promise((r) => setTimeout(r, 20))
    }
    handlers.onDone?.(reply, false)
    return
  }

  // 服务端下发 error 事件后会关闭流，这里先记下，等流结束再统一抛出
  let streamError: Error | null = null
  let fullText = ''

  const emitEvent = (event: BackfillInterviewEvent) => {
    if (event.type === 'chunk') {
      fullText += event.text
      handlers.onChunk?.(event.text)
    }
    if (event.type === 'done') handlers.onDone?.(event.text || fullText, event.finished)
    if (event.type === 'error') streamError = new Error(event.message || 'AI 分身追问失败')
  }

  try {
    await requestSseStream<BackfillInterviewEvent>({
      path: '/diaries/backfill-interview/stream',
      body: payload,
      onEvent: emitEvent,
    })
  } catch (error) {
    const failure = error instanceof Error ? error : new Error('AI 分身追问失败')
    handlers.onError?.(failure)
    throw failure
  }

  if (streamError) {
    handlers.onError?.(streamError)
    throw streamError
  }
}
