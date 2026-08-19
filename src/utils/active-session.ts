/**
 * 当前正在查看的社交会话。
 * 聊天页 / 活动室 onShow 写入，onHide 清空。
 * 收件箱巡检据此判断：前台且就在该会话页时不弹聊天通知。
 */

let activeMatchId = ''

export function setActiveMatchId(id: unknown): void {
  activeMatchId = String(id || '').trim()
}

export function getActiveMatchId(): string {
  return activeMatchId
}

export function clearActiveMatchId(): void {
  activeMatchId = ''
}
