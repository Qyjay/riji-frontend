<template>
  <view class="page">
    <CustomNavBar title="补写素材" left-icon="back" />
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <view v-if="photos.length === 0" class="empty">
      <text>没有可补写的照片，请先返回选择</text>
    </view>

    <template v-else>
      <!-- 进度指示 -->
      <view class="progress-bar">
        <text class="progress-text">{{ currentIndex + 1 }} / {{ photos.length }}</text>
        <text class="progress-time">{{ formatDate(current.takenAt) }} · {{ formatTime(current.takenAt) }} {{ detectPeriod(current.takenAt).label }}</text>
      </view>

      <swiper
        class="swiper"
        :current="currentIndex"
        :style="{ height: swiperHeight + 'px' }"
        @change="onSwiperChange"
      >
        <swiper-item v-for="(item, idx) in photos" :key="item.id">
          <scroll-view scroll-y class="card-scroll" :style="{ height: swiperHeight + 'px' }">
            <image class="card-photo" :src="item.localPath || item.url" mode="widthFix" />

            <view class="hint-box">
              <text class="hint-text">💡 想想这一刻：和谁在一起？发生了什么？什么感觉？</text>
            </view>

            <textarea
              class="note-input"
              :value="item.userNote"
              placeholder="写下当时的回忆，或长按下方按钮语音输入…"
              :maxlength="500"
              @input="onNoteInput(item.id, $event)"
            />

            <view class="action-row">
              <view
                class="voice-btn"
                :class="{ recording: isRecording && recordingId === item.id }"
                @touchstart.prevent="startRecording(item.id)"
                @touchend.prevent="stopRecording"
                @touchcancel.prevent="stopRecording"
              >
                <text>{{ isRecording && recordingId === item.id ? `松开结束 ${recordDuration}s` : '🎤 长按录音' }}</text>
              </view>
            </view>

            <view v-if="transcribingId === item.id" class="transcribe-tip">
              <text>语音转写中…</text>
            </view>
          </scroll-view>
        </swiper-item>
      </swiper>

      <!-- 底部导航 -->
      <view class="footer-bar">
        <view class="nav-btn" :class="{ disabled: currentIndex === 0 }" @click="prev">
          <text>← 上一张</text>
        </view>
        <view v-if="currentIndex < photos.length - 1" class="nav-btn primary" @click="next">
          <text>下一张 →</text>
        </view>
        <view v-else class="nav-btn primary" @click="goCompanion">
          <text>完成填写</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { useBackfillStore } from '@/stores/backfill'
import { speechToText, speechToTextFile } from '@/services/api/ai'
import { getBackfillQuestions } from '@/services/api/backfill'
import { formatDate, formatTime, detectPeriod } from '@/utils/exif'

const navPlaceholderHeight = ref(64)
const swiperHeight = ref(600)
const store = useBackfillStore()
const photos = computed(() => store.photos)
const currentIndex = ref(0)
const current = computed(() => photos.value[currentIndex.value] || ({ takenAt: Date.now() } as any))

// 录音状态
const isRecording = ref(false)
const recordingId = ref('')
const recordDuration = ref(0)
const transcribingId = ref('')
let recordTimer: ReturnType<typeof setInterval> | null = null
let cancelRecordingFlag = false

// uni 录音
let recorderManager: UniApp.RecorderManager | null = null
// H5 录音
let h5MediaRecorder: MediaRecorder | null = null
let h5MediaStream: MediaStream | null = null
let h5RecordChunks: BlobPart[] = []

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  swiperHeight.value = info.windowHeight - navPlaceholderHeight.value - 150
})

onBeforeUnmount(() => {
  stopRecordTimer()
  h5MediaStream?.getTracks().forEach((t) => t.stop())
})

function onSwiperChange(e: any) {
  currentIndex.value = e.detail.current
}

function onNoteInput(id: string, e: any) {
  store.updatePhotoNote(id, e.detail.value)
}

function prev() {
  if (currentIndex.value > 0) currentIndex.value -= 1
}
function next() {
  if (currentIndex.value < photos.value.length - 1) currentIndex.value += 1
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

async function startRecording(id: string) {
  if (isRecording.value) return
  recordingId.value = id
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
      void transcribe(res.tempFilePath, id)
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
      const file = new File([blob], `backfill-voice-${Date.now()}.${ext}`, { type })
      void transcribe(file, recordingId.value)
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

async function transcribe(source: string | File, id: string) {
  transcribingId.value = id
  try {
    const res = typeof source === 'string' ? await speechToText(source) : await speechToTextFile(source)
    const text = (res.text || '').trim()
    if (text) {
      const existing = photos.value.find((p) => p.id === id)?.userNote || ''
      const merged = existing ? `${existing} ${text}` : text
      store.updatePhotoNote(id, merged)
      uni.showToast({ title: '语音已转文字', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '语音转写失败', icon: 'none' })
  } finally {
    transcribingId.value = ''
  }
}

function goCompanion() {
  // 预拉取访谈问题：进入下一页前在后台发起，避免用户在问卷页空等。
  void prefetchQuestions()
  uni.navigateTo({ url: '/pages/write/backfill-companion' })
}

async function prefetchQuestions() {
  if (store.questionsLoading || store.questions.length > 0) return
  store.questionsLoading = true
  try {
    const list = await getBackfillQuestions({
      date: store.targetDate,
      photos: store.photos.map((p) => ({
        url: p.url,
        takenAt: p.takenAt,
        userNote: p.userNote,
        location: p.location,
      })),
    })
    store.setQuestions(list)
  } catch {
    // 失败时问卷页会自行兜底
  } finally {
    store.questionsLoading = false
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FDF8F3; }
.nav-placeholder { width: 100%; }

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
  text { font-size: 28rpx; color: #AE9D92; }
}

.progress-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 32rpx;
  .progress-text { font-size: 30rpx; font-weight: 600; color: #2C1F14; }
  .progress-time { font-size: 24rpx; color: #AE9D92; }
}

.swiper { width: 100%; }
.card-scroll { box-sizing: border-box; padding: 0 32rpx; }

.card-photo {
  width: 100%;
  border-radius: 24rpx;
  background: #EFE6DD;
}

.hint-box {
  margin-top: 24rpx;
  background: #FFF3E8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  .hint-text { font-size: 24rpx; color: #C2733E; line-height: 1.5; }
}

.note-input {
  margin-top: 20rpx;
  width: 100%;
  min-height: 200rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.6;
}

.action-row {
  margin-top: 24rpx;
  display: flex;
  justify-content: center;
}
.voice-btn {
  background: #fff;
  border: 2rpx solid #E8855A;
  border-radius: 48rpx;
  padding: 22rpx 60rpx;
  text { font-size: 28rpx; color: #E8855A; }
  &.recording {
    background: #E8855A;
    text { color: #fff; }
  }
}

.transcribe-tip {
  margin-top: 16rpx;
  text-align: center;
  text { font-size: 24rpx; color: #C2733E; }
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  gap: 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04);
}
.nav-btn {
  flex: 1;
  text-align: center;
  border-radius: 40rpx;
  padding: 22rpx 0;
  background: #F2E9E1;
  text { font-size: 30rpx; color: #6B5B4F; }
  &.disabled { opacity: 0.4; }
  &.primary {
    background: #E8855A;
    text { color: #fff; font-weight: 600; }
  }
}
</style>
