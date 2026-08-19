import { onUnmounted } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { createPolling, type PollingController, type PollingOptions } from '@/utils/polling'

export type UsePollingOptions = PollingOptions & {
  isEnabled?: () => boolean
}

/**
 * 页面可见时启动轮询，onHide / onUnload / 卸载时停止。
 * App 切后台、跳转其他页、返回上一页都会走到 onHide / onUnload。
 */
export function usePolling(options: UsePollingOptions): PollingController {
  const polling = createPolling(options)

  onShow(() => {
    if (options.isEnabled && !options.isEnabled()) return
    polling.start()
  })
  onHide(() => polling.stop())
  onUnload(() => polling.stop())
  onUnmounted(() => polling.stop())

  return polling
}
