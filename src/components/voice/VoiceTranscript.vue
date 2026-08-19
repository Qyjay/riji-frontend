<template>
  <view class="transcript">
    <view v-if="!items.length && !activeUserText && !activeAssistantText" class="empty">
      <text class="empty-title">{{ mode === 'social_mission' ? '说说你想找谁' : '现在可以说话' }}</text>
      <text class="empty-copy">
        {{ mode === 'social_mission' ? '时间、地点和边界不清楚时，分身会先问你。' : '涉及过去的事情，分身会先查找可追溯的记忆。' }}
      </text>
    </view>

    <view
      v-for="item in items"
      :key="item.id"
      class="utterance"
      :class="`utterance--${item.role}`"
    >
      <text class="speaker">{{ item.role === 'user' ? '你' : '分身' }}</text>
      <text class="utterance-copy">{{ item.text }}</text>
    </view>

    <view v-if="activeUserText" class="utterance utterance--user utterance--active">
      <text class="speaker">你 · 正在说</text>
      <text class="utterance-copy">{{ activeUserText }}</text>
    </view>

    <view v-if="activeAssistantText" class="utterance utterance--assistant utterance--active">
      <text class="speaker">分身 · 正在回复</text>
      <text class="utterance-copy">{{ activeAssistantText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { VoiceEntryMode } from '@/services/realtime/voice-protocol'
import type { VoiceTranscriptItem } from '@/stores/realtime-voice'

defineProps<{
  mode: VoiceEntryMode
  items: VoiceTranscriptItem[]
  activeUserText: string
  activeAssistantText: string
}>()
</script>

<style scoped lang="scss">
.transcript { padding: 4rpx 32rpx 18rpx; }
.empty {
  min-height: 220rpx;
  padding: 46rpx 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
.empty-title {
  color: #3a2b23;
  font-size: 32rpx;
  line-height: 1.4;
  font-weight: 700;
}
.empty-copy {
  max-width: 560rpx;
  margin: 14rpx auto 0;
  color: #79665b;
  font-size: 25rpx;
  line-height: 1.65;
}
.utterance {
  width: min(600rpx, 88%);
  margin-bottom: 26rpx;
}
.utterance--user {
  margin-left: auto;
  text-align: right;
}
.utterance--assistant {
  margin-right: auto;
  padding-left: 22rpx;
  border-left: 1px solid #b7a195;
}
.speaker {
  display: block;
  margin-bottom: 8rpx;
  color: #917b6e;
  font-size: 21rpx;
  line-height: 1.4;
  font-weight: 600;
}
.utterance--user .speaker { color: #a45f40; }
.utterance--assistant .speaker { color: #50745a; }
.utterance-copy {
  color: #31241d;
  font-size: 30rpx;
  line-height: 1.62;
  font-weight: 450;
  overflow-wrap: anywhere;
}
.utterance--active .utterance-copy { color: #655249; }
</style>
