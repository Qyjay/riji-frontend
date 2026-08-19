/**
 * App 端下行播放的 JS 队列与起播缓冲。
 *
 * 原生插件的 writePlayback 在 AudioTrack 写不满时只会保留「一个」尾巴，
 * 若此时再喂新数据会覆盖未写完的 PCM（丢帧 → 听感断续）。
 * 这里用 FIFO 把新数据先排起来，只在 native 没有 pending 时按顺序写出；
 * 并借鉴 H5 AudioWorklet 的 jitter buffer：先攒够一段时间再起播。
 */

export interface NativePlaybackBridge {
  writePlayback(base64: string): number
  flushPending(): number
  hasPendingPlayback(): boolean
  clearPlayback(): void
}

export interface PlaybackBufferEvent {
  type: 'underrun' | 'overflow'
  queuedBytes: number
  droppedBytes?: number
}

export interface PcmPlaybackBufferOptions {
  sampleRate: number
  bytesPerSample?: number
  prebufferMs?: number
  maxBufferMs?: number
  onEvent?: (event: PlaybackBufferEvent) => void
}

const DEFAULT_PREBUFFER_MS = 100
const DEFAULT_MAX_BUFFER_MS = 3000
const BYTES_PER_SAMPLE = 2

export class PcmPlaybackBuffer {
  private chunks: Uint8Array[] = []
  private queuedBytes = 0
  private started = false
  private forceStart = false
  private dropEvents = 0
  private droppedBytes = 0
  private underrunEvents = 0
  private readonly prebufferBytes: number
  private readonly maxBytes: number
  private readonly onEvent?: (event: PlaybackBufferEvent) => void

  constructor(options: PcmPlaybackBufferOptions) {
    const bytesPerSample = options.bytesPerSample ?? BYTES_PER_SAMPLE
    const bytesPerMs = options.sampleRate * bytesPerSample / 1000
    this.prebufferBytes = Math.max(
      bytesPerSample,
      Math.round((options.prebufferMs ?? DEFAULT_PREBUFFER_MS) * bytesPerMs),
    )
    this.maxBytes = Math.max(
      this.prebufferBytes,
      Math.round((options.maxBufferMs ?? DEFAULT_MAX_BUFFER_MS) * bytesPerMs),
    )
    this.onEvent = options.onEvent
  }

  enqueue(pcm: ArrayBuffer): void {
    const evenLength = pcm.byteLength - (pcm.byteLength % 2)
    if (evenLength <= 0) return
    const incoming = new Uint8Array(pcm.slice(0, evenLength))

    if (incoming.byteLength >= this.maxBytes) {
      this.droppedBytes += this.queuedBytes + (incoming.byteLength - this.maxBytes)
      this.dropEvents += 1
      const tail = incoming.subarray(incoming.byteLength - this.maxBytes)
      this.chunks = [new Uint8Array(tail)]
      this.queuedBytes = this.chunks[0].byteLength
      this.onEvent?.({
        type: 'overflow',
        queuedBytes: this.queuedBytes,
        droppedBytes: this.droppedBytes,
      })
      return
    }

    let dropped = false
    while (this.chunks.length && this.queuedBytes + incoming.byteLength > this.maxBytes) {
      const removed = this.chunks.shift()
      const removedBytes = removed?.byteLength || 0
      this.queuedBytes = Math.max(0, this.queuedBytes - removedBytes)
      this.droppedBytes += removedBytes
      this.dropEvents += 1
      dropped = true
    }

    this.chunks.push(incoming)
    this.queuedBytes += incoming.byteLength
    if (dropped) {
      this.onEvent?.({
        type: 'overflow',
        queuedBytes: this.queuedBytes,
        droppedBytes: this.droppedBytes,
      })
    }
  }

  /** 是否已攒够起播量，或已被强制释放（例如 audio.done 的尾巴） */
  canStart(): boolean {
    if (!this.queuedBytes) return false
    return this.started || this.forceStart || this.queuedBytes >= this.prebufferBytes
  }

  takeChunk(): Uint8Array | null {
    if (!this.canStart()) return null
    const head = this.chunks.shift()
    if (!head) return null
    this.started = true
    this.queuedBytes = Math.max(0, this.queuedBytes - head.byteLength)
    return head
  }

  /** 不足起播量时也开始播，避免短句或句尾卡在队列里 */
  releasePrebuffer(): void {
    if (!this.queuedBytes) return
    this.forceStart = true
    this.started = true
  }

  noteUnderrunIfPlaying(): void {
    if (!this.started) return
    this.started = false
    this.forceStart = false
    this.underrunEvents += 1
    this.onEvent?.({ type: 'underrun', queuedBytes: this.queuedBytes })
  }

  clear(): void {
    this.chunks = []
    this.queuedBytes = 0
    this.started = false
    this.forceStart = false
  }

  get hasQueued(): boolean {
    return this.queuedBytes > 0
  }

  get stats() {
    return {
      queuedBytes: this.queuedBytes,
      started: this.started,
      dropEvents: this.dropEvents,
      droppedBytes: this.droppedBytes,
      underrunEvents: this.underrunEvents,
      prebufferBytes: this.prebufferBytes,
      maxBytes: this.maxBytes,
    }
  }
}

export interface AppPlaybackPumpOptions {
  native: NativePlaybackBridge
  toBase64: (bytes: Uint8Array) => string
  sampleRate: number
  prebufferMs?: number
  maxBufferMs?: number
  onEvent?: (event: PlaybackBufferEvent) => void
}

/**
 * 把 JS FIFO 泵到原生 AudioTrack。
 * 关键约束：native 仍有 pending 时绝不调用 writePlayback，
 * 这样即使旧插件会覆盖尾巴，也不会被触发。
 */
export class AppPlaybackPump {
  private readonly native: NativePlaybackBridge
  private readonly toBase64: (bytes: Uint8Array) => string
  private readonly buffer: PcmPlaybackBuffer

  constructor(options: AppPlaybackPumpOptions) {
    this.native = options.native
    this.toBase64 = options.toBase64
    this.buffer = new PcmPlaybackBuffer({
      sampleRate: options.sampleRate,
      prebufferMs: options.prebufferMs,
      maxBufferMs: options.maxBufferMs,
      onEvent: options.onEvent,
    })
  }

  enqueue(pcm: ArrayBuffer): void {
    this.buffer.enqueue(pcm)
    this.pump()
  }

  pump(): void {
    this.native.flushPending()
    while (!this.native.hasPendingPlayback()) {
      const chunk = this.buffer.takeChunk()
      if (!chunk) break
      this.native.writePlayback(this.toBase64(chunk))
    }
  }

  flush(): void {
    this.buffer.releasePrebuffer()
    this.pump()
  }

  interrupt(): void {
    this.buffer.clear()
    this.native.clearPlayback()
  }

  clearBuffer(): void {
    this.buffer.clear()
  }

  hasWork(): boolean {
    return this.buffer.hasQueued || this.native.hasPendingPlayback()
  }

  get stats() {
    return this.buffer.stats
  }
}
