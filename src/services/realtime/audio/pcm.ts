export function float32ToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] || 0))
    output[index] = sample < 0
      ? Math.round(sample * 0x8000)
      : Math.round(sample * 0x7fff)
  }
  return output
}

export function calculateRms(input: Float32Array | Int16Array): number {
  if (!input.length) return 0
  const scale = input instanceof Int16Array ? 1 / 32768 : 1
  let sum = 0
  for (let index = 0; index < input.length; index += 1) {
    const value = (input[index] || 0) * scale
    sum += value * value
  }
  return Math.min(1, Math.sqrt(sum / input.length))
}

export function resampleFloat32(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (!input.length) return new Float32Array(0)
  if (fromRate <= 0 || toRate <= 0) {
    throw new Error('采样率必须大于 0')
  }
  if (fromRate === toRate) return input.slice()
  const outputLength = Math.max(1, Math.round(input.length * toRate / fromRate))
  const output = new Float32Array(outputLength)
  const ratio = fromRate / toRate
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio
    const left = Math.min(input.length - 1, Math.floor(position))
    const right = Math.min(input.length - 1, left + 1)
    const weight = position - left
    output[index] = input[left] * (1 - weight) + input[right] * weight
  }
  return output
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize))
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

export function concatInt16(
  left: Int16Array,
  right: Int16Array,
): Int16Array {
  if (!left.length) return right.slice()
  if (!right.length) return left.slice()
  const output = new Int16Array(left.length + right.length)
  output.set(left)
  output.set(right, left.length)
  return output
}

