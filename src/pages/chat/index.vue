<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'

import CustomNavBar from '@/components/CustomNavBar.vue'
import ChatAttachmentTray from '@/components/chat/ChatAttachmentTray.vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatEmptyState from '@/components/chat/ChatEmptyState.vue'
import ChatHeaderCard from '@/components/chat/ChatHeaderCard.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ChatQuickActions from '@/components/chat/ChatQuickActions.vue'
import ChatRecordingBar from '@/components/chat/ChatRecordingBar.vue'
import { getUserProfile } from '@/services/api/user'
import type { UserProfile } from '@/services/api/user'
import { useChatStore, type DraftChatAttachment } from '@/stores/chat'

const chatStore = useChatStore()
const { messages, draftText, pendingAttachments, isStreaming, isRecording, useWebSearch } = storeToRefs(chatStore)

const quickActions = [
  { iconName: 'pen', iconColor: '#E8855A', label: '记录素材', path: '/pages/write/index' },
  { iconName: 'crystal', iconColor: '#D4728A', label: '看运势', path: '/pages/fortune/index' },
  { iconName: 'tomato', iconColor: '#E8855A', label: '开始番茄', path: '/pages/study/pomodoro' },
  { iconName: 'calendar', iconColor: '#C8A86B', label: '纪念日', path: '/pages/anniversary/index' },
]

const suggestions = ['帮我写一段今天的日记', '最近有什么纪念日', '我今天有点累，陪我聊聊']

const profile = ref<UserProfile>({
  name: 'Kylin',
  school: '南开大学',
  major: '软件工程',
  level: 12,
  diaryCount: 127,
  streakDays: 23,
  pomodoroCount: 247,
  avatar: '',
  styleTags: [],
  customStylePrompt: '',
})

const navPlaceholderHeight = ref(64)
const scrollTopVal = ref(0)
const recordDuration = ref(0)
const manualScrollLocked = ref(false)
const showScrollToBottom = ref(false)
const lastScrollTop = ref(0)

let recordTimer: ReturnType<typeof setInterval> | null = null
let recorderManager: UniApp.RecorderManager | null = null
let h5MediaRecorder: MediaRecorder | null = null
let h5MediaStream: MediaStream | null = null
let h5RecordChunks: Blob[] = []
let h5VoiceObjectUrl = ''
let cancelRecordingFlag = false
let closingSession = false
let h5VoicePlayer: HTMLAudioElement | null = null
let voicePlayer: UniApp.InnerAudioContext | null = null

const interestCount = computed(() => profile.value.styleTags?.length || 23)
const canSend = computed(() => Boolean(draftText.value.trim()) || pendingAttachments.value.length > 0)
const hasConversation = computed(() => messages.value.length > 0)
const showCompactActions = computed(
  () => hasConversation.value && !draftText.value.trim() && pendingAttachments.value.length === 0 && !isRecording.value,
)

function jumpBottom() {
  manualScrollLocked.value = false
  showScrollToBottom.value = false
  nextTick(() => {
    scrollTopVal.value += 200000
  })
}

watch(
  () => messages.value.map((item) => `${item.id}:${item.content.length}:${item.status}`).join('|'),
  () => {
    if (!manualScrollLocked.value) {
      jumpBottom()
    }
  },
  { flush: 'post' },
)

async function closeSessionOnLeave() {
  if (closingSession) return
  closingSession = true
  stopRecordTimer()
  try {
    const result = await chatStore.closeCurrentSession()
    if (result.materialGenerated) {
      uni.showToast({ title: '已记录为今日素材 ✓', icon: 'none', duration: 1500 })
    }
  } catch {
    // ignore
  } finally {
    closingSession = false
  }
}

onHide(() => {
  void closeSessionOnLeave()
})

onUnload(() => {
  void closeSessionOnLeave()
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44

  try {
    profile.value = await getUserProfile()
  } catch {
    // ignore profile failure
  }

  try {
    await chatStore.loadHistory()
  } catch {
    uni.showToast({ title: '聊天记录加载失败', icon: 'none' })
  }
  jumpBottom()
})

async function handleSend() {
  try {
    await chatStore.sendMessage()
    jumpBottom()
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '发送失败',
      icon: 'none',
    })
  }
}

function applyPrompt(prompt: string) {
  chatStore.setDraftText(prompt)
}

function handleQuickAction(path: string) {
  uni.navigateTo({ url: path })
}

function createDraftAttachment(partial: Partial<DraftChatAttachment>): DraftChatAttachment {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: partial.type || 'file',
    name: partial.name || '未命名附件',
    url: partial.url || '',
    thumbnailUrl: partial.thumbnailUrl,
    mimeType: partial.mimeType,
    size: partial.size,
    localPath: partial.localPath,
    rawFile: partial.rawFile,
    uploadStatus: partial.uploadStatus || 'local',
    error: partial.error,
  }
}

function handleAttach() {
  uni.showActionSheet({
    itemList: ['📷 拍照', '🖼️ 从相册选择', '📎 选择文件'],
    success: (res) => {
      if (res.tapIndex === 0) pickImage(['camera'])
      else if (res.tapIndex === 1) pickImage(['album'])
      else pickFile()
    },
  })
}

function pickImage(sourceType: string[]) {
  const remaining = 9 - pendingAttachments.value.filter((item) => item.type === 'image').length
  if (remaining <= 0) {
    uni.showToast({ title: '最多添加 9 张图片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: sourceType as any,
    success: (res) => {
      const paths = Array.isArray(res.tempFilePaths)
        ? res.tempFilePaths
        : (res.tempFilePaths ? [res.tempFilePaths] : [])
      const files = paths.map((path: string, index: number) => createDraftAttachment({
        type: 'image',
        name: `图片${index + 1}.jpg`,
        url: path,
        localPath: path,
      }))
      chatStore.addPendingAttachments(files)
    },
  })
}

function pickFile() {
  // #ifdef APP-PLUS
  uni.chooseFile({
    count: 5,
    type: 'all',
    success: (res: any) => {
      const files = (res.tempFiles || []).map((file: any) => createDraftAttachment({
        type: 'file',
        name: file.name || '未知文件',
        url: file.path || file.uri || '',
        localPath: file.path || file.uri || '',
        size: file.size,
      }))
      chatStore.addPendingAttachments(files)
    },
  })
  // #endif

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv'
  input.onchange = (event: Event) => {
    const files = (event.target as HTMLInputElement).files
    if (!files) return
    const attachments = Array.from(files).map((file) => createDraftAttachment({
      type: 'file',
      name: file.name,
      size: file.size,
      mimeType: file.type,
      rawFile: file,
      url: '',
    }))
    chatStore.addPendingAttachments(attachments)
  }
  input.click()
  // #endif
}

function handleScroll(event: any) {
  const current = Number(event?.detail?.scrollTop || 0)
  if (current + 24 < lastScrollTop.value) {
    manualScrollLocked.value = true
    showScrollToBottom.value = true
  }
  lastScrollTop.value = current
}

function handleReachBottom() {
  manualScrollLocked.value = false
  showScrollToBottom.value = false
}

async function handleVoiceMessage(file: string | File, voiceSrc: string) {
  const duration = recordDuration.value
  await chatStore.sendVoiceMessage(file, voiceSrc, duration)
  jumpBottom()
}

function initUniRecorder() {
  if (recorderManager) return
  if (typeof uni.getRecorderManager !== 'function') return
  recorderManager = uni.getRecorderManager()
  if (!recorderManager) return
  recorderManager.onStop(async (res: any) => {
    stopRecordTimer()
    chatStore.setRecording(false)
    const shouldCancel = cancelRecordingFlag
    cancelRecordingFlag = false
    if (shouldCancel || !res.tempFilePath) return

    void handleVoiceMessage(res.tempFilePath, res.tempFilePath)
  })
  recorderManager.onError(() => {
    stopRecordTimer()
    cancelRecordingFlag = false
    chatStore.setRecording(false)
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
}

function getH5MimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) || ''
}

async function startH5Recording() {
  if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    uni.showToast({ title: '当前浏览器不支持录音', icon: 'none' })
    return
  }

  try {
    h5MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    h5RecordChunks = []
    const mimeType = getH5MimeType()
    h5MediaRecorder = new MediaRecorder(h5MediaStream, mimeType ? { mimeType } : undefined)
    h5MediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) h5RecordChunks.push(event.data)
    }
    h5MediaRecorder.onstop = async () => {
      stopRecordTimer()
      chatStore.setRecording(false)
      h5MediaStream?.getTracks().forEach((track) => track.stop())
      h5MediaStream = null
      const shouldCancel = cancelRecordingFlag
      cancelRecordingFlag = false
      if (shouldCancel || h5RecordChunks.length === 0) return

      const type = h5MediaRecorder?.mimeType || mimeType || 'audio/webm'
      const ext = type.includes('ogg') ? 'ogg' : 'webm'
      const blob = new Blob(h5RecordChunks, { type })
      h5RecordChunks = []
      if (h5VoiceObjectUrl) URL.revokeObjectURL(h5VoiceObjectUrl)
      h5VoiceObjectUrl = URL.createObjectURL(blob)
      void handleVoiceMessage(new File([blob], `recording-${Date.now()}.${ext}`, { type }), h5VoiceObjectUrl)
    }
    h5MediaRecorder.onerror = () => {
      stopRecordTimer()
      cancelRecordingFlag = false
      chatStore.setRecording(false)
      h5MediaStream?.getTracks().forEach((track) => track.stop())
      h5MediaStream = null
      uni.showToast({ title: '录音失败', icon: 'none' })
    }
    h5MediaRecorder.start()
    cancelRecordingFlag = false
    chatStore.setRecording(true)
    recordDuration.value = 0
    recordTimer = setInterval(() => {
      recordDuration.value += 1
      if (recordDuration.value >= 60) stopRecording()
    }, 1000)
  } catch {
    uni.showToast({ title: '无法访问麦克风', icon: 'none' })
  }
}

function stopRecordTimer() {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

async function startRecording() {
  // #ifdef H5
  await startH5Recording()
  return
  // #endif

  initUniRecorder()
  if (!recorderManager) {
    uni.showToast({ title: '当前平台不支持录音', icon: 'none' })
    return
  }
  cancelRecordingFlag = false
  chatStore.setRecording(true)
  recordDuration.value = 0
  recordTimer = setInterval(() => {
    recordDuration.value += 1
    if (recordDuration.value >= 60) stopRecording()
  }, 1000)
  recorderManager?.start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1 })
}

function stopRecording() {
  // #ifdef H5
  h5MediaRecorder?.stop()
  return
  // #endif

  recorderManager?.stop()
  stopRecordTimer()
}

function cancelRecording() {
  cancelRecordingFlag = true
  // #ifdef H5
  h5MediaRecorder?.stop()
  stopRecordTimer()
  chatStore.setRecording(false)
  return
  // #endif

  recorderManager?.stop()
  stopRecordTimer()
  chatStore.setRecording(false)
}

async function toggleRecording() {
  if (isRecording.value) stopRecording()
  else await startRecording()
}

function handleMenu() {
  uni.showActionSheet({
    itemList: ['帮我写日记', '最近有什么纪念日', '看看我的情绪报告', '清除对话'],
    success: async (res) => {
      const commands = ['帮我写日记', '最近有什么纪念日', '看看我的情绪报告', '']
      if (res.tapIndex === 3) {
        chatStore.clearConversation()
        return
      }
      const command = commands[res.tapIndex]
      if (command) {
        chatStore.setDraftText(command)
        await handleSend()
      }
    },
  })
}

function handleToggleWebSearch() {
  chatStore.toggleWebSearch()
  if (useWebSearch.value) {
    uni.showToast({ title: '已开启联网搜索', icon: 'none', duration: 1200 })
  }
}

function handlePlayVoice(src: string) {
  if (!src) return

  // #ifdef H5
  if (!h5VoicePlayer) h5VoicePlayer = new Audio()
  h5VoicePlayer.pause()
  h5VoicePlayer.currentTime = 0
  h5VoicePlayer.src = src
  h5VoicePlayer.play().catch(() => {
    uni.showToast({ title: '播放失败', icon: 'none' })
  })
  return
  // #endif

  // #ifndef H5
  if (!voicePlayer) {
    const createdPlayer = uni.createInnerAudioContext()
    createdPlayer.onError(() => {
      uni.showToast({ title: '播放失败', icon: 'none' })
    })
    voicePlayer = createdPlayer
  }
  const player = voicePlayer as UniApp.InnerAudioContext
  player.src = src
  player.play()
  // #endif
}
</script>

<template>
  <view class="page page-root">
    <CustomNavBar title="AI 伙伴" left-icon="back" right-icon="···" @right-click="handleMenu" />
    <view class="nav-placeholder" :style="{ height: `${navPlaceholderHeight}px` }" />

    <view class="page-content">
      <ChatHeaderCard :diary-count="profile.diaryCount" :interest-count="interestCount" />

      <ChatMessageList
        :messages="messages"
        :scroll-top="scrollTopVal"
        :scroll-with-animation="!isStreaming"
        :show-scroll-to-bottom="showScrollToBottom"
        @scroll="handleScroll"
        @reach-bottom="handleReachBottom"
        @jump-bottom="jumpBottom"
        @retry="chatStore.retryMessage"
        @play-voice="handlePlayVoice"
      >
        <template #empty>
          <ChatEmptyState
            :suggestions="suggestions"
            :actions="quickActions"
            @use-prompt="applyPrompt"
            @navigate="handleQuickAction"
          />
        </template>
      </ChatMessageList>

      <view class="composer-shell" :class="{ 'composer-shell--recording': isRecording }">
        <ChatAttachmentTray :attachments="pendingAttachments" @remove="chatStore.removePendingAttachment" />
        <ChatRecordingBar :visible="isRecording" :duration="recordDuration" @cancel="cancelRecording" />
        <view v-if="useWebSearch" class="web-search-tip">
          <text class="web-search-tip__text">已开启联网搜索</text>
        </view>
        <ChatQuickActions
          v-if="showCompactActions"
          :actions="quickActions.slice(0, 3)"
          compact
          @navigate="handleQuickAction"
        />
        <ChatComposer
          :model-value="draftText"
          :can-send="canSend"
          :disabled="isStreaming"
          :is-recording="isRecording"
          :use-web-search="useWebSearch"
          @update:modelValue="chatStore.setDraftText"
          @send="handleSend"
          @attach="handleAttach"
          @toggle-recording="toggleRecording"
          @toggle-web-search="handleToggleWebSearch"
        />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.88), transparent 42%),
    linear-gradient(180deg, #fffaf5 0%, #f8f0e8 42%, #fdf8f3 100%);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.composer-shell {
  padding: 0 16rpx 18rpx;
  padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(253, 248, 243, 0) 0%, rgba(253, 248, 243, 0.82) 22%, #fdf8f3 100%);
}

.composer-shell--recording {
  padding-top: 8rpx;
}

.web-search-tip {
  display: flex;
  justify-content: flex-start;
  padding: 0 10rpx 8rpx;
}

.web-search-tip__text {
  font-size: 22rpx;
  line-height: 1.4;
  color: #9a765f;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(232, 133, 90, 0.2);
  border-radius: 999rpx;
  padding: 6rpx 14rpx;
}
</style>
