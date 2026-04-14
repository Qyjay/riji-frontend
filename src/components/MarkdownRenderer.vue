<template>
  <view class="markdown-content">
    <rich-text class="md-rich-text" :nodes="parsedContent"></rich-text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 自定义渲染器，处理代码块和特殊内容
const renderer: any = new marked.Renderer()

// 代码块渲染
renderer.code = function({ text, lang }: { text: string; lang?: string }) {
  const language = lang || 'plaintext'
  // 在 uniapp rich-text 中，我们使用简单的代码块样式
  const escapedCode = escapeHtml(text)
  return `<div class="code-block"><div class="code-lang">${escapeHtml(language)}</div><pre><code class="language-${language}">${escapedCode}</code></pre></div>`
}

// 行内代码渲染
renderer.codespan = function({ text }: { text: string }) {
  return `<code class="inline-code">${escapeHtml(text)}</code>`
}

// 链接渲染 - 确保在 rich-text 中可用
renderer.link = function({ href, title, text }: { href: string; title?: string | null; text: string }) {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
  return `<a href="${escapeHtml(href)}"${titleAttr}>${text}</a>`
}

// 图片渲染 - rich-text 中的图片需要特殊处理
renderer.image = function({ href, title, text }: { href: string; title?: string | null; text: string }) {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
  // uniapp rich-text 中的图片需要使用 img 标签
  return `<div class="image-container"><img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} class="md-image" loading="lazy"/></div>`
}

// 引用块渲染
renderer.blockquote = function({ text }: { text: string }) {
  return `<blockquote class="md-blockquote">${text}</blockquote>`
}

// 表格渲染
renderer.table = function(token: any) {
  const headerCells = Array.isArray(token?.header)
    ? token.header.map((cell: any) => `<th>${cell?.text || ''}</th>`).join('')
    : String(token?.header || '')
  const rows = Array.isArray(token?.rows)
    ? token.rows.map((row: any) => {
      if (Array.isArray(row)) {
        return `<tr>${row.map((cell: any) => `<td>${cell?.text || cell || ''}</td>`).join('')}</tr>`
      }
      return String(row || '')
    }).join('')
    : String(token?.rows || '')
  const head = headerCells.startsWith('<tr>') ? headerCells : `<tr>${headerCells}</tr>`
  return `<table class="md-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`
}

// 处理特殊标签（如 AI 思考标签）
function processSpecialTags(html: string): string {
  return html
    .replace(/<think>/g, '<div class="think-block">')
    .replace(/<\/think>/g, '</div>')
    .replace(/<think>/g, '<div class="think-block">')
    .replace(/<\/think>/g, '</div>')
}

// HTML 转义
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (c) => map[c])
}

marked.use({ renderer })

const props = defineProps<{
  content: string
  dark?: boolean
}>()

const parsedContent = computed(() => {
  if (!props.content) return ''

  try {
    const result = marked.parse(props.content)
    const html = typeof result === 'string' ? result : ''
    // 处理特殊标签
    return processSpecialTags(html)
  } catch (e) {
    console.error('Markdown parse error:', e)
    return escapeHtml(props.content)
  }
})
</script>

<style lang="scss" scoped>
.markdown-content {
  width: 100%;
  font-size: 30rpx;
  line-height: 1.7;
  color: #2C1F14;

  .md-rich-text {
    width: 100%;
  }
}

// 样式通过 global 方式注入，因为 rich-text 内部样式有限
:global(.md-blockquote) {
  border-left: 6rpx solid #E8855A;
  background-color: #FEF6F1;
  padding: 16rpx 24rpx;
  margin: 16rpx 0;
  border-radius: 0 12rpx 12rpx 0;
  color: #5A4A3A;
  font-size: 28rpx;
}

:global(.code-block) {
  background-color: #2C1F14;
  border-radius: 12rpx;
  margin: 16rpx 0;
  overflow: hidden;
}

:global(.code-lang) {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: #AE9D92;
  font-family: monospace;
}

:global(.code-block pre) {
  padding: 16rpx;
  margin: 0;
  overflow-x: auto;
}

:global(.code-block code) {
  color: #E8DDD5;
  font-size: 26rpx;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

:global(.inline-code) {
  background-color: #F5F0EB;
  color: #E8855A;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  font-size: 28rpx;
  font-family: 'Courier New', monospace;
}

:global(.image-container) {
  margin: 16rpx 0;
  text-align: center;
}

:global(.md-image) {
  max-width: 100%;
  height: auto;
  border-radius: 12rpx;
  display: inline-block;
}

:global(.think-block) {
  border-left: 6rpx solid #D4A574;
  padding: 12rpx 16rpx;
  margin: 12rpx 0;
  background-color: #FDF8F3;
  border-radius: 0 8rpx 8rpx 0;
  font-size: 24rpx;
  color: #8A7668;
  line-height: 1.6;
}

:global(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16rpx 0;
  font-size: 26rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

:global(.md-table th) {
  background-color: #F5F0EB;
  font-weight: 600;
  padding: 12rpx 16rpx;
  text-align: left;
}

:global(.md-table td) {
  padding: 10rpx 16rpx;
  border-bottom: 1px solid rgba(44, 31, 20, 0.08);
}

:global(.md-table tr:nth-child(even)) {
  background-color: rgba(245, 240, 235, 0.5);
}

:global(.md-rich-text a) {
  color: #E8855A;
  text-decoration: none;
}
</style>
