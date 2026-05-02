<template>
  <view class="write-page">
    <!-- ── CustomNavBar ── -->
    <CustomNavBar title="记录此刻" @left-click="handleBack">
      <template #left>
        <view class="nav-back press-feedback" @click="handleBack">
          <DoodleIcon name="arrow-left" color="#2C1F14" :size="36" />
        </view>
      </template>
    </CustomNavBar>

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- ── 主滚动区 ── -->
    <scroll-view
      class="page-scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
    >
      <!-- 文字输入区（始终可见） -->
      <view class="input-card">
        <textarea
          v-model="textInput"
          class="text-textarea"
          placeholder="写下此刻的想法..."
          :placeholder-style="'color: #AE9D92; font-size: 30rpx; line-height: 1.7;'"
          :auto-height="true"
          maxlength="500"
          :focus="true"
        />
        <view class="char-count-row">
          <text class="char-count">{{ textInput.length }}/500</text>
        </view>
        <view v-if="voiceNotes.length > 0" class="voice-note-list">
          <view
            v-for="note in voiceNotes"
            :key="note.id"
            class="voice-note-bubble"
            :class="`voice-note-bubble--${note.status}`"
          >
            <view class="voice-note-main">
              <text class="voice-note-icon">🎤</text>
              <view class="voice-wave">
                <view v-for="bar in 10" :key="bar" class="voice-wave-bar" :style="{ height: `${10 + (bar % 4) * 5}rpx` }" />
              </view>
              <text class="voice-note-duration">{{ formatDuration(note.duration) }}</text>
            </view>
            <text v-if="note.status === 'transcribing'" class="voice-note-text">正在语音转文字...</text>
            <text v-else-if="note.status === 'failed'" class="voice-note-text">{{ note.error || '语音转写失败' }}</text>
            <text v-else class="voice-note-text">{{ note.text }}</text>
            <view class="voice-note-remove press-feedback" @click="removeVoiceNote(note.id)">
              <text class="voice-note-remove-icon">×</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 照片区域 -->
      <view v-if="photos.length > 0 || true" class="photo-section">
        <text class="section-label">照片</text>
        <scroll-view class="photo-scroll" scroll-x>
          <view class="photo-list">
            <!-- 已选照片 -->
            <view
              v-for="(photo, idx) in photos"
              :key="photo"
              class="photo-item"
            >
              <image class="photo-thumb" :src="photo" mode="aspectFill" />
              <view class="photo-remove" @click="removePhoto(idx)">
                <text class="photo-remove-icon">×</text>
              </view>
            </view>
            <!-- 添加按钮（最多9张） -->
            <view
              v-if="photos.length < 9"
              class="photo-add press-feedback"
              @click="pickPhoto"
            >
              <text class="photo-add-icon">+</text>
              <text class="photo-add-label">添加</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 位置信息 -->
      <view class="location-row">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ locationText }}</text>
      </view>

      <!-- 分隔线 + 今日已记录 -->
      <view class="divider">
        <view class="divider-line" />
        <text class="divider-label">今日已记录 {{ todayMaterials.length }} 条</text>
        <view class="divider-line" />
      </view>

      <!-- 今日素材列表 -->
      <view class="today-list">
        <view v-if="loadingMaterials" class="list-loading">
          <text class="list-loading-text">加载中...</text>
        </view>

        <view
          v-for="item in todayMaterials"
          :key="item.id"
          class="today-item"
        >
          <!-- 💬 对话素材卡片 -->
          <template v-if="item.type === 'chat'">
            <view class="chat-material" @click="openChatDetail(item)">
              <view class="chat-left">
                <view class="chat-indicator" />
                <text class="chat-time">{{ formatTimeRange(item.startTime, item.endTime) }}</text>
              </view>
              <view class="chat-body">
                <view class="chat-header-row">
                  <text class="chat-icon">💬</text>
                  <text class="chat-title">{{ getChatTitle(item) }}</text>
                  <text v-if="item.emotion?.emoji" class="chat-mood-emoji">{{ item.emotion.emoji }}</text>
                </view>
                <text class="chat-summary">{{ getChatPreview(item.content) }}</text>
                <view class="chat-expand-row">
                  <text class="chat-expand-text">展开对话 ›</text>
                </view>
              </view>
            </view>
          </template>

          <!-- 原有素材卡片 -->
          <template v-else>
            <view class="item-header">
              <text class="item-time">{{ formatTime(item.createdAt) }}</text>
              <text class="item-type-icon">{{ typeIcon(item.type) }}</text>
              <text v-if="item.emotion && item.emotion.emoji" class="item-emotion-emoji">{{ item.emotion.emoji }}</text>
              <view class="item-delete-btn press-feedback" @click.stop="handleDeleteMaterial(item.id)">
                <text class="item-delete-icon">×</text>
              </view>
            </view>
            <view class="item-body">
              <image
                v-if="item.type === 'image' && (item.mediaUrl || item.content)"
                class="item-image"
                :src="toFullUrl(item.mediaUrl || item.content)"
                mode="aspectFill"
              />
              <text v-else class="item-text">{{ item.content }}</text>
            </view>
          </template>
        </view>

        <view v-if="!loadingMaterials && todayMaterials.length === 0" class="empty-today">
          <text class="empty-today-text">今天还没有记录，快来添加第一条吧 ✨</text>
        </view>
      </view>

      <!-- 底部留白（给 toolbar 让位） -->
      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 录音中提示条 -->
    <view v-if="isRecording" class="recording-bar">
      <view class="recording-bar-dot" />
      <text class="recording-bar-text">录音中，松开结束...</text>
    </view>

    <!-- ── 底部工具栏 ── -->
    <view class="toolbar" :style="{ paddingBottom: safeBottom + 'px' }">
      <!-- 📷 拍照 -->
      <view class="toolbar-btn press-feedback" @click="pickPhoto">
        <text class="toolbar-btn-icon">📷</text>
        <text class="toolbar-btn-label">拍照</text>
      </view>

      <!-- 🎤 按住说话 -->
      <view
        class="toolbar-btn press-feedback"
        :class="{ 'toolbar-btn--recording': isRecording }"
        @touchstart.prevent="startRecording"
        @touchend.prevent="stopRecording"
        @mousedown.prevent="startRecording"
        @mouseup.prevent="stopRecording"
      >
        <text class="toolbar-btn-icon">🎤</text>
        <text class="toolbar-btn-label">{{ isRecording ? '松开结束' : '按住说话' }}</text>
      </view>

      <!-- ✓ 保存 -->
      <view
        class="toolbar-save press-feedback"
        :class="{ disabled: !canSave }"
        @click="handleSave"
      >
        <text class="toolbar-save-text">{{ saving ? '保存中...' : '✓ 保存' }}</text>
      </view>
    </view>
    <!-- ── 对话详情 Bottom Sheet ── -->
    <ChatDetailSheet
      :visible="chatDetailVisible"
      :session="chatDetailData?.session ?? null"
      :messages="chatDetailData?.messages ?? []"
      @close="chatDetailVisible = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { createMaterial, getMaterials, extractEmotion, uploadDiaryImage, deleteMaterial } from '@/services/api/material'
import { API_BASE_URL } from '@/services/config'
import type { RawMaterial } from '@/services/api/material'
import { speechToText, speechToTextFile } from '@/services/api/ai'
import { getSessionMessages, type SessionMessagesResult } from '@/services/api/chat'
import ChatDetailSheet from '@/components/ChatDetailSheet.vue'
import { getAssistantPreview } from '@/utils/chat-message'
import { toLocalDateYmd } from '@/utils/date'

// ── 布局 ──
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const safeBottom = ref(0)

// ── 状态 ──
const textInput = ref('')
const photos = ref<string[]>([])
const locationText = ref('获取位置中...')
const todayMaterials = ref<RawMaterial[]>([])
const loadingMaterials = ref(false)
const saving = ref(false)
const lastSubmitSignature = ref('')
const lastSubmitAt = ref(0)
const DUPLICATE_GUARD_MS = 15000

// 语音 — 按住说话
const isRecording = ref(false)
const recordDuration = ref(0)
const voiceNotes = ref<VoiceNote[]>([])

interface VoiceNote {
  id: string
  src: string
  duration: number
  status: 'transcribing' | 'done' | 'failed'
  text: string
  error?: string
}

let recordTimer: ReturnType<typeof setInterval> | null = null
let recorderManager: UniApp.RecorderManager | null = null
let h5MediaRecorder: MediaRecorder | null = null
let h5MediaStream: MediaStream | null = null
let h5RecordChunks: Blob[] = []
let cancelRecordingFlag = false
const voiceTranscriptionTasks = new Map<string, Promise<void>>()

const today = toLocalDateYmd()

function buildSubmitSignature(): string {
  const content = combinedMaterialContent.value
  const photosPart = photos.value.join('|')
  const voicesPart = voiceNotes.value
    .map(note => `${note.id}:${note.status}:${note.text}`)
    .join('|')
  return `${today}|${content}|${photosPart}|${voicesPart}`
}

function markRecentSubmit(signature: string) {
  lastSubmitSignature.value = signature
  lastSubmitAt.value = Date.now()
}

function isLikelyDuplicateSubmit(signature: string): boolean {
  if (!lastSubmitSignature.value) return false
  if (signature !== lastSubmitSignature.value) return false
  return (Date.now() - lastSubmitAt.value) < DUPLICATE_GUARD_MS
}

// 是否可保存：至少有文字 OR 照片
const canSave = computed(() => {
  return !saving.value && (combinedMaterialContent.value.length > 0 || photos.value.length > 0 || hasSavableVoiceNotes.value)
})

const hasSavableVoiceNotes = computed(() => {
  return voiceNotes.value.some(note => note.status === 'transcribing' || (note.status === 'done' && note.text.trim()))
})

const hasPendingVoiceNotes = computed(() => {
  return voiceNotes.value.some(note => note.status === 'transcribing')
})

const voiceTranscriptionText = computed(() => {
  return getVoiceTranscriptionText()
})

function getVoiceTranscriptionText(noteIds?: string[]) {
  const idSet = noteIds ? new Set(noteIds) : null
  return voiceNotes.value
    .filter(note => !idSet || idSet.has(note.id))
    .filter(note => note.status === 'done' && note.text.trim())
    .map(note => note.text.trim())
    .join('\n')
}

const combinedMaterialContent = computed(() => {
  return [textInput.value.trim(), voiceTranscriptionText.value]
    .filter(Boolean)
    .join('\n')
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  const statusH = info.statusBarHeight ?? 20
  navPlaceholderHeight.value = statusH + 44
  // toolbar 高度约 100rpx + safe area
  const toolbarH = 100 * (info.windowWidth / 750) + (info.safeAreaInsets?.bottom ?? 0)
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - toolbarH
  safeBottom.value = info.safeAreaInsets?.bottom ?? 0

  getLocation()
  await loadTodayMaterials()
})

function getLocation() {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      // 简单用经纬度模拟地址（真实场景需逆地理编码）
      locationText.value = `${res.latitude.toFixed(4)}°N · 晴 22°`
    },
    fail: () => {
      locationText.value = '位置未获取'
    },
  })
}

async function loadTodayMaterials() {
  loadingMaterials.value = true
  try {
    todayMaterials.value = await getMaterials(today)
  } catch {
    // silently ignore
  } finally {
    loadingMaterials.value = false
  }
}

// ── 照片 ──
function pickPhoto() {
  const remain = 9 - photos.value.length
  if (remain <= 0) return

  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      photos.value = [...photos.value, ...res.tempFilePaths].slice(0, 9)
    },
    fail: () => {
      // H5 fallback: mock images
      const mockUrl = `https://picsum.photos/seed/${Date.now()}/400/400`
      photos.value = [...photos.value, mockUrl].slice(0, 9)
    },
  })
}

function removePhoto(idx: number) {
  photos.value.splice(idx, 1)
}

function genVoiceId() {
  return `voice-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function stopRecordTimer() {
  if (!recordTimer) return
  clearInterval(recordTimer)
  recordTimer = null
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(1, Math.round(seconds || 1))
  return `${safeSeconds}s`
}

function removeVoiceNote(id: string) {
  voiceNotes.value = voiceNotes.value.filter(note => note.id !== id)
}

async function transcribeRecordedVoice(file: string | File, voiceSrc: string, duration: number) {
  const noteId = genVoiceId()
  const note: VoiceNote = {
    id: noteId,
    src: voiceSrc,
    duration,
    status: 'transcribing',
    text: '',
  }
  voiceNotes.value = [...voiceNotes.value, note]

  const task = (async () => {
    try {
      const result = typeof File !== 'undefined' && file instanceof File
        ? await speechToTextFile(file)
        : await speechToText(file as string)
      const text = String(result.transcription || result.text || '').trim()
      const current = voiceNotes.value.find(item => item.id === noteId)
      if (!current) return
      if (!text) {
        current.status = 'failed'
        current.error = '未识别到语音内容'
        return
      }
      current.status = 'done'
      current.text = text
      uni.showToast({ title: '语音已转文字', icon: 'none' })
    } catch (error) {
      const current = voiceNotes.value.find(item => item.id === noteId)
      if (!current) return
      current.status = 'failed'
      current.error = error instanceof Error ? error.message : '语音转写失败'
    } finally {
      voiceTranscriptionTasks.delete(noteId)
    }
  })()
  voiceTranscriptionTasks.set(noteId, task)
  await task
}

function initUniRecorder() {
  if (recorderManager) return
  if (typeof uni.getRecorderManager !== 'function') return
  recorderManager = uni.getRecorderManager()
  if (!recorderManager) return

  recorderManager.onStop((res: any) => {
    stopRecordTimer()
    isRecording.value = false
    const shouldCancel = cancelRecordingFlag
    cancelRecordingFlag = false
    if (shouldCancel || !res.tempFilePath) return
    void transcribeRecordedVoice(res.tempFilePath, res.tempFilePath, recordDuration.value)
  })

  recorderManager.onError(() => {
    stopRecordTimer()
    cancelRecordingFlag = false
    isRecording.value = false
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
}

function getH5MimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return candidates.find(item => MediaRecorder.isTypeSupported(item)) || ''
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
    h5MediaRecorder.onstop = () => {
      stopRecordTimer()
      isRecording.value = false
      h5MediaStream?.getTracks().forEach(track => track.stop())
      h5MediaStream = null
      const shouldCancel = cancelRecordingFlag
      cancelRecordingFlag = false
      if (shouldCancel || h5RecordChunks.length === 0) return

      const type = h5MediaRecorder?.mimeType || mimeType || 'audio/webm'
      const ext = type.includes('ogg') ? 'ogg' : 'webm'
      const blob = new Blob(h5RecordChunks, { type })
      h5RecordChunks = []
      const file = new File([blob], `material-voice-${Date.now()}.${ext}`, { type })
      const voiceSrc = URL.createObjectURL(blob)
      void transcribeRecordedVoice(file, voiceSrc, recordDuration.value)
    }
    h5MediaRecorder.onerror = () => {
      stopRecordTimer()
      cancelRecordingFlag = false
      isRecording.value = false
      h5MediaStream?.getTracks().forEach(track => track.stop())
      h5MediaStream = null
      uni.showToast({ title: '录音失败', icon: 'none' })
    }
    h5MediaRecorder.start()
    cancelRecordingFlag = false
    isRecording.value = true
    recordDuration.value = 0
    recordTimer = setInterval(() => {
      recordDuration.value += 1
      if (recordDuration.value >= 60) stopRecording()
    }, 1000)
  } catch {
    uni.showToast({ title: '无法访问麦克风', icon: 'none' })
  }
}

async function startRecording() {
  if (isRecording.value) return
  // #ifdef H5
  await startH5Recording()
  return
  // #endif

  initUniRecorder()
  if (!recorderManager) {
    uni.showToast({ title: '当前平台不支持录音', icon: 'none' })
    return
  }
  const manager = recorderManager as UniApp.RecorderManager
  cancelRecordingFlag = false
  isRecording.value = true
  recordDuration.value = 0
  recordTimer = setInterval(() => {
    recordDuration.value += 1
    if (recordDuration.value >= 60) stopRecording()
  }, 1000)
  manager.start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1 })
}

function stopRecording() {
  if (!isRecording.value) return

  // #ifdef H5
  h5MediaRecorder?.stop()
  return
  // #endif

  recorderManager?.stop()
  stopRecordTimer()
}

async function waitForVoiceNotesReady(noteIds: string[]) {
  const tasks = noteIds
    .map(id => voiceTranscriptionTasks.get(id))
    .filter((task): task is Promise<void> => Boolean(task))
  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }
}

async function saveMaterialAfterVoiceReady(options: {
  submitSignature: string
  text: string
  photoPaths: string[]
  voiceNoteIds: string[]
  background: boolean
}) {
  try {
    await waitForVoiceNotesReady(options.voiceNoteIds)

    const voiceText = getVoiceTranscriptionText(options.voiceNoteIds)
    const content = [options.text, voiceText].filter(Boolean).join('\n')
    if (!content && options.photoPaths.length === 0) {
      throw new Error('未识别到语音内容')
    }

    let type: 'image' | 'voice' | 'text' = voiceText && !options.text ? 'voice' : 'text'
    let mediaUrl: string | undefined

    if (options.photoPaths.length > 0) {
      type = 'image'
      const uploaded = await uploadDiaryImage(options.photoPaths[0])
      mediaUrl = uploaded.url
    }

    const mat = await createMaterial({
      type,
      content: content || undefined,
      mediaUrl,
      date: today,
    })
    uni.$emit('materials:changed', { date: today })

    // 立即追加到今日列表
    todayMaterials.value.unshift(mat)

    // 重置输入
    textInput.value = options.text === textInput.value.trim() ? '' : textInput.value
    voiceNotes.value = voiceNotes.value.filter(note => !options.voiceNoteIds.includes(note.id))
    photos.value = []
    markRecentSubmit(options.submitSignature)

    uni.showToast({ title: '已记录 ✓', icon: 'success' })

    // 后台情绪提取
    extractEmotion(mat.id).then(emotion => {
      const idx = todayMaterials.value.findIndex(m => m.id === mat.id)
      if (idx >= 0) {
        todayMaterials.value[idx] = { ...todayMaterials.value[idx], emotion }
      }
    }).catch(() => {})

    if (!options.background) {
      setTimeout(() => {
        uni.navigateBack()
      }, 800)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (/timeout|超时/i.test(msg)) {
      // 超时时后端可能已落库，先阻止用户立刻重复提交。
      markRecentSubmit(options.submitSignature)
      uni.showToast({ title: '请求超时，素材可能已保存，请刷新确认', icon: 'none', duration: 2400 })
    } else {
      uni.showToast({ title: msg || '记录失败，请重试', icon: 'none' })
    }
  } finally {
    saving.value = false
  }
}

// ── 保存 ──
async function handleSave() {
  if (!canSave.value || saving.value) return

  const submitSignature = buildSubmitSignature()
  if (isLikelyDuplicateSubmit(submitSignature)) {
    uni.showToast({ title: '请勿重复提交，稍后刷新查看', icon: 'none' })
    return
  }

  saving.value = true
  const voiceNoteIds = voiceNotes.value.map(note => note.id)
  const options = {
    submitSignature,
    text: textInput.value.trim(),
    photoPaths: [...photos.value],
    voiceNoteIds,
    background: hasPendingVoiceNotes.value,
  }

  if (options.background) {
    uni.showToast({ title: '转写完成后自动保存', icon: 'none', duration: 1800 })
    void saveMaterialAfterVoiceReady(options)
    setTimeout(() => {
      uni.navigateBack()
    }, 300)
    return
  }

  await saveMaterialAfterVoiceReady(options)
}

// ── 对话素材 ──
const chatDetailVisible = ref(false)
const chatDetailData = ref<SessionMessagesResult | null>(null)

function getChatPreview(content: string) {
  const summary = getAssistantPreview(content || '', 42)
  return summary || '点击查看对话详情'
}

function formatTimeRange(start?: number, end?: number): string {
  if (!start) return ''
  const fmt = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (!end) return fmt(start)
  return `${fmt(start)} ~ ${fmt(end)}`
}

function getChatTitle(mat: RawMaterial): string {
  return getAssistantPreview(mat.content || '', 15) || '对话记录'
}

async function openChatDetail(mat: RawMaterial) {
  if (!mat.chatSessionId) return
  try {
    const data = await getSessionMessages(mat.chatSessionId)
    chatDetailData.value = data
    chatDetailVisible.value = true
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// ── 工具函数 ──
function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function typeIcon(type: string): string {
  if (type === 'image') return '📷'
  if (type === 'voice') return '🎤'
  if (type === 'chat') return '💬'
  return '📝'
}

// 辅助函数：将相对路径转换为完整 URL
function toFullUrl(path: string): string {
  if (path && path.startsWith('/')) {
    // /uploads/ 路径不走 /api，直接用 host
    if (path.startsWith('/uploads/')) {
      const host = API_BASE_URL.replace(/\/api$/, '')
      return `${host}${path}`
    }
    return `${API_BASE_URL}${path}`
  }
  return path
}

// ── 删除素材 ──
async function handleDeleteMaterial(id: string) {
  const res = await uni.showModal({
    title: '确认删除',
    content: '确定要删除这条素材吗？',
    confirmText: '删除',
    confirmColor: '#E8855A',
    cancelText: '取消',
  })
  if (res.confirm !== true) return

  try {
    await deleteMaterial(id)
    todayMaterials.value = todayMaterials.value.filter(m => m.id !== id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.write-page {
  background: #FDF8F3;
  min-height: 100vh;
  position: relative;
}

.nav-placeholder {}

.nav-back {
  padding: 8rpx 16rpx;
}

.page-scroll {
  box-sizing: border-box;
}

/* ── 文字输入卡片 ── */
.input-card {
  margin: 24rpx 24rpx 16rpx;
  background: #FFFFFF;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid rgba(232, 133, 90, 0.1);
}

.text-textarea {
  width: 100%;
  min-height: 180rpx;
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.7;
  background: transparent;
  box-sizing: border-box;
}

.char-count-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}

.char-count {
  font-size: 22rpx;
  color: #AE9D92;
}

.voice-note-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 14rpx;
}

.voice-note-bubble {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  width: fit-content;
  max-width: 100%;
  padding: 16rpx 56rpx 16rpx 18rpx;
  background: #FFF7F0;
  border: 2rpx solid rgba(232, 133, 90, 0.18);
  border-radius: 22rpx 24rpx 20rpx 8rpx;
}

.voice-note-bubble--transcribing {
  background: #FDF0E8;
}

.voice-note-bubble--failed {
  background: #FFF2F0;
  border-color: rgba(212, 100, 92, 0.28);
}

.voice-note-main {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.voice-note-icon {
  font-size: 28rpx;
}

.voice-wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.voice-wave-bar {
  width: 5rpx;
  border-radius: 999rpx;
  background: #E8855A;
  opacity: 0.75;
}

.voice-note-duration {
  font-size: 24rpx;
  color: #8A7668;
}

.voice-note-text {
  font-size: 26rpx;
  line-height: 1.5;
  color: #4A3628;
}

.voice-note-bubble--transcribing .voice-note-text {
  color: #AE9D92;
}

.voice-note-bubble--failed .voice-note-text {
  color: #B55248;
}

.voice-note-remove {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(44, 31, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-note-remove-icon {
  font-size: 22rpx;
  line-height: 1;
  color: #8A7668;
}

/* ── 照片区域 ── */
.photo-section {
  margin: 0 24rpx 16rpx;
}

.section-label {
  font-size: 26rpx;
  color: #AE9D92;
  display: block;
  margin-bottom: 12rpx;
}

.photo-scroll {
  white-space: nowrap;
}

.photo-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.photo-item {
  position: relative;
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: visible;
}

.photo-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  display: block;
}

.photo-remove {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #2C1F14;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.photo-remove-icon {
  color: #FFF;
  font-size: 28rpx;
  line-height: 1;
}

.photo-add {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #FFFFFF;
  border: 2rpx dashed #D4C4B8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  &:active { opacity: 0.7; }
}

.photo-add-icon {
  font-size: 48rpx;
  color: #AE9D92;
  line-height: 1;
}

.photo-add-label {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ── 位置 ── */
.location-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 0 24rpx 24rpx;
  padding: 16rpx 20rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16rpx 20rpx 14rpx 18rpx;
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 26rpx;
  color: #AE9D92;
}

/* ── 分隔线 ── */
.divider {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 24rpx 20rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent 6rpx,
    #D4C4B8 6rpx,
    #D4C4B8 12rpx
  );
}

.divider-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

/* ── 今日素材列表 ── */
.today-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.list-loading {
  display: flex;
  justify-content: center;
  padding: 24rpx;
}

.list-loading-text {
  font-size: 26rpx;
  color: #AE9D92;
}

.today-item {
  background: #FFFFFF;
  border-radius: 16rpx 20rpx 14rpx 18rpx;
  padding: 18rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.item-time {
  font-size: 22rpx;
  color: #AE9D92;
}

.item-type-icon {
  font-size: 22rpx;
}

.item-emotion-emoji {
  font-size: 22rpx;
}

.item-delete-btn {
  margin-left: auto;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-delete-icon {
  font-size: 24rpx;
  color: #AE9D92;
  line-height: 1;
}

.item-body {}

.item-image {
  width: 100%;
  height: 220rpx;
  border-radius: 10rpx;
  display: block;
}

.item-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  /* 最多展示2行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── 对话素材卡片 ── */
.chat-material {
  display: flex;
  gap: 16rpx;
}

.chat-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding-top: 4rpx;
}

.chat-indicator {
  width: 6rpx;
  min-height: 60rpx;
  flex: 1;
  background: #7C6FE3;
  border-radius: 3rpx;
}

.chat-time {
  font-size: 20rpx;
  color: #AE9D92;
  white-space: nowrap;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.chat-header-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.chat-icon {
  font-size: 28rpx;
}

.chat-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
}

.chat-mood-emoji {
  font-size: 24rpx;
}

.chat-summary {
  font-size: 26rpx;
  color: #4A3628;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.chat-expand-row {
  margin-top: 4rpx;
}

.chat-expand-text {
  font-size: 24rpx;
  color: #7C6FE3;
}

.empty-today {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.empty-today-text {
  font-size: 26rpx;
  color: #D4C4B8;
  text-align: center;
}

.bottom-spacer {
  height: 40rpx;
}

/* ── 录音中提示条 ── */
.recording-bar {
  position: fixed;
  bottom: 140rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(44, 31, 20, 0.85);
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  z-index: 60;
}

.recording-bar-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #D4645C;
  animation: recBlink 0.8s infinite;
}

@keyframes recBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-bar-text {
  font-size: 26rpx;
  color: #FFFFFF;
}

/* ── 底部工具栏 ── */
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid rgba(212, 196, 184, 0.5);
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 50;
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  background: #F5F0EB;
  transition: all 0.15s;
  &:active { opacity: 0.75; transform: scale(0.95); }
}

.toolbar-btn--recording {
  background: #E8855A;
  box-shadow: 0 0 0 6rpx rgba(232, 133, 90, 0.2);
  .toolbar-btn-icon { filter: brightness(1.2); }
  .toolbar-btn-label { color: #FFFFFF; }
}

.toolbar-btn-icon {
  font-size: 40rpx;
}

.toolbar-btn-label {
  font-size: 20rpx;
  color: #4A3628;
}

.toolbar-save {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.3);
  &:active { opacity: 0.85; transform: scale(0.98); }

  &.disabled {
    background: #D4C4B8;
    box-shadow: none;
  }
}

.toolbar-save-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 700;
}

/* ── 通用按压反馈 ── */
.press-feedback {
  &:active { opacity: 0.75; }
}
</style>
