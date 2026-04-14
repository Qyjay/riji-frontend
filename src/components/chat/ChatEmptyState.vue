<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

const props = withDefaults(defineProps<{
  suggestions?: string[]
  actions?: Array<{ iconName: string; iconColor: string; label: string; path: string }>
}>(), {
  suggestions: () => ['帮我写一段今天的日记', '最近有什么纪念日', '我今天有点累，陪我聊聊'],
  actions: () => [],
})

const emit = defineEmits<{
  (e: 'usePrompt', prompt: string): void
  (e: 'navigate', path: string): void
}>()
</script>

<template>
  <view class="empty-state">
    <view class="empty-hero">
      <view class="empty-icon">
        <DoodleIcon name="robot" color="#FFFFFF" :size="50" :filtered="false" />
      </view>
      <text class="empty-title">今天想聊点什么？</text>
      <text class="empty-copy">我可以陪你整理心情、梳理今天发生的事，也可以把聊天沉淀成写日记的素材。</text>
    </view>

    <view class="empty-suggestions">
      <view
        v-for="item in props.suggestions"
        :key="item"
        class="suggestion-card press-feedback"
        @click="emit('usePrompt', item)"
      >
        <text class="suggestion-text">{{ item }}</text>
      </view>
    </view>

    <view v-if="props.actions.length" class="empty-actions">
      <view
        v-for="action in props.actions"
        :key="action.label"
        class="empty-action-chip press-feedback"
        @click="emit('navigate', action.path)"
      >
        <DoodleIcon :name="action.iconName" :color="action.iconColor" :size="22" />
        <text class="empty-action-label">{{ action.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.empty-state {
  padding: 44rpx 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.empty-hero {
  padding: 28rpx 24rpx 20rpx;
  border-radius: 30rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 249, 243, 0.72));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  box-shadow: 0 18rpx 36rpx rgba(154, 102, 61, 0.06);
}

.empty-icon {
  width: 92rpx;
  height: 92rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #e8855a, #f0a882);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 38rpx;
  font-weight: 600;
  color: #2c1f14;
  margin-bottom: 14rpx;
}

.empty-copy {
  font-size: 26rpx;
  line-height: 1.75;
  color: #8a7668;
}

.empty-suggestions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 24rpx;
}

.suggestion-card {
  padding: 20rpx 22rpx;
  background: rgba(255, 255, 255, 0.76);
  border-radius: 22rpx;
  border: 1px solid rgba(232, 133, 90, 0.08);
  text-align: left;
}

.suggestion-text {
  font-size: 26rpx;
  color: #4a3628;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 22rpx;
}

.empty-action-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(232, 133, 90, 0.08);
}

.empty-action-label {
  font-size: 22rpx;
  color: #6d5443;
}
</style>
