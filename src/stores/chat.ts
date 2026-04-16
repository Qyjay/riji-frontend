import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { closeSession, type ChatAttachment, type ChatMessage, chatStream, getChatHistory, uploadChatFile } from '@/services/api/chat'
import { uploadDiaryImage, uploadVoice } from '@/services/api/material'
import { uniStorage } from './storage'

export interface DraftChatAttachment extends ChatAttachment {
  id: string
  localPath?: string
  rawFile?: File
  uploadStatus: 'local' | 'uploading' | 'uploaded' | 'failed'
  error?: string
}

export interface UiChatMessage {
  id: string
  sessionId?: string | null
  clientMessageId?: string | null
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  status: 'sending' | 'streaming' | 'sent' | 'failed'
  attachments: ChatAttachment[]
  error?: string
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toUiMessage(message: ChatMessage): UiChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId ?? null,
    clientMessageId: message.clientMessageId ?? null,
    role: message.role,
    content: message.content,
    createdAt: message.timestamp,
    status: 'sent',
    attachments: message.attachments || [],
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<UiChatMessage[]>([])
  const draftText = ref('')
  const pendingAttachments = ref<DraftChatAttachment[]>([])
  const isStreaming = ref(false)
  const streamingMessageId = ref<string | null>(null)
  const isRecording = ref(false)
  const useWebSearch = ref(false)
  const activeSessionId = ref<string | null>(null)
  const lastPreview = computed(() => messages.value[messages.value.length - 1] || null)

  async function loadHistory(limit = 50) {
    const result = await getChatHistory(limit)
    messages.value = result.items.map(toUiMessage)
    activeSessionId.value = messages.value[messages.value.length - 1]?.sessionId ?? null
  }

  function setDraftText(text: string) {
    draftText.value = text
  }

  function setRecording(value: boolean) {
    isRecording.value = value
  }

  function addPendingAttachments(items: DraftChatAttachment[]) {
    pendingAttachments.value = [...pendingAttachments.value, ...items]
  }

  function removePendingAttachment(id: string) {
    pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id)
  }

  function clearPendingAttachments() {
    pendingAttachments.value = []
  }

  function upsertMessage(next: UiChatMessage) {
    const index = messages.value.findIndex((item) => item.id === next.id)
    if (index >= 0) {
      messages.value.splice(index, 1, next)
      return
    }
    messages.value.push(next)
  }

  async function uploadPendingAttachments() {
    const uploaded: ChatAttachment[] = []
    for (const attachment of pendingAttachments.value) {
      attachment.uploadStatus = 'uploading'
      attachment.error = undefined
      try {
        if (attachment.type === 'image' && attachment.localPath) {
          const result = await uploadDiaryImage(attachment.localPath)
          attachment.url = result.url
          attachment.thumbnailUrl = result.thumbnailUrl
        } else if (attachment.localPath) {
          const result = await uploadChatFile(attachment.localPath)
          attachment.url = result.url
          attachment.name = result.name
          attachment.size = result.size
          attachment.mimeType = result.mimeType
        } else if (attachment.rawFile) {
          const result = await uploadChatFile(attachment.rawFile)
          attachment.url = result.url
          attachment.name = result.name
          attachment.size = result.size
          attachment.mimeType = result.mimeType
        }
        attachment.uploadStatus = 'uploaded'
        uploaded.push({
          type: attachment.type,
          name: attachment.name,
          url: attachment.url,
          thumbnailUrl: attachment.thumbnailUrl,
          mimeType: attachment.mimeType,
          size: attachment.size,
        })
      } catch (error) {
        attachment.uploadStatus = 'failed'
        attachment.error = error instanceof Error ? error.message : '上传失败'
        throw error
      }
    }
    return uploaded
  }

  async function sendMessage() {
    const text = draftText.value.trim()
    if ((!text && pendingAttachments.value.length === 0) || isStreaming.value) return

    const uploadedAttachments = await uploadPendingAttachments()
    const clientMessageId = genId('cmsg')
    const optimisticUserId = genId('user')
    const optimisticAssistantId = genId('assistant')

    const userMessage: UiChatMessage = {
      id: optimisticUserId,
      sessionId: activeSessionId.value,
      clientMessageId,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      status: 'sending',
      attachments: uploadedAttachments,
    }

    const assistantMessage: UiChatMessage = {
      id: optimisticAssistantId,
      sessionId: activeSessionId.value,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'streaming',
      attachments: [],
    }

    messages.value.push(userMessage, assistantMessage)
    draftText.value = ''
    pendingAttachments.value = []
    isStreaming.value = true
    streamingMessageId.value = optimisticAssistantId

    let acked = false
    try {
      await chatStream(
        {
          message: text,
          clientMessageId,
          useWebSearch: useWebSearch.value,
          attachments: uploadedAttachments,
        },
        {
          onSession: (sessionId) => {
            activeSessionId.value = sessionId
            const currentUser = messages.value.find((item) => item.id === optimisticUserId)
            if (currentUser) currentUser.sessionId = sessionId
            const currentAssistant = messages.value.find((item) => item.id === optimisticAssistantId)
            if (currentAssistant) currentAssistant.sessionId = sessionId
          },
          onAck: (message) => {
            acked = true
            const index = messages.value.findIndex((item) => item.id === optimisticUserId)
            if (index >= 0) {
              messages.value.splice(index, 1, {
                ...toUiMessage(message),
                status: 'sent',
              })
            }
          },
          onChunk: (textChunk) => {
            const current = messages.value.find((item) => item.id === optimisticAssistantId)
            if (current) {
              current.content += textChunk
            }
          },
          onDone: (message) => {
            const index = messages.value.findIndex((item) => item.id === optimisticAssistantId)
            if (index >= 0) {
              messages.value.splice(index, 1, {
                ...toUiMessage(message),
                status: 'sent',
              })
            }
          },
          onError: (error) => {
            if (!acked) {
              const user = messages.value.find((item) => item.id === optimisticUserId)
              if (user) {
                user.status = 'failed'
                user.error = error.message
              }
            }
            const assistant = messages.value.find((item) => item.id === optimisticAssistantId)
            if (assistant) {
              assistant.status = 'failed'
              assistant.error = error.message
            }
          },
        },
      )
    } finally {
      isStreaming.value = false
      streamingMessageId.value = null
    }
  }

  async function retryMessage(messageId: string) {
    const failed = messages.value.find((item) => item.id === messageId && item.role === 'user')
    if (!failed) return
    draftText.value = failed.content
    pendingAttachments.value = failed.attachments.map((attachment) => ({
      ...attachment,
      id: genId('att'),
      uploadStatus: 'uploaded',
    }))
    messages.value = messages.value.filter((item) => item.id !== messageId)
    await sendMessage()
  }

  async function transcribeVoice(filePath: string) {
    return uploadVoice(filePath)
  }

  async function closeCurrentSession() {
    return closeSession()
  }

  function clearConversation() {
    messages.value = []
    activeSessionId.value = null
    draftText.value = ''
    pendingAttachments.value = []
    isStreaming.value = false
    streamingMessageId.value = null
  }

  function setUseWebSearch(value: boolean) {
    useWebSearch.value = value
  }

  function toggleWebSearch() {
    useWebSearch.value = !useWebSearch.value
  }

  return {
    messages,
    draftText,
    pendingAttachments,
    isStreaming,
    streamingMessageId,
    isRecording,
    useWebSearch,
    activeSessionId,
    lastPreview,
    loadHistory,
    setDraftText,
    setRecording,
    addPendingAttachments,
    removePendingAttachment,
    clearPendingAttachments,
    sendMessage,
    retryMessage,
    transcribeVoice,
    closeCurrentSession,
    clearConversation,
    setUseWebSearch,
    toggleWebSearch,
    upsertMessage,
  }
}, {
  persist: {
    storage: uniStorage,
    paths: ['messages', 'draftText', 'activeSessionId', 'useWebSearch'],
  },
})
