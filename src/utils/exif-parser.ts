/**
 * 轻量 EXIF 解析器
 *
 * 纯 ArrayBuffer 运算，不依赖 File / DOM / Buffer，因此 H5 与 App 端通用。
 * App 端拿不到 File 对象，exifr 也无法运行，只能走这里。
 *
 * 只解析补写日记真正需要的字段：拍摄时间与 GPS 经纬度。
 */

export interface ExifResult {
  /** 拍摄时间毫秒时间戳 */
  takenAt?: number
  lat?: number
  lon?: number
}

// TIFF 标签
const TAG_EXIF_IFD_POINTER = 0x8769
const TAG_GPS_IFD_POINTER = 0x8825
const TAG_DATETIME_ORIGINAL = 0x9003
const TAG_CREATE_DATE = 0x9004
const TAG_DATETIME = 0x0132
const TAG_GPS_LAT_REF = 0x0001
const TAG_GPS_LAT = 0x0002
const TAG_GPS_LON_REF = 0x0003
const TAG_GPS_LON = 0x0004

const TYPE_ASCII = 2
const TYPE_RATIONAL = 5

interface IfdEntry {
  tag: number
  type: number
  count: number
  valueOffset: number
}

/**
 * 从 JPEG 字节流解析 EXIF。
 * 非 JPEG、无 EXIF 或结构损坏时返回空对象，调用方走兜底逻辑。
 */
export function parseExif(buffer: ArrayBuffer): ExifResult {
  try {
    const view = new DataView(buffer)
    if (view.byteLength < 4) return {}

    // JPEG SOI
    if (view.getUint16(0) !== 0xFFD8) return {}

    const tiffOffset = findExifTiffOffset(view)
    if (tiffOffset < 0) return {}

    return parseTiff(view, tiffOffset)
  } catch {
    // 结构异常一律当作没有 EXIF，绝不让解析失败影响选图流程
    return {}
  }
}

/** 遍历 JPEG 段，定位 APP1/Exif 里 TIFF 头的绝对偏移 */
function findExifTiffOffset(view: DataView): number {
  let offset = 2

  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)

    // 段标记必须以 0xFF 开头，否则说明已经进入压缩数据
    if ((marker & 0xFF00) !== 0xFF00) return -1

    // SOS 之后是图像数据，EXIF 不会出现在这之后
    if (marker === 0xFFDA) return -1

    const length = view.getUint16(offset + 2)
    if (length < 2) return -1

    if (marker === 0xFFE1) {
      const headerStart = offset + 4
      // 需要 "Exif\0\0" 共 6 字节
      if (headerStart + 6 <= view.byteLength
        && view.getUint8(headerStart) === 0x45      // E
        && view.getUint8(headerStart + 1) === 0x78  // x
        && view.getUint8(headerStart + 2) === 0x69  // i
        && view.getUint8(headerStart + 3) === 0x66  // f
        && view.getUint8(headerStart + 4) === 0x00
      ) {
        return headerStart + 6
      }
    }

    offset += 2 + length
  }

  return -1
}

function parseTiff(view: DataView, tiff: number): ExifResult {
  if (tiff + 8 > view.byteLength) return {}

  const byteOrder = view.getUint16(tiff)
  let little: boolean
  if (byteOrder === 0x4949) little = true        // 'II'
  else if (byteOrder === 0x4D4D) little = false  // 'MM'
  else return {}

  // TIFF magic number
  if (view.getUint16(tiff + 2, little) !== 42) return {}

  const ifd0Offset = view.getUint32(tiff + 4, little)
  if (ifd0Offset < 8) return {}

  const result: ExifResult = {}

  const ifd0 = readIfd(view, tiff, tiff + ifd0Offset, little)
  let exifIfdOffset = 0
  let gpsIfdOffset = 0
  let fallbackDate = ''

  ifd0.forEach((entry) => {
    if (entry.tag === TAG_EXIF_IFD_POINTER) {
      exifIfdOffset = readUint32Value(view, entry, little)
    } else if (entry.tag === TAG_GPS_IFD_POINTER) {
      gpsIfdOffset = readUint32Value(view, entry, little)
    } else if (entry.tag === TAG_DATETIME && entry.type === TYPE_ASCII) {
      // 修改时间，仅在没有拍摄时间时使用
      fallbackDate = readAscii(view, tiff, entry, little)
    }
  })

  if (exifIfdOffset > 0) {
    const exifIfd = readIfd(view, tiff, tiff + exifIfdOffset, little)
    let original = ''
    let created = ''

    exifIfd.forEach((entry) => {
      if (entry.type !== TYPE_ASCII) return
      if (entry.tag === TAG_DATETIME_ORIGINAL) original = readAscii(view, tiff, entry, little)
      else if (entry.tag === TAG_CREATE_DATE) created = readAscii(view, tiff, entry, little)
    })

    const timestamp = parseExifDate(original) ?? parseExifDate(created)
    if (timestamp) result.takenAt = timestamp
  }

  if (!result.takenAt && fallbackDate) {
    const timestamp = parseExifDate(fallbackDate)
    if (timestamp) result.takenAt = timestamp
  }

  if (gpsIfdOffset > 0) {
    const gps = readGps(view, tiff, tiff + gpsIfdOffset, little)
    if (gps.lat !== undefined) result.lat = gps.lat
    if (gps.lon !== undefined) result.lon = gps.lon
  }

  return result
}

function readIfd(view: DataView, tiff: number, offset: number, little: boolean): IfdEntry[] {
  if (offset + 2 > view.byteLength) return []

  const count = view.getUint16(offset, little)
  const entries: IfdEntry[] = []

  for (let index = 0; index < count; index += 1) {
    const entryOffset = offset + 2 + index * 12
    if (entryOffset + 12 > view.byteLength) break

    entries.push({
      tag: view.getUint16(entryOffset, little),
      type: view.getUint16(entryOffset + 2, little),
      count: view.getUint32(entryOffset + 4, little),
      valueOffset: entryOffset + 8,
    })
  }

  return entries
}

function readUint32Value(view: DataView, entry: IfdEntry, little: boolean): number {
  if (entry.valueOffset + 4 > view.byteLength) return 0
  return view.getUint32(entry.valueOffset, little)
}

/** ASCII 值超过 4 字节时 valueOffset 处存的是相对 TIFF 头的偏移 */
function readAscii(view: DataView, tiff: number, entry: IfdEntry, little: boolean): string {
  const length = entry.count
  if (length <= 0) return ''

  let start = entry.valueOffset
  if (length > 4) {
    start = tiff + view.getUint32(entry.valueOffset, little)
  }
  if (start < 0 || start + length > view.byteLength) return ''

  let text = ''
  for (let index = 0; index < length; index += 1) {
    const code = view.getUint8(start + index)
    if (code === 0) break
    text += String.fromCharCode(code)
  }
  return text.trim()
}

/** rational = 两个 uint32（分子/分母） */
function readRational(view: DataView, offset: number, little: boolean): number {
  if (offset + 8 > view.byteLength) return 0
  const numerator = view.getUint32(offset, little)
  const denominator = view.getUint32(offset + 4, little)
  if (!denominator) return 0
  return numerator / denominator
}

function readGps(
  view: DataView,
  tiff: number,
  offset: number,
  little: boolean,
): { lat?: number; lon?: number } {
  const entries = readIfd(view, tiff, offset, little)
  let latRef = ''
  let lonRef = ''
  let lat: number | undefined
  let lon: number | undefined

  entries.forEach((entry) => {
    if (entry.tag === TAG_GPS_LAT_REF) latRef = readAscii(view, tiff, entry, little)
    else if (entry.tag === TAG_GPS_LON_REF) lonRef = readAscii(view, tiff, entry, little)
    else if (entry.tag === TAG_GPS_LAT) lat = readDms(view, tiff, entry, little)
    else if (entry.tag === TAG_GPS_LON) lon = readDms(view, tiff, entry, little)
  })

  // 南纬 / 西经取负
  if (lat !== undefined && latRef.toUpperCase() === 'S') lat = -lat
  if (lon !== undefined && lonRef.toUpperCase() === 'W') lon = -lon

  const valid = (value: number | undefined, limit: number) =>
    value !== undefined && Number.isFinite(value) && Math.abs(value) <= limit

  return {
    lat: valid(lat, 90) ? lat : undefined,
    lon: valid(lon, 180) ? lon : undefined,
  }
}

/** GPS 坐标存为 度/分/秒 三个 rational，共 24 字节，必然是偏移引用 */
function readDms(view: DataView, tiff: number, entry: IfdEntry, little: boolean): number | undefined {
  if (entry.type !== TYPE_RATIONAL || entry.count < 3) return undefined

  const start = tiff + view.getUint32(entry.valueOffset, little)
  if (start < 0 || start + 24 > view.byteLength) return undefined

  const degrees = readRational(view, start, little)
  const minutes = readRational(view, start + 8, little)
  const seconds = readRational(view, start + 16, little)

  return degrees + minutes / 60 + seconds / 3600
}

/**
 * EXIF 时间格式为 "YYYY:MM:DD HH:MM:SS"，且是拍摄设备的本地时间（无时区）。
 * 这里按运行设备的本地时区解释，与用户看到的相册时间一致。
 */
export function parseExifDate(value: string): number | undefined {
  const matched = String(value || '').match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  )
  if (!matched) return undefined

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const hour = Number(matched[4])
  const minute = Number(matched[5])
  const second = Number(matched[6])

  // 相机未设置时间时会写出 0000:00:00
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) return undefined

  const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime()
  if (Number.isNaN(timestamp) || timestamp <= 0) return undefined

  // 拍摄时间不可能在未来，容忍一天的设备时钟偏差
  if (timestamp > Date.now() + 86400000) return undefined

  return timestamp
}
