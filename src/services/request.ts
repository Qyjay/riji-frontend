// request.ts - 封装 uni.request，自动处理 JWT 认证和统一响应格式
import { API_BASE_URL } from './config'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

// 后端统一响应格式
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/**
 * 封装请求函数
 * - 自动拼接 API_BASE_URL
 * - 自动注入 JWT token
 * - 自动解析统一响应格式 {code, data, message}
 * - 401 时清除 token 并跳转登录页
 */
export async function request<T = any>(options: RequestOptions): Promise<T> {
  // 读取本地存储的 token
  const token = uni.getStorageSync('token')

  // 构建请求头
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        // HTTP 401 → 清除 token，跳转登录页
        if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('currentUser')
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期，请重新登录'))
          return
        }

        // 其他 HTTP 错误
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP 错误: ${res.statusCode}`))
          return
        }

        // 解析统一响应格式
        const body = res.data as ApiResponse<T>
        if (body && typeof body === 'object' && 'code' in body) {
          if (body.code === 0) {
            resolve(body.data)
          } else {
            const err: any = new Error(body.message || '请求失败')
            err.code = body.code
            reject(err)
          }
        } else {
          // 兼容无包装格式
          resolve(res.data as T)
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}
