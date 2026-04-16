<script setup lang="ts">
import { computed, ref } from 'vue'

import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import type { UiChatMessage } from '@/stores/chat'
import { parseAssistantContent } from '@/utils/chat-message'

type DisplayItem =
  | { type: 'time'; id: string; label: string }
  | { type: 'message'; id: string; message: UiChatMessage; showAvatar: boolean }

const props = defineProps<{
  messages: UiChatMessage[]
  scrollTop: number
  scrollWithAnimation?: boolean
  showScrollToBottom?: boolean
}>()

const emit = defineEmits<{
  (e: 'scroll', event: any): void
  (e: 'reachBottom'): void
  (e: 'jumpBottom'): void
  (e: 'retry', id: string): void
}>()

const thinkingExpandedState = ref<Record<string, boolean>>({})
const webSourcesExpandedState = ref<Record<string, boolean>>({})

function formatTimeLabel(timestamp: number) {
  const date = new Date(timestamp)
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

const displayItems = computed<DisplayItem[]>(() => {
  const items: DisplayItem[] = []
  let lastTimestamp = 0
  props.messages.forEach((message, index) => {
    if (!lastTimestamp || Math.abs(message.createdAt - lastTimestamp) > 5 * 60 * 1000) {
      items.push({
        type: 'time',
        id: `time-${message.id}`,
        label: formatTimeLabel(message.createdAt),
      })
    }
    items.push({
      type: 'message',
      id: message.id,
      message,
      showAvatar: message.role === 'assistant' && props.messages[index - 1]?.role !== 'assistant',
    })
    lastTimestamp = message.createdAt
  })
  return items
})

function getAssistantParts(message: UiChatMessage) {
  return parseAssistantContent(message.content)
}

function isThinkingExpanded(message: UiChatMessage) {
  if (thinkingExpandedState.value[message.id] !== undefined) {
    return thinkingExpandedState.value[message.id]
  }
  const { thinking, body } = getAssistantParts(message)
  if (!thinking) return false
  return !body
}

function toggleThinking(message: UiChatMessage) {
  thinkingExpandedState.value = {
    ...thinkingExpandedState.value,
    [message.id]: !isThinkingExpanded(message),
  }
}

function getWebAttachments(message: UiChatMessage) {
  return message.attachments.filter((attachment) => attachment.type === 'web')
}

function getCommonAttachments(message: UiChatMessage) {
  return message.attachments.filter((attachment) => attachment.type !== 'web')
}

function isWebSourcesExpanded(message: UiChatMessage) {
  return Boolean(webSourcesExpandedState.value[message.id])
}

function toggleWebSources(message: UiChatMessage) {
  webSourcesExpandedState.value = {
    ...webSourcesExpandedState.value,
    [message.id]: !isWebSourcesExpanded(message),
  }
}

function openWebSource(url: string) {
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: url })
  uni.showToast({ title: '链接已复制', icon: 'none' })
  // #endif
}
</script>

<template>
  <view class="messages-panel">
    <scroll-view
      class="messages-scroll"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="scrollWithAnimation"
      lower-threshold="80"
      @scroll="emit('scroll', $event)"
      @scrolltolower="emit('reachBottom')"
    >
      <view class="messages-inner">
        <slot v-if="!displayItems.length" name="empty" />
        <template v-for="item in displayItems" :key="item.id">
          <view v-if="item.type === 'time'" class="time-divider">
            <text class="time-divider-text">{{ item.label }}</text>
          </view>
          <view v-else class="message-wrap" :class="item.message.role === 'user' ? 'message-wrap--user' : 'message-wrap--ai'">
            <view v-if="item.showAvatar" class="msg-avatar">
              <DoodleIcon name="robot" color="#FFFFFF" :size="26" :filtered="false" />
            </view>
            <view v-else-if="item.message.role === 'assistant'" class="msg-avatar-placeholder" />
            <view class="message-stack">
              <view class="message-bubble" :class="item.message.role === 'user' ? 'bubble--user' : 'bubble--ai'">
                <view v-if="item.message.attachments.length" class="msg-attachments">
                  <view
                    v-if="getWebAttachments(item.message).length"
                    class="web-sources-wrap"
                  >
                    <view class="web-sources-head press-feedback" @click="toggleWebSources(item.message)">
                      <text class="web-sources-title">联网搜索结果（{{ getWebAttachments(item.message).length }}）</text>
                      <text class="web-sources-toggle">{{ isWebSourcesExpanded(item.message) ? '收起' : '展开' }}</text>
                    </view>
                    <view v-if="isWebSourcesExpanded(item.message)" class="web-sources-body">
                      <view
                        v-for="attachment in getWebAttachments(item.message)"
                        :key="attachment.url + attachment.name"
                        class="web-source-card press-feedback"
                        @click="openWebSource(attachment.url)"
                      >
                        <view class="web-source-head">
                          <text class="web-source-title">{{ attachment.name }}</text>
                          <text v-if="attachment.domain" class="web-source-domain">{{ attachment.domain }}</text>
                        </view>
                        <text v-if="attachment.snippet" class="web-source-snippet">{{ attachment.snippet }}</text>
                        <text class="web-source-url">{{ attachment.url }}</text>
                      </view>
                    </view>
                  </view>
                  <view
                    v-for="attachment in getCommonAttachments(item.message)"
                    :key="attachment.url + attachment.name"
                    class="msg-attachment-item"
                  >
                    <image
                      v-if="attachment.type === 'image'"
                      :src="attachment.thumbnailUrl || attachment.url"
                      class="att-image-thumb"
                      mode="aspectFill"
                    />
                    <view v-else class="att-file-info">
                      <text class="att-file-icon">📎</text>
                      <text class="att-file-name">{{ attachment.name }}</text>
                    </view>
                  </view>
                </view>
                <view v-if="item.message.role === 'assistant'" class="assistant-content">
                  <view class="assistant-block">
                    <view
                      v-if="getAssistantParts(item.message).thinking"
                      class="thinking-card"
                    >
                      <view class="thinking-header" @click="toggleThinking(item.message)">
                        <text class="thinking-title">思考过程</text>
                        <text class="thinking-toggle">{{ isThinkingExpanded(item.message) ? '收起' : '展开' }}</text>
                      </view>
                      <view v-if="isThinkingExpanded(item.message)" class="thinking-body">
                        <MarkdownRenderer class="bubble-rich-text thinking-rich-text" :content="getAssistantParts(item.message).thinking" />
                      </view>
                    </view>
                    <MarkdownRenderer
                      v-if="getAssistantParts(item.message).body"
                      class="bubble-rich-text"
                      :content="getAssistantParts(item.message).body"
                    />
                  </view>
                  <text v-if="item.message.status === 'streaming'" class="streaming-cursor">|</text>
                </view>
                <text v-else class="bubble-text bubble-text--user">{{ item.message.content || '附件消息' }}</text>
              </view>
              <view v-if="item.message.status === 'failed'" class="message-error-row">
                <text class="message-error-text">{{ item.message.error || '发送失败' }}</text>
                <text
                  v-if="item.message.role === 'user'"
                  class="message-retry"
                  @click="emit('retry', item.message.id)"
                >重试</text>
              </view>
            </view>
          </view>
        </template>
        <view class="scroll-bottom-spacer" />
      </view>
    </scroll-view>

    <view v-if="showScrollToBottom" class="jump-bottom-btn press-feedback" @click="emit('jumpBottom')">
      <text class="jump-bottom-text">回到底部</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.messages-panel {
  position: relative;
  flex: 1;
  min-height: 0;
}

.messages-scroll {
  height: 100%;
}

.messages-inner {
  padding: 18rpx 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.time-divider {
  display: flex;
  justify-content: center;
}

.time-divider-text {
  font-size: 20rpx;
  color: #b19c90;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.56);
}

.message-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
}

.message-wrap--user {
  justify-content: flex-end;
}

.message-wrap--ai {
  justify-content: flex-start;
}

.message-stack {
  max-width: 79%;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.msg-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #e8855a, #f0a882);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 10rpx 22rpx rgba(232, 133, 90, 0.14);
}

.msg-avatar-placeholder {
  width: 52rpx;
  flex-shrink: 0;
}

.message-bubble {
  padding: 18rpx 20rpx;
  line-height: 1.6;
}

.bubble--ai {
  background: rgba(255, 252, 248, 0.88);
  border-radius: 8rpx 22rpx 22rpx 22rpx;
  box-shadow: 0 12rpx 28rpx rgba(120, 91, 68, 0.05);
}

.bubble--user {
  background: linear-gradient(135deg, #df8156, #eba27f);
  border-radius: 22rpx 8rpx 22rpx 22rpx;
}

.bubble-text,
.bubble-rich-text {
  font-size: 28rpx;
  line-height: 1.7;
  word-break: break-word;
}

.assistant-content {
  display: inline-flex;
  align-items: flex-end;
  width: 100%;
}

.assistant-block {
  width: 100%;
}

.thinking-card {
  margin-bottom: 14rpx;
  border-radius: 16rpx;
  background: rgba(248, 242, 236, 0.9);
  border: 1px solid rgba(174, 157, 146, 0.18);
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 14rpx 18rpx;
}

.thinking-title {
  font-size: 22rpx;
  color: #8a7668;
  font-weight: 600;
}

.thinking-toggle {
  font-size: 22rpx;
  color: #e8855a;
}

.thinking-body {
  padding: 0 18rpx 16rpx;
}

.thinking-rich-text {
  opacity: 0.84;
}

.streaming-cursor {
  color: #e8855a;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.bubble-text--user {
  color: #ffffff;
}

.msg-attachments {
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.att-image-thumb {
  width: 220rpx;
  height: 220rpx;
  border-radius: 16rpx;
}

.att-file-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
}

.att-file-icon {
  font-size: 28rpx;
}

.att-file-name {
  font-size: 24rpx;
  color: #8a7668;
}

.web-source-card {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 14rpx;
  border-radius: 12rpx;
  background: rgba(249, 245, 240, 0.92);
  border: 1px solid rgba(216, 189, 170, 0.42);
}

.web-sources-wrap {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.web-sources-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 10rpx 12rpx;
  border-radius: 12rpx;
  background: rgba(245, 237, 229, 0.92);
  border: 1px solid rgba(216, 189, 170, 0.32);
}

.web-sources-title {
  font-size: 22rpx;
  line-height: 1.4;
  color: #5a4537;
  font-weight: 600;
}

.web-sources-toggle {
  font-size: 22rpx;
  line-height: 1.4;
  color: #e8855a;
}

.web-sources-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.web-source-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.web-source-title {
  font-size: 24rpx;
  color: #3f2c1f;
  font-weight: 600;
  flex: 1;
}

.web-source-domain {
  font-size: 20rpx;
  color: #9d7f6c;
}

.web-source-snippet {
  font-size: 22rpx;
  line-height: 1.5;
  color: #6c5646;
}

.web-source-url {
  font-size: 20rpx;
  color: #a66f52;
  line-height: 1.4;
  word-break: break-all;
}

.message-error-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  padding: 0 8rpx;
}

.message-error-text,
.message-retry {
  font-size: 22rpx;
  color: #c05030;
}

.message-retry {
  text-decoration: underline;
}

.jump-bottom-btn {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(44, 31, 20, 0.66);
  box-shadow: 0 10rpx 24rpx rgba(44, 31, 20, 0.12);
}

.jump-bottom-text {
  font-size: 22rpx;
  color: #ffffff;
}

.scroll-bottom-spacer {
  height: 8rpx;
}
</style>
