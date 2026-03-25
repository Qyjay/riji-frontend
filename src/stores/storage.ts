/**
 * 跨端存储适配器
 * 统一使用 uni.xxxStorageSync，兼容 H5 / App / 小程序 / 鸿蒙
 * 不依赖 localStorage / sessionStorage
 */
export const uniStorage: Storage = {
  get length() {
    const res = uni.getStorageInfoSync()
    return res.keys.length
  },
  key(index: number) {
    const res = uni.getStorageInfoSync()
    return res.keys[index] ?? null
  },
  getItem(key: string): string | null {
    try {
      const val = uni.getStorageSync(key)
      return val !== '' ? val : null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      uni.setStorageSync(key, value)
    } catch (e) {
      console.warn('[uniStorage] setItem failed:', key, e)
    }
  },
  removeItem(key: string): void {
    try {
      uni.removeStorageSync(key)
    } catch (e) {
      console.warn('[uniStorage] removeItem failed:', key, e)
    }
  },
  clear(): void {
    try {
      uni.clearStorageSync()
    } catch (e) {
      console.warn('[uniStorage] clear failed:', e)
    }
  },
}
