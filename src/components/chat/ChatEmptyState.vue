<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

const props = withDefaults(defineProps<{
  suggestions?: string[]
}>(), {
  suggestions: () => ['帮我写一段今天的日记', '最近有什么纪念日', '我今天有点累，陪我聊聊'],
})

const emit = defineEmits<{
  (e: 'usePrompt', prompt: string): void
}>()
</script>

<template>
  <view class="empty-state">
    <view class="empty-icon doodle-box-v2">
      <DoodleIcon name="robot" color="#FFFFFF" :size="56" :filtered="false" />
    </view>
    <text class="empty-title font-handwrite">今天想聊点什么？</text>
    <text class="empty-copy">你可以和 AI 伙伴聊天、整理情绪、记录生活，也可以直接让我帮你生成今天的日记。</text>
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
  </view>
</template>

<style scoped lang="scss">
.empty-state {
  padding: 48rpx 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-icon {
  width: 104rpx;
  height: 104rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #e8855a, #f0a882) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-color: transparent !important;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.15);
}

.empty-title {
  font-size: 34rpx;
  color: #2c1f14;
  margin-bottom: 16rpx;
}

.empty-copy {
  font-size: 26rpx;
  line-height: 1.7;
  color: #8a7668;
}

.empty-suggestions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 28rpx;
}

.suggestion-card {
  padding: 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24rpx 30rpx 22rpx 28rpx;
  border: 1px solid rgba(232, 133, 90, 0.12);
  text-align: left;
}

.suggestion-text {
  font-size: 26rpx;
  color: #4a3628;
  line-height: 1.6;
}
</style>
