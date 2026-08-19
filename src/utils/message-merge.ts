/**
 * 按消息 id 去重合并。不要用内容和时间戳判断，避免重复或漏消息。
 */

export interface IdentifiedMessage {
  id: string
  timestamp?: number
}

export interface MergeMessagesResult<T extends IdentifiedMessage> {
  items: T[]
  added: T[]
}

export function mergeMessagesById<T extends IdentifiedMessage>(
  existing: readonly T[],
  incoming: readonly T[],
): MergeMessagesResult<T> {
  const byId = new Map<string, T>()
  for (const item of existing) {
    if (!item || !item.id) continue
    byId.set(item.id, item)
  }

  const added: T[] = []
  for (const item of incoming) {
    if (!item || !item.id) continue
    if (byId.has(item.id)) continue
    byId.set(item.id, item)
    added.push(item)
  }

  const items = Array.from(byId.values())
  items.sort((a, b) => {
    const ta = Number(a.timestamp || 0)
    const tb = Number(b.timestamp || 0)
    if (ta !== tb) return ta - tb
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })

  return { items, added }
}
