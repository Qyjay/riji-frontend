#!/usr/bin/env node
/**
 * 跨平台 query 工具测试（不依赖 URLSearchParams）
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

const { buildQuery, withQuery, decodeQueryParam } = loadTsModule(
  path.join(root, 'src/utils/query.ts'),
)

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
    console.log(`     ${error.message}`)
  }
}

check('buildQuery encodes unicode values', () => {
  const query = buildQuery({ nickname: '小明', matchId: 'm1' })
  assert.ok(query.includes('matchId=m1'))
  assert.ok(query.includes(`nickname=${encodeURIComponent('小明')}`))
  assert.ok(!query.includes('小明'))
})

check('buildQuery skips empty values', () => {
  assert.strictEqual(buildQuery({ a: '1', b: '', c: undefined, d: null }), 'a=1')
})

check('buildQuery encodes reserved characters in keys and values', () => {
  assert.strictEqual(
    buildQuery({ 'a b': 'x&y=z' }),
    'a%20b=x%26y%3Dz',
  )
})

check('withQuery appends ? only when params exist', () => {
  assert.strictEqual(withQuery('/plaza/posts', {}), '/plaza/posts')
  assert.strictEqual(
    withQuery('/plaza/posts', { page: 1, page_size: 10 }),
    '/plaza/posts?page=1&page_size=10',
  )
})

check('decodeQueryParam restores unicode', () => {
  assert.strictEqual(decodeQueryParam(encodeURIComponent('李悠然')), '李悠然')
  assert.strictEqual(decodeQueryParam('李悠然'), '李悠然')
  assert.strictEqual(decodeQueryParam(undefined, '搭子'), '搭子')
  assert.strictEqual(decodeQueryParam(''), '')
})

check('decodeQueryParam does not throw on malformed percent sequences', () => {
  assert.strictEqual(decodeQueryParam('%E9%99'), '%E9%99')
})

check('decodeQueryParam accepts array query values', () => {
  assert.strictEqual(decodeQueryParam([encodeURIComponent('小红')]), '小红')
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
