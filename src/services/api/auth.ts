// auth.ts - 认证相关 API 及 Token 管理
// 注意：auth 始终调用真实后端，不走 mock 分支
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

// ==================== 认证 API ====================

/**
 * 注册
 * 成功后自动存储 token 和用户信息
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
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
 * 清除本地 token 和用户信息
 */
export function logout(): void {
  removeToken()
  uni.removeStorageSync('currentUser')
}
