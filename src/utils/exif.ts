// EXIF 解析工具：从用户选取的本地图片中提取拍摄时间与 GPS。
// exifr 依赖浏览器/Node 文件能力，App 端静态引入会因缺少 Buffer 导致白屏。

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
