import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { speechToText, speechToTextFile } from '@/services/api/ai'
import { closeSession, type ChatAttachment, type ChatMessage, chatStream, getChatHistory, uploadChatFile } from '@/services/api/chat'
import { uploadDiaryImage } from '@/services/api/material'
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
  voice?: {
    src: string
    duration: number
    transcriptionStatus: 'transcribing' | 'done' | 'failed'
    transcriptionText: string
  }
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

function getReadableChatError(error: unknown, options: { webSearchRequested: boolean; webSearchReturned: boolean }) {
  const rawMessage = error instanceof Error ? error.message : String(error || '')
  const lower = rawMessage.toLowerCase()
  const isAiNoResponse = [
    'server disconnected',
    'network request failed',
    'network error',
    '请求超时',
    'readtimeout',
    'timeout',
    'failed to fetch',
    'http 502',
    'http 503',
    'http 504',
    'ai 服务异常',
    'miniMax'.toLowerCase(),
  ].some((keyword) => lower.includes(keyword))

  if (options.webSearchRequested && !options.webSearchReturned) {
    return '联网搜索失败：搜索服务暂时没有响应，请稍后重试，或关闭联网搜索后再发送。'
  }

  if (options.webSearchRequested && options.webSearchReturned && isAiNoResponse) {
    return '联网搜索已返回结果，但 AI 暂未响应，请稍后重试。'
  }

  if (isAiNoResponse) {
    return 'AI 暂未响应：服务连接中断或超时，请稍后重试。'
  }

  return rawMessage || '发送失败，请稍后重试。'
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
    let webSearchReturned = false
    let friendlyError: string | null = null
    const webSearchRequested = useWebSearch.value
    try {
      await chatStream(
        {
          message: text,
          clientMessageId,
          useWebSearch: webSearchRequested,
          attachments: uploadedAttachments,
        },
        {
          onEvent: (event) => {
            if (event.type === 'web_search') {
              webSearchReturned = true
            }
          },
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
            friendlyError = getReadableChatError(error, {
              webSearchRequested,
              webSearchReturned,
            })
            if (!acked) {
              const user = messages.value.find((item) => item.id === optimisticUserId)
              if (user) {
                user.status = 'failed'
                user.error = friendlyError
              }
            }
            const assistant = messages.value.find((item) => item.id === optimisticAssistantId)
            if (assistant) {
              assistant.status = 'failed'
              assistant.error = friendlyError
            }
          },
        },
      )
    } catch (error) {
      const message = friendlyError || getReadableChatError(error, {
        webSearchRequested,
        webSearchReturned,
      })
      const assistant = messages.value.find((item) => item.id === optimisticAssistantId)
      if (assistant) {
        assistant.status = 'failed'
        assistant.error = message
      }
      throw new Error(message)
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

  async function transcribeVoice(filePath: string | File) {
    if (typeof File !== 'undefined' && filePath instanceof File) {
      return speechToTextFile(filePath)
    }
    return speechToText(filePath as string)
  }

  async function sendVoiceMessage(file: string | File, voiceSrc: string, duration: number) {
    if (isStreaming.value) return

    const clientMessageId = genId('voice-cmsg')
    const voiceMessageId = genId('voice-user')
    const assistantMessageId = genId('assistant')

    const voiceMessage: UiChatMessage = {
      id: voiceMessageId,
      sessionId: activeSessionId.value,
      clientMessageId,
      role: 'user',
      content: '',
      createdAt: Date.now(),
      status: 'sending',
      attachments: [],
      voice: {
        src: voiceSrc,
        duration,
        transcriptionStatus: 'transcribing',
        transcriptionText: '',
      },
    }

    messages.value.push(voiceMessage)

    let transcription = ''
    try {
      const result = await transcribeVoice(file)
      transcription = String(result.transcription || result.text || '').trim()
      const current = messages.value.find((item) => item.id === voiceMessageId)
      if (current?.voice) {
        current.content = transcription
        current.status = transcription ? 'sent' : 'failed'
        current.voice.transcriptionStatus = transcription ? 'done' : 'failed'
        current.voice.transcriptionText = transcription
        if (!transcription) current.error = '未识别到语音内容'
      }
      if (!transcription) return
    } catch (error) {
      const current = messages.value.find((item) => item.id === voiceMessageId)
      if (current?.voice) {
        current.status = 'failed'
        current.error = error instanceof Error ? error.message : '语音转写失败'
        current.voice.transcriptionStatus = 'failed'
        current.voice.transcriptionText = ''
      }
      return
    }

    const assistantMessage: UiChatMessage = {
      id: assistantMessageId,
      sessionId: activeSessionId.value,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'streaming',
      attachments: [],
    }
    messages.value.push(assistantMessage)
    isStreaming.value = true
    streamingMessageId.value = assistantMessageId

    let webSearchReturned = false
    let friendlyError: string | null = null
    const webSearchRequested = useWebSearch.value
    try {
      await chatStream(
        {
          message: transcription,
          clientMessageId,
          useWebSearch: webSearchRequested,
          attachments: [],
        },
        {
          onEvent: (event) => {
            if (event.type === 'web_search') webSearchReturned = true
          },
          onSession: (sessionId) => {
            activeSessionId.value = sessionId
            const currentUser = messages.value.find((item) => item.id === voiceMessageId)
            if (currentUser) currentUser.sessionId = sessionId
            const currentAssistant = messages.value.find((item) => item.id === assistantMessageId)
            if (currentAssistant) currentAssistant.sessionId = sessionId
          },
          onAck: (message) => {
            const currentUser = messages.value.find((item) => item.id === voiceMessageId)
            if (currentUser) {
              currentUser.id = message.id || currentUser.id
              currentUser.sessionId = message.sessionId ?? currentUser.sessionId
              currentUser.clientMessageId = message.clientMessageId ?? currentUser.clientMessageId
              currentUser.status = 'sent'
            }
          },
          onChunk: (textChunk) => {
            const current = messages.value.find((item) => item.id === assistantMessageId)
            if (current) current.content += textChunk
          },
          onDone: (message) => {
            const index = messages.value.findIndex((item) => item.id === assistantMessageId)
            if (index >= 0) {
              messages.value.splice(index, 1, {
                ...toUiMessage(message),
                status: 'sent',
              })
            }
          },
          onError: (error) => {
            friendlyError = getReadableChatError(error, {
              webSearchRequested,
              webSearchReturned,
            })
            const assistant = messages.value.find((item) => item.id === assistantMessageId)
            if (assistant) {
              assistant.status = 'failed'
              assistant.error = friendlyError
            }
          },
        },
      )
    } catch (error) {
      const message = friendlyError || getReadableChatError(error, {
        webSearchRequested,
        webSearchReturned,
      })
      const assistant = messages.value.find((item) => item.id === assistantMessageId)
      if (assistant) {
        assistant.status = 'failed'
        assistant.error = message
      }
    } finally {
      isStreaming.value = false
      streamingMessageId.value = null
    }
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
    sendVoiceMessage,
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
