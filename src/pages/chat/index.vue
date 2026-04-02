<template>
  <view class="page page-root">
    <CustomNavBar title="AI 伙伴" left-icon="back" right-icon="···" @right-click="handleMenu" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <view class="page-content">
      <!-- AI 伙伴信息卡 -->
      <view class="ai-info-card">
        <view class="ai-info-icon doodle-box-v3">
          <DoodleIcon name="robot" color="#FFFFFF" :size="44" :filtered="false" />
        </view>
        <view class="ai-info-text">
          <text class="ai-info-title">你的 AI 伙伴</text>
          <text class="ai-info-sub">已陪你写了 {{ profile.diaryCount }} 篇日记</text>
          <text class="ai-info-sub">了解你的 {{ interestTags }} 个兴趣标签</text>
        </view>
      </view>

      <!-- 消息列表 -->
      <scroll-view
        class="messages-scroll"
        scroll-y
        :style="{ height: msgScrollHeight + 'px' }"
        :scroll-top="scrollTopVal"
        :scroll-with-animation="!isStreaming"
      >
        <view class="messages-inner">
          <view
            v-for="(msg, idx) in messages"
            :key="idx"
            :id="`msg-${idx}`"
            class="message-wrap"
            :class="msg.role === 'user' ? 'message-wrap--user' : 'message-wrap--ai'"
          >
            <!-- AI avatar -->
            <view v-if="msg.role === 'assistant'" class="msg-avatar doodle-box-v3">
              <DoodleIcon name="robot" color="#FFFFFF" :size="32" :filtered="false" />
            </view>

            <view class="message-bubble" :class="msg.role === 'user' ? 'bubble--user' : 'bubble--ai'">
              <!-- 附件预览 -->
              <view v-if="(msg as any).attachments && (msg as any).attachments.length" class="msg-attachments">
                <view v-for="(att, ai) in (msg as any).attachments" :key="ai" class="msg-attachment-item">
                  <image v-if="att.type === 'image'" :src="att.url" class="att-image-thumb" mode="aspectFill" />
                  <view v-else class="att-file-info">
                    <text class="att-file-icon">📎</text>
                    <text class="att-file-name">{{ att.name }}</text>
                  </view>
                </view>
              </view>
              <text class="bubble-text" :class="msg.role === 'user' ? 'bubble-text--user' : ''">
                {{ msg.content }}
              </text>
            </view>
          </view>

          <!-- AI thinking indicator -->
          <view v-if="isThinking" class="message-wrap message-wrap--ai">
            <view class="msg-avatar doodle-box-v3">
              <DoodleIcon name="robot" color="#FFFFFF" :size="32" :filtered="false" />
            </view>
            <view class="message-bubble bubble--ai">
              <view class="thinking-dots">
                <view class="dot" />
                <view class="dot" />
                <view class="dot" />
              </view>
            </view>
          </view>

          <!-- Streaming message -->
          <view v-if="isStreaming" id="streaming-msg" class="message-wrap message-wrap--ai">
            <view class="msg-avatar doodle-box-v3">
              <DoodleIcon name="robot" color="#FFFFFF" :size="32" :filtered="false" />
            </view>
            <view class="message-bubble bubble--ai">
              <text class="bubble-text">{{ streamingContent }}<text class="cursor-blink">|</text></text>
            </view>
          </view>

          <!-- 底部占位 -->
          <view class="scroll-bottom-spacer" />
        </view>
      </scroll-view>

      <!-- 快捷操作 -->
      <view class="quick-actions">
        <scroll-view class="quick-scroll" scroll-x>
          <view
            v-for="action in quickActions"
            :key="action.label"
            class="quick-btn press-feedback"
            @click="handleQuickAction(action.path)"
          >
            <view class="quick-icon-wrap">
              <DoodleIcon :name="action.iconName" :color="action.iconColor" :size="28" />
            </view>
            <text class="quick-label">{{ action.label }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 附件预览区 -->
      <view v-if="pendingAttachments.length > 0" class="pending-attachments">
        <scroll-view class="att-scroll" scroll-x>
          <view class="att-list">
            <view v-for="(att, idx) in pendingAttachments" :key="idx" class="att-item">
              <image v-if="att.type === 'image'" :src="att.url" class="att-thumb" mode="aspectFill" />
              <view v-else class="att-file-card">
                <text class="att-file-icon-lg">📎</text>
                <text class="att-file-name-sm">{{ att.name }}</text>
              </view>
              <view class="att-remove" @click="removePendingAttachment(idx)">
                <text class="att-remove-icon">×</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 录音状态提示 -->
      <view v-if="isRecording" class="recording-bar">
        <view class="recording-dot-anim" />
        <text class="recording-text">录音中... {{ recordDuration }}s</text>
        <view class="recording-cancel" @click="cancelRecording">
          <text class="recording-cancel-text">取消</text>
        </view>
      </view>

      <!-- 输入栏 — 非 fixed，正常流 -->
      <view class="input-bar">
        <view class="input-row">
          <view class="attach-btn press-feedback" @click="handleAttach">
            <DoodleIcon name="attach" color="#AE9D92" :size="36" />
          </view>
          <input
            v-model="inputText"
            class="input-field"
            placeholder="说点什么..."
            placeholder-class="input-placeholder"
            confirm-type="send"
            :cursor-spacing="12"
            @confirm="handleSend"
          />
          <view class="voice-btn press-feedback" :class="{ 'voice-btn--active': isRecording }" @click="toggleRecording">
            <DoodleIcon name="voice" :color="isRecording ? '#E8855A' : '#AE9D92'" :size="36" />
          </view>
          <view class="send-btn" :class="{ 'send-btn--active': inputText.trim() || pendingAttachments.length > 0 }" @click="handleSend">
            <DoodleIcon name="send" color="#FFFFFF" :size="36" :filtered="false" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getUserProfile } from '@/services/api/user'
import type { UserProfile } from '@/services/api/user'
import { chat, getChatHistory } from '@/services/api/ai'
import type { ChatMessage } from '@/services/api/ai'
import { closeSession } from '@/services/api/chat'
import { uploadVoice } from '@/services/api/material'

interface Attachment {
  type: 'image' | 'file'
  url: string
  name: string
}

interface ExtendedMessage extends ChatMessage {
  attachments?: Attachment[]
}

const quickActions = [
  { iconName: 'pen',     iconColor: '#E8855A', label: '记录素材', path: '/pages/write/index' },
  { iconName: 'crystal', iconColor: '#D4728A', label: '看运势', path: '/pages/fortune/index' },
  { iconName: 'tomato',  iconColor: '#E8855A', label: '开始番茄', path: '/pages/study/pomodoro' },
  { iconName: 'calendar', iconColor: '#C8A86B', label: '纪念日', path: '/pages/anniversary/index' },
]

const profile = ref<UserProfile>({
  name: 'Kylin',
  school: '南开大学',
  major: '软件工程',
  level: 12,
  diaryCount: 127,
  streakDays: 23,
  pomodoroCount: 247,
  avatar: '',
})

const interestTags = ref(23)

const messages = ref<ExtendedMessage[]>([])
const inputText = ref('')
const isThinking = ref(false)
const isStreaming = ref(false)
const streamingContent = ref('')
const scrollTopVal = ref(0)

// 附件
const pendingAttachments = ref<Attachment[]>([])

// 录音
const isRecording = ref(false)
const recordDuration = ref(0)
let recordTimer: ReturnType<typeof setInterval> | null = null
let recorderManager: UniApp.RecorderManager | null = null

function scrollToBottom() {
  nextTick(() => {
    scrollTopVal.value = scrollTopVal.value === 99998 ? 99999 : 99998
  })
}

// 页面卸载时关闭对话段
onUnload(async () => {
  stopRecordTimer()
  try {
    const result = await closeSession()
    if (result.materialGenerated) {
      uni.showToast({ title: '已记录为今日素材 ✓', icon: 'none', duration: 1500 })
    }
  } catch {}
})

async function handleSend() {
  const text = inputText.value.trim()
  const atts = [...pendingAttachments.value]
  if ((!text && atts.length === 0) || isThinking.value || isStreaming.value) return

  let msgContent = text
  if (atts.length > 0 && !text) {
    msgContent = atts.map(a => a.type === 'image' ? '[图片]' : `[文件: ${a.name}]`).join(' ')
  }

  messages.value.push({
    role: 'user',
    content: msgContent,
    timestamp: Date.now(),
    attachments: atts.length > 0 ? atts : undefined,
  })
  inputText.value = ''
  pendingAttachments.value = []
  isThinking.value = true
  scrollToBottom()

  try {
    let sendText = msgContent
    if (atts.length > 0) {
      const attDesc = atts.map(a => a.type === 'image' ? `[用户上传了图片: ${a.name}]` : `[用户上传了文件: ${a.name}]`).join('\n')
      sendText = attDesc + (text ? '\n' + text : '')
    }

    const response = await chat(sendText)
    isThinking.value = false

    // 流式打字机
    isStreaming.value = true
    streamingContent.value = ''
    scrollToBottom()

    const chunkSize = 2
    for (let i = 0; i < response.length; i += chunkSize) {
      await new Promise(resolve => setTimeout(resolve, 25))
      streamingContent.value = response.slice(0, i + chunkSize)
      if (i % 40 === 0) scrollToBottom()
    }
    streamingContent.value = response

    isStreaming.value = false
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    })
    streamingContent.value = ''
    scrollToBottom()
  } catch {
    isThinking.value = false
    isStreaming.value = false
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

// ── 附件 ──
function handleAttach() {
  uni.showActionSheet({
    itemList: ['📷 拍照', '🖼️ 从相册选择', '📎 选择文件'],
    success: (res) => {
      if (res.tapIndex === 0) pickImage(['camera'])
      else if (res.tapIndex === 1) pickImage(['album'])
      else if (res.tapIndex === 2) pickFile()
    },
  })
}

function pickImage(sourceType: string[]) {
  const remain = 9 - pendingAttachments.value.filter(a => a.type === 'image').length
  if (remain <= 0) {
    uni.showToast({ title: '最多添加 9 张图片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: sourceType as any,
    success: (res) => {
      const newAtts: Attachment[] = res.tempFilePaths.map((p, i) => ({
        type: 'image' as const,
        url: p,
        name: `图片${pendingAttachments.value.length + i + 1}.jpg`,
      }))
      pendingAttachments.value = [...pendingAttachments.value, ...newAtts]
    },
  })
}

function pickFile() {
  // #ifdef APP-PLUS
  uni.chooseFile({
    count: 5,
    type: 'all',
    success: (res: any) => {
      const files = res.tempFiles || []
      const newAtts: Attachment[] = files.map((f: any) => ({
        type: 'file' as const,
        url: f.path || f.uri,
        name: f.name || '未知文件',
      }))
      pendingAttachments.value = [...pendingAttachments.value, ...newAtts]
    },
  })
  // #endif

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp'
  input.onchange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    Array.from(files).forEach(f => {
      const url = URL.createObjectURL(f)
      const isImg = f.type.startsWith('image/')
      pendingAttachments.value.push({
        type: isImg ? 'image' : 'file',
        url,
        name: f.name,
      })
    })
  }
  input.click()
  // #endif
}

function removePendingAttachment(idx: number) {
  pendingAttachments.value.splice(idx, 1)
}

// ── 语音录入（转文字）──
function initRecorder() {
  if (recorderManager) return
  recorderManager = uni.getRecorderManager()
  recorderManager.onStop(async (res: any) => {
    stopRecordTimer()
    isRecording.value = false
    if (!res.tempFilePath) return

    uni.showLoading({ title: '语音转文字中...', mask: true })
    try {
      const result = await uploadVoice(res.tempFilePath)
      uni.hideLoading()
      const transcription = result.transcription || ''
      if (transcription) {
        inputText.value += (inputText.value ? ' ' : '') + transcription
        uni.showToast({ title: '语音已转文字', icon: 'success', duration: 1000 })
      } else {
        uni.showToast({ title: '未识别到语音内容', icon: 'none' })
      }
    } catch {
      uni.hideLoading()
      uni.showToast({ title: '语音转写失败', icon: 'none' })
    }
  })
  recorderManager.onError(() => {
    stopRecordTimer()
    isRecording.value = false
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
}

function toggleRecording() {
  if (isRecording.value) stopRecording()
  else startRecording()
}

function startRecording() {
  initRecorder()
  isRecording.value = true
  recordDuration.value = 0
  recordTimer = setInterval(() => {
    recordDuration.value++
    if (recordDuration.value >= 60) stopRecording()
  }, 1000)
  recorderManager!.start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1 })
}

function stopRecording() {
  if (!recorderManager) return
  recorderManager.stop()
  stopRecordTimer()
}

function cancelRecording() {
  stopRecording()
  isRecording.value = false
}

function stopRecordTimer() {
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
}

function handleMenu() {
  uni.showActionSheet({
    itemList: ['帮我写日记', '最近有什么纪念日', '看看我的情绪报告', '清除对话'],
    success: async (res) => {
      const commands = ['帮我写日记', '最近有什么纪念日', '看看我的情绪报告', '']
      if (res.tapIndex === 3) { messages.value = []; return }
      const cmd = commands[res.tapIndex]
      if (cmd) { inputText.value = cmd; await handleSend() }
    }
  })
}

function handleQuickAction(path: string) {
  uni.navigateTo({ url: path })
}

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const msgScrollHeight = ref(400)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value
  // AI 信息卡 ~130 + 快捷操作 ~70 + 输入栏 ~110 + 安全区底部 ~34
  msgScrollHeight.value = scrollHeight.value - 344
  try { profile.value = await getUserProfile() } catch {}

  try {
    const history = await getChatHistory(1, 20)
    messages.value = history.list
  } catch {
    messages.value = [{
      role: 'assistant',
      content: '嗨 Kylin！今天过得怎么样？你可以和我聊天、说「帮我写日记」或「最近有什么纪念日」哦 😊',
      timestamp: Date.now(),
    }]
  }
  scrollToBottom()
})
</script>

<style lang="scss" scoped>
.page { background: #FDF8F3; }

.page-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-info-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(44, 31, 20, 0.06);
}

.ai-info-icon {
  width: 80rpx; height: 80rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882) !important;
  border-color: transparent !important;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.2);
}

.ai-info-text { display: flex; flex-direction: column; gap: 4rpx; }
.ai-info-title { font-size: 30rpx; font-weight: 600; color: #2C1F14; }
.ai-info-sub { font-size: 24rpx; color: #AE9D92; }

.messages-scroll { flex: 1; overflow-y: auto; }

.messages-inner {
  padding: 32rpx 32rpx 16rpx;
  display: flex; flex-direction: column; gap: 48rpx;
}

.scroll-bottom-spacer { height: 20rpx; }

.message-wrap { display: flex; align-items: flex-end; gap: 16rpx; }
.message-wrap--ai { justify-content: flex-start; }
.message-wrap--user { justify-content: flex-end; }

.msg-avatar {
  width: 64rpx; height: 64rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882) !important;
  border-color: transparent !important;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.15);
}

.message-bubble { max-width: 70%; padding: 20rpx 28rpx; line-height: 1.6; }
.bubble--ai { background: #F5F0EB; border-radius: 0 20rpx 20rpx 20rpx; }
.bubble--user { background: #E8855A; border-radius: 20rpx 0 20rpx 20rpx; }
.bubble-text { font-size: 30rpx; color: #2C1F14; word-break: break-all; }
.bubble-text--user { color: #FFFFFF; }

.msg-attachments { margin-bottom: 12rpx; }
.msg-attachment-item { margin-bottom: 8rpx; }
.att-image-thumb { width: 200rpx; height: 200rpx; border-radius: 12rpx; }
.att-file-info { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 0; }
.att-file-icon { font-size: 28rpx; }
.att-file-name { font-size: 24rpx; color: #8A7668; max-width: 300rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.thinking-dots { display: flex; gap: 10rpx; padding: 8rpx 0; align-items: center; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #AE9D92; animation: bounce 1.2s ease infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-10rpx); } }

.cursor-blink { animation: blink 0.8s step-end infinite; color: #E8855A; }
@keyframes blink { 50% { opacity: 0; } }

.quick-actions {
  flex-shrink: 0; background: #FFFFFF;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  padding: 12rpx 0;
}
.quick-scroll { white-space: nowrap; padding: 0 24rpx; }
.quick-btn {
  display: inline-flex; align-items: center; gap: 12rpx;
  background: #FDF8F3; border-radius: 20rpx; padding: 12rpx 24rpx;
  margin-right: 12rpx; cursor: pointer;
  border: 1px solid rgba(232, 133, 90, 0.1);
}
.quick-icon-wrap { display: flex; align-items: center; justify-content: center; }
.quick-label { font-size: 24rpx; color: #4A3628; white-space: nowrap; }

/* 附件预览区 */
.pending-attachments {
  flex-shrink: 0; background: #FEFAF7;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  padding: 12rpx 0;
}
.att-scroll { white-space: nowrap; padding: 0 24rpx; }
.att-list { display: flex; gap: 12rpx; }
.att-item { position: relative; flex-shrink: 0; }
.att-thumb { width: 120rpx; height: 120rpx; border-radius: 12rpx; }
.att-file-card {
  width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #F5F0EB;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx;
}
.att-file-icon-lg { font-size: 36rpx; }
.att-file-name-sm { font-size: 18rpx; color: #8A7668; max-width: 100rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.att-remove {
  position: absolute; top: -8rpx; right: -8rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
}
.att-remove-icon { color: #fff; font-size: 24rpx; line-height: 1; }

/* 录音状态条 */
.recording-bar {
  flex-shrink: 0; display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 32rpx; background: #FEF0F0;
  border-top: 1px solid rgba(232, 90, 90, 0.15);
}
.recording-dot-anim { width: 16rpx; height: 16rpx; border-radius: 50%; background: #E85A5A; animation: pulse 1s ease infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
.recording-text { flex: 1; font-size: 26rpx; color: #C05030; font-weight: 500; }
.recording-cancel { padding: 8rpx 24rpx; border-radius: 20rpx; background: rgba(232, 90, 90, 0.1); }
.recording-cancel-text { font-size: 24rpx; color: #C05030; }

/* 输入栏 — 正常流（非 fixed） */
.input-bar {
  flex-shrink: 0; background: #FFFFFF;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.input-row { display: flex; align-items: center; gap: 12rpx; }
.attach-btn, .voice-btn {
  width: 72rpx; height: 72rpx; border-radius: 50%; background: #F5F0EB;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer;
}
.voice-btn--active { background: #FEE8E0; }
.input-field {
  flex: 1; height: 72rpx; background: #F5F0EB; border-radius: 36rpx;
  padding: 0 28rpx; font-size: 28rpx; color: #2C1F14;
}
.input-placeholder { color: #AE9D92; font-size: 28rpx; }
.send-btn {
  width: 72rpx; height: 72rpx; border-radius: 50%; background: #E8DDD5;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  cursor: pointer; transition: background 0.2s;
}
.send-btn--active { background: #E8855A; }
</style>
