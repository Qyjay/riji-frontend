<template>
  <view class="page">
    <CustomNavBar title="和分身回忆这一天" left-icon="back" />
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="content-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="intro">
        <text class="intro-text">分身根据你的照片准备了几个问题，回答它们能让日记更完整。也可以直接跳过，不影响生成。</text>
      </view>

      <!-- 问题加载中 -->
      <view v-if="loading && questions.length === 0" class="loading-box">
        <text class="loading-text">分身正在准备问题…</text>
      </view>

      <!-- 问卷列表 -->
      <view
        v-for="(q, idx) in questions"
        :key="idx"
        class="qa-card"
      >
        <view class="q-row">
          <text class="q-index">{{ idx + 1 }}</text>
          <text class="q-text">{{ q }}</text>
        </view>
        <textarea
          class="a-input"
          :value="answers[idx]"
          placeholder="写下你的回答，或点下方按钮语音输入（可留空）"
          :maxlength="300"
          @input="onAnswerInput(idx, $event)"
        />
        <view class="a-actions">
          <view
            class="voice-btn"
            :class="{ recording: isRecording && recordingIdx === idx }"
            @touchstart.prevent="startRecording(idx)"
            @touchend.prevent="stopRecording"
            @touchcancel.prevent="stopRecording"
          >
            <text>{{ isRecording && recordingIdx === idx ? `松开结束 ${recordDuration}s` : '🎤 语音' }}</text>
          </view>
          <text v-if="transcribingIdx === idx" class="transcribe-tip">转写中…</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 操作区 -->
    <view class="action-bar">
      <view class="submit-btn" :class="{ disabled: submitting }" @click="submitBackfill">
        <text>{{ submitting ? '生成中…' : (hasAnyAnswer ? '完成回答，生成日记' : '跳过，直接生成日记') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { useBackfillStore } from '@/stores/backfill'
import { speechToText, speechToTextFile } from '@/services/api/ai'
import {
  getBackfillQuestions,
  startBackfillTask,
  getBackfillTask,
} from '@/services/api/backfill'
import { withQuery } from '@/utils/query'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(500)
const store = useBackfillStore()

const questions = computed(() => store.questions)
const answers = computed(() => store.answers)
const loading = ref(false)
const submitting = ref(false)

const hasAnyAnswer = computed(() => store.answers.some((a) => (a || '').trim()))

// 录音状态
const isRecording = ref(false)
const recordingIdx = ref(-1)
const recordDuration = ref(0)
const transcribingIdx = ref(-1)
let recordTimer: ReturnType<typeof setInterval> | null = null
let cancelRecordingFlag = false
let recorderManager: UniApp.RecorderManager | null = null
let h5MediaRecorder: MediaRecorder | null = null
let h5MediaStream: MediaStream | null = null
let h5RecordChunks: BlobPart[] = []

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 120
  // 若上一页预取未完成，这里兜底拉取一次。
  if (store.questions.length === 0) {
    void loadQuestions()
  }
})

onBeforeUnmount(() => {
  stopRecordTimer()
  clearPoll()
  h5MediaStream?.getTracks().forEach((t) => t.stop())
})

function buildPhotoPayload() {
  return store.photos.map((p) => ({
    url: p.url,
    takenAt: p.takenAt,
    userNote: p.userNote,
    location: p.location,
  }))
}

async function loadQuestions() {
  if (store.questionsLoading) {
    // 上一页正在拉取，轮询等待结果
    loading.value = true
    const wait = setInterval(() => {
      if (!store.questionsLoading || store.questions.length > 0) {
        clearInterval(wait)
        loading.value = false
      }
    }, 300)
    return
  }
  loading.value = true
  try {
    const list = await getBackfillQuestions({ date: store.targetDate, photos: buildPhotoPayload() })
    store.setQuestions(list)
  } catch {
    store.setQuestions([
      '这一天你主要和谁在一起？当时的氛围是怎样的？',
      '照片里发生的事，让你印象最深的瞬间是什么？',
      '那天你的心情有什么变化吗？',
    ])
  } finally {
    loading.value = false
  }
}

function onAnswerInput(idx: number, e: any) {
  store.setAnswer(idx, e.detail.value)
}

function stopRecordTimer() {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}
function startRecordTimer() {
  recordDuration.value = 0
  recordTimer = setInterval(() => {
    recordDuration.value += 1
    if (recordDuration.value >= 60) stopRecording()
  }, 1000)
}
function getH5MimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) || ''
}

async function startRecording(idx: number) {
  if (isRecording.value) return
  recordingIdx.value = idx
  cancelRecordingFlag = false
  // #ifdef H5
  await startH5Recording()
  return undefined
  // #endif
  if (!recorderManager) {
    if (typeof uni.getRecorderManager !== 'function') {
      uni.showToast({ title: '当前平台不支持录音', icon: 'none' })
      return
    }
    const manager = uni.getRecorderManager()
    if (!manager) {
      uni.showToast({ title: '录音组件初始化失败', icon: 'none' })
      return
    }
    recorderManager = manager
    manager.onStop((res: any) => {
      stopRecordTimer()
      isRecording.value = false
      const shouldCancel = cancelRecordingFlag
      cancelRecordingFlag = false
      if (shouldCancel || !res.tempFilePath) return
      void transcribe(res.tempFilePath, recordingIdx.value)
    })
    manager.onError(() => {
      stopRecordTimer()
      isRecording.value = false
      uni.showToast({ title: '录音失败', icon: 'none' })
    })
  }
  const manager = recorderManager
  if (!manager) return
  isRecording.value = true
  startRecordTimer()
  manager?.start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1 })
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
      h5MediaStream?.getTracks().forEach((t) => t.stop())
      h5MediaStream = null
      const shouldCancel = cancelRecordingFlag
      cancelRecordingFlag = false
      if (shouldCancel || h5RecordChunks.length === 0) return
      const type = h5MediaRecorder?.mimeType || mimeType || 'audio/webm'
      const ext = type.includes('ogg') ? 'ogg' : 'webm'
      const blob = new Blob(h5RecordChunks, { type })
      h5RecordChunks = []
      const file = new File([blob], `backfill-qa-${Date.now()}.${ext}`, { type })
      void transcribe(file, recordingIdx.value)
    }
    h5MediaRecorder.start()
    isRecording.value = true
    startRecordTimer()
  } catch {
    uni.showToast({ title: '无法访问麦克风', icon: 'none' })
  }
}

function stopRecording() {
  if (!isRecording.value) return
  // #ifdef H5
  h5MediaRecorder?.stop()
  return undefined
  // #endif
  recorderManager?.stop()
  stopRecordTimer()
}

async function transcribe(source: string | File, idx: number) {
  if (idx < 0) return
  transcribingIdx.value = idx
  try {
    const res = typeof source === 'string' ? await speechToText(source) : await speechToTextFile(source)
    const text = (res.text || '').trim()
    if (text) {
      const existing = (store.answers[idx] || '').trim()
      store.setAnswer(idx, existing ? `${existing} ${text}` : text)
      uni.showToast({ title: '语音已转文字', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '语音转写失败', icon: 'none' })
  } finally {
    transcribingIdx.value = -1
  }
}

async function submitBackfill() {
  if (submitting.value) return
  if (!store.photos.length) {
    uni.showToast({ title: '素材缺失，请返回重选', icon: 'none' })
    return
  }
  submitting.value = true
  uni.showLoading({ title: '正在生成日记…', mask: true })
  try {
    const task = await startBackfillTask({
      date: store.targetDate,
      photos: buildPhotoPayload(),
      interviewTranscript: store.buildInterviewTranscript(),
      weather: store.weather,
    })
    pollTask(task.taskId)
  } catch (e: any) {
    uni.hideLoading()
    submitting.value = false
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  }
}

function pollTask(taskId: string) {
  let elapsed = 0
  pollTimer = setInterval(async () => {
    elapsed += 3
    try {
      const task = await getBackfillTask(taskId)
      if (task.status === 'done') {
        clearPoll()
        uni.hideLoading()
        submitting.value = false
        const results = task.results || []
        const count = results.length
        store.reset()
        if (count > 1) {
          uni.showToast({ title: `已生成 ${count} 篇日记`, icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/diary/emotion-calendar' })
          }, 900)
        } else {
          const diaryId = task.diaryId || results[0]?.diaryId
          uni.showToast({ title: '日记已生成', icon: 'success' })
          setTimeout(() => {
            if (diaryId) uni.redirectTo({ url: withQuery('/pages/diary/detail', { id: diaryId }) })
            else uni.redirectTo({ url: '/pages/diary/emotion-calendar' })
          }, 800)
        }
      } else if (task.status === 'failed') {
        clearPoll()
        uni.hideLoading()
        submitting.value = false
        uni.showToast({ title: task.error || '生成失败', icon: 'none' })
      } else if (elapsed > 150) {
        clearPoll()
        uni.hideLoading()
        submitting.value = false
        uni.showToast({ title: '生成超时，请稍后在日记列表查看', icon: 'none' })
      }
    } catch {
      // 单次失败忽略，继续轮询
    }
  }, 3000)
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FDF8F3; }
.nav-placeholder { width: 100%; }

.content-scroll { box-sizing: border-box; padding: 0 28rpx; }

.intro {
  margin: 20rpx 0;
  background: #FFF3E8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  .intro-text { font-size: 24rpx; color: #C2733E; line-height: 1.6; }
}

.loading-box {
  padding: 80rpx 0;
  text-align: center;
  .loading-text { font-size: 26rpx; color: #AE9D92; }
}

.qa-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}
.q-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.q-index {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #E8855A;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  text-align: center;
  line-height: 44rpx;
}
.q-text {
  flex: 1;
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.5;
  font-weight: 500;
}
.a-input {
  width: 100%;
  min-height: 160rpx;
  background: #F8F2EC;
  border-radius: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.6;
}
.a-actions {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.voice-btn {
  background: #fff;
  border: 2rpx solid #E8855A;
  border-radius: 40rpx;
  padding: 14rpx 36rpx;
  text { font-size: 26rpx; color: #E8855A; }
  &.recording {
    background: #E8855A;
    text { color: #fff; }
  }
}
.transcribe-tip { font-size: 24rpx; color: #C2733E; }

.bottom-spacer { height: 40rpx; }

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 110rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04);
}
.submit-btn {
  flex: 1;
  text-align: center;
  background: #E8855A;
  border-radius: 40rpx;
  padding: 22rpx 0;
  &.disabled { opacity: 0.5; }
  text { color: #fff; font-size: 30rpx; font-weight: 600; }
}
</style>
