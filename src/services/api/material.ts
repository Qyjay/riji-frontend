import { USE_MOCK, API_BASE_URL } from '../config'
import { request } from '../request'
import * as mock from '../mock/material'

export interface RawMaterial {
  id: string
  userId: string
  type: 'image' | 'voice' | 'text' | 'chat'
  content: string
  mediaUrl: string
  thumbnailUrl: string
  location: { lat?: number; lng?: number; address?: string }
  emotion: { label: string; score: number; emoji: string }
  tags: string[]
  date: string  // "2026-03-25"
  createdAt: number
  // chat 专属字段
  chatSessionId?: string
  startTime?: number
  endTime?: number
}

const DEFAULT_EMOTION = { label: '平静', score: 0.5, emoji: '😐' }
const IMAGE_UPLOAD_MAX_SIDE = 1600
const IMAGE_UPLOAD_QUALITY = 0.82
const IMAGE_UPLOAD_SKIP_COMPRESS_SIZE = 900 * 1024

type UploadImageSource = {
  filePath: string
  file?: File
  cleanup?: () => void
}

function pickFirstUrl(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim().length > 0)
    return typeof first === 'string' ? first : ''
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

function normalizeMaterial(raw: any): RawMaterial {
  return {
    ...raw,
    mediaUrl: pickFirstUrl(raw?.mediaUrl),
    thumbnailUrl: pickFirstUrl(raw?.thumbnailUrl),
    location: raw?.location || {},
    emotion: raw?.emotion || DEFAULT_EMOTION,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
  } as RawMaterial
}

export interface PolishRequest {
  style: '文艺' | '幽默' | '简洁' | '温暖'
}

export async function createMaterial(data: {
  type: 'image' | 'voice' | 'text'
  content?: string
  mediaUrl?: string
  thumbnailUrl?: string
  location?: { lat?: number; lng?: number; address?: string } | null
  emotion?: { label: string; score: number; emoji: string }
  date?: string
}): Promise<RawMaterial> {
  if (USE_MOCK) return mock.createMaterial(data)
  const payload = {
    ...data,
    // 传入默认情绪，避免后端在创建接口内同步等待 AI 情绪提取导致前端超时误判。
    emotion: data.emotion ?? DEFAULT_EMOTION,
  }
  const result = await request<RawMaterial>({
    url: '/materials',
    method: 'POST',
    data: payload,
    timeout: 30000,
  })
  return normalizeMaterial(result)
}

export async function getMaterials(date: string): Promise<RawMaterial[]> {
  if (USE_MOCK) return mock.getMaterials(date)
  const result = await request<RawMaterial[]>({ url: `/materials?date=${date}` })
  return (result || []).map(normalizeMaterial)
}

export async function getMaterialDetail(id: string): Promise<RawMaterial> {
  if (USE_MOCK) return mock.getMaterialDetail(id)
  const result = await request<RawMaterial>({ url: `/materials/${id}` })
  return normalizeMaterial(result)
}

export async function updateMaterial(id: string, data: Partial<RawMaterial>): Promise<RawMaterial> {
  if (USE_MOCK) return mock.updateMaterial(id, data)
  const result = await request<RawMaterial>({ url: `/materials/${id}`, method: 'PUT', data })
  return normalizeMaterial(result)
}

export async function deleteMaterial(id: string): Promise<void> {
  if (USE_MOCK) return mock.deleteMaterial(id)
  return request<void>({ url: `/materials/${id}`, method: 'DELETE' })
}

export async function extractEmotion(id: string): Promise<{ label: string; score: number; emoji: string }> {
  if (USE_MOCK) return mock.extractEmotion(id)
  return request<{ label: string; score: number; emoji: string }>({ url: `/materials/${id}/emotion`, method: 'POST' })
}

export async function polishText(id: string, style: string): Promise<{ polished: string }> {
  if (USE_MOCK) return mock.polishText(id, style)
  return request<{ polished: string }>({ url: `/materials/${id}/polish`, method: 'POST', data: { style } })
}

export async function uploadVoice(filePath: string): Promise<{ url: string; transcription: string }> {
  if (USE_MOCK) return mock.uploadVoice(filePath)
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    uni.uploadFile({
      url: `${API_BASE_URL}/materials/voice`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res: { data: string }) => {
        try {
          const parsed = JSON.parse(res.data)
          if (parsed.code === 0) resolve(parsed.data)
          else reject(new Error(parsed.message || '上传失败'))
        } catch { reject(new Error('解析响应失败')) }
      },
      fail: () => reject(new Error('上传失败')),
    })
  })
}

function isRemoteOrDataUrl(path: string): boolean {
  return /^(https?:)?\/\//i.test(path) || /^data:/i.test(path)
}

function getFileNameFromPath(path: string, fallbackExt = 'jpg'): string {
  const cleanPath = String(path || '').split('?')[0].split('#')[0]
  const name = cleanPath.split('/').filter(Boolean).pop() || ''
  return /\.[a-z0-9]+$/i.test(name) ? name : `diary-image-${Date.now()}.${fallbackExt}`
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片读取失败'))
    img.src = src
  })
}

async function compressImageOnH5(filePath: string): Promise<UploadImageSource> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { filePath }
  }
  if (isRemoteOrDataUrl(filePath) && !filePath.startsWith('blob:')) {
    return { filePath }
  }

  const sourceBlob = await fetch(filePath).then((res) => res.blob())
  if (!sourceBlob.type.startsWith('image/') || sourceBlob.type === 'image/gif') {
    return { filePath }
  }

  const objectUrl = URL.createObjectURL(sourceBlob)
  try {
    const img = await loadImageElement(objectUrl)
    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height) {
      return { filePath }
    }

    const scale = Math.min(1, IMAGE_UPLOAD_MAX_SIDE / Math.max(width, height))
    if (scale >= 1 && sourceBlob.size <= IMAGE_UPLOAD_SKIP_COMPRESS_SIZE) {
      return { filePath }
    }

    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { filePath }
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_UPLOAD_QUALITY)
    })
    if (!compressedBlob || compressedBlob.size >= sourceBlob.size) {
      return { filePath }
    }

    const compressedFile = new File(
      [compressedBlob],
      getFileNameFromPath(filePath, 'jpg').replace(/\.[a-z0-9]+$/i, '.jpg'),
      { type: 'image/jpeg' },
    )
    const compressedUrl = URL.createObjectURL(compressedFile)
    return {
      filePath: compressedUrl,
      file: compressedFile,
      cleanup: () => URL.revokeObjectURL(compressedUrl),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function compressImageForUpload(filePath: string): Promise<UploadImageSource> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      return await compressImageOnH5(filePath)
    } catch {
      return { filePath }
    }
  }

  const compressor = (uni as any).compressImage
  if (typeof compressor !== 'function' || isRemoteOrDataUrl(filePath)) {
    return { filePath }
  }

  return new Promise((resolve) => {
    compressor({
      src: filePath,
      quality: Math.round(IMAGE_UPLOAD_QUALITY * 100),
      success: (res: { tempFilePath?: string }) => {
        resolve({ filePath: res.tempFilePath || filePath })
      },
      fail: () => resolve({ filePath }),
    })
  })
}

async function uploadDiaryImageFile(file: File): Promise<{ url: string; thumbnailUrl: string; location: any }> {
  const token = uni.getStorageSync('token')
  const formData = new FormData()
  formData.append('file', file, file.name || `diary-image-${Date.now()}.jpg`)
  const response = await fetch(`${API_BASE_URL}/upload/diary-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const parsed = await response.json().catch(() => null)
  if (!response.ok || !parsed || parsed.code !== 0) {
    throw new Error(parsed?.message || '上传失败')
  }
  return parsed.data
}

export async function uploadDiaryImage(filePath: string): Promise<{ url: string; thumbnailUrl: string; location: any }> {
  if (USE_MOCK) {
    // Mock 模式直接返回本地路径
    return { url: filePath, thumbnailUrl: filePath, location: null }
  }
  const uploadSource = await compressImageForUpload(filePath)
  if (uploadSource.file) {
    try {
      return await uploadDiaryImageFile(uploadSource.file)
    } finally {
      uploadSource.cleanup?.()
    }
  }
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const uploadOptions: any = {
      url: `${API_BASE_URL}/upload/diary-image`,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res: { data: string }) => {
        try {
          const parsed = JSON.parse(res.data)
          if (parsed.code === 0) resolve(parsed.data)
          else reject(new Error(parsed.message || '上传失败'))
        } catch { reject(new Error('解析响应失败')) }
      },
      fail: () => reject(new Error('上传失败')),
      complete: () => uploadSource.cleanup?.(),
    }
    if (uploadSource.file) {
      uploadOptions.file = uploadSource.file
    } else {
      uploadOptions.filePath = uploadSource.filePath
    }
    uni.uploadFile(uploadOptions)
  })
}
