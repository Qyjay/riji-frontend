#!/usr/bin/env node
/**
 * 聊天轮询：启动/停止、隐藏时停止、失败不中断、按 id 去重
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function loadTsModule(filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText

  const exports = {}
  const factory = new Function('exports', 'require', 'module', compiled)
  factory(exports, require, { exports })
  return exports
}

const {
  createPolling,
  nextPollingDelay,
  CHAT_POLL_INTERVAL_MS,
} = loadTsModule(path.join(root, 'src/utils/polling.ts'))
const { mergeMessagesById } = loadTsModule(path.join(root, 'src/utils/message-merge.ts'))

let passed = 0
let failed = 0

function check(name, callback) {
  try {
    const result = callback()
    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          passed += 1
          console.log(`PASS ${name}`)
        },
        (error) => {
          failed += 1
          console.log(`FAIL ${name}`)
          console.log(`     ${error && error.message ? error.message : error}`)
        },
      )
    }
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${name}`)
    console.log(`     ${error && error.message ? error.message : error}`)
  }
}

function createFakeClock() {
  let now = 0
  let nextId = 1
  const timers = new Map()
  return {
    now: () => now,
    pendingCount: () => timers.size,
    setTimeout(handler, timeout) {
      const id = nextId
      nextId += 1
      timers.set(id, { handler, due: now + timeout })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    async advance(ms) {
      now += ms
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.due <= now)
        .sort((a, b) => a[1].due - b[1].due)
      for (const [id, timer] of due) {
        timers.delete(id)
        await timer.handler()
      }
    },
  }
}

function waitMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve))
}

async function flush(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await waitMicrotasks()
  }
}

async function runChecks() {
  await check('interval is within the 2-3s demo window', () => {
    assert.ok(CHAT_POLL_INTERVAL_MS >= 2000)
    assert.ok(CHAT_POLL_INTERVAL_MS <= 3000)
  })

  await check('backoff grows then caps', () => {
    assert.strictEqual(nextPollingDelay(2500, 0, 10000), 2500)
    assert.strictEqual(nextPollingDelay(2500, 1, 10000), 5000)
    assert.strictEqual(nextPollingDelay(2500, 2, 10000), 10000)
    assert.strictEqual(nextPollingDelay(2500, 8, 10000), 10000)
  })

  await check('start runs immediately and stop prevents later ticks', async () => {
    const clock = createFakeClock()
    let runs = 0
    const polling = createPolling({
      intervalMs: 2500,
      clock,
      async run() {
        runs += 1
      },
    })
    polling.start()
    await flush()
    assert.strictEqual(runs, 1)
    assert.strictEqual(polling.active, true)
    polling.stop()
    assert.strictEqual(polling.active, false)
    assert.strictEqual(clock.pendingCount(), 0)
    await clock.advance(20000)
    await flush()
    assert.strictEqual(runs, 1)
  })

  await check('page hide stop() clears the timer', async () => {
    const clock = createFakeClock()
    let runs = 0
    const polling = createPolling({
      intervalMs: 2500,
      clock,
      run() {
        runs += 1
      },
    })
    polling.start()
    await flush()
    assert.strictEqual(runs, 1)
    polling.stop()
    await clock.advance(2500)
    await flush()
    assert.strictEqual(runs, 1)
  })

  await check('failure does not stop polling and applies backoff', async () => {
    const clock = createFakeClock()
    let runs = 0
    let shouldFail = true
    const failures = []
    const polling = createPolling({
      intervalMs: 2500,
      maxIntervalMs: 10000,
      clock,
      onError(_error, count) {
        failures.push(count)
      },
      async run() {
        runs += 1
        if (shouldFail) throw new Error('network')
      },
    })
    polling.start()
    await flush()
    assert.strictEqual(runs, 1)
    assert.deepStrictEqual(failures, [1])
    assert.strictEqual(polling.active, true)
    assert.ok(polling.delayMs > 2500)

    await clock.advance(polling.delayMs)
    await flush()
    assert.strictEqual(runs, 2)
    assert.deepStrictEqual(failures, [1, 2])

    shouldFail = false
    await clock.advance(polling.delayMs)
    await flush()
    assert.strictEqual(runs, 3)
    assert.strictEqual(polling.consecutiveFailures, 0)
    assert.strictEqual(polling.delayMs, 2500)
    polling.stop()
  })

  await check('in-flight run is not applied after stop', async () => {
    const clock = createFakeClock()
    let continueRun
    const gate = new Promise((resolve) => {
      continueRun = resolve
    })
    let finished = 0
    const polling = createPolling({
      intervalMs: 2500,
      clock,
      async run() {
        await gate
        finished += 1
      },
    })
    polling.start()
    await flush()
    polling.stop()
    continueRun()
    await flush()
    assert.strictEqual(finished, 1)
    assert.strictEqual(polling.active, false)
    assert.strictEqual(clock.pendingCount(), 0)
  })

  await check('mergeMessagesById dedupes by id not content', () => {
    const existing = [
      { id: 'a', content: 'hi', timestamp: 1 },
      { id: 'b', content: 'same', timestamp: 2 },
    ]
    const incoming = [
      { id: 'b', content: 'same', timestamp: 2 },
      { id: 'c', content: 'same', timestamp: 3 },
      { id: 'd', content: 'hi', timestamp: 4 },
    ]
    const result = mergeMessagesById(existing, incoming)
    assert.strictEqual(result.added.length, 2)
    assert.deepStrictEqual(result.added.map((item) => item.id), ['c', 'd'])
    assert.deepStrictEqual(result.items.map((item) => item.id), ['a', 'b', 'c', 'd'])
  })

  await check('optimistic send plus poll of the same id stays unique', () => {
    const local = { id: 'm1', content: 'hello', timestamp: 10 }
    const fromPoll = { id: 'm1', content: 'hello', timestamp: 10 }
    const result = mergeMessagesById([local], [fromPoll, { id: 'm2', content: 'hi', timestamp: 11 }])
    assert.strictEqual(result.items.length, 2)
    assert.strictEqual(result.added.length, 1)
    assert.strictEqual(result.added[0].id, 'm2')
    assert.strictEqual(result.items[0], local)
  })

  await check('same timestamp different ids are both kept', () => {
    const result = mergeMessagesById(
      [{ id: 'x', timestamp: 5 }],
      [{ id: 'y', timestamp: 5 }, { id: 'x', timestamp: 5 }],
    )
    assert.deepStrictEqual(result.items.map((item) => item.id).sort(), ['x', 'y'])
  })

  console.log('')
  console.log(`${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}

runChecks().catch((error) => {
  console.error(error)
  process.exit(1)
})
