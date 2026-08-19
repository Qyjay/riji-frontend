<template>
  <view v-if="confirmation" class="confirmation" aria-live="assertive">
    <view class="confirmation-copy">
      <text class="label">需要你确认</text>
      <text class="title">{{ confirmation.title }}</text>
      <text
        v-for="line in confirmation.summary"
        :key="line"
        class="summary-line"
      >{{ line }}</text>
      <text class="boundary">不会自动发帖、试聊或申请认识</text>
      <text v-if="remainingSec <= 30" class="countdown">
        {{ expired ? '确认已过期，请重新整理任务' : `还剩 ${remainingSec} 秒` }}
      </text>
    </view>
    <view class="actions">
      <button
        class="secondary-button"
        role="button"
        tabindex="0"
        :disabled="expired || resolving"
        @click="$emit('resolve', 'reject')"
        @keyup.enter="$emit('resolve', 'reject')"
        @keyup.space="$emit('resolve', 'reject')"
      >
        {{ confirmation.rejectLabel }}
      </button>
      <button
        class="primary-button"
        role="button"
        tabindex="0"
        :disabled="expired || resolving"
        @click="$emit('resolve', 'approve')"
        @keyup.enter="$emit('resolve', 'approve')"
        @keyup.space="$emit('resolve', 'approve')"
      >
        {{ resolving ? '正在开始' : confirmation.approveLabel }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  ConfirmationDecision,
  VoiceConfirmation,
} from '@/services/realtime/voice-protocol'

const props = defineProps<{
  confirmation?: VoiceConfirmation
  resolving?: boolean
}>()
defineEmits<{
  (event: 'resolve', decision: ConfirmationDecision): void
}>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
const remainingSec = computed(() => {
  if (!props.confirmation) return 0
  return Math.max(0, Math.ceil((props.confirmation.expiresAt - now.value) / 1000))
})
const expired = computed(() => remainingSec.value <= 0)

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.confirmation {
  flex: 0 0 auto;
  max-height: 44vh;
  padding: 24rpx 32rpx 20rpx;
  border-top: 1px solid #dacfc5;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #fffaf5;
  overflow: hidden;
}
.confirmation-copy {
  width: 100%;
  max-width: 680rpx;
  min-height: 0;
  margin: 0 auto;
  overflow-y: auto;
}
.label {
  display: block;
  color: #9b6a43;
  font-size: 20rpx;
  line-height: 1.4;
  font-weight: 700;
}
.title {
  display: block;
  margin-top: 6rpx;
  color: #2f231c;
  font-size: 28rpx;
  line-height: 1.45;
  font-weight: 750;
}
.summary-line {
  display: block;
  margin-top: 6rpx;
  color: #66544a;
  font-size: 23rpx;
  line-height: 1.5;
}
.boundary {
  display: block;
  margin-top: 12rpx;
  color: #54705d;
  font-size: 21rpx;
  line-height: 1.5;
}
.countdown {
  display: block;
  margin-top: 8rpx;
  color: #a04f47;
  font-size: 21rpx;
  line-height: 1.45;
}
.actions {
  flex: 0 0 auto;
  width: 100%;
  max-width: 680rpx;
  margin: 20rpx auto 0;
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 16rpx;
}
.secondary-button,
.primary-button {
  min-height: 96rpx;
  margin: 0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  line-height: 1.3;
  font-weight: 700;
}
.secondary-button {
  color: #5f4c42;
  border: 1px solid #cdbdb2;
  background: transparent;
}
.primary-button { color: #fffaf6; background: #bf613d; border: 0; }
.secondary-button::after,
.primary-button::after { border: 0; }
.secondary-button:active:not([disabled]) { background: #f1e7df; }
.primary-button:active:not([disabled]) { background: #a95132; }
button[disabled] { opacity: 0.46; }
button:focus-visible { outline: 2px solid #8f472d; outline-offset: 2px; }
</style>
