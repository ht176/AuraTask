import type { Task, SubTask, Category, StatsData } from '../types/todo'
import { useServerStore } from '../stores/server'
import { localDb } from './localDb'

function getServerContext() {
  let isStandalone = true
  let baseUrl = ''
  let token: string | undefined

  try {
    const serverStore = useServerStore()
    isStandalone = serverStore.isStandalone
    baseUrl = serverStore.baseUrl
    token = serverStore.authToken
  } catch {
    // Pinia not yet ready
  }

  return { isStandalone, baseUrl, token }
}

function getRequestHeaders(customHeaders: Record<string, string> = {}) {
  const { token } = getServerContext()
  const headers: Record<string, string> = { ...customHeaders }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const api = {
  async getTasks(): Promise<Task[]> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.getTasks()
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/tasks`, { headers })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        // 同步缓存到本地数据库
        localDb.importBackupData({ tasks: data.data })
        return data.data
      }
    } catch (err) {
      console.warn('Remote getTasks failed, falling back to localDb:', err)
    }

    return localDb.getTasks()
  },

  async createTask(payload: Partial<Task>): Promise<Task> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.createTask(payload)
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        // 同步更新本地副本
        localDb.createTask(data.data)
        return data.data
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote createTask failed, falling back to localDb:', err)
      return localDb.createTask(payload)
    }
  },

  async updateTask(id: string, payload: Partial<Task>): Promise<Task> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.updateTask(id, payload)
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        localDb.updateTask(id, data.data)
        return data.data
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote updateTask failed, falling back to localDb:', err)
      return localDb.updateTask(id, payload)
    }
  },

  async toggleTask(id: string): Promise<boolean> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.toggleTask(id)
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/tasks/${id}/toggle`, {
        method: 'POST',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        localDb.toggleTask(id)
        return data.completed
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote toggleTask failed, falling back to localDb:', err)
      return localDb.toggleTask(id)
    }
  },

  async deleteTask(id: string): Promise<void> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      localDb.deleteTask(id)
      return
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/tasks/${id}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      localDb.deleteTask(id)
    } catch (err) {
      console.warn('Remote deleteTask failed, applying locally:', err)
      localDb.deleteTask(id)
    }
  },

  async batchUpdateTasks(updates: Array<{ id: string; sort_order?: number; eisenhower_quadrant?: number; kanban_status?: any }>): Promise<void> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      localDb.batchUpdateTasks(updates)
      return
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/tasks/batch-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      localDb.batchUpdateTasks(updates)
    } catch (err) {
      console.warn('Remote batchUpdateTasks failed, applying locally:', err)
      localDb.batchUpdateTasks(updates)
    }
  },

  async getCategories(): Promise<Category[]> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.getCategories()
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/categories`, { headers })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        return data.data
      }
    } catch (err) {
      console.warn('Remote getCategories failed, falling back to localDb:', err)
    }
    return localDb.getCategories()
  },

  async createCategory(payload: { name: string; icon?: string; color?: string }): Promise<Category> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.createCategory(payload)
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        localDb.createCategory(data.data)
        return data.data
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote createCategory failed, falling back to localDb:', err)
      return localDb.createCategory(payload)
    }
  },

  async deleteCategory(id: string): Promise<void> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      localDb.deleteCategory(id)
      return
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/categories/${id}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      localDb.deleteCategory(id)
    } catch (err) {
      console.warn('Remote deleteCategory failed, applying locally:', err)
      localDb.deleteCategory(id)
    }
  },

  async getSubtasks(taskId: string): Promise<SubTask[]> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.getSubtasks(taskId)
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`, { headers })
      const data = await res.json()
      if (data.success) return data.data
    } catch (err) {
      console.warn('Remote getSubtasks failed, falling back to localDb:', err)
    }
    return localDb.getSubtasks(taskId)
  },

  async createSubtask(taskId: string, title: string): Promise<SubTask> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.createSubtask(taskId, title)
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      })
      const data = await res.json()
      if (data.success) {
        localDb.createSubtask(taskId, title)
        return data.data
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote createSubtask failed, falling back to localDb:', err)
      return localDb.createSubtask(taskId, title)
    }
  },

  async updateSubtask(id: string, payload: { title?: string; completed?: boolean }): Promise<SubTask> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.updateSubtask(id, payload)
    }

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`${baseUrl}/api/subtasks/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        localDb.updateSubtask(id, payload)
        return data.data
      }
      throw new Error(data.error)
    } catch (err) {
      console.warn('Remote updateSubtask failed, falling back to localDb:', err)
      return localDb.updateSubtask(id, payload)
    }
  },

  async deleteSubtask(id: string): Promise<void> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      localDb.deleteSubtask(id)
      return
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/subtasks/${id}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      localDb.deleteSubtask(id)
    } catch (err) {
      console.warn('Remote deleteSubtask failed, applying locally:', err)
      localDb.deleteSubtask(id)
    }
  },

  async logPomodoro(taskId: string | null, durationMinutes: number, mode: 'work' | 'short_break' | 'long_break'): Promise<void> {
    localDb.logPomodoro(taskId, durationMinutes, mode)

    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) return

    try {
      const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
      await fetch(`${baseUrl}/api/pomodoro`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_id: taskId, duration_minutes: durationMinutes, mode }),
      })
    } catch (err) {
      console.warn('Remote logPomodoro failed, recorded locally:', err)
    }
  },

  async getStats(): Promise<StatsData | null> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      return localDb.getStats()
    }

    try {
      const headers = getRequestHeaders()
      const res = await fetch(`${baseUrl}/api/stats`, { headers })
      const data = await res.json()
      if (data.success) return data.data
    } catch (err) {
      console.warn('Remote getStats failed, computing from localDb:', err)
    }
    return localDb.getStats()
  },

  async exportBackup(): Promise<void> {
    const { isStandalone, baseUrl } = getServerContext()
    if (isStandalone || !baseUrl) {
      const data = localDb.exportBackupData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auratask_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return
    }

    window.open(`${baseUrl}/api/backup/export`, '_blank')
  },

  async importBackup(jsonData: any): Promise<number> {
    const count = localDb.importBackupData(jsonData)

    const { isStandalone, baseUrl } = getServerContext()
    if (!isStandalone && baseUrl) {
      try {
        const headers = getRequestHeaders({ 'Content-Type': 'application/json' })
        await fetch(`${baseUrl}/api/backup/import`, {
          method: 'POST',
          headers,
          body: JSON.stringify(jsonData),
        })
      } catch (err) {
        console.warn('Failed to sync imported backup to remote server node:', err)
      }
    }

    return count
  }
}
