#!/usr/bin/env node
/**
 * 本地通知文案、去重、Deep Link 纯逻辑
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const cache = new Map()

function loadTsModule(filename) {
  const abs = path.resolve(filename)
  if (cache.has(abs)) return cache.get(abs)

  const source = fs.readFileSync(abs, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: abs,
  }).outputText

  const exports = {}
  cache.set(abs, exports)
  const factory = new Function('exports', 'require', 'module', compiled)
  factory(exports, (spec) => {
    if (spec.startsWith('.') || spec.startsWith('@/')) {
      let target = spec.startsWith('@/')
        ? path.join(root, 'src', spec.slice(2))
        : path.resolve(path.dirname(abs), spec)
      if (!target.endsWith('.ts') && !target.endsWith('.js')) {
        if (fs.existsSync(`${target}.ts`)) target = `${target}.ts`
        else if (fs.existsSync(`${target}.js`)) target = `${target}.js`
      }
      return loadTsModule(target)
    }
    return require(spec)
  }, { exports })
  return exports
}

const {
  INBOX_POLL_INTERVAL_MS,
  buildMessageNotifyCopy,
  buildRequestNotifyCopy,
  chatNotifyLink,
  collectUnseen,
  displayPersonName,
  isOwnMessage,
  parseStoredIdList,
  requestNotifyLink,
  shouldNotifyIncomingMessage,
} = loadTsModule(path.join(root, 'src/utils/inbox-notify.ts'))

let passed = 0
let failed = 0

function check(name, callback) {
  try {
    callback()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${name}`)
    console.log(`     ${error && error.message ? error.message : error}`)
  }
}

check('poll interval stays in the demo window', () => {
  assert.ok(INBOX_POLL_INTERVAL_MS >= 2500)
  assert.ok(INBOX_POLL_INTERVAL_MS <= 5000)
})

check('buddy request copy is Chinese and concrete', () => {
  const copy = buildRequestNotifyCopy({ nickname: '陈屿', matchType: 'buddy' })
  assert.strictEqual(copy.title, '新的搭子申请')
  assert.strictEqual(copy.content, '陈屿 想和你成为搭子')
})

check('long-term friend request copy', () => {
  const copy = buildRequestNotifyCopy({ nickname: '林夏', matchType: 'long_term' })
  assert.strictEqual(copy.title, '新的好友申请')
  assert.strictEqual(copy.content, '林夏 想和你成为好友')
})

check('encoded nickname is decoded for display', () => {
  const name = displayPersonName('%E9%99%88%E5%B1%BF')
  assert.strictEqual(name, '陈屿')
  const copy = buildRequestNotifyCopy({ nickname: '%E9%99%88%E5%B1%BF', matchType: 'buddy' })
  assert.ok(!copy.content.includes('%E9'))
  assert.ok(copy.content.includes('陈屿'))
})

check('empty nickname falls back to 有人', () => {
  const copy = buildRequestNotifyCopy({ nickname: '', matchType: 'buddy' })
  assert.strictEqual(copy.content, '有人 想和你成为搭子')
})

check('message copy uses preview and skips own messages', () => {
  const copy = buildMessageNotifyCopy({ nickname: '小明', content: '晚上图书馆见' })
  assert.strictEqual(copy.title, '新的聊天消息')
  assert.strictEqual(copy.content, '小明：晚上图书馆见')
  assert.strictEqual(isOwnMessage('me', 'u1'), true)
  assert.strictEqual(isOwnMessage('u1', 'u1'), true)
  assert.strictEqual(isOwnMessage('u2', 'u1'), false)
})

check('blank message content still has a Chinese sentence', () => {
  const copy = buildMessageNotifyCopy({ nickname: '小红', content: '   ' })
  assert.strictEqual(copy.content, '小红 给你发来一条消息')
})

check('first message baseline does not notify historical ids', () => {
  const diff = collectUnseen({
    seen: new Set(),
    ids: ['m1', 'm2'],
    primed: false,
    notifyOnFirstBaseline: false,
  })
  assert.deepStrictEqual(diff.newIds, [])
  assert.strictEqual(diff.nextPrimed, true)
  assert.ok(diff.nextSeen.has('m1'))
  assert.ok(diff.nextSeen.has('m2'))
})

check('first request baseline can notify existing pending once', () => {
  const diff = collectUnseen({
    seen: new Set(),
    ids: ['r1'],
    primed: false,
    notifyOnFirstBaseline: true,
  })
  assert.deepStrictEqual(diff.newIds, ['r1'])
})

check('same request id is not emitted twice', () => {
  const first = collectUnseen({
    seen: new Set(),
    ids: ['r1'],
    primed: true,
  })
  const second = collectUnseen({
    seen: first.nextSeen,
    ids: ['r1', 'r2'],
    primed: true,
  })
  assert.deepStrictEqual(first.newIds, ['r1'])
  assert.deepStrictEqual(second.newIds, ['r2'])
})

check('an event whose notification failed is retried on the next tick', () => {
  const first = collectUnseen({ seen: new Set(), ids: ['r1'], primed: true })
  assert.deepStrictEqual(first.newIds, ['r1'])

  // notify() 返回 false 时巡检会把 id 退回未读，下一轮必须重新尝试
  const retrySeen = new Set(first.nextSeen)
  retrySeen.delete('r1')
  const second = collectUnseen({ seen: retrySeen, ids: ['r1'], primed: true })
  assert.deepStrictEqual(second.newIds, ['r1'])

  // 成功之后就不再重复弹
  const third = collectUnseen({ seen: second.nextSeen, ids: ['r1'], primed: true })
  assert.deepStrictEqual(third.newIds, [])
})

check('seen set stays capped without dropping the newest ids', () => {
  const ids = Array.from({ length: 320 }, (_, i) => `m${i}`)
  const diff = collectUnseen({ seen: new Set(), ids, primed: true, maxSeen: 300 })
  assert.strictEqual(diff.nextSeen.size, 300)
  assert.ok(diff.nextSeen.has('m319'))
})

check('deep links stay in avalin scheme', () => {
  assert.strictEqual(requestNotifyLink(), 'avalin://social/requests')
  const link = chatNotifyLink('match-1', '陈屿')
  assert.ok(link.startsWith('avalin://social/chat?'))
  assert.ok(link.includes('matchId=match-1'))
  assert.ok(link.includes(encodeURIComponent('陈屿')))
})

check('stored id list parser accepts json array or string', () => {
  assert.deepStrictEqual(parseStoredIdList('["a","b"]'), ['a', 'b'])
  assert.deepStrictEqual(parseStoredIdList(['c']), ['c'])
  assert.deepStrictEqual(parseStoredIdList('not-json'), [])
})

check('background chat always notifies even if that session was last open', () => {
  assert.strictEqual(shouldNotifyIncomingMessage({
    matchId: 'm1',
    activeMatchId: 'm1',
    appForeground: false,
  }), true)
})

check('foreground current chat does not notify', () => {
  assert.strictEqual(shouldNotifyIncomingMessage({
    matchId: 'm1',
    activeMatchId: 'm1',
    appForeground: true,
  }), false)
})

check('foreground other page or other chat does notify', () => {
  assert.strictEqual(shouldNotifyIncomingMessage({
    matchId: 'm1',
    activeMatchId: '',
    appForeground: true,
  }), true)
  assert.strictEqual(shouldNotifyIncomingMessage({
    matchId: 'm1',
    activeMatchId: 'm2',
    appForeground: true,
  }), true)
})

check('empty match id never notifies', () => {
  assert.strictEqual(shouldNotifyIncomingMessage({
    matchId: '',
    activeMatchId: '',
    appForeground: false,
  }), false)
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
