import type { Task, SubTask, Category, StatsData } from '../types/todo'
import { useServerStore } from '../stores/server'

function getRequestConfig(customHeaders: Record<string, string> = {}) {
  let baseUrl = ''
  let token: string | undefined

  try {
    const serverStore = useServerStore()
    baseUrl = serverStore.baseUrl
    token = serverStore.authToken
  } catch {
    // Pinia not yet ready fallback
  }

  const headers: Record<string, string> = { ...customHeaders }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return { baseUrl, headers }
}

export const api = {
  async getTasks(): Promise<Task[]> {
    const { baseUrl, headers } = getRequestConfig()
    try {
      const res = await fetch(`${baseUrl}/api/tasks`, { headers })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('auratask_cached_tasks', JSON.stringify(data.data))
        return data.data
      }
    } catch {
      // 离线容灾回退
      const cached = localStorage.getItem('auratask_cached_tasks')
      if (cached) return JSON.parse(cached)
    }
    return []
  },

  async createTask(payload: Partial<Task>): Promise<Task> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async updateTask(id: string, payload: Partial<Task>): Promise<Task> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async toggleTask(id: string): Promise<boolean> {
    const { baseUrl, headers } = getRequestConfig()
    const res = await fetch(`${baseUrl}/api/tasks/${id}/toggle`, {
      method: 'POST',
      headers,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.completed
  },

  async deleteTask(id: string): Promise<void> {
    const { baseUrl, headers } = getRequestConfig()
    const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
      method: 'DELETE',
      headers,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
  },

  async batchUpdateTasks(updates: Array<{ id: string; sort_order?: number; eisenhower_quadrant?: number; kanban_status?: string }>): Promise<void> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/tasks/batch-update`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ updates }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
  },

  async getCategories(): Promise<Category[]> {
    const { baseUrl, headers } = getRequestConfig()
    try {
      const res = await fetch(`${baseUrl}/api/categories`, { headers })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('auratask_cached_categories', JSON.stringify(data.data))
        return data.data
      }
    } catch {
      const cached = localStorage.getItem('auratask_cached_categories')
      if (cached) return JSON.parse(cached)
    }
    return []
  },

  async createCategory(payload: { name: string; icon?: string; color?: string }): Promise<Category> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async deleteCategory(id: string): Promise<void> {
    const { baseUrl, headers } = getRequestConfig()
    const res = await fetch(`${baseUrl}/api/categories/${id}`, {
      method: 'DELETE',
      headers,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
  },

  async getSubtasks(taskId: string): Promise<SubTask[]> {
    const { baseUrl, headers } = getRequestConfig()
    const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`, { headers })
    const data = await res.json()
    return data.success ? data.data : []
  },

  async createSubtask(taskId: string, title: string): Promise<SubTask> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async updateSubtask(id: string, payload: { title?: string; completed?: boolean }): Promise<SubTask> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/subtasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data
  },

  async deleteSubtask(id: string): Promise<void> {
    const { baseUrl, headers } = getRequestConfig()
    const res = await fetch(`${baseUrl}/api/subtasks/${id}`, {
      method: 'DELETE',
      headers,
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
  },

  async logPomodoro(taskId: string | null, durationMinutes: number, mode: 'work' | 'short_break' | 'long_break'): Promise<void> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    await fetch(`${baseUrl}/api/pomodoro`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ task_id: taskId, duration_minutes: durationMinutes, mode }),
    })
  },

  async getStats(): Promise<StatsData | null> {
    const { baseUrl, headers } = getRequestConfig()
    try {
      const res = await fetch(`${baseUrl}/api/stats`, { headers })
      const data = await res.json()
      return data.success ? data.data : null
    } catch {
      return null
    }
  },

  async exportBackup(): Promise<void> {
    const { baseUrl } = getRequestConfig()
    window.open(`${baseUrl}/api/backup/export`, '_blank')
  },

  async importBackup(jsonData: any): Promise<number> {
    const { baseUrl, headers } = getRequestConfig({ 'Content-Type': 'application/json' })
    const res = await fetch(`${baseUrl}/api/backup/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify(jsonData),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.importedTasks
  }
}
