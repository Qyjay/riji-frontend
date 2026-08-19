// EXIF 解析工具：从用户选取的本地图片中提取拍摄时间与 GPS。
// exifr 依赖浏览器/Node 文件能力，App 端静态引入会因缺少 Buffer 导致白屏，
// 所以 App 端走 extractTakenAtFromPath —— 读文件字节 + 自带的 exif-parser。

import { parseExif } from './exif-parser'

export type TakenAtSource = 'exif' | 'lastModified' | 'manual'

export interface PhotoTakenMeta {
  takenAt: number          // 毫秒时间戳
  takenAtSource: TakenAtSource
  lat?: number
  lon?: number
}

/**
 * 从 File 对象解析拍摄时间。
 * 优先级：EXIF DateTimeOriginal → 文件 lastModified → 当前时间。
 */
export async function extractTakenAt(file: File): Promise<PhotoTakenMeta> {
  // #ifdef H5
  if (file) {
    const { default: exifr } = await import('exifr')
    if (typeof exifr?.parse === 'function') {
      try {
        const parsed = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'])
        const dt = parsed?.DateTimeOriginal || parsed?.CreateDate
        if (dt) {
          const ts = dt instanceof Date ? dt.getTime() : new Date(dt).getTime()
          if (!Number.isNaN(ts) && ts > 0) {
            return {
              takenAt: ts,
              takenAtSource: 'exif',
              lat: typeof parsed?.latitude === 'number' ? parsed.latitude : undefined,
              lon: typeof parsed?.longitude === 'number' ? parsed.longitude : undefined,
            }
          }
        }
      } catch {
        // 忽略解析失败，走兜底逻辑
      }
    }
  }
  // #endif

  const lastModified = file?.lastModified
  if (typeof lastModified === 'number' && lastModified > 0) {
    return { takenAt: lastModified, takenAtSource: 'lastModified' }
  }
  return { takenAt: Date.now(), takenAtSource: 'lastModified' }
}

/** EXIF 一般位于文件开头，先只读这么多字节，失败再读全文件 */
const EXIF_HEAD_BYTES = 262144

/** 读取本地文件的前若干字节；length 参数在部分平台会被忽略，那时返回整个文件 */
function readFileBytes(filePath: string, length?: number): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    let manager: UniApp.FileSystemManager | null = null
    try {
      manager = typeof uni.getFileSystemManager === 'function' ? uni.getFileSystemManager() : null
    } catch {
      manager = null
    }

    if (!manager?.readFile) {
      resolve(null)
      return
    }

    const options: Record<string, unknown> = {
      filePath,
      success: (res: { data?: unknown }) => {
        const data = res?.data
        if (data instanceof ArrayBuffer) {
          resolve(data)
          return
        }
        // 某些平台只肯给 base64 字符串
        if (typeof data === 'string' && data) {
          try {
            resolve(uni.base64ToArrayBuffer(data))
            return
          } catch {
            resolve(null)
            return
          }
        }
        resolve(null)
      },
      fail: () => resolve(null),
    }

    if (typeof length === 'number' && length > 0) {
      options.position = 0
      options.length = length
    }

    try {
      manager.readFile(options as any)
    } catch {
      resolve(null)
    }
  })
}

/**
 * 从本地文件路径解析拍摄时间（App / 小程序端使用）。
 *
 * chooseImage 在 App 端只给出临时路径，既没有 File 对象也没有 lastModifiedTime，
 * 不解析 EXIF 的话所有历史照片都会被当成"今天拍的"，补写日记会归档到错误的日期。
 *
 * @param fallbackTs 解析不到 EXIF 时使用的兜底时间戳
 */
export async function extractTakenAtFromPath(
  filePath: string,
  fallbackTs?: number,
): Promise<PhotoTakenMeta> {
  const fallback: PhotoTakenMeta = {
    takenAt: typeof fallbackTs === 'number' && fallbackTs > 0 ? fallbackTs : Date.now(),
    takenAtSource: 'lastModified',
  }

  if (!filePath) return fallback

  let buffer = await readFileBytes(filePath, EXIF_HEAD_BYTES)
  let parsed = buffer ? parseExif(buffer) : {}

  // 头部没读到（可能 APP1 段靠后或 length 截断了关键数据），退回整文件重试一次
  if (!parsed.takenAt && buffer && buffer.byteLength >= EXIF_HEAD_BYTES) {
    buffer = await readFileBytes(filePath)
    if (buffer) parsed = parseExif(buffer)
  }

  if (!parsed.takenAt) {
    return {
      ...fallback,
      lat: parsed.lat,
      lon: parsed.lon,
    }
  }

  return {
    takenAt: parsed.takenAt,
    takenAtSource: 'exif',
    lat: parsed.lat,
    lon: parsed.lon,
  }
}

/** 毫秒时间戳 → "YYYY-MM-DD" */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 毫秒时间戳 → "HH:MM" */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export type DayPeriodKey = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night' | 'midnight'

export interface DayPeriod {
  key: DayPeriodKey
  label: string
}

/** 根据毫秒时间戳推断时间段。 */
export function detectPeriod(ts: number): DayPeriod {
  const hour = new Date(ts).getHours()
  if (hour >= 5 && hour < 9) return { key: 'dawn', label: '清晨' }
  if (hour >= 9 && hour < 12) return { key: 'morning', label: '上午' }
  if (hour >= 12 && hour < 14) return { key: 'noon', label: '中午' }
  if (hour >= 14 && hour < 18) return { key: 'afternoon', label: '下午' }
  if (hour >= 18 && hour < 20) return { key: 'dusk', label: '傍晚' }
  if (hour >= 20 && hour < 24) return { key: 'night', label: '夜晚' }
  return { key: 'midnight', label: '深夜' }
}
