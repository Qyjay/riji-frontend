#!/usr/bin/env node
/**
 * Unit tests: verify px→rpx migration rules are correctly applied.
 * Checks that:
 *   1. Converted files have no stray CSS px values in <style> blocks
 *      (except box-shadow, border 1px solid, outline)
 *   2. DoodleIcon iconStyle uses rpx not px
 *   3. box-shadow values are preserved with px
 */

const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0
const errors = []

function assert(condition, msg) {
  if (condition) {
    passed++
  } else {
    failed++
    errors.push('FAIL: ' + msg)
  }
}

// --- Test 1: DoodleIcon uses rpx in iconStyle ---
const doodleIconPath = path.join(__dirname, '../src/components/DoodleIcon.vue')
const doodleContent = fs.readFileSync(doodleIconPath, 'utf8')
assert(
  doodleContent.includes('`${props.size}rpx`'),
  'DoodleIcon iconStyle should use rpx not px'
)
assert(
  !doodleContent.includes('`${props.size}px`'),
  'DoodleIcon iconStyle should NOT use px'
)
assert(
  doodleContent.includes(":width=\"size + 'rpx'\"") || doodleContent.includes(':width="size + \'rpx\'"'),
  'DoodleIcon SVG width should use rpx'
)

// --- Test 2: No stray px in <style> blocks (outside allowed exceptions) ---
const srcDir = path.join(__dirname, '../src')

function walkDir(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else if (entry.name.endsWith('.vue') || entry.name.endsWith('.scss')) {
      files.push(full)
    }
  }
  return files
}

const vueFiles = walkDir(srcDir)

for (const filePath of vueFiles) {
  const content = fs.readFileSync(filePath, 'utf8')
  const rel = path.relative(srcDir, filePath)

  // Extract style section for .vue files
  let styleContent = content
  if (filePath.endsWith('.vue')) {
    const styleMatch = content.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/g)
    styleContent = styleMatch ? styleMatch.join('\n') : ''
  }

  // Check each line for stray px values
  const lines = styleContent.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip allowed px exceptions
    if (
      line.includes('box-shadow') ||
      /border(-\w+)?:\s*1px\s+solid/.test(line) ||
      line.includes('outline:') ||
      line.includes('border-width:') ||
      line.includes('env(safe') ||
      line.trim().startsWith('//') ||
      line.trim().startsWith('*')
    ) continue

    // Check for px values that should have been converted
    const pxMatch = line.match(/(\d+(?:\.\d+)?)px/)
    if (pxMatch) {
      // Allow 1px in border declarations
      const val = parseFloat(pxMatch[1])
      const isBorderOnePx = val === 1 && /border/.test(line)
      if (!isBorderOnePx) {
        errors.push(`FAIL: ${rel}:${i+1} still has px value: "${line.trim()}"`)
        failed++
        continue
      }
    }
    passed++
  }
}

// --- Test 3: box-shadow values preserved with px ---
const messagesPath = path.join(__dirname, '../src/pages/messages/index.vue')
const messagesContent = fs.readFileSync(messagesPath, 'utf8')
assert(
  messagesContent.includes('box-shadow:') && messagesContent.match(/box-shadow:.*px/),
  'box-shadow values should retain px units'
)

// --- Summary ---
console.log(`\n=== Unit Test Results ===`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
if (errors.length > 0) {
  console.log('\nErrors:')
  // Show first 20 errors to avoid overwhelming output
  errors.slice(0, 20).forEach(e => console.log('  ' + e))
  if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`)
  process.exit(1)
} else {
  console.log('\nAll tests passed! ✓')
  process.exit(0)
}
