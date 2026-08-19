<template>
  <view v-if="items.length" class="evidence">
    <view class="connector" aria-hidden="true">
      <view class="connector-dot" />
      <view class="connector-line" />
    </view>
    <view class="evidence-main">
      <text class="section-label">找到的记忆</text>
      <button
        v-for="item in items.slice(0, 3)"
        :key="`${item.deepLink}-${item.title}`"
        class="evidence-row"
        role="button"
        tabindex="0"
        @click="$emit('open', item.deepLink)"
        @keyup.enter="$emit('open', item.deepLink)"
        @keyup.space="$emit('open', item.deepLink)"
      >
        <view class="evidence-copy">
          <text class="source">{{ sourceLabel(item.sourceType) }} · {{ dateLabel(item.occurredAt) }}</text>
          <text class="title">{{ item.title || '未命名记录' }}</text>
          <text class="snippet">{{ item.snippet }}</text>
        </view>
        <text class="arrow" aria-hidden="true">›</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { VoiceEvidence } from '@/services/realtime/voice-protocol'

defineProps<{ items: VoiceEvidence[] }>()
defineEmits<{ (event: 'open', path: string): void }>()

function sourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    diary: '来自日记',
    material: '来自素材',
    chat_session: '来自对话',
    social_message: '来自聊天',
  }
  return labels[sourceType] || '来自记忆'
}

function dateLabel(timestamp: number): string {
  if (!timestamp) return '时间未记录'
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style scoped lang="scss">
.evidence {
  padding: 0 32rpx 30rpx;
  display: grid;
  grid-template-columns: 26rpx minmax(0, 1fr);
}
.connector { display: flex; flex-direction: column; align-items: center; }
.connector-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: #678873;
}
.connector-line {
  width: 1rpx;
  flex: 1;
  min-height: 80rpx;
  margin-top: 8rpx;
  background: #c7d4ca;
}
.evidence-main { min-width: 0; }
.section-label {
  display: block;
  margin-bottom: 8rpx;
  color: #567260;
  font-size: 22rpx;
  line-height: 1.4;
  font-weight: 700;
}
.evidence-row {
  width: 100%;
  min-height: 128rpx;
  margin: 0;
  padding: 20rpx 4rpx;
  border: 0;
  border-bottom: 1px solid #ded5ce;
  border-radius: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
  text-align: left;
  background: transparent;
}
.evidence-row::after { border: 0; }
.evidence-row:active { background: #f4ece6; }
.evidence-row:focus-visible { outline: 2px solid #52765e; outline-offset: 2px; }
.evidence-copy { flex: 1; min-width: 0; }
.source {
  display: block;
  color: #7b8d7f;
  font-size: 20rpx;
  line-height: 1.4;
}
.title {
  display: block;
  margin-top: 4rpx;
  color: #30241d;
  font-size: 27rpx;
  line-height: 1.4;
  font-weight: 700;
}
.snippet {
  display: -webkit-box;
  margin-top: 5rpx;
  color: #75645a;
  font-size: 23rpx;
  line-height: 1.5;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}
.arrow { color: #938077; font-size: 40rpx; }
</style>
