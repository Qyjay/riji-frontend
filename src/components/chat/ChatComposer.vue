<script setup lang="ts">
import DoodleIcon from '@/components/DoodleIcon.vue'

defineProps<{
  modelValue: string
  disabled?: boolean
  canSend?: boolean
  isRecording?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send'): void
  (e: 'attach'): void
  (e: 'toggle-recording'): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

function handleInput(event: any) {
  emit('update:modelValue', event?.detail?.value || '')
}
</script>

<template>
  <view class="input-bar">
    <view class="input-row">
      <view class="attach-btn press-feedback" @click="emit('attach')">
        <DoodleIcon name="attach" color="#AE9D92" :size="36" />
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
      <view class="voice-btn press-feedback" :class="{ 'voice-btn--active': isRecording }" @click="emit('toggle-recording')">
        <DoodleIcon name="voice" :color="isRecording ? '#E8855A' : '#AE9D92'" :size="36" />
      </view>
      <view class="send-btn" :class="{ 'send-btn--active': canSend }" @click="emit('send')">
        <DoodleIcon name="send" color="#FFFFFF" :size="36" :filtered="false" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.input-bar {
  background: #ffffff;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
}

.attach-btn,
.voice-btn,
.send-btn {
  width: 72rpx;
  min-width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attach-btn,
.voice-btn {
  background: #f5f0eb;
}

.voice-btn--active {
  background: #fee8e0;
}

.input-field {
  flex: 1;
  min-height: 72rpx;
  max-height: 220rpx;
  background: #f5f0eb;
  border-radius: 36rpx;
  padding: 18rpx 28rpx;
  font-size: 28rpx;
  line-height: 1.5;
  color: #2c1f14;
}

.input-placeholder {
  color: #ae9d92;
  font-size: 28rpx;
}

.send-btn {
  background: #e8ddd5;
}

.send-btn--active {
  background: #e8855a;
}
</style>
