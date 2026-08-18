import { defineStore } from 'pinia'
import { ref } from 'vue'
import { uniStorage } from './storage'
import type { BackfillInterviewMessage } from '@/services/api/backfill'

export interface BackfillPhotoItem {
  id: string
  url: string              // 上传后返回的图片 URL
  localPath: string        // 本地预览路径（H5 blob/临时路径）
  takenAt: number          // 毫秒时间戳（可被用户调整）
  takenAtSource: 'exif' | 'lastModified' | 'manual'
  userNote: string         // 用户对该照片的文字/语音回忆
  location?: string
  uploaded: boolean        // 是否已上传成功
}

export const useBackfillStore = defineStore('backfill', () => {
  // 当前补写会话的目标日期（用户可在归档页调整分组，这里记主日期）
  const targetDate = ref('')
  const weather = ref('')
  const photos = ref<BackfillPhotoItem[]>([])
  const interviewMessages = ref<BackfillInterviewMessage[]>([])
  // 预生成的访谈问题与用户答案（问卷式，避免逐轮等待）
  const questions = ref<string[]>([])
  const answers = ref<string[]>([])
  const questionsLoading = ref(false)
  const savedAt = ref(0)

  function reset() {
    targetDate.value = ''
    weather.value = ''
    photos.value = []
    interviewMessages.value = []
    questions.value = []
    answers.value = []
    questionsLoading.value = false
    savedAt.value = 0
  }

  function setPhotos(list: BackfillPhotoItem[]) {
    photos.value = list
    savedAt.value = Date.now()
  }

  function setQuestions(list: string[]) {
    questions.value = list
    // 保留已填答案的长度对齐
    answers.value = list.map((_, i) => answers.value[i] || '')
    savedAt.value = Date.now()
  }

  function setAnswer(index: number, value: string) {
    if (index < 0) return
    while (answers.value.length <= index) answers.value.push('')
    answers.value[index] = value
    savedAt.value = Date.now()
  }

  function updatePhotoNote(id: string, note: string) {
    const item = photos.value.find((p) => p.id === id)
    if (item) {
      item.userNote = note
      savedAt.value = Date.now()
    }
  }

  function updatePhotoTakenAt(id: string, takenAt: number) {
    const item = photos.value.find((p) => p.id === id)
    if (item) {
      item.takenAt = takenAt
      item.takenAtSource = 'manual'
      savedAt.value = Date.now()
    }
  }

  function setInterviewMessages(list: BackfillInterviewMessage[]) {
    interviewMessages.value = list
    savedAt.value = Date.now()
  }

  /** 拼接访谈素材为纯文本，供提交补写任务使用（优先问卷问答，兼容旧对话）。 */
  function buildInterviewTranscript(): string {
    const qaLines = questions.value
      .map((q, i) => ({ q, a: (answers.value[i] || '').trim() }))
      .filter((item) => item.a)
      .map((item) => `问：${item.q}\n答：${item.a}`)
    if (qaLines.length > 0) return qaLines.join('\n')
    return interviewMessages.value
      .map((m) => (m.role === 'assistant' ? `分身：${m.content}` : `我：${m.content}`))
      .join('\n')
  }

  return {
    targetDate,
    weather,
    photos,
    interviewMessages,
    questions,
    answers,
    questionsLoading,
    savedAt,
    reset,
    setPhotos,
    setQuestions,
    setAnswer,
    updatePhotoNote,
    updatePhotoTakenAt,
    setInterviewMessages,
    buildInterviewTranscript,
  }
}, {
  persist: {
    storage: uniStorage,
    paths: ['targetDate', 'weather', 'photos', 'interviewMessages', 'questions', 'answers', 'savedAt'],
  },
})
