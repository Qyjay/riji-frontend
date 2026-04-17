<template>
  <view class="markdown-content" :class="{ 'markdown-content--dark': dark }">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <view v-if="block.type === 'heading'" class="md-heading">
        <text class="md-heading-text">{{ block.text }}</text>
      </view>
      <view v-else-if="block.type === 'quote'" class="md-quote">
        <text class="md-quote-text">{{ block.text }}</text>
      </view>
      <view v-else-if="block.type === 'code'" class="md-code-block">
        <text v-if="block.lang" class="md-code-lang">{{ block.lang }}</text>
        <text class="md-code-text">{{ block.text }}</text>
      </view>
      <view v-else-if="block.type === 'list'" class="md-list">
        <view v-for="(item, itemIndex) in block.items" :key="itemIndex" class="md-list-item">
          <text class="md-list-dot">{{ block.ordered ? `${itemIndex + 1}.` : '•' }}</text>
          <text class="md-list-text">{{ item }}</text>
        </view>
      </view>
      <view v-else class="md-paragraph">
        <text class="md-paragraph-text">{{ block.text }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string; lang: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'paragraph'; text: string }

const props = defineProps<{
  content: string
  dark?: boolean
}>()

const blocks = computed<MarkdownBlock[]>(() => parseMarkdown(props.content || ''))

function parseMarkdown(input: string): MarkdownBlock[] {
  const normalized = input.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const result: MarkdownBlock[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []

  function flushParagraph() {
    const text = cleanInline(paragraph.join(' ')).trim()
    if (text) result.push({ type: 'paragraph', text })
    paragraph = []
  }

  function flushList() {
    if (listItems.length) result.push({ type: 'list', items: listItems, ordered: listOrdered })
    listItems = []
    listOrdered = false
  }

  function flushCode() {
    result.push({ type: 'code', text: codeLines.join('\n').trimEnd(), lang: codeLang || 'text' })
    codeLines = []
    codeLang = ''
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        flushParagraph()
        flushList()
        inCode = true
        codeLang = trimmed.replace(/^```/, '').trim()
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      result.push({ type: 'heading', text: cleanInline(headingMatch[2]) })
      continue
    }

    if (trimmed.startsWith('>')) {
      flushParagraph()
      flushList()
      result.push({ type: 'quote', text: cleanInline(trimmed.replace(/^>\s?/, '')) })
      continue
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      const isOrdered = Boolean(ordered)
      if (listItems.length && listOrdered !== isOrdered) flushList()
      listOrdered = isOrdered
      listItems.push(cleanInline((unordered || ordered)?.[1] || ''))
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  if (inCode) flushCode()
  flushParagraph()
  flushList()
  return result
}

function cleanInline(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}
</script>

<style lang="scss" scoped>
.markdown-content {
  width: 100%;
  color: #2C1F14;
}

.markdown-content--dark {
  color: #FFF9EF;
}

.md-heading,
.md-paragraph,
.md-quote,
.md-code-block,
.md-list {
  margin-bottom: 14rpx;
}

.md-heading-text {
  display: block;
  color: #2C1F14;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.45;
}

.md-paragraph-text,
.md-quote-text,
.md-list-text {
  color: inherit;
  font-size: 28rpx;
  line-height: 1.7;
}

.md-quote {
  padding: 18rpx 22rpx;
  border: 1px solid rgba(232, 133, 90, 0.22);
  border-radius: 24rpx 18rpx 28rpx 20rpx;
  background: #FEF6F1;
}

.md-quote-text {
  color: #5A4A3A;
}

.md-list {
  display: flex;
  flex-direction: column;
}

.md-list-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10rpx;
}

.md-list-dot {
  width: 42rpx;
  flex-shrink: 0;
  color: #E8855A;
  font-size: 27rpx;
  font-weight: 900;
  line-height: 1.7;
}

.md-list-text {
  flex: 1;
}

.md-code-block {
  padding: 18rpx;
  border-radius: 18rpx;
  background: #2C1F14;
}

.md-code-lang {
  display: block;
  margin-bottom: 8rpx;
  color: #AE9D92;
  font-size: 22rpx;
}

.md-code-text {
  display: block;
  color: #E8DDD5;
  font-size: 24rpx;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>