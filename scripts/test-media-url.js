#!/usr/bin/env node
/**
 * 媒体地址解析：相对 /uploads、明文 HTTP、旧公网 IP → 当前 API host
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

const { getAssetHost, resolveMediaUrl, resolveMediaUrls } = loadTsModule(
  path.join(root, 'src/utils/media-url.ts'),
)

const APP_API = 'https://www.avalin.cn/api'
const H5_API = '/api'
const SAMPLE = '/uploads/3104d085-d7bd-5207-9362-4c0fdbe42dd1/avatar/9c12b22f-2119-58e9-bfb8-32294ca21036.webp'

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

check('getAssetHost strips trailing /api', () => {
  assert.strictEqual(getAssetHost(APP_API), 'https://www.avalin.cn')
  assert.strictEqual(getAssetHost('https://www.avalin.cn/api/'), 'https://www.avalin.cn')
  assert.strictEqual(getAssetHost(H5_API), '')
  assert.strictEqual(getAssetHost('http://192.168.1.8:8000/api'), 'http://192.168.1.8:8000')
})

check('App: /uploads becomes https host', () => {
  assert.strictEqual(
    resolveMediaUrl(SAMPLE, APP_API),
    `https://www.avalin.cn${SAMPLE}`,
  )
})

check('H5: /uploads stays same-origin relative', () => {
  assert.strictEqual(resolveMediaUrl(SAMPLE, H5_API), SAMPLE)
})

check('uploads without leading slash', () => {
  assert.strictEqual(
    resolveMediaUrl('uploads/u1/avatar/a.jpg', APP_API),
    'https://www.avalin.cn/uploads/u1/avatar/a.jpg',
  )
})

check('mistaken /api/uploads is rewritten to /uploads', () => {
  assert.strictEqual(
    resolveMediaUrl('/api/uploads/u1/avatar/a.jpg', APP_API),
    'https://www.avalin.cn/uploads/u1/avatar/a.jpg',
  )
})

check('empty input stays empty', () => {
  assert.strictEqual(resolveMediaUrl('', APP_API), '')
  assert.strictEqual(resolveMediaUrl(null, APP_API), '')
})

check('local static and file schemes are kept', () => {
  assert.strictEqual(resolveMediaUrl('/static/brand/logo-d-mascot.png', APP_API), '/static/brand/logo-d-mascot.png')
  assert.strictEqual(resolveMediaUrl('static/brand/logo-d-mascot.png', APP_API), '/static/brand/logo-d-mascot.png')
  assert.strictEqual(resolveMediaUrl('file:///storage/emulated/0/a.jpg', APP_API), 'file:///storage/emulated/0/a.jpg')
  assert.strictEqual(resolveMediaUrl('data:image/png;base64,abc', APP_API), 'data:image/png;base64,abc')
  assert.strictEqual(resolveMediaUrl('/storage/emulated/0/DCIM/a.jpg', APP_API), '/storage/emulated/0/DCIM/a.jpg')
})

check('legacy IP and bare domain are rewritten onto current host', () => {
  assert.strictEqual(
    resolveMediaUrl(`http://115.190.218.167${SAMPLE}`, APP_API),
    `https://www.avalin.cn${SAMPLE}`,
  )
  assert.strictEqual(
    resolveMediaUrl(`https://115.190.218.167${SAMPLE}`, APP_API),
    `https://www.avalin.cn${SAMPLE}`,
  )
  assert.strictEqual(
    resolveMediaUrl(`http://avalin.cn${SAMPLE}`, APP_API),
    `https://www.avalin.cn${SAMPLE}`,
  )
})

check('plaintext http on public host is upgraded to https', () => {
  assert.strictEqual(
    resolveMediaUrl(`http://www.avalin.cn${SAMPLE}`, APP_API),
    `https://www.avalin.cn${SAMPLE}`,
  )
})

check('LAN http is kept for local debugging', () => {
  const lan = 'http://192.168.1.8:8000/uploads/u1/a.jpg'
  assert.strictEqual(resolveMediaUrl(lan, 'http://192.168.1.8:8000/api'), lan)
})

check('https uploads already absolute stay unchanged', () => {
  const abs = `https://www.avalin.cn${SAMPLE}`
  assert.strictEqual(resolveMediaUrl(abs, APP_API), abs)
})

check('resolveMediaUrls maps and drops empties', () => {
  assert.deepStrictEqual(
    resolveMediaUrls(['', SAMPLE, null], APP_API),
    [`https://www.avalin.cn${SAMPLE}`],
  )
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
