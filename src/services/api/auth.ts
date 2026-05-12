// auth.ts - 认证相关 API 及 Token 管理
import { USE_MOCK } from '../config'
import { request } from '../request'

// ==================== 类型定义 ====================

export interface RegisterRequest {
  username: string  // 4-20 字符
  password: string  // 6-32 字符
  name?: string
  school?: string
  major?: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
    name: string
    school: string
    major: string
    avatar: string
    level: number
  }
}

// ==================== Token 管理 ====================

/** 获取本地存储的 JWT token */
export function getToken(): string | null {
  return uni.getStorageSync('token') || null
}

/** 将 JWT token 写入本地存储 */
export function setToken(token: string): void {
  uni.setStorageSync('token', token)
}

/** 清除本地 token */
export function removeToken(): void {
  uni.removeStorageSync('token')
}

/** 获取当前登录用户信息 */
export function getCurrentUser(): AuthResponse['user'] | null {
  try {
    const raw = uni.getStorageSync('currentUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 将用户信息写入本地存储 */
export function setCurrentUser(user: AuthResponse['user']): void {
  uni.setStorageSync('currentUser', JSON.stringify(user))
}

/** 判断当前是否已登录 */
export function isLoggedIn(): boolean {
  return !!getToken()
}

function createMockAuthResponse(username: string, profile?: Partial<AuthResponse['user']>): AuthResponse {
  return {
    token: `mock-token-${Date.now()}`,
    user: {
      id: 'mock-user-1',
      username,
      name: profile?.name || 'Mock 用户',
      school: profile?.school || '日迹学院',
      major: profile?.major || '生活记录学',
      avatar: profile?.avatar || '/static/images/avatar-default.png',
      level: profile?.level || 3,
    },
  }
}

// ==================== 认证 API ====================

/**
 * 注册
 * 成功后自动存储 token 和用户信息
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  if (USE_MOCK) {
    const res = createMockAuthResponse(data.username, data)
    setToken(res.token)
    setCurrentUser(res.user)
    return res
  }

  const res = await request<AuthResponse>({
    url: '/auth/register',
    method: 'POST',
    data,
  })
  setToken(res.token)
  setCurrentUser(res.user)
  return res
}

/**
 * 登录
 * 成功后自动存储 token 和用户信息
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const res = createMockAuthResponse(username)
    setToken(res.token)
    setCurrentUser(res.user)
    return res
  }

  const res = await request<AuthResponse>({
    url: '/auth/login',
    method: 'POST',
    data: { username, password },
  })
  setToken(res.token)
  setCurrentUser(res.user)
  return res
}

/**
 * 登出
 * 调用后端使 token 失效，然后清除本地存储
 * 即使网络失败也强制清除本地 token 完成登出
 */
export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    try {
      await request({ url: '/auth/logout', method: 'POST' })
    } catch {
      // 网络失败也继续清除本地状态
    }
  }
  removeToken()
  uni.removeStorageSync('currentUser')
}
