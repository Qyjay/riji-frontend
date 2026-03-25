import { defineStore } from 'pinia'
import { ref } from 'vue'
import { uniStorage } from './storage'
import type { Diary } from '@/services/api/diary'

export const useDiaryStore = defineStore('diary', () => {
  // 日记列表缓存（从后端拉取，不持久化）
  const diaries = ref<Diary[]>([])
  const total = ref(0)
  const currentPage = ref(1)

  // 草稿（持久化，防止意外退出丢失）
  const draft = ref<{
    content: string
    images: string[]
    style: string
    emotion: string
    savedAt: number
  }>({
    content: '',
    images: [],
    style: '',
    emotion: '',
    savedAt: 0,
  })

  function setDiaries(list: Diary[], t: number) {
    diaries.value = list
    total.value = t
  }
  function appendDiaries(list: Diary[]) {
    diaries.value.push(...list)
    currentPage.value++
  }
  function saveDraft(data: Partial<typeof draft.value>) {
    draft.value = { ...draft.value, ...data, savedAt: Date.now() }
  }
  function clearDraft() {
    draft.value = { content: '', images: [], style: '', emotion: '', savedAt: 0 }
  }
  function clearCache() {
    diaries.value = []
    total.value = 0
    currentPage.value = 1
  }

  return { diaries, total, currentPage, draft, setDiaries, appendDiaries, saveDraft, clearDraft, clearCache }
}, {
  persist: {
    storage: uniStorage,
    paths: ['draft'],
  },
})
