import type { Pomodoro, Todo } from '../api/study'

const now = Date.now()
const day = 86400000

export const mockPomodoros: Pomodoro[] = [
  { id: 'p1', task: '雅思阅读真题C12-T3', subject: '雅思阅读', duration: 25, completedAt: now - 1 * day, createdAt: now - 1 * day },
  { id: 'p2', task: '雅思阅读C13-T1', subject: '雅思阅读', duration: 25, completedAt: now - 1 * day, createdAt: now - 1 * day },
  { id: 'p3', task: '雅思阅读C14-T2', subject: '雅思阅读', duration: 25, completedAt: now - 2 * day, createdAt: now - 2 * day },
  { id: 'p4', task: '二分查找与递归', subject: '编程', duration: 50, completedAt: now - 3 * day, createdAt: now - 3 * day },
  { id: 'p5', task: '动态规划专题', subject: '编程', duration: 50, completedAt: now - 4 * day, createdAt: now - 4 * day },
  { id: 'p6', task: '概率论大数定律', subject: '数学', duration: 25, completedAt: now - 5 * day, createdAt: now - 5 * day },
]

export const mockTodos: Todo[] = [
  { id: 't1', content: '完成留学文书初稿', completed: true, priority: 'high', createdAt: now - 7 * day },
  { id: 't2', content: '雅思听力专项训练30套', completed: false, priority: 'high', createdAt: now - 6 * day },
  { id: 't3', content: '刷算法题hot100', completed: false, priority: 'medium', createdAt: now - 5 * day },
  { id: 't4', content: '整理推荐信材料', completed: false, priority: 'medium', createdAt: now - 4 * day },
  { id: 't5', content: '每周跑步3次', completed: true, priority: 'low', createdAt: now - 3 * day },
]

export function getPomodoros(): Pomodoro[] {
  return mockPomodoros
}

export function createPomodoro(data: Partial<Pomodoro>): Pomodoro {
  const p: Pomodoro = {
    id: `p${Date.now()}`,
    task: data.task ?? '新任务',
    subject: data.subject ?? '其他',
    duration: data.duration ?? 25,
    createdAt: Date.now(),
  }
  mockPomodoros.unshift(p)
  return p
}

export function completePomodoro(id: string): void {
  const p = mockPomodoros.find(p => p.id === id)
  if (p) p.completedAt = Date.now()
}

export function getTodos(): Todo[] {
  return mockTodos
}

export function createTodo(data: Partial<Todo>): Todo {
  const t: Todo = {
    id: `t${Date.now()}`,
    content: data.content ?? '',
    completed: false,
    priority: data.priority ?? 'medium',
    createdAt: Date.now(),
  }
  mockTodos.push(t)
  return t
}

export function toggleTodo(id: string): Todo {
  const t = mockTodos.find(t => t.id === id)
  if (t) t.completed = !t.completed
  return t!
}
