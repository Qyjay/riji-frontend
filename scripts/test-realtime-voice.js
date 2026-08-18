#!/usr/bin/env node
const assert = require('assert')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'src')
const moduleCache = new Map()

global.btoa = global.btoa || ((value) => Buffer.from(value, 'binary').toString('base64'))
global.atob = global.atob || ((value) => Buffer.from(value, 'base64').toString('binary'))
global.uni = {
  navigateTo() {},
}

function resolveTsFile(request, parentFilename) {
  let candidate
  if (request.startsWith('@/')) candidate = path.join(src, request.slice(2))
  else if (request.startsWith('.')) candidate = path.resolve(path.dirname(parentFilename), request)
  else return null
  for (const suffix of ['', '.ts', '.js', '/index.ts', '/index.js']) {
    const filename = candidate + suffix
    if (fs.existsSync(filename) && fs.statSync(filename).isFile()) return filename
  }
  return null
}

function loadTs(filename) {
  const absolute = path.resolve(filename)
  if (moduleCache.has(absolute)) return moduleCache.get(absolute).exports
  const source = fs.readFileSync(absolute, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: absolute,
  }).outputText
  const instance = new Module(absolute, module)
  moduleCache.set(absolute, instance)
  instance.filename = absolute
  instance.paths = Module._nodeModulePaths(path.dirname(absolute))
  const nativeRequire = instance.require.bind(instance)
  instance.require = (request) => {
    if (request === '@/services/config') return { API_BASE_URL: '/api' }
    if (
      absolute.endsWith('/voice-socket.ts')
      && request === './voice-api'
    ) {
      return { createRealtimeVoiceTicket: async () => { throw new Error('ticket provider not injected') } }
    }
    const local = resolveTsFile(request, absolute)
    return local ? loadTs(local) : nativeRequire(request)
  }
  instance._compile(compiled, absolute)
  return instance.exports
}

let passed = 0
function test(name, callback) {
  return Promise.resolve()
    .then(callback)
    .then(() => {
      passed += 1
      console.log(`PASS ${name}`)
    })
}

async function run() {
  const protocol = loadTs(path.join(src, 'services/realtime/voice-protocol.ts'))
  const pcm = loadTs(path.join(src, 'services/realtime/audio/pcm.ts'))
  const { FakeRealtimeAudioAdapter } = loadTs(
    path.join(src, 'services/realtime/audio/fake-audio.ts'),
  )
  const socketModule = loadTs(path.join(src, 'services/realtime/voice-socket.ts'))

  await test('protocol parses known events and ignores malformed events', () => {
    const event = protocol.parseVoiceServerEvent(JSON.stringify({
      type: 'asr.done',
      eventId: 'evt-1',
      sessionId: 'session-1',
      timestamp: 1,
      text: '今晚看电影',
    }))
    assert.equal(event.type, 'asr.done')
    assert.equal(protocol.parseVoiceServerEvent('{bad'), null)
    assert.equal(protocol.parseVoiceServerEvent({
      type: 'provider.private.event',
      eventId: 'evt',
      sessionId: 'session',
      timestamp: 1,
    }), null)
  })

  await test('PCM utilities clamp, resample, encode and measure audio', () => {
    const pcm16 = pcm.float32ToPcm16(new Float32Array([-2, -0.5, 0, 0.5, 2]))
    assert.deepEqual(Array.from(pcm16), [-32768, -16384, 0, 16384, 32767])
    assert.equal(pcm.resampleFloat32(new Float32Array(0), 48000, 16000).length, 0)
    assert.equal(pcm.resampleFloat32(new Float32Array(480), 48000, 16000).length, 160)
    const encoded = pcm.arrayBufferToBase64(pcm16.buffer)
    assert.deepEqual(
      Array.from(new Int16Array(pcm.base64ToArrayBuffer(encoded))),
      Array.from(pcm16),
    )
    assert(pcm.calculateRms(new Int16Array([16384, -16384])) > 0.49)
  })

  await test('fake audio capture, playback, interrupt and dispose are deterministic', async () => {
    const audio = new FakeRealtimeAudioAdapter()
    let frames = 0
    await audio.requestPermission()
    await audio.startCapture(() => { frames += 1 })
    audio.emitFrame()
    audio.enqueuePlayback(new Int16Array([1, 2]).buffer)
    assert.equal(frames, 1)
    assert.equal(audio.playbackQueue.length, 1)
    audio.interruptPlayback()
    assert.equal(audio.playbackQueue.length, 0)
    await audio.dispose()
    audio.emitFrame()
    assert.equal(frames, 1)
    assert.equal(audio.disposed, true)
  })

  await test('H5 AudioWorklet adapter emits 20ms frames and clears playback', async () => {
    const tracks = [{
      enabled: true,
      stopped: false,
      stop() { this.stopped = true },
    }]
    class FakePort {
      constructor() {
        this.messages = []
        this.onmessage = null
      }
      postMessage(message) {
        this.messages.push(message)
      }
    }
    class FakeAudioWorkletNode {
      constructor(_context, name) {
        this.name = name
        this.port = new FakePort()
      }
      connect() {}
      disconnect() {}
    }
    class FakeNode {
      connect() {}
      disconnect() {}
    }
    class FakeAudioContext {
      constructor() {
        this.sampleRate = 48000
        this.state = 'running'
        this.destination = {}
        this.modules = []
        this.audioWorklet = {
          addModule: async (modulePath) => { this.modules.push(modulePath) },
        }
      }
      async resume() { this.state = 'running' }
      createMediaStreamSource() { return new FakeNode() }
      createGain() {
        const node = new FakeNode()
        node.gain = { value: 1 }
        return node
      }
      async close() { this.state = 'closed' }
    }
    global.window = { AudioContext: FakeAudioContext }
    global.AudioWorkletNode = FakeAudioWorkletNode
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: async () => ({
            getTracks: () => tracks,
            getAudioTracks: () => tracks,
          }),
        },
      },
    })
    const { H5RealtimeAudioAdapter } = loadTs(
      path.join(src, 'services/realtime/audio/h5-audio.ts'),
    )
    const audio = new H5RealtimeAudioAdapter()
    const frames = []
    await audio.requestPermission()
    await audio.startCapture((frame, level) => frames.push({ frame, level }))
    audio.captureNode.port.onmessage({
      data: {
        type: 'samples',
        samples: new Float32Array(960).fill(0.5),
      },
    })
    assert.equal(frames.length, 1)
    assert.equal(frames[0].frame.byteLength, 640)
    assert(frames[0].level > 0.49)
    audio.enqueuePlayback(new Int16Array(240).fill(1000).buffer)
    const enqueue = audio.playbackNode.port.messages.find(
      (message) => message.type === 'enqueue',
    )
    assert.equal(new Float32Array(enqueue.samples).length, 480)
    audio.interruptPlayback()
    assert.equal(
      audio.playbackNode.port.messages.at(-1).type,
      'clear',
    )
    await audio.dispose()
    assert.equal(tracks[0].stopped, true)
  })

  await test('socket uses ephemeral ticket, secure URL and event ids', async () => {
    class FakeSocket {
      constructor(url) {
        this.url = url
        this.readyState = 0
        this.sent = []
        this.listeners = {}
        queueMicrotask(() => {
          this.readyState = 1
          this.emit('open', {})
        })
      }
      addEventListener(type, listener) {
        this.listeners[type] = listener
      }
      emit(type, event) {
        this.listeners[type]?.(event)
      }
      send(data) {
        this.sent.push(JSON.parse(data))
      }
      close() {
        this.readyState = 3
        this.emit('close', {})
      }
    }
    let fakeSocket
    const events = []
    const client = new socketModule.RealtimeVoiceSocketClient({
      apiBaseUrl: 'https://avalin.test/api',
      pageOrigin: 'https://avalin.test',
      ticketProvider: async () => ({
        ticket: 'one-time-ticket',
        expiresAt: Date.now() + 60000,
        websocketPath: '/ws/realtime-avatar',
        input: {},
        output: {},
      }),
      socketFactory: (url) => {
        fakeSocket = new FakeSocket(url)
        return fakeSocket
      },
      onEvent: (event) => events.push(event),
    })
    await client.connect({ entryMode: 'social_mission' })
    assert.equal(
      fakeSocket.url,
      'wss://avalin.test/ws/realtime-avatar?ticket=one-time-ticket',
    )
    assert.equal(fakeSocket.sent[0].type, 'session.start')
    assert.equal(fakeSocket.sent[0].entryMode, 'social_mission')
    assert(fakeSocket.sent[0].eventId)
    client.appendAudio('AAE=')
    assert.equal(fakeSocket.sent[1].type, 'audio.append')
    fakeSocket.emit('message', {
      data: JSON.stringify({
        type: 'session.ready',
        eventId: 'ready',
        sessionId: 'session',
        timestamp: 1,
        providerSessionId: 'provider',
      }),
    })
    assert.equal(events.length, 1)
    client.close()
  })

  await test('store handles transcript, interruption, evidence, confirmation and cleanup', async () => {
    const { createPinia, setActivePinia } = require('pinia')
    setActivePinia(createPinia())
    const { useRealtimeVoiceStore } = loadTs(
      path.join(src, 'stores/realtime-voice.ts'),
    )
    const audio = new FakeRealtimeAudioAdapter()
    let handlers
    const sent = { audio: 0, cancel: 0, confirmations: [] }
    const fakeSocket = {
      async connect() {
        handlers.onState('open')
        handlers.onEvent({
          type: 'session.ready',
          eventId: 'ready',
          sessionId: 'voice-session',
          timestamp: 1,
          providerSessionId: 'provider-session',
        })
      },
      appendAudio() { sent.audio += 1 },
      cancelResponse() { sent.cancel += 1 },
      resolveConfirmation(id, decision) {
        sent.confirmations.push([id, decision])
      },
      close() { handlers.onState('closed') },
    }
    const store = useRealtimeVoiceStore()
    store.configure({
      createAudio: () => audio,
      createSocket: (nextHandlers) => {
        handlers = nextHandlers
        return fakeSocket
      },
      now: () => 1000,
    })
    await store.connect({ entryMode: 'general' })
    assert.equal(store.phase, 'listening')
    audio.emitFrame()
    assert.equal(sent.audio, 1)
    handlers.onEvent({
      type: 'asr.delta',
      eventId: 'asr-delta',
      sessionId: 'voice-session',
      timestamp: 2,
      text: '晚霞',
    })
    handlers.onEvent({
      type: 'asr.done',
      eventId: 'asr-done',
      sessionId: 'voice-session',
      timestamp: 3,
      text: '你还记得晚霞吗',
      itemId: 'user-1',
    })
    handlers.onEvent({
      type: 'assistant.audio.started',
      eventId: 'audio-start',
      sessionId: 'voice-session',
      timestamp: 4,
    })
    audio.enqueuePlayback(new Int16Array([1]).buffer)
    handlers.onEvent({
      type: 'asr.started',
      eventId: 'interrupt',
      sessionId: 'voice-session',
      timestamp: 5,
    })
    assert.equal(audio.playbackQueue.length, 0)
    assert.equal(sent.cancel, 1)
    handlers.onEvent({
      type: 'tool.result',
      eventId: 'evidence',
      sessionId: 'voice-session',
      timestamp: 6,
      name: 'search_personal_memory',
      display: {
        kind: 'memory_evidence',
        items: [
          {
            sourceType: 'diary',
            title: '同一片晚霞',
            snippet: '湖面有橙色反光',
            occurredAt: 1,
            deepLink: '/pages/diary/detail?id=diary-1',
          },
        ],
      },
    })
    assert.equal(store.evidence.length, 1)
    handlers.onEvent({
      type: 'confirmation.required',
      eventId: 'confirmation',
      sessionId: 'voice-session',
      timestamp: 7,
      confirmation: {
        id: 'confirm-1',
        action: 'start_social_mission',
        riskLevel: 'R2',
        title: '开始寻找？',
        summary: ['活动：看电影'],
        expiresAt: 2000,
        approveLabel: '确认开始',
        rejectLabel: '再改一下',
      },
    })
    store.resolveConfirmation('approve')
    assert.deepEqual(sent.confirmations, [['confirm-1', 'approve']])
    await store.close()
    assert.equal(store.phase, 'closed')
    assert.equal(audio.disposed, true)
  })

  console.log(`\nRealtime voice tests passed: ${passed}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
