<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  collapsed?: boolean
  compact?: boolean
  actions: Array<{ iconName: string; iconColor: string; label: string; path: string }>
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()
</script>

<template>
  <view v-if="!collapsed" class="quick-actions" :class="{ 'quick-actions--compact': compact }">
    <scroll-view class="quick-scroll" scroll-x>
      <view
        v-for="action in actions"
        :key="action.label"
        class="quick-btn press-feedback"
        @click="emit('navigate', action.path)"
      >
        <view class="quick-icon-wrap">
          <DoodleIcon :name="action.iconName" :color="action.iconColor" :size="28" />
        </view>
        <text class="quick-label">{{ action.label }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.quick-actions {
  padding: 8rpx 0 10rpx;
}

.quick-scroll {
  white-space: nowrap;
  padding: 0 8rpx;
}

.quick-btn {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 255, 255, 0.74);
  border-radius: 999rpx;
  padding: 12rpx 20rpx;
  margin-right: 12rpx;
  border: 1px solid rgba(232, 133, 90, 0.08);
}

.quick-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-label {
  font-size: 24rpx;
  color: #4a3628;
  white-space: nowrap;
}

.quick-actions--compact .quick-btn {
  padding: 10rpx 18rpx;
}

.quick-actions--compact .quick-label {
  font-size: 22rpx;
}
</style>
