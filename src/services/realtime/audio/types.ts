export interface RealtimeAudioAdapter {
  requestPermission(): Promise<void>
  startCapture(
    onFrame: (pcm16: ArrayBuffer, level: number) => void,
  ): Promise<void>
  stopCapture(): Promise<void>
  enqueuePlayback(pcm24: ArrayBuffer): void
  /** 句尾不足起播缓冲时仍开始播放，避免短句卡在队列里 */
  flushPlayback(): void
  interruptPlayback(): void
  setMicEnabled(value: boolean): void
  setSpeakerEnabled(value: boolean): void
  dispose(): Promise<void>
}

export type AudioAdapterFactory = () => RealtimeAudioAdapter
