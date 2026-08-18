<template>
  <view class="page">
    <CustomNavBar title="发起找人" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">
        <text class="eyebrow">TELL YOUR AGENT</text>
        <text class="title">你为什么想找人？</text>
        <text class="lead">说目的就好。分身会整理时间、地点和边界，所有推断都可以修改。</text>

        <view class="intent-box" :class="{ focused: focused }">
          <textarea
            v-model="intent"
            class="intent-input"
            placeholder="例如：周末想找一个人看电影"
            placeholder-class="intent-placeholder"
            maxlength="500"
            :show-confirm-bar="false"
            @focus="focused = true"
            @blur="focused = false"
          />
          <view class="intent-footer">
            <button
              v-if="voiceAvailable"
              class="voice-action"
              role="button"
              tabindex="0"
              aria-label="用实时语音描述找人需求"
              @click="openRealtimeVoice"
              @keyup.enter="openRealtimeVoice"
              @keyup.space="openRealtimeVoice"
            >
              <DoodleIcon name="voice" :size="32" color="#806B60" />
              <text class="voice-copy">语音说</text>
            </button>
            <view
              class="parse-action press-feedback"
              :class="{ disabled: !intent.trim() || parsing }"
              role="button"
              tabindex="0"
              @click="parseIntent"
              @keyup.enter="parseIntent"
            >
              <text class="parse-copy">{{ parsing ? '正在整理' : '让分身理解' }}</text>
              <text class="parse-arrow">→</text>
            </view>
          </view>
        </view>

        <view v-if="questions.length" class="questions">
          <text class="questions-title">分身还会请你确认</text>
          <text v-for="question in questions" :key="question" class="question">· {{ question }}</text>
        </view>

        <view class="mode-heading">
          <text class="mode-title">也可以直接选择</text>
          <text class="mode-note">两种模式使用不同的匹配逻辑</text>
        </view>

        <view class="mode-row short" role="button" tabindex="0" @click="openMode('short_term')" @keyup.enter="openMode('short_term')">
          <view class="mode-icon">
            <DoodleIcon name="calendar" :size="46" color="#557FA5" />
          </view>
          <view class="mode-main">
            <text class="mode-name">一起做件事</text>
            <text class="mode-desc">电影、剧本杀、吃饭、运动、临时组队</text>
            <view class="example-line">
              <text class="example-text">时间、地点、名额优先</text>
            </view>
          </view>
          <text class="row-arrow">›</text>
        </view>

        <view class="mode-row long" role="button" tabindex="0" @click="openMode('long_term')" @keyup.enter="openMode('long_term')">
          <view class="mode-icon">
            <DoodleIcon name="heart" :size="46" color="#B75C79" />
          </view>
          <view class="mode-main">
            <text class="mode-name">慢慢认识一个人</text>
            <text class="mode-desc">恋爱、交友、合租、长期学习或运动伙伴</text>
            <view class="example-line">
              <text class="example-text">关系目的、生活方式和边界优先</text>
            </view>
          </view>
          <text class="row-arrow">›</text>
        </view>

        <view class="examples">
          <text class="examples-title">你可以这样说</text>
          <view v-for="example in examples" :key="example" class="example" @click="intent = example">
            <text class="example-copy">{{ example }}</text>
            <DoodleIcon name="plus" :size="26" color="#9B7A67" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { parseMission } from '@/services/api/mission'
import type { MissionMode } from '@/services/api/mission'
import {
  getRealtimeAudioStartupMessage,
  primeRealtimeAudio,
} from '@/services/realtime/audio'
import { getRealtimeVoiceHealth } from '@/services/realtime/voice-api'
import { saveMissionDraft } from '@/utils/mission'

const navHeight = ref(64)
const scrollHeight = ref(600)
const intent = ref('')
const focused = ref(false)
const parsing = ref(false)
const questions = ref<string[]>([])
const voiceAvailable = ref(false)
const examples = [
  '周末想找一个人看科幻电影',
  '帮我组一个新手友好的剧本杀局',
  '想认识能长期一起学习的人',
  '下个月想找作息相近的室友',
]

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value
  try {
    const health = await getRealtimeVoiceHealth()
    voiceAvailable.value = health.enabled && health.configured
  } catch {
    voiceAvailable.value = false
  }
})

function openMode(mode: MissionMode) {
  uni.navigateTo({
    url: mode === 'short_term'
      ? '/pages/social/mission-short'
      : '/pages/social/mission-long',
  })
}

async function openRealtimeVoice() {
  try {
    await primeRealtimeAudio()
    uni.navigateTo({
      url: '/pages/chat/voice-call?mode=social_mission',
    })
  } catch (error) {
    uni.showToast({
      title: getRealtimeAudioStartupMessage(error),
      icon: 'none',
    })
  }
}

async function parseIntent() {
  if (!intent.value.trim() || parsing.value) return
  parsing.value = true
  try {
    const result = await parseMission(intent.value.trim())
    saveMissionDraft(result.draft)
    questions.value = result.questions
    uni.navigateTo({
      url: result.draft.mode === 'short_term'
        ? '/pages/social/mission-short'
        : '/pages/social/mission-long',
    })
  } catch (error: any) {
    uni.showToast({
      title: error?.message || '暂时没理解清楚，可以手动选择模式',
      icon: 'none',
    })
  } finally {
    parsing.value = false
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
[role='button']:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 38rpx 32rpx 80rpx; }
.eyebrow { display: block; color: #A66C4E; font-size: 19rpx; letter-spacing: 3rpx; margin-bottom: 10rpx; }
.title { display: block; font-size: 46rpx; line-height: 1.25; font-weight: 750; color: #2D211A; margin-left: -2rpx; }
.lead { display: block; max-width: 620rpx; margin-top: 16rpx; color: #746158; font-size: 26rpx; line-height: 1.65; }
.intent-box { margin-top: 36rpx; padding: 22rpx; border: 2rpx solid #E2D4C9; border-radius: 28rpx 34rpx 25rpx 31rpx; background: #FFFDFC; transition: border-color 180ms ease-out; }
.intent-box.focused { border-color: #E8855A; }
.intent-input { width: 100%; min-height: 190rpx; color: #3A2B23; font-size: 30rpx; line-height: 1.6; }
.intent-placeholder { color: #A7958A; }
.intent-footer { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding-top: 18rpx; border-top: 1rpx solid #EDE3DB; }
.voice-action { min-height: 70rpx; margin: 0; padding: 0 14rpx; border: 0; border-radius: 14rpx; display: flex; align-items: center; gap: 10rpx; background: transparent; }
.voice-action::after { border: 0; }
.voice-action:active { background: #F1E7DF; }
.voice-action:focus-visible { outline: 2px solid #C7633B; outline-offset: 2px; }
.voice-copy { color: #806B60; font-size: 24rpx; }
.parse-action { min-width: 240rpx; min-height: 76rpx; margin-left: auto; padding: 0 20rpx; border-radius: 21rpx; background: #D96F42; display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.parse-action.disabled { opacity: 0.45; }
.parse-copy, .parse-arrow { color: #FFF9F5; font-size: 26rpx; font-weight: 650; }
.questions { margin-top: 20rpx; padding: 22rpx 24rpx; background: #F5ECE5; border-radius: 20rpx; }
.questions-title { display: block; font-size: 24rpx; color: #5F4B40; font-weight: 600; margin-bottom: 8rpx; }
.question { display: block; color: #816B5E; font-size: 23rpx; line-height: 1.6; }
.mode-heading { display: flex; align-items: baseline; justify-content: space-between; margin: 54rpx 0 18rpx; }
.mode-title { font-size: 32rpx; color: #33261F; font-weight: 700; }
.mode-note { font-size: 21rpx; color: #958177; }
.mode-row { display: flex; align-items: center; gap: 20rpx; min-height: 174rpx; padding: 24rpx 22rpx; margin-bottom: 16rpx; border: 1rpx solid #DFD2C8; border-radius: 26rpx; }
.mode-row.short { background: #F3F7FA; }
.mode-row.long { background: #FAF2F4; }
.mode-icon { width: 82rpx; height: 82rpx; border-radius: 25rpx; background: #FFFDFC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mode-main { flex: 1; min-width: 0; }
.mode-name { display: block; color: #33261F; font-size: 30rpx; font-weight: 700; }
.mode-desc { display: block; color: #756157; font-size: 23rpx; line-height: 1.5; margin: 8rpx 0; }
.example-text { color: #8C6D5D; font-size: 21rpx; }
.row-arrow { color: #A79287; font-size: 42rpx; }
.examples { margin-top: 46rpx; }
.examples-title { display: block; font-size: 27rpx; color: #43332A; font-weight: 650; margin-bottom: 12rpx; }
.example { min-height: 84rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; border-bottom: 1rpx solid #E8DDD3; }
.example-copy { flex: 1; color: #6D594F; font-size: 25rpx; line-height: 1.45; }
</style>
