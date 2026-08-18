import {
  calculateRms,
  concatInt16,
  float32ToPcm16,
  resampleFloat32,
} from './pcm'
import type { RealtimeAudioAdapter } from './types'

const INPUT_RATE = 16000
const OUTPUT_RATE = 24000
const INPUT_FRAME_SAMPLES = 320
const PREBUFFER_MS = 100
const MAX_PLAYBACK_SEC = 30
const MIC_REQUEST_TIMEOUT_MS = 8000
const PREFERRED_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: { ideal: 1 },
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
}

let primedContext: AudioContext | null = null
let primedInputStream: MediaStream | null = null
let primingInputRequest: Promise<MediaStream> | null = null

function createAudioError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

function hasLiveAudioTrack(stream: MediaStream | null): stream is MediaStream {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState !== 'ended'),
  )
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

async function getUserMediaWithTimeout(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  const request = navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      if (timedOut) {
        stopStream(stream)
      }
      return stream
    })

  const timeout = new Promise<MediaStream>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      reject(createAudioError(
        'AudioCaptureTimeoutError',
        '麦克风没有响应，请切换输入设备或重启浏览器后重试',
      ))
    }, MIC_REQUEST_TIMEOUT_MS)
  })

  try {
    return await Promise.race([request, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function applyPreferredAudioConstraints(stream: MediaStream): Promise<void> {
  await Promise.all(
    stream.getAudioTracks().map(async (track) => {
      if (!track.applyConstraints) return
      try {
        await track.applyConstraints(PREFERRED_AUDIO_CONSTRAINTS)
      } catch {
        // Keep the already-granted stream; preferred capture settings are optional.
      }
    }),
  )
}

async function requestInputStream(): Promise<MediaStream> {
  const stream = await getUserMediaWithTimeout({ audio: true })
  if (!hasLiveAudioTrack(stream)) {
    stopStream(stream)
    throw createAudioError(
      'DevicesNotFoundError',
      '浏览器没有返回可用的麦克风输入流',
    )
  }
  await applyPreferredAudioConstraints(stream)
  return stream
}

function takePrimedInputStream(): MediaStream | null {
  if (!hasLiveAudioTrack(primedInputStream)) {
    stopStream(primedInputStream)
    primedInputStream = null
    return null
  }
  const stream = primedInputStream
  primedInputStream = null
  return stream
}

async function getPreparedInputStream(): Promise<MediaStream> {
  const primed = takePrimedInputStream()
  if (primed) return primed

  if (primingInputRequest) {
    await primingInputRequest
    const stream = takePrimedInputStream()
    if (stream) return stream
  }

  return requestInputStream()
}

function AudioContextConstructor(): typeof AudioContext {
  const constructor = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!constructor) throw new Error('当前浏览器不支持 Web Audio')
  return constructor
}

async function ensurePrimedContext(): Promise<AudioContext> {
  if (!primedContext || primedContext.state === 'closed') {
    const Constructor = AudioContextConstructor()
    primedContext = new Constructor({ latencyHint: 'interactive' })
  }
  if (primedContext.state === 'suspended') await primedContext.resume()
  return primedContext
}

/** 必须在用户点击入口触发：同时解锁播放上下文并申请麦克风输入流。 */
export async function primeH5RealtimeAudio(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持麦克风采集')
  }
  await ensurePrimedContext()
  if (hasLiveAudioTrack(primedInputStream)) return
  stopStream(primedInputStream)
  primedInputStream = null
  if (!primingInputRequest) {
    primingInputRequest = requestInputStream()
      .then((stream) => {
        primedInputStream = stream
        return stream
      })
      .catch((error) => {
        primedInputStream = null
        throw error
      })
      .finally(() => {
        primingInputRequest = null
      })
  }
  await primingInputRequest
}

export class H5RealtimeAudioAdapter implements RealtimeAudioAdapter {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private captureNode: AudioWorkletNode | null = null
  private captureSink: GainNode | null = null
  private playbackNode: AudioWorkletNode | null = null
  private captureRemainder = new Int16Array(0)
  private onFrame: ((pcm16: ArrayBuffer, level: number) => void) | null = null
  private micEnabled = true
  private speakerEnabled = true
  private disposed = false
  // #region debug-point stream-playback-main-state
  private playbackDebugLastReportedAt = 0
  private playbackDebugEnqueueSequence = 0
  private playbackDebugInterruptSequence = 0
  // #endregion

  async requestPermission(): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持麦克风采集')
    }
    this.context = await ensurePrimedContext()
    if (!this.context.audioWorklet) {
      throw new Error('当前浏览器不支持 AudioWorklet')
    }
    this.stream = await getPreparedInputStream()
    await Promise.all([
      this.context.audioWorklet.addModule('/static/audio-worklets/pcm-capture.js'),
      this.context.audioWorklet.addModule('/static/audio-worklets/pcm-playback.js'),
    ])
    this.ensurePlaybackNode()
  }

  private ensurePlaybackNode(): void {
    if (!this.context || this.playbackNode) return
    const prebufferSamples = Math.round(
      this.context.sampleRate * PREBUFFER_MS / 1000,
    )
    this.playbackNode = new AudioWorkletNode(
      this.context,
      'avalin-pcm-playback',
      {
        outputChannelCount: [1],
        processorOptions: {
          prebufferSamples,
          maxSamples: this.context.sampleRate * MAX_PLAYBACK_SEC,
        },
      },
    )
    // #region debug-point stream-playback-worklet-bridge
    this.playbackNode.port.onmessage = (event: MessageEvent) => {
      const message = event.data || {}
      if (!message.type) return
      const now = Date.now()
      const shouldReport = message.type !== 'level'
        || now - this.playbackDebugLastReportedAt > 500
        || Number(message.queuedSamples || 0) > this.context!.sampleRate
      if (!shouldReport) return
      this.playbackDebugLastReportedAt = now
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'stream-playback-overlap', runId: 'post-fix', hypothesisId: 'A,C,D', location: 'services/realtime/audio/h5-audio.ts:playbackNode.onmessage', msg: '[DEBUG] playback worklet metric', data: { type: message.type, queuedSamples: message.queuedSamples, queuedMs: Math.round(Number(message.queuedSamples || 0) / Number(message.sampleRate || this.context!.sampleRate) * 1000), sampleRate: message.sampleRate, level: message.level, droppedSamples: message.droppedSamples, dropEvents: message.dropEvents, underrunEvents: message.underrunEvents, started: message.started }, ts: now }) }).catch(() => {})
    }
    // #endregion
    this.playbackNode.connect(this.context.destination)
    this.playbackNode.port.postMessage({
      type: 'mute',
      value: !this.speakerEnabled,
    })
  }

  async startCapture(
    onFrame: (pcm16: ArrayBuffer, level: number) => void,
  ): Promise<void> {
    if (this.disposed) throw new Error('音频适配器已释放')
    if (!this.context || !this.stream) await this.requestPermission()
    if (!this.context || !this.stream) throw new Error('麦克风尚未准备好')
    if (this.context.state === 'suspended') await this.context.resume()
    this.onFrame = onFrame
    if (this.captureNode) return

    this.source = this.context.createMediaStreamSource(this.stream)
    this.captureNode = new AudioWorkletNode(
      this.context,
      'avalin-pcm-capture',
      { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] },
    )
    this.captureSink = this.context.createGain()
    this.captureSink.gain.value = 0
    this.captureNode.port.onmessage = (event: MessageEvent) => {
      const message = event.data || {}
      if (message.type !== 'samples' || !message.samples || !this.micEnabled) return
      const samples = message.samples instanceof Float32Array
        ? message.samples
        : new Float32Array(message.samples)
      const level = calculateRms(samples)
      const resampled = resampleFloat32(
        samples,
        this.context?.sampleRate || INPUT_RATE,
        INPUT_RATE,
      )
      this.captureRemainder = concatInt16(
        this.captureRemainder,
        float32ToPcm16(resampled),
      )
      while (this.captureRemainder.length >= INPUT_FRAME_SAMPLES) {
        const frame = this.captureRemainder.slice(0, INPUT_FRAME_SAMPLES)
        this.captureRemainder = this.captureRemainder.slice(INPUT_FRAME_SAMPLES)
        this.onFrame?.(frame.buffer, level)
      }
    }
    this.source.connect(this.captureNode)
    this.captureNode.connect(this.captureSink)
    this.captureSink.connect(this.context.destination)
  }

  async stopCapture(): Promise<void> {
    this.onFrame = null
    this.captureRemainder = new Int16Array(0)
    this.source?.disconnect()
    this.captureNode?.disconnect()
    this.captureSink?.disconnect()
    this.source = null
    this.captureNode = null
    this.captureSink = null
  }

  enqueuePlayback(pcm24: ArrayBuffer): void {
    if (
      this.disposed
      || !this.speakerEnabled
      || !this.context
      || !this.playbackNode
      || pcm24.byteLength < 2
    ) return
    const input = new Int16Array(
      pcm24.slice(0, pcm24.byteLength - (pcm24.byteLength % 2)),
    )
    const floatInput = new Float32Array(input.length)
    for (let index = 0; index < input.length; index += 1) {
      floatInput[index] = input[index] / 32768
    }
    const output = resampleFloat32(
      floatInput,
      OUTPUT_RATE,
      this.context.sampleRate,
    )
    // #region debug-point stream-playback-main-enqueue
    this.playbackDebugEnqueueSequence += 1
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'stream-playback-overlap', runId: 'post-fix', hypothesisId: 'A,D', location: 'services/realtime/audio/h5-audio.ts:enqueuePlayback', msg: '[DEBUG] enqueue playback chunk', data: { sequence: this.playbackDebugEnqueueSequence, pcmBytes: pcm24.byteLength, inputSamples: input.length, outputSamples: output.length, outputMs: Math.round(output.length / this.context.sampleRate * 1000), contextSampleRate: this.context.sampleRate, speakerEnabled: this.speakerEnabled }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    this.playbackNode.port.postMessage(
      { type: 'enqueue', samples: output.buffer },
      [output.buffer],
    )
  }

  interruptPlayback(): void {
    // #region debug-point stream-playback-main-interrupt
    this.playbackDebugInterruptSequence += 1
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'stream-playback-overlap', runId: 'post-fix', hypothesisId: 'E', location: 'services/realtime/audio/h5-audio.ts:interruptPlayback', msg: '[DEBUG] interrupt playback requested', data: { sequence: this.playbackDebugInterruptSequence, hasPlaybackNode: Boolean(this.playbackNode), speakerEnabled: this.speakerEnabled }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    this.playbackNode?.port.postMessage({ type: 'clear' })
  }

  setMicEnabled(value: boolean): void {
    this.micEnabled = value
    if (!value) this.captureRemainder = new Int16Array(0)
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = value
    })
  }

  setSpeakerEnabled(value: boolean): void {
    this.speakerEnabled = value
    this.playbackNode?.port.postMessage({ type: 'mute', value: !value })
    if (!value) this.interruptPlayback()
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    await this.stopCapture()
    this.interruptPlayback()
    this.playbackNode?.disconnect()
    this.playbackNode = null
    stopStream(this.stream)
    this.stream = null
    stopStream(primedInputStream)
    primedInputStream = null
    if (this.context && this.context.state !== 'closed') {
      await this.context.close()
    }
    if (primedContext === this.context) primedContext = null
    this.context = null
  }
}
