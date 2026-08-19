import type { RealtimeAudioAdapter } from './types'

export class FakeRealtimeAudioAdapter implements RealtimeAudioAdapter {
  permissionRequested = false
  capturing = false
  disposed = false
  micEnabled = true
  speakerEnabled = true
  playbackQueue: ArrayBuffer[] = []
  interruptCount = 0
  private onFrame: ((pcm16: ArrayBuffer, level: number) => void) | null = null

  async requestPermission(): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')
    this.permissionRequested = true
  }

  async startCapture(
    onFrame: (pcm16: ArrayBuffer, level: number) => void,
  ): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')
    this.onFrame = onFrame
    this.capturing = true
  }

  async stopCapture(): Promise<void> {
    this.capturing = false
    this.onFrame = null
  }

  emitFrame(frame = new Int16Array(320).buffer, level = 0.25): void {
    if (
      !this.disposed
      && this.capturing
      && this.micEnabled
      && this.onFrame
    ) {
      this.onFrame(frame.slice(0), level)
    }
  }

  enqueuePlayback(pcm24: ArrayBuffer): void {
    if (this.disposed || !this.speakerEnabled) return
    this.playbackQueue.push(pcm24.slice(0))
  }

  interruptPlayback(): void {
    this.interruptCount += 1
    this.playbackQueue = []
  }

  setMicEnabled(value: boolean): void {
    this.micEnabled = value
  }

  setSpeakerEnabled(value: boolean): void {
    this.speakerEnabled = value
    if (!value) this.interruptPlayback()
  }

  async dispose(): Promise<void> {
    await this.stopCapture()
    this.interruptPlayback()
    this.disposed = true
  }
}

