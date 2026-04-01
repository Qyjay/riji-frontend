// 全局开关：运行时可通过设置页「开发者选项」切换 mock 模式
// 使用 export let + live binding，所有 import { USE_MOCK } 的地方自动读到最新值

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api'

function _readMock(): boolean {
  try {
    return uni.getStorageSync('dev_mock_mode') === true
  } catch {
    return false
  }
}

function _readBaseUrl(): string {
  try {
    const saved = uni.getStorageSync('dev_api_base_url')
    return saved || DEFAULT_API_BASE_URL
  } catch {
    return DEFAULT_API_BASE_URL
  }
}

export let USE_MOCK: boolean = _readMock()
export let API_BASE_URL: string = _readBaseUrl()

/** 切换 mock 模式并持久化 */
export function setMockMode(val: boolean) {
  USE_MOCK = val
  uni.setStorageSync('dev_mock_mode', val)
}

/** 设置后端 API 地址并持久化，传空字符串则恢复默认地址 */
export function setApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '') // 去掉尾部斜杠
  API_BASE_URL = trimmed || DEFAULT_API_BASE_URL
  if (trimmed) {
    uni.setStorageSync('dev_api_base_url', API_BASE_URL)
  } else {
    uni.removeStorageSync('dev_api_base_url')
  }
}

/** 获取默认地址（用于 UI 显示 placeholder） */
export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_BASE_URL
}
