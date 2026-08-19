export interface RealtimeAudioAdapter {
  requestPermission(): Promise<void>
  startCapture(
    onFrame: (pcm16: ArrayBuffer, level: number) => void,
  ): Promise<void>
  stopCapture(): Promise<void>
  enqueuePlayback(pcm24: ArrayBuffer): void
  interruptPlayback(): void
  setMicEnabled(value: boolean): void
  setSpeakerEnabled(value: boolean): void
  dispose(): Promise<void>
}

export type AudioAdapterFactory = () => RealtimeAudioAdapter

