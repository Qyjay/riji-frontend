/**
 * App 端实时音频适配器
 *
 * 与 H5 版（AudioWorklet）能力对等，底层换成 avalin-realtime-audio UTS 插件的
 * AudioRecord / AudioTrack。插件只做非阻塞的设备读写，节奏由这里的定时器掌控：
 *   - 采集：每 20ms 把 AudioRecord 缓冲区排空，转成 PCM16 交给上层
 *   - 播放：写入后若有未写完的尾巴，靠同一个定时器持续写出
 *
 * 插件未编译进基座时（比如用的是标准基座），requestPermission 会抛出可读错误，
 * 由语音通话页展示提示，而不是让整个页面崩掉。
 */

import type { RealtimeAudioAdapter } from './types'
import { calculateRms } from './pcm'

// #ifdef APP-PLUS
import * as nativeAudio from '@/uni_modules/avalin-realtime-audio'
// #endif

/** 上行采样率，与后端 ticket 中声明的 input 格式一致 */
const CAPTURE_RATE = 16000
/** 单帧 40ms：16000 * 0.04 * 2 字节 */
const CAPTURE_FRAME_BYTES = 1280
/** 下行采样率，与后端 ticket 中声明的 output 格式一致 */
const PLAYBACK_RATE = 24000
/** 轮询间隔取帧长的一半，保证不丢帧又不过度占用主线程 */
const TICK_MS = 20
/** 单次 tick 最多读取的帧数，防止异常情况下死循环 */
const MAX_FRAMES_PER_TICK = 8

const ERROR_MESSAGES: Record<string, string> = {
  NO_PERMISSION: '请允许麦克风权限后重试',
  UNSUPPORTED_SAMPLE_RATE: '当前设备不支持所需的音频采样率',
  UNSUPPORTED_PLATFORM: '当前平台暂不支持实时语音',
  INIT_FAILED: '音频设备初始化失败，请检查是否被其他应用占用',
  START_FAILED: '音频设备启动失败，请重试',
}

function describeError(code: string): string {
  return ERROR_MESSAGES[code] || `音频设备异常（${code}）`
}

/** 申请 Android 运行时麦克风权限 */
function requestAndroidRecordPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    // plus.android.requestPermissions 未包含在 @dcloudio/types 里，手动收窄类型
    const android = (plus as unknown as {
      android?: {
        requestPermissions: (
          permissions: string[],
          success: (result: { granted?: string[]; deniedPresent?: string[]; deniedAlways?: string[] }) => void,
          fail: (error: unknown) => void,
        ) => void
      }
    }).android

    if (!android?.requestPermissions) {
      resolve(false)
      return
    }

    android.requestPermissions(
      ['android.permission.RECORD_AUDIO'],
      (result) => {
        resolve((result?.granted || []).length > 0)
      },
      () => resolve(false),
    )
    // #endif

    // #ifndef APP-PLUS
    resolve(false)
    // #endif
  })
}

export class AppRealtimeAudioAdapter implements RealtimeAudioAdapter {
  private onFrame: ((pcm16: ArrayBuffer, level: number) => void) | null = null
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private capturing = false
  private playbackStarted = false
  private micEnabled = true
  private speakerEnabled = true
  private disposed = false

  async requestPermission(): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')

    // #ifndef APP-PLUS
    throw new Error('当前平台不支持 App 音频适配器')
    // #endif

    // #ifdef APP-PLUS
    let available = false
    try {
      available = nativeAudio.isAvailable()
    } catch (error) {
      available = false
    }
    if (!available) {
      throw new Error('实时语音插件未生效，请使用包含 avalin-realtime-audio 的自定义基座')
    }

    if (!nativeAudio.hasRecordPermission()) {
      const granted = await requestAndroidRecordPermission()
      if (!granted) {
        throw new Error(ERROR_MESSAGES.NO_PERMISSION)
      }
    }

    const code = nativeAudio.startPlayback(PLAYBACK_RATE)
    if (code) throw new Error(describeError(code))
    this.playbackStarted = true
    nativeAudio.setPlaybackMuted(!this.speakerEnabled)
    // #endif
  }

  async startCapture(
    onFrame: (pcm16: ArrayBuffer, level: number) => void,
  ): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')
    this.onFrame = onFrame

    // #ifdef APP-PLUS
    if (!this.capturing) {
      const code = nativeAudio.startCapture(CAPTURE_RATE, CAPTURE_FRAME_BYTES)
      if (code) throw new Error(describeError(code))
      this.capturing = true
    }
    // #endif

    this.ensureTicking()
  }

  async stopCapture(): Promise<void> {
    this.onFrame = null
    // #ifdef APP-PLUS
    if (this.capturing) {
      nativeAudio.stopCapture()
      this.capturing = false
    }
    // #endif
    this.syncTicking()
  }

  enqueuePlayback(pcm24: ArrayBuffer): void {
    if (this.disposed || !pcm24.byteLength) return

    // #ifdef APP-PLUS
    if (!this.playbackStarted) {
      const code = nativeAudio.startPlayback(PLAYBACK_RATE)
      if (code) return
      this.playbackStarted = true
      nativeAudio.setPlaybackMuted(!this.speakerEnabled)
    }
    nativeAudio.writePlayback(uni.arrayBufferToBase64(pcm24))
    // #endif

    // 可能残留写不进去的尾巴，需要定时器继续写出
    this.ensureTicking()
  }

  interruptPlayback(): void {
    if (this.disposed) return
    // #ifdef APP-PLUS
    if (this.playbackStarted) nativeAudio.clearPlayback()
    // #endif
  }

  setMicEnabled(value: boolean): void {
    // 静音期间仍然读取设备，只是丢弃数据，避免重新 start 带来的爆音与延迟
    this.micEnabled = value
  }

  setSpeakerEnabled(value: boolean): void {
    this.speakerEnabled = value
    // #ifdef APP-PLUS
    if (this.playbackStarted) nativeAudio.setPlaybackMuted(!value)
    // #endif
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.onFrame = null
    this.stopTicking()

    // #ifdef APP-PLUS
    if (this.capturing) {
      nativeAudio.stopCapture()
      this.capturing = false
    }
    if (this.playbackStarted) {
      nativeAudio.stopPlayback()
      this.playbackStarted = false
    }
    // #endif
  }

  // ── 定时器 ──────────────────────────────────────────────

  private ensureTicking(): void {
    if (this.disposed || this.tickTimer) return
    this.tickTimer = setInterval(() => this.tick(), TICK_MS)
  }

  /** 采集停止且播放无积压时收掉定时器，避免空转耗电 */
  private syncTicking(): void {
    if (this.capturing) return
    let pending = false
    // #ifdef APP-PLUS
    pending = this.playbackStarted && nativeAudio.hasPendingPlayback()
    // #endif
    if (!pending) this.stopTicking()
  }

  private stopTicking(): void {
    if (!this.tickTimer) return
    clearInterval(this.tickTimer)
    this.tickTimer = null
  }

  private tick(): void {
    if (this.disposed) return

    // #ifdef APP-PLUS
    if (this.playbackStarted) nativeAudio.flushPending()

    if (this.capturing) {
      for (let index = 0; index < MAX_FRAMES_PER_TICK; index += 1) {
        const base64 = nativeAudio.readCaptureFrame()
        if (!base64) break
        if (!this.micEnabled || !this.onFrame) continue

        const buffer = uni.base64ToArrayBuffer(base64)
        if (!buffer.byteLength) continue
        // PCM16 需要偶数字节，异常长度直接丢弃避免 Int16Array 构造失败
        if (buffer.byteLength % 2 !== 0) continue

        this.onFrame(buffer, calculateRms(new Int16Array(buffer)))
      }
    }
    // #endif

    this.syncTicking()
  }
}
