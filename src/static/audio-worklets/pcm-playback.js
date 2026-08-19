class AvalinPcmPlaybackProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const processorOptions = options.processorOptions || {}
    this.prebufferSamples = Math.max(
      1,
      Number(processorOptions.prebufferSamples || Math.round(sampleRate * 0.1)),
    )
    this.maxSamples = Math.max(
      this.prebufferSamples,
      Number(processorOptions.maxSamples || sampleRate * 2),
    )
    this.queue = []
    this.offset = 0
    this.queuedSamples = 0
    this.started = false
    this.muted = false
    // #region debug-point stream-playback-worklet-state
    this.dropEvents = 0
    this.droppedSamples = 0
    this.underrunEvents = 0
    // #endregion
    this.port.onmessage = (event) => this.handleMessage(event.data || {})
  }

  handleMessage(message) {
    if (message.type === 'enqueue' && message.samples) {
      const samples = new Float32Array(message.samples)
      if (samples.length > this.maxSamples) {
        // #region debug-point stream-playback-worklet-drop-large
        this.dropEvents += 1
        this.droppedSamples += this.queuedSamples + Math.max(0, samples.length - this.maxSamples)
        // #endregion
        this.clear()
        this.queue.push(samples.slice(samples.length - this.maxSamples))
        this.queuedSamples = this.maxSamples
      } else {
        while (
          this.queue.length
          && this.queuedSamples + samples.length > this.maxSamples
        ) {
          const removed = this.queue.shift()
          const removedSamples = Math.max(0, removed.length - this.offset)
          // #region debug-point stream-playback-worklet-drop-overflow
          this.dropEvents += 1
          this.droppedSamples += removedSamples
          // #endregion
          this.queuedSamples = Math.max(0, this.queuedSamples - removedSamples)
          this.offset = 0
        }
        this.queue.push(samples)
        this.queuedSamples += samples.length
      }
      this.report()
    } else if (message.type === 'clear') {
      this.clear()
      this.report()
    } else if (message.type === 'flush') {
      if (this.queuedSamples > 0) this.started = true
    } else if (message.type === 'mute') {
      this.muted = Boolean(message.value)
    }
  }

  clear() {
    this.queue = []
    this.offset = 0
    this.queuedSamples = 0
    this.started = false
  }

  report() {
    this.port.postMessage({
      type: 'queue',
      queuedSamples: this.queuedSamples,
      sampleRate,
      droppedSamples: this.droppedSamples,
      dropEvents: this.dropEvents,
      underrunEvents: this.underrunEvents,
      started: this.started,
    })
  }

  process(_inputs, outputs) {
    const output = outputs[0] && outputs[0][0]
    if (!output) return true
    output.fill(0)
    if (!this.started && this.queuedSamples >= this.prebufferSamples) {
      this.started = true
      this.port.postMessage({
        type: 'started',
        queuedSamples: this.queuedSamples,
        sampleRate,
        droppedSamples: this.droppedSamples,
        dropEvents: this.dropEvents,
        underrunEvents: this.underrunEvents,
        started: this.started,
      })
    }
    if (!this.started) return true

    let sum = 0
    for (let index = 0; index < output.length; index += 1) {
      const current = this.queue[0]
      if (!current) {
        this.started = false
        // #region debug-point stream-playback-worklet-underrun
        this.underrunEvents += 1
        this.port.postMessage({
          type: 'underrun',
          queuedSamples: this.queuedSamples,
          sampleRate,
          droppedSamples: this.droppedSamples,
          dropEvents: this.dropEvents,
          underrunEvents: this.underrunEvents,
          started: this.started,
        })
        // #endregion
        break
      }
      const sample = current[this.offset] || 0
      output[index] = this.muted ? 0 : sample
      sum += sample * sample
      this.offset += 1
      this.queuedSamples = Math.max(0, this.queuedSamples - 1)
      if (this.offset >= current.length) {
        this.queue.shift()
        this.offset = 0
      }
    }
    this.port.postMessage({
      type: 'level',
      level: Math.min(1, Math.sqrt(sum / Math.max(1, output.length))),
      queuedSamples: this.queuedSamples,
      sampleRate,
      droppedSamples: this.droppedSamples,
      dropEvents: this.dropEvents,
      underrunEvents: this.underrunEvents,
      started: this.started,
    })
    return true
  }
}

registerProcessor('avalin-pcm-playback', AvalinPcmPlaybackProcessor)
