#!/usr/bin/env node
/**
 * 记忆 / 发帖通知文案、去重、当前会话登记
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
  NOTIFY_CLAIM_WINDOW_MS,
  buildMemoryNotifyCopy,
  buildPlazaNotifyCopy,
  claimNotifyKey,
  memoryNotifyLink,
  plazaPostNotifyLink,
  plazaTypeLabel,
  resetNotifyClaims,
} = loadTsModule(path.join(root, 'src/utils/action-notify.ts'))

const {
  clearActiveMatchId,
  getActiveMatchId,
  setActiveMatchId,
} = loadTsModule(path.join(root, 'src/utils/active-session.ts'))

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

check('delete memory copy is Chinese and truncated', () => {
  const copy = buildMemoryNotifyCopy({
    action: 'delete',
    content: '南开大学大三，软件工程专业，正在 MiniMax 做实习，周末还想去骑行',
  })
  assert.strictEqual(copy.title, '分身记忆已更新')
  assert.ok(copy.content.startsWith('已删除 1 条记忆：'))
  assert.ok(copy.content.includes('南开大学大三'))
  assert.ok(copy.content.includes('…'))
  assert.ok(!copy.content.includes('undefined'))
})

check('encoded memory content is decoded', () => {
  const copy = buildMemoryNotifyCopy({
    action: 'edit',
    content: '%E5%8D%97%E5%BC%80%E5%A4%A7%E5%AD%A6',
  })
  assert.ok(copy.content.includes('南开大学'))
  assert.ok(!copy.content.includes('%E5'))
})

check('pin and disable copies stay concrete', () => {
  const pin = buildMemoryNotifyCopy({ action: 'pin', content: '喜欢骑行' })
  const unpin = buildMemoryNotifyCopy({ action: 'unpin', content: '喜欢骑行' })
  const disable = buildMemoryNotifyCopy({ action: 'disable', content: '想找雅思搭子' })
  assert.strictEqual(pin.content, '已置顶记忆：喜欢骑行')
  assert.strictEqual(unpin.content, '已取消置顶：喜欢骑行')
  assert.strictEqual(disable.content, '已停用记忆：想找雅思搭子')
})

check('plaza copy uses Chinese type and preview', () => {
  assert.strictEqual(plazaTypeLabel('buddy'), '找搭子')
  const copy = buildPlazaNotifyCopy({
    type: 'buddy',
    content: '今晚图书馆自习，有人一起吗？带水杯就行',
  })
  assert.strictEqual(copy.title, '帖子已发布')
  assert.ok(copy.content.startsWith('找搭子：'))
  assert.ok(copy.content.includes('今晚图书馆自习'))
})

check('blank plaza content still has a Chinese sentence', () => {
  const copy = buildPlazaNotifyCopy({ type: 'help', content: '   ' })
  assert.strictEqual(copy.content, '已发布一条求助帖子')
})

check('notify keys only fire once', () => {
  const key = `test-once-${Date.now()}`
  assert.strictEqual(claimNotifyKey(key), true)
  assert.strictEqual(claimNotifyKey(key), false)
  assert.strictEqual(claimNotifyKey(''), false)
})

check('dedupe window blocks a repeated callback but not a later operation', () => {
  resetNotifyClaims()
  const key = 'memory:pin:fact-1:喜欢骑行'
  assert.strictEqual(claimNotifyKey(key, { now: 1000 }), true)
  assert.strictEqual(claimNotifyKey(key, { now: 1000 + NOTIFY_CLAIM_WINDOW_MS - 1 }), false)
  // 置顶 → 取消置顶 → 再置顶，第二次置顶必须还能提示
  assert.strictEqual(claimNotifyKey(key, { now: 1000 + NOTIFY_CLAIM_WINDOW_MS }), true)
})

check('different actions on the same fact do not shadow each other', () => {
  resetNotifyClaims()
  assert.strictEqual(claimNotifyKey('memory:pin:fact-1:喜欢骑行', { now: 0 }), true)
  assert.strictEqual(claimNotifyKey('memory:unpin:fact-1:喜欢骑行', { now: 10 }), true)
  assert.strictEqual(claimNotifyKey('memory:delete:fact-1:喜欢骑行', { now: 20 }), true)
})

check('edited content counts as a new event even within the window', () => {
  resetNotifyClaims()
  assert.strictEqual(claimNotifyKey('memory:edit:fact-1:第一版', { now: 0 }), true)
  assert.strictEqual(claimNotifyKey('memory:edit:fact-1:第二版', { now: 100 }), true)
})

check('claim table is capped and expired keys are reclaimable', () => {
  resetNotifyClaims()
  for (let i = 0; i < 400; i += 1) {
    assert.strictEqual(claimNotifyKey(`bulk-${i}`, { now: i }), true)
  }
  assert.strictEqual(claimNotifyKey('bulk-399', { now: 400 }), false)
  assert.strictEqual(claimNotifyKey('bulk-399', { now: 400 + NOTIFY_CLAIM_WINDOW_MS }), true)
})

check('deep links stay in avalin scheme', () => {
  assert.strictEqual(memoryNotifyLink(), 'avalin://profile/memory')
  assert.strictEqual(plazaPostNotifyLink(''), 'avalin://plaza')
  assert.ok(plazaPostNotifyLink('post-1').startsWith('avalin://plaza/post/'))
  assert.ok(plazaPostNotifyLink('post-1').includes('post-1'))
})

check('active session remembers the open match', () => {
  clearActiveMatchId()
  assert.strictEqual(getActiveMatchId(), '')
  setActiveMatchId('match-9')
  assert.strictEqual(getActiveMatchId(), 'match-9')
  clearActiveMatchId()
  assert.strictEqual(getActiveMatchId(), '')
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
