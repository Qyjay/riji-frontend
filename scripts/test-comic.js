#!/usr/bin/env node
/**
 * 漫画占位图识别：后端失败回落的 placehold.co 不能当成功结果
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

const { isFallbackComicUrl, describeComicRequestError } = loadTsModule(
  path.join(root, 'src/utils/comic.ts'),
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

check('empty is not a fallback url', () => {
  assert.strictEqual(isFallbackComicUrl(''), false)
  assert.strictEqual(isFallbackComicUrl(null), false)
  assert.strictEqual(isFallbackComicUrl(undefined), false)
})

check('backend Diary Comic placeholder is detected', () => {
  assert.strictEqual(
    isFallbackComicUrl('https://placehold.co/1024x1024/EEE/31343C?text=Diary+Comic&font=roboto'),
    true,
  )
})

check('mock AI image placeholder is detected', () => {
  assert.strictEqual(
    isFallbackComicUrl('https://placehold.co/1024x1024/E8D5F5/6B21A8?text=Mock+AI+Image&font=roboto'),
    true,
  )
})

check('real vivo or uploads urls pass', () => {
  assert.strictEqual(
    isFallbackComicUrl('https://xuanji-llm-chilong-prd-bj.vivo.com.cn/xuanji-llm-bucket/comic.png'),
    false,
  )
  assert.strictEqual(
    isFallbackComicUrl('https://www.avalin.cn/uploads/u1/comic/a.png'),
    false,
  )
})

check('timeout and missing diary errors are localized', () => {
  assert.strictEqual(describeComicRequestError(new Error('timeout'), '失败'), '请求超时，请稍后重试')
  assert.strictEqual(describeComicRequestError(new Error('日记不存在'), '失败'), '找不到这篇日记，请从日记详情重新进入')
  assert.strictEqual(describeComicRequestError(new Error('HTTP 错误: 500'), '漫画生成失败，请稍后重试'), '漫画生成失败，请稍后重试')
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
