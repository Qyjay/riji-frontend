<template>
  <view v-if="toolLabel || missionSummary || questions.length" class="tool-region">
    <view v-if="toolLabel" class="tool-running" aria-live="polite">
      <DoodleIcon name="search" :size="28" color="#76645A" />
      <text>{{ toolLabel }}</text>
    </view>

    <view v-if="missionSummary" class="mission-summary">
      <text class="summary-title">{{ missionSummary.activity || '找人任务' }}</text>
      <view class="fact-grid">
        <view v-if="missionSummary.time" class="fact">
          <text class="fact-label">时间</text>
          <text class="fact-value">{{ missionSummary.time }}</text>
        </view>
        <view v-if="missionSummary.location" class="fact">
          <text class="fact-label">地点</text>
          <text class="fact-value">{{ missionSummary.location }}</text>
        </view>
        <view v-if="missionSummary.headcount" class="fact">
          <text class="fact-label">人数</text>
          <text class="fact-value">{{ missionSummary.headcount }}</text>
        </view>
        <view v-if="missionSummary.scope" class="fact">
          <text class="fact-label">范围</text>
          <text class="fact-value">{{ missionSummary.scope }}</text>
        </view>
      </view>
      <text v-if="missionSummary.notice" class="notice">{{ missionSummary.notice }}</text>
    </view>

    <view v-if="questions.length" class="questions">
      <text class="questions-label">还需要确认</text>
      <text v-for="question in questions" :key="question" class="question">{{ question }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'
import type { MissionVoiceSummary } from '@/services/realtime/voice-protocol'

defineProps<{
  toolLabel?: string
  missionSummary?: MissionVoiceSummary
  questions: string[]
}>()
</script>

<style scoped lang="scss">
.tool-region { padding: 0 32rpx 28rpx; }
.tool-running {
  min-height: 66rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #6d5b51;
  font-size: 23rpx;
  background: #f1e9e3;
  border-radius: 14rpx;
}
.mission-summary {
  padding: 24rpx 0 6rpx;
  border-top: 1px solid #ddd2c9;
  border-bottom: 1px solid #ddd2c9;
}
.summary-title {
  display: block;
  color: #33261f;
  font-size: 29rpx;
  line-height: 1.4;
  font-weight: 700;
}
.fact-grid {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx 24rpx;
}
.fact { min-width: 0; }
.fact-label {
  display: block;
  color: #927e72;
  font-size: 20rpx;
  line-height: 1.4;
}
.fact-value {
  display: block;
  margin-top: 3rpx;
  color: #4b3a31;
  font-size: 24rpx;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.notice {
  display: block;
  margin-top: 18rpx;
  color: #58735f;
  font-size: 21rpx;
  line-height: 1.5;
}
.questions { padding-top: 20rpx; }
.questions-label {
  display: block;
  color: #805e46;
  font-size: 22rpx;
  line-height: 1.4;
  font-weight: 700;
}
.question {
  display: block;
  margin-top: 8rpx;
  color: #5f4d42;
  font-size: 25rpx;
  line-height: 1.55;
}
</style>
