<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  modelValue: string
  disabled?: boolean
  canSend?: boolean
  isRecording?: boolean
  useWebSearch?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send'): void
  (e: 'attach'): void
  (e: 'toggle-recording'): void
  (e: 'toggle-web-search'): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

function handleInput(event: any) {
  emit('update:modelValue', event?.detail?.value || '')
}
</script>

<template>
  <view class="input-bar">
    <view class="input-shell">
      <view class="attach-btn press-feedback" @click="emit('attach')">
        <DoodleIcon name="attach" color="#8A7668" :size="30" />
      </view>
      <view
        class="web-search-btn press-feedback"
        :class="{ 'web-search-btn--active': useWebSearch }"
        @click="emit('toggle-web-search')"
      >
        <DoodleIcon name="search" :color="useWebSearch ? '#FFFFFF' : '#8A7668'" :size="28" />
      </view>
      <textarea
        class="input-field"
        :value="modelValue"
        auto-height
        maxlength="-1"
        confirm-type="send"
        :disabled="disabled"
        placeholder="说点什么..."
        placeholder-class="input-placeholder"
        :cursor-spacing="12"
        @input="handleInput"
        @confirm="emit('send')"
        @focus="emit('focus')"
        @blur="emit('blur')"
      />
      <view
        v-if="canSend"
        class="send-btn press-feedback"
        :class="{ 'send-btn--active': canSend }"
        @click="emit('send')"
      >
        <DoodleIcon name="send" color="#FFFFFF" :size="28" :filtered="false" />
      </view>
      <view
        v-else
        class="voice-btn press-feedback"
        :class="{ 'voice-btn--active': isRecording }"
        @click="emit('toggle-recording')"
      >
        <DoodleIcon name="voice" :color="isRecording ? '#E8855A' : '#8A7668'" :size="30" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.input-bar {
  padding: 0;
}

.input-shell {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  padding: 14rpx 16rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(232, 133, 90, 0.08);
  border-radius: 32rpx;
  box-shadow: 0 16rpx 32rpx rgba(125, 91, 61, 0.08);
}

.attach-btn,
.web-search-btn,
.voice-btn,
.send-btn {
  width: 64rpx;
  min-width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attach-btn {
  align-self: center;
  background: rgba(245, 240, 235, 0.95);
}

.voice-btn {
  align-self: center;
  background: rgba(245, 240, 235, 0.95);
}

.web-search-btn {
  align-self: center;
  background: rgba(245, 240, 235, 0.95);
}

.web-search-btn--active {
  background: #e8855a;
}

.voice-btn--active {
  background: #fee8e0;
}

.input-field {
  flex: 1;
  min-height: 64rpx;
  max-height: 220rpx;
  background: transparent;
  border-radius: 0;
  padding: 14rpx 6rpx 12rpx;
  font-size: 28rpx;
  line-height: 1.5;
  color: #2c1f14;
}

.input-placeholder {
  color: #ae9d92;
  font-size: 28rpx;
}

.send-btn {
  align-self: center;
  background: #ead7c8;
}

.send-btn--active {
  background: #e8855a;
}
</style>
