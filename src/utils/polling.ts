/**
 * 页面可见时轮询：不依赖 Vue / DOM，方便 Node 单测。
 *
 * 间隔默认 2.5s：演示双账号聊天要尽快看到对方消息，
 * 同时避免两台真机每 2s 打满最近消息接口。
 */

export const CHAT_POLL_INTERVAL_MS = 2500
export const CHAT_POLL_MAX_INTERVAL_MS = 10000

export interface PollingClock {
  setTimeout: (handler: () => void, timeout: number) => unknown
  clearTimeout: (id: unknown) => void
}

export interface PollingOptions {
  intervalMs?: number
  maxIntervalMs?: number
  immediate?: boolean
  run: () => Promise<void> | void
  onError?: (error: unknown, consecutiveFailures: number) => void
  clock?: PollingClock
}

export interface PollingController {
  start: () => void
  stop: () => void
  readonly active: boolean
  readonly consecutiveFailures: number
  readonly delayMs: number
}

function defaultClock(): PollingClock {
  return {
    setTimeout: (handler, timeout) => setTimeout(handler, timeout),
    clearTimeout: (id) => {
      clearTimeout(id as ReturnType<typeof setTimeout>)
    },
  }
}

export function nextPollingDelay(
  intervalMs: number,
  consecutiveFailures: number,
  maxIntervalMs: number,
): number {
  const base = Math.max(200, intervalMs)
  const cap = Math.max(base, maxIntervalMs)
  if (consecutiveFailures <= 0) return base
  const factor = 2 ** Math.min(consecutiveFailures, 4)
  return Math.min(base * factor, cap)
}

export function createPolling(options: PollingOptions): PollingController {
  const intervalMs = options.intervalMs ?? CHAT_POLL_INTERVAL_MS
  const maxIntervalMs = options.maxIntervalMs ?? CHAT_POLL_MAX_INTERVAL_MS
  const clock = options.clock ?? defaultClock()
  const immediate = options.immediate !== false

  let timer: unknown = null
  let active = false
  let inFlight = false
  let consecutiveFailures = 0
  let generation = 0

  function delayMs() {
    return nextPollingDelay(intervalMs, consecutiveFailures, maxIntervalMs)
  }

  function clearTimer() {
    if (timer == null) return
    clock.clearTimeout(timer)
    timer = null
  }

  function schedule(delay: number) {
    clearTimer()
    if (!active) return
    const gen = generation
    timer = clock.setTimeout(() => {
      timer = null
      return tick(gen)
    }, delay)
  }

  async function tick(gen: number) {
    if (!active || gen !== generation) return
    if (inFlight) {
      schedule(delayMs())
      return
    }

    inFlight = true
    try {
      await options.run()
      if (gen !== generation) return
      consecutiveFailures = 0
    } catch (error) {
      if (gen !== generation) return
      consecutiveFailures += 1
      try {
        options.onError?.(error, consecutiveFailures)
      } catch {
        // 错误回调本身失败时不能中断轮询
      }
    } finally {
      inFlight = false
      if (active && gen === generation) {
        schedule(delayMs())
      }
    }
  }

  function start() {
    if (active) return
    active = true
    generation += 1
    consecutiveFailures = 0
    if (immediate) {
      void tick(generation)
      return
    }
    schedule(intervalMs)
  }

  function stop() {
    active = false
    generation += 1
    clearTimer()
  }

  return {
    start,
    stop,
    get active() {
      return active
    },
    get consecutiveFailures() {
      return consecutiveFailures
    },
    get delayMs() {
      return delayMs()
    },
  }
}
