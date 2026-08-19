// 全局开关：运行时可通过设置页「开发者选项」切换 mock 模式
// 使用 export let + live binding，所有 import { USE_MOCK } 的地方自动读到最新值

// App / 小程序端没有同源概念，必须用绝对地址；H5 走 vite dev 代理或同源部署。
// 生产域名用 www：裸域 avalin.cn 目前没有 A/AAAA 记录，真机会 DNS 失败。
let DEFAULT_API_BASE_URL = 'https://www.avalin.cn/api'
// #ifdef H5
DEFAULT_API_BASE_URL = '/api'
// #endif

function _readMock(): boolean {
  try {
    const saved = uni.getStorageSync('dev_mock_mode')
    if (saved === true) return true
    if (saved === false) return false
  } catch {
    // H5 初始化早期可能无法读取 storage，继续读取构建环境变量。
  }
  return import.meta.env.VITE_USE_MOCK === 'true'
}

function _readBaseUrl(): string {
  try {
    const saved = uni.getStorageSync('dev_api_base_url')
    // 清掉已失效的旧地址：旧公网 IP、无法解析的裸域、以及会被 Android 拦截的明文 HTTP。
    if (
      saved &&
      (/^https?:\/\/115\.190\.218\.167/i.test(saved) ||
        /^https?:\/\/avalin\.cn(\/|$)/i.test(saved) ||
        /^http:\/\/www\.avalin\.cn(\/|$)/i.test(saved))
    ) {
      uni.removeStorageSync('dev_api_base_url')
      return DEFAULT_API_BASE_URL
    }
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
