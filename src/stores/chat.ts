import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { uniStorage } from './storage'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const MAX_CACHED_MESSAGES = 50

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const recentMessages = computed(() => messages.value.slice(-MAX_CACHED_MESSAGES))

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    // 内存中保留全部，持久化只保留最近 N 条（通过 paths 序列化时截断）
    if (messages.value.length > MAX_CACHED_MESSAGES * 2) {
      messages.value = messages.value.slice(-MAX_CACHED_MESSAGES)
    }
  }
  function clearMessages() {
    messages.value = []
  }
  function setMessages(msgs: ChatMessage[]) {
    messages.value = msgs
  }

  return { messages, recentMessages, addMessage, clearMessages, setMessages }
}, {
  persist: {
    storage: uniStorage,
    paths: ['messages'],
  },
})
