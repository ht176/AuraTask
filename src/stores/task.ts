import { defineStore } from 'pinia'
import confetti from 'canvas-confetti'
import { api } from '../services/api'
import { sound } from '../services/audio'
import { parseNaturalLanguage } from '../services/nlp'
import type { Task, Category, ActiveNavView, StatsData, KanbanStatus, EisenhowerQuadrant } from '../types/todo'

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [] as Task[],
    categories: [] as Category[],
    activeView: 'today' as ActiveNavView,
    selectedTaskId: null as string | null,
    activeTag: null as string | null,
    searchQuery: '',
    isLoading: false,
    stats: null as StatsData | null,
    isQuickAddOpen: false,
    isPomodoroOpen: false,
    isMiniMode: false,
  }),

  getters: {
    selectedTask(state): Task | undefined {
      return state.tasks.find(t => t.id === state.selectedTaskId)
    },

    allTags(state): string[] {
      const set = new Set<string>()
      state.tasks.forEach(t => {
        if (Array.isArray(t.tags)) {
          t.tags.forEach(tag => set.add(tag))
        }
      })
      return Array.from(set)
    },

    todayDateStr(): string {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    filteredTasks(state): Task[] {
      let list = [...state.tasks]

      // 搜索过滤
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase().trim()
        list = list.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(q)))
        )
      }

      // 标签过滤
      if (state.activeTag) {
        list = list.filter(t => Array.isArray(t.tags) && t.tags.includes(state.activeTag!))
      }

      // 视图过滤
      const today = this.todayDateStr

      switch (state.activeView) {
        case 'today':
          return list.filter(t => {
            if (t.completed) {
              return t.completed_at?.startsWith(today)
            }
            return !t.due_date || t.due_date.startsWith(today) || t.due_date < today
          })

        case 'inbox':
          return list.filter(t => !t.completed && t.category_id === 'inbox')

        case 'upcoming':
          return list.filter(t => !t.completed && t.due_date && t.due_date > today)

        case 'completed':
          return list.filter(t => t.completed)

        case 'all':
          return list

        case 'matrix':
        case 'kanban':
          // 在四象限和看板视图中，默认展示未完成的任务
          return list.filter(t => !t.completed)

        default:
          // 自定义分类
          return list.filter(t => t.category_id === state.activeView)
      }
    },

    todayProgress(): { completed: number; total: number; percentage: number } {
      const today = this.todayDateStr
      const todayList = this.tasks.filter(t => {
        if (t.completed) return t.completed_at?.startsWith(today)
        return !t.due_date || t.due_date.startsWith(today) || t.due_date < today
      })
      const completed = todayList.filter(t => t.completed).length
      const total = todayList.length
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
      return { completed, total, percentage }
    }
  },

  actions: {
    async init() {
      this.isLoading = true
      try {
        await Promise.all([
          this.fetchTasks(),
          this.fetchCategories(),
          this.fetchStats()
        ])
      } finally {
        this.isLoading = false
      }
    },

    async fetchTasks() {
      try {
        this.tasks = await api.getTasks()
      } catch (err) {
        console.error('Failed to fetch tasks', err)
      }
    },

    async fetchCategories() {
      try {
        this.categories = await api.getCategories()
      } catch (err) {
        console.error('Failed to fetch categories', err)
      }
    },

    async fetchStats() {
      try {
        this.stats = await api.getStats()
      } catch (err) {
        console.error('Failed to fetch stats', err)
      }
    },

    async toggleTask(id: string) {
      const task = this.tasks.find(t => t.id === id)
      if (!task) return

      const willComplete = !task.completed
      task.completed = willComplete

      if (willComplete) {
        task.completed_at = new Date().toISOString()
        sound.playCheckSound()
        // 触发五彩礼花撒花动效
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']
        })
      } else {
        task.completed_at = null
      }

      try {
        await api.toggleTask(id)
        this.fetchStats()
      } catch {
        // 如果后端失败，恢复状态
        task.completed = !willComplete
      }
    },

    async createTask(payload: Partial<Task>): Promise<Task | null> {
      try {
        const newTask = await api.createTask(payload)
        this.tasks.unshift(newTask)
        this.fetchCategories()
        this.fetchStats()
        return newTask
      } catch (err) {
        console.error('Failed to create task', err)
        return null
      }
    },

    async createTaskFromNLP(rawInput: string, defaultCategoryId = 'inbox'): Promise<Task | null> {
      const parsed = parseNaturalLanguage(rawInput)
      if (!parsed.title) return null

      return this.createTask({
        title: parsed.title,
        priority: parsed.priority,
        due_date: parsed.due_date,
        tags: parsed.tags,
        estimated_pomodoros: parsed.estimated_pomodoros,
        category_id: defaultCategoryId,
        kanban_status: 'todo',
        eisenhower_quadrant: parsed.priority as EisenhowerQuadrant
      })
    },

    async updateTask(id: string, payload: Partial<Task>) {
      const task = this.tasks.find(t => t.id === id)
      if (task) {
        Object.assign(task, payload)
      }
      try {
        const updated = await api.updateTask(id, payload)
        const idx = this.tasks.findIndex(t => t.id === id)
        if (idx !== -1) {
          this.tasks[idx] = updated
        }
        this.fetchStats()
      } catch (err) {
        console.error('Failed to update task', err)
      }
    },

    async deleteTask(id: string) {
      this.tasks = this.tasks.filter(t => t.id !== id)
      if (this.selectedTaskId === id) {
        this.selectedTaskId = null
      }
      try {
        await api.deleteTask(id)
        this.fetchCategories()
        this.fetchStats()
      } catch (err) {
        console.error('Failed to delete task', err)
      }
    },

    async updateQuadrant(taskId: string, quadrant: EisenhowerQuadrant) {
      const task = this.tasks.find(t => t.id === taskId)
      if (task) {
        task.eisenhower_quadrant = quadrant
        // 同步更新优先级映射
        task.priority = quadrant
        await api.updateTask(taskId, {
          eisenhower_quadrant: quadrant,
          priority: quadrant
        })
      }
    },

    async updateKanbanStatus(taskId: string, status: KanbanStatus) {
      const task = this.tasks.find(t => t.id === taskId)
      if (task) {
        task.kanban_status = status
        if (status === 'done' && !task.completed) {
          await this.toggleTask(taskId)
        } else {
          await api.updateTask(taskId, { kanban_status: status })
        }
      }
    },

    async createCategory(name: string, color = '#6366f1') {
      try {
        const newCat = await api.createCategory({ name, color })
        this.categories.push(newCat)
      } catch (err) {
        console.error('Failed to create category', err)
      }
    },

    async deleteCategory(id: string) {
      this.categories = this.categories.filter(c => c.id !== id)
      if (this.activeView === id) {
        this.activeView = 'inbox'
      }
      try {
        await api.deleteCategory(id)
        await this.fetchTasks()
      } catch (err) {
        console.error('Failed to delete category', err)
      }
    }
  }
})
