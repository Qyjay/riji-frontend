<script setup lang="ts">
import type { DraftChatAttachment } from '@/stores/chat'

const props = defineProps<{
  attachments: DraftChatAttachment[]
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

function previewUrl(attachment: DraftChatAttachment) {
  return attachment.thumbnailUrl || attachment.url || attachment.localPath || ''
}

function statusText(attachment: DraftChatAttachment) {
  if (attachment.uploadStatus === 'uploading') return '上传中'
  if (attachment.uploadStatus === 'failed') return '失败'
  return ''
}
</script>

<template>
  <view v-if="props.attachments.length" class="pending-attachments">
    <scroll-view class="att-scroll" scroll-x>
      <view class="att-list">
        <view v-for="attachment in props.attachments" :key="attachment.id" class="att-item">
          <image
            v-if="attachment.type === 'image'"
            :src="previewUrl(attachment)"
            class="att-thumb"
            mode="aspectFill"
          />
          <view v-else class="att-file-card">
            <text class="att-file-icon-lg">📎</text>
            <text class="att-file-name-sm">{{ attachment.name }}</text>
          </view>
          <view v-if="statusText(attachment)" class="att-status">
            <text class="att-status-text">{{ statusText(attachment) }}</text>
          </view>
          <view class="att-remove" @click="emit('remove', attachment.id)">
            <text class="att-remove-icon">×</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.pending-attachments {
  padding: 0 0 12rpx;
}

.att-scroll {
  white-space: nowrap;
  padding: 0 10rpx;
}

.att-list {
  display: flex;
  gap: 12rpx;
}

.att-item {
  position: relative;
  flex-shrink: 0;
}

.att-thumb,
.att-file-card {
  width: 112rpx;
  height: 112rpx;
  border-radius: 18rpx;
}

.att-file-card {
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx;
  border: 1px solid rgba(232, 133, 90, 0.08);
}

.att-file-icon-lg {
  font-size: 36rpx;
}

.att-file-name-sm {
  font-size: 18rpx;
  color: #8a7668;
  max-width: 100rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.att-status {
  position: absolute;
  left: 8rpx;
  bottom: 8rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(44, 31, 20, 0.65);
}

.att-status-text {
  font-size: 18rpx;
  color: #ffffff;
}

.att-remove {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(44, 31, 20, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
}

.att-remove-icon {
  color: #fff;
  font-size: 24rpx;
  line-height: 1;
}
</style>
