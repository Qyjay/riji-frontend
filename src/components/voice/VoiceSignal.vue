<template>
  <view
    class="signal"
    :class="[`signal--${phase}`, { 'signal--reduced': reducedMotion }]"
    role="img"
    :aria-label="statusText"
  >
    <view class="signal-line">
      <view
        v-for="(height, index) in bars"
        :key="index"
        class="signal-bar"
        :style="{ height: `${height}rpx` }"
      />
    </view>
    <view class="status-line" aria-live="polite">
      <view class="status-mark" />
      <text class="status-copy">{{ statusText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { VoicePhase } from '@/services/realtime/voice-protocol'

const props = defineProps<{
  phase: VoicePhase
  inputLevel: number
  outputLevel: number
  toolLabel?: string
}>()

const reducedMotion = ref(false)
const visualLevel = ref(0.08)
let frameTimer: ReturnType<typeof setTimeout> | null = null

const statusText = computed(() => {
  const labels: Record<VoicePhase, string> = {
    idle: '准备通话',
    requesting_permission: '等待麦克风权限',
    connecting: '正在连接分身',
    ready: '可以开始了',
    listening: '正在听',
    thinking: '正在想',
    speaking: '分身在说',
    interrupted: '已停下',
    tool_running: props.toolLabel || '正在查找',
    awaiting_confirmation: '等你确认',
    reconnecting: '连接中断，正在恢复',
    closing: '正在结束',
    closed: '通话已结束',
    error: '通话暂时中断',
  }
  return labels[props.phase]
})

const bars = computed(() => {
  const level = reducedMotion.value ? 0.12 : visualLevel.value
  return Array.from({ length: 15 }, (_, index) => {
    const centerDistance = Math.abs(index - 7) / 7
    const rhythm = 0.52 + Math.sin(index * 1.7 + level * 4) * 0.22
    const emphasis = 1 - centerDistance * 0.36
    return Math.round(14 + Math.max(0.08, level) * 74 * rhythm * emphasis)
  })
})

function clearFrameTimer() {
  if (!frameTimer) return
  clearTimeout(frameTimer)
  frameTimer = null
}

function scheduleLevel() {
  if (frameTimer) return
  frameTimer = setTimeout(() => {
    frameTimer = null
    const next = props.phase === 'speaking' ? props.outputLevel : props.inputLevel
    visualLevel.value = Math.max(0.06, Math.min(1, next))
  }, 33)
}

watch(
  () => [props.inputLevel, props.outputLevel, props.phase],
  scheduleLevel,
)

onMounted(() => {
  // App 端没有 window.matchMedia，减少动效只在 H5 读取系统偏好
  // #ifdef H5
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  // #endif
})

onBeforeUnmount(() => {
  clearFrameTimer()
})
</script>

<style scoped lang="scss">
.signal {
  flex: 0 0 210rpx;
  height: 210rpx;
  min-height: 210rpx;
  box-sizing: border-box;
  padding: 24rpx 32rpx 18rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.signal-line {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9rpx;
}
.signal-bar {
  width: 6rpx;
  min-height: 12rpx;
  max-height: 88rpx;
  border-radius: 6rpx;
  background: #cf7049;
  transform-origin: center;
  transition: height 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease-out;
}
.signal--speaking .signal-bar { background: #5f876b; }
.signal--thinking .signal-bar,
.signal--connecting .signal-bar,
.signal--reconnecting .signal-bar { background: #9a887c; }
.signal--awaiting_confirmation .signal-bar { background: #b28a4b; }
.signal--error .signal-bar { background: #a84c45; }
.signal--reduced .signal-bar { height: 22rpx !important; transition: none; }
.status-line {
  min-height: 50rpx;
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.status-mark {
  width: 13rpx;
  height: 13rpx;
  border-radius: 50%;
  background: #cf7049;
}
.signal--speaking .status-mark { background: #5f876b; }
.signal--thinking .status-mark,
.signal--connecting .status-mark,
.signal--reconnecting .status-mark { background: #7c6b61; }
.signal--awaiting_confirmation .status-mark { background: #a27835; }
.status-copy {
  color: #4a392f;
  font-size: 25rpx;
  line-height: 1.4;
  font-weight: 600;
}
@media (prefers-reduced-motion: reduce) {
  .signal-bar { transition: none; }
}
@media (orientation: landscape) {
  .signal {
    flex-basis: 96rpx;
    height: 96rpx;
    min-height: 96rpx;
    padding: 4rpx 32rpx 0;
  }
  .signal-line { height: 52rpx; }
  .status-line { min-height: 36rpx; margin-top: 0; }
}
</style>
