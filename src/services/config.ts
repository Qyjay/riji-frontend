// 全局开关：运行时可通过设置页「开发者选项」切换 mock 模式
// 使用 export let + live binding，所有 import { USE_MOCK } 的地方自动读到最新值

function _readMock(): boolean {
  try {
    return uni.getStorageSync('dev_mock_mode') === true
  } catch {
    return false
  }
}

export let USE_MOCK: boolean = _readMock()

/** 切换 mock 模式并持久化 */
export function setMockMode(val: boolean) {
  USE_MOCK = val
  uni.setStorageSync('dev_mock_mode', val)
}

export const API_BASE_URL = 'http://localhost:8000/api'
