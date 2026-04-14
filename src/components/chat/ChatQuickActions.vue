<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  collapsed?: boolean
  actions: Array<{ iconName: string; iconColor: string; label: string; path: string }>
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()
</script>

<template>
  <view v-if="!collapsed" class="quick-actions">
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
  background: #ffffff;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  padding: 12rpx 0;
}

.quick-scroll {
  white-space: nowrap;
  padding: 0 24rpx;
}

.quick-btn {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  background: #fdf8f3;
  border-radius: 20rpx;
  padding: 12rpx 24rpx;
  margin-right: 12rpx;
  border: 1px solid rgba(232, 133, 90, 0.1);
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
</style>
