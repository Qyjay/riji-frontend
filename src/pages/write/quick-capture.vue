<template>
  <view class="page">
    <CustomNavBar title="快拍" @left-click="handleBack">
      <template #left>
        <view class="nav-back press-feedback" @click="handleBack">
          <DoodleIcon name="arrow-left" color="#2C1F14" :size="36" />
        </view>
      </template>
    </CustomNavBar>

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <view class="content" :style="{ height: contentHeight + 'px' }">
      <!-- 照片预览 -->
      <view v-if="photos.length === 1" class="photo-wrap">
        <image class="photo-preview" :src="photos[0]" mode="aspectFill" />
      </view>
      <scroll-view v-else-if="photos.length > 1" class="photo-scroll" scroll-x>
        <view class="photo-list">
          <view v-for="(photo, idx) in photos" :key="idx" class="photo-item">
            <image class="photo-thumb-multi" :src="photo" mode="aspectFill" />
            <view class="photo-remove" @click="removePhoto(idx)">
              <text class="photo-remove-icon">×</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 输入区 -->
      <view class="input-card">
        <view class="input-row">
          <textarea
            v-model="caption"
            class="caption-input"
            placeholder="说点什么..."
            :placeholder-style="'color: #D4C4B8; font-size: 28rpx;'"
            maxlength="200"
            :auto-height="true"
          />
          <view
            class="voice-btn press-feedback"
            :class="{ recording: isRecording }"
            @touchstart.prevent="startRecording"
            @touchend.prevent="stopRecording"
            @mousedown.prevent="startRecording"
            @mouseup.prevent="stopRecording"
          >
            <text class="voice-btn-icon">🎤</text>
          </view>
        </view>
        <view v-if="isRecording" class="recording-hint">
          <view class="recording-dot" />
          <text class="recording-text">松开结束</text>
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
                <view v-for="bar in 8" :key="bar" class="voice-wave-bar" :style="{ height: `${10 + (bar % 4) * 5}rpx` }" />
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
        <view class="char-row">
          <text class="char-count">{{ caption.length }}/200</text>
        </view>
      </view>

      <!-- 保存按钮 -->
      <view
        class="save-btn press-feedback"
        :class="{ disabled: saving }"
        @click="handleSave"
      >
        <text class="save-btn-text">{{ saving ? '保存中...' : '✓ 记下了' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { createMaterial, extractEmotion, uploadDiaryImage } from '@/services/api/material'
import { speechToText, speechToTextFile } from '@/services/api/ai'
import { toLocalDateYmd } from '@/utils/date'

const navPlaceholderHeight = ref(64)
const contentHeight = ref(600)
const photos = ref<string[]>([])
const caption = ref('')
const saving = ref(false)
const isRecording = ref(false)
const recordDuration = ref(0)
const voiceNotes = ref<VoiceNote[]>([])
const lastSubmitSignature = ref('')
const lastSubmitAt = ref(0)
const DUPLICATE_GUARD_MS = 15000

const today = toLocalDateYmd()

interface VoiceNote {
  id: string
  src: string
  duration: number
  status: 'transcribing' | 'done' | 'failed'
  text: string
  error?: string
}

const voiceTranscriptionText = computed(() => {
  return getVoiceTranscriptionText()
})

const hasPendingVoiceNotes = computed(() => {
  return voiceNotes.value.some(note => note.status === 'transcribing')
})

function getVoiceTranscriptionText(noteIds?: string[]) {
  const idSet = noteIds ? new Set(noteIds) : null
  return voiceNotes.value
    .filter(note => !idSet || idSet.has(note.id))
    .filter(note => note.status === 'done' && note.text.trim())
    .map(note => note.text.trim())
    .join('\n')
}

const combinedCaption = computed(() => {
  return [caption.value.trim(), voiceTranscriptionText.value]
    .filter(Boolean)
    .join('\n')
})

function buildSubmitSignature(): string {
  const voicesPart = voiceNotes.value
    .map(note => `${note.id}:${note.status}:${note.text}`)
    .join('|')
  return `${today}|${combinedCaption.value}|${photos.value.join('|')}|${voicesPart}`
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

onLoad((query: Record<string, string> | undefined) => {
  // 兼容新格式（多张 JSON）和旧格式（单张）
  if (query?.photos) {
    try {
      photos.value = JSON.parse(decodeURIComponent(query.photos))
    } catch {
      photos.value = [decodeURIComponent(query.photos)]
    }
  } else if (query?.photo) {
    photos.value = [decodeURIComponent(query.photo)]
  }
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  contentHeight.value = info.windowHeight - navPlaceholderHeight.value
})

// ── 按住录音 ──
let recordTimer: ReturnType<typeof setInterval> | null = null
let recorderManager: UniApp.RecorderManager | null = null
let h5MediaRecorder: MediaRecorder | null = null
let h5MediaStream: MediaStream | null = null
let h5RecordChunks: Blob[] = []
let cancelRecordingFlag = false
const voiceTranscriptionTasks = new Map<string, Promise<void>>()

function genVoiceId() {
  return `voice-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function stopRecordTimer() {
  if (!recordTimer) return
  clearInterval(recordTimer)
  recordTimer = null
}

function formatDuration(seconds: number): string {
  return `${Math.max(1, Math.round(seconds || 1))}s`
}

function removeVoiceNote(id: string) {
  voiceNotes.value = voiceNotes.value.filter(note => note.id !== id)
}

async function transcribeRecordedVoice(file: string | File, voiceSrc: string, duration: number) {
  const noteId = genVoiceId()
  voiceNotes.value = [...voiceNotes.value, {
    id: noteId,
    src: voiceSrc,
    duration,
    status: 'transcribing',
    text: '',
  }]

  const task = (async () => {
    try {
      const result = typeof File !== 'undefined' && file instanceof File
        ? await speechToTextFile(file)
        : await speechToText(file as string)
      const text = String(result.transcription || result.text || '').trim()
      const current = voiceNotes.value.find(note => note.id === noteId)
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
      const current = voiceNotes.value.find(note => note.id === noteId)
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
      void transcribeRecordedVoice(file, URL.createObjectURL(blob), recordDuration.value)
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

// ── 删除照片 ──
function removePhoto(idx: number) {
  photos.value.splice(idx, 1)
  if (photos.value.length === 0) {
    uni.navigateBack()
  }
}

async function waitForVoiceNotesReady(noteIds: string[]) {
  const tasks = noteIds
    .map(id => voiceTranscriptionTasks.get(id))
    .filter((task): task is Promise<void> => Boolean(task))
  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }
}

async function savePhotoMaterialAfterVoiceReady(options: {
  submitSignature: string
  captionText: string
  photoPaths: string[]
  voiceNoteIds: string[]
  background: boolean
}) {
  try {
    await waitForVoiceNotesReady(options.voiceNoteIds)

    const voiceText = getVoiceTranscriptionText(options.voiceNoteIds)
    const content = [options.captionText, voiceText].filter(Boolean).join('\n')
    const uploaded = await uploadDiaryImage(options.photoPaths[0])
    const mat = await createMaterial({
      type: 'image',
      content: content || undefined,
      mediaUrl: uploaded.url,
      date: today,
    })
    uni.$emit('materials:changed', { date: today })

    markRecentSubmit(options.submitSignature)
    caption.value = options.captionText === caption.value.trim() ? '' : caption.value
    voiceNotes.value = voiceNotes.value.filter(note => !options.voiceNoteIds.includes(note.id))
    photos.value = []

    uni.showToast({ title: '已记录 ✓', icon: 'success' })

    // 后台提取情绪
    extractEmotion(mat.id).catch(() => {})

    if (!options.background) {
      setTimeout(() => {
        uni.navigateBack()
      }, 600)
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
  if (saving.value || photos.value.length === 0) return

  const submitSignature = buildSubmitSignature()
  if (isLikelyDuplicateSubmit(submitSignature)) {
    uni.showToast({ title: '请勿重复提交，稍后刷新查看', icon: 'none' })
    return
  }

  saving.value = true
  const options = {
    submitSignature,
    captionText: caption.value.trim(),
    photoPaths: [...photos.value],
    voiceNoteIds: voiceNotes.value.map(note => note.id),
    background: hasPendingVoiceNotes.value,
  }

  if (options.background) {
    uni.showToast({ title: '转写完成后自动保存', icon: 'none', duration: 1800 })
    void savePhotoMaterialAfterVoiceReady(options)
    setTimeout(() => {
      uni.navigateBack()
    }, 300)
    return
  }

  await savePhotoMaterialAfterVoiceReady(options)
}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
  min-height: 100vh;
}

.nav-back {
  padding: 8rpx 16rpx;
}

.content {
  display: flex;
  flex-direction: column;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

/* 照片预览 */
.photo-wrap {
  flex: 1;
  min-height: 0;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 24rpx;
}

.photo-preview {
  width: 100%;
  height: 100%;
  display: block;
}

/* 多张照片横滑 */
.photo-scroll {
  height: 360rpx;
  margin-bottom: 24rpx;
  white-space: nowrap;
}

.photo-list {
  display: flex;
  gap: 16rpx;
  padding: 0 8rpx;
}

.photo-item {
  position: relative;
  flex-shrink: 0;
  width: 320rpx;
  height: 340rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.photo-thumb-multi {
  width: 100%;
  height: 100%;
  display: block;
}

.photo-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-icon {
  color: #FFFFFF;
  font-size: 28rpx;
  line-height: 1;
}

/* 输入区 */
.input-card {
  background: #FFFFFF;
  border-radius: 20rpx 24rpx 16rpx 22rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 20rpx;
}

.input-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.caption-input {
  flex: 1;
  min-height: 60rpx;
  max-height: 160rpx;
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.6;
  background: transparent;
  box-sizing: border-box;
}

.voice-btn {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50% 55% 45% 52%;
  background: #F5F0EB;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:active { transform: scale(0.92); }
}

.voice-btn.recording {
  background: #E8855A;
  box-shadow: 0 0 0 8rpx rgba(232, 133, 90, 0.2);
}

.voice-btn-icon {
  font-size: 40rpx;
}

.recording-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}

.recording-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #D4645C;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-text {
  font-size: 24rpx;
  color: #D4645C;
  font-weight: 500;
}

.voice-note-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 12rpx;
}

.voice-note-bubble {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  width: fit-content;
  max-width: 100%;
  padding: 14rpx 52rpx 14rpx 16rpx;
  background: #FFF7F0;
  border: 2rpx solid rgba(232, 133, 90, 0.18);
  border-radius: 20rpx 22rpx 18rpx 8rpx;
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
  gap: 8rpx;
}

.voice-note-icon {
  font-size: 26rpx;
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
  font-size: 22rpx;
  color: #8A7668;
}

.voice-note-text {
  font-size: 24rpx;
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
  top: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(44, 31, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-note-remove-icon {
  font-size: 20rpx;
  line-height: 1;
  color: #8A7668;
}

.char-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}

.char-count {
  font-size: 22rpx;
  color: #AE9D92;
}

/* 保存按钮 */
.save-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(232, 133, 90, 0.3);
  margin-bottom: 24rpx;
  &:active { opacity: 0.85; transform: scale(0.98); }
}

.save-btn.disabled {
  background: #D4C4B8;
  box-shadow: none;
}

.save-btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.press-feedback {
  &:active { opacity: 0.75; }
}
</style>
