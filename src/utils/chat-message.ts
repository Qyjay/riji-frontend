export interface ParsedAssistantContent {
  thinking: string
  body: string
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
}

export function parseAssistantContent(content: string): ParsedAssistantContent {
  const source = String(content || '')
  const thinkMatch = source.match(/<think>([\s\S]*?)<\/think>/i)

  if (thinkMatch) {
    const thinking = thinkMatch[1].trim()
    const body = source.replace(thinkMatch[0], '').trim()
    return { thinking, body }
  }

  const partialThinkMatch = source.match(/<think>([\s\S]*)$/i)
  if (partialThinkMatch) {
    return {
      thinking: partialThinkMatch[1].trim(),
      body: source.replace(partialThinkMatch[0], '').trim(),
    }
  }

  return {
    thinking: '',
    body: source.trim(),
  }
}

export function getAssistantPreview(content: string, maxLength = 36) {
  const { body, thinking } = parseAssistantContent(content)
  const previewSource = normalizeWhitespace(stripMarkdown(body || ''))
  if (previewSource) {
    return previewSource.length > maxLength ? `${previewSource.slice(0, maxLength)}...` : previewSource
  }
  if (thinking) {
    return 'AI 正在思考中...'
  }
  return ''
}
