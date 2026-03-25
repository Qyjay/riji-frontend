import { USE_MOCK } from '../config'
import { request } from '../request'
import * as mock from '../mock/study'

export interface Pomodoro {
  id: string
  task: string
  subject: string
  duration: number
  completedAt?: number
  createdAt: number
}

export interface Todo {
  id: string
  content: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: number
}

export async function getPomodoros(): Promise<Pomodoro[]> {
  if (USE_MOCK) return mock.getPomodoros()
  return request<Pomodoro[]>({ url: '/study/pomodoros' })
}

export async function createPomodoro(data: Partial<Pomodoro>): Promise<Pomodoro> {
  if (USE_MOCK) return mock.createPomodoro(data)
  return request<Pomodoro>({ url: '/study/pomodoros', method: 'POST', data })
}

export async function completePomodoro(id: string): Promise<void> {
  if (USE_MOCK) return mock.completePomodoro(id)
  return request<void>({ url: `/study/pomodoros/${id}/complete`, method: 'POST' })
}

export async function getTodos(): Promise<Todo[]> {
  if (USE_MOCK) return mock.getTodos()
  return request<Todo[]>({ url: '/study/todos' })
}

export async function createTodo(data: Partial<Todo>): Promise<Todo> {
  if (USE_MOCK) return mock.createTodo(data)
  return request<Todo>({ url: '/study/todos', method: 'POST', data })
}

export async function toggleTodo(id: string): Promise<Todo> {
  if (USE_MOCK) return mock.toggleTodo(id)
  return request<Todo>({ url: `/study/todos/${id}/toggle`, method: 'POST' })
}
