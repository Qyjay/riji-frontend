#!/usr/bin/env node
/**
 * EXIF 解析器测试
 *
 * 用 scripts/gen-exif-fixtures.py（PIL + piexif，独立实现）生成的图片，
 * 校验 src/utils/exif-parser.ts 的解析结果。
 *
 * 前置：python scripts/gen-exif-fixtures.py
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const fixturesDir = path.join(__dirname, 'fixtures')

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
  // eslint-disable-next-line no-new-func
  const factory = new Function('exports', 'require', 'module', compiled)
  factory(exports, require, { exports })
  return exports
}

const { parseExif, parseExifDate } = loadTsModule(
  path.join(root, 'src/utils/exif-parser.ts'),
)

function toLocalString(timestamp) {
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function readFixture(name) {
  const buffer = fs.readFileSync(path.join(fixturesDir, name))
  // 转成独立的 ArrayBuffer，避免 Node Buffer 的 pool 偏移影响 DataView
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

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

if (!fs.existsSync(fixturesDir)) {
  console.error('缺少测试图片，请先运行: python scripts/gen-exif-fixtures.py')
  process.exit(2)
}

const expectations = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'expectations.json'), 'utf8'),
)

// ── 图片解析 ────────────────────────────────────────────────

for (const [name, expected] of Object.entries(expectations)) {
  check(`parseExif ${name}`, () => {
    const result = parseExif(readFixture(name))

    if (expected.takenAtLocal === null) {
      assert.strictEqual(
        result.takenAt,
        undefined,
        `期望无拍摄时间，实际 ${result.takenAt && toLocalString(result.takenAt)}`,
      )
    } else {
      assert.ok(result.takenAt, '未解析出拍摄时间')
      assert.strictEqual(
        toLocalString(result.takenAt),
        expected.takenAtLocal,
        `时间不符：期望 ${expected.takenAtLocal}，实际 ${toLocalString(result.takenAt)}`,
      )
    }

    if (expected.lat === null) {
      assert.strictEqual(result.lat, undefined, `期望无纬度，实际 ${result.lat}`)
      assert.strictEqual(result.lon, undefined, `期望无经度，实际 ${result.lon}`)
    } else {
      assert.ok(typeof result.lat === 'number', '未解析出纬度')
      assert.ok(typeof result.lon === 'number', '未解析出经度')
      // DMS 往返转换有精度损失，容忍 1e-4 度（约 11 米）
      assert.ok(
        Math.abs(result.lat - expected.lat) < 1e-4,
        `纬度不符：期望 ${expected.lat}，实际 ${result.lat}`,
      )
      assert.ok(
        Math.abs(result.lon - expected.lon) < 1e-4,
        `经度不符：期望 ${expected.lon}，实际 ${result.lon}`,
      )
    }
  })
}

// ── 健壮性：损坏输入不能抛异常 ──────────────────────────────

check('parseExif 空 buffer', () => {
  assert.deepStrictEqual(parseExif(new ArrayBuffer(0)), {})
})

check('parseExif 非 JPEG', () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  assert.deepStrictEqual(parseExif(bytes.buffer), {})
})

check('parseExif 截断的 JPEG', () => {
  const full = new Uint8Array(readFixture('with-datetime-gps.jpg'))
  // 从 APP1 段中间切断，解析器必须安全返回而不是越界读取
  const truncated = full.subarray(0, 40)
  const result = parseExif(
    truncated.buffer.slice(truncated.byteOffset, truncated.byteOffset + truncated.byteLength),
  )
  assert.strictEqual(typeof result, 'object')
})

check('parseExif 全零数据', () => {
  assert.deepStrictEqual(parseExif(new ArrayBuffer(1024)), {})
})

// ── 日期解析边界 ────────────────────────────────────────────

check('parseExifDate 正常值', () => {
  const ts1 = parseExifDate('2026:03:15 14:30:45')
  assert.strictEqual(toLocalString(ts1), '2026-03-15 14:30:45')
})

check('parseExifDate 相机未设时间', () => {
  assert.strictEqual(parseExifDate('0000:00:00 00:00:00'), undefined)
})

check('parseExifDate 空值与垃圾值', () => {
  assert.strictEqual(parseExifDate(''), undefined)
  assert.strictEqual(parseExifDate('not a date'), undefined)
  assert.strictEqual(parseExifDate('2026-03-15'), undefined)
})

check('parseExifDate 拒绝未来时间', () => {
  assert.strictEqual(parseExifDate('2099:01:01 00:00:00'), undefined)
})

check('parseExifDate 非法月份', () => {
  assert.strictEqual(parseExifDate('2026:13:01 00:00:00'), undefined)
})

console.log(`\n=== EXIF Parser Test Results ===`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)

if (failed > 0) {
  process.exit(1)
}
console.log('All tests passed! ✓')
