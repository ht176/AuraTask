import type { Task, SubTask, Category, StatsData, PomodoroSession } from '../types/todo'

const STORAGE_KEYS = {
  TASKS: 'auratask_local_tasks',
  SUBTASKS: 'auratask_local_subtasks',
  CATEGORIES: 'auratask_local_categories',
  POMODOROS: 'auratask_local_pomodoros',
}

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch (e) {
    console.warn(`Failed to parse localStorage key ${key}`, e)
    return defaultValue
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.error(`Failed to set localStorage key ${key}`, e)
  }
}

// 默认清单分类
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'inbox', name: '收集箱', icon: 'Inbox', color: '#3b82f6', sort_order: 0 },
  { id: 'work', name: '工作项目', icon: 'Briefcase', color: '#8b5cf6', sort_order: 1 },
  { id: 'life', name: '生活日常', icon: 'Smile', color: '#10b981', sort_order: 2 },
  { id: 'study', name: '阅读学习', icon: 'BookOpen', color: '#f59e0b', sort_order: 3 },
]

function getInitialTasks(): Task[] {
  const now = new Date().toISOString()
  const todayStr = new Date().toISOString().split('T')[0]
  return [
    {
      id: 'task-welcome-1',
      title: '快捷键唤出极速录入 (按 Cmd/Ctrl + K 体验自然语言录入)',
      description: '试试在输入框中输入：明天下午3点 买咖啡 !高 #生活，程序会自动解析时间、优先级与标签。',
      completed: false,
      completed_at: null,
      priority: 1,
      due_date: todayStr,
      category_id: 'inbox',
      tags: ['快捷键', '新手必读'],
      estimated_pomodoros: 2,
      completed_pomodoros: 1,
      kanban_status: 'todo',
      eisenhower_quadrant: 1,
      sort_order: 0,
      created_at: now,
      updated_at: now,
      subtask_total: 2,
      subtask_completed: 1,
    },
    {
      id: 'task-welcome-2',
      title: '体验 25 分钟番茄专注模式 (点击右侧番茄钟图标启动)',
      description: '内置纯 Web Audio 合成的轻柔颂钵起止提醒铃声与心流白噪音，单机模式亦完全支持。',
      completed: false,
      completed_at: null,
      priority: 2,
      due_date: todayStr,
      category_id: 'work',
      tags: ['专注', '番茄工作法'],
      estimated_pomodoros: 4,
      completed_pomodoros: 2,
      kanban_status: 'in_progress',
      eisenhower_quadrant: 2,
      sort_order: 1,
      created_at: now,
      updated_at: now,
      subtask_total: 0,
      subtask_completed: 0,
    },
    {
      id: 'task-welcome-3',
      title: '切换顶部视图：体验「四象限」与「看板」工作流',
      description: '支持在不同象限或看板列之间自由拖拽与流转，直观掌控所有任务轻重缓急。',
      completed: false,
      completed_at: null,
      priority: 2,
      due_date: null,
      category_id: 'work',
      tags: ['视图', '进阶'],
      estimated_pomodoros: 1,
      completed_pomodoros: 0,
      kanban_status: 'waiting',
      eisenhower_quadrant: 2,
      sort_order: 2,
      created_at: now,
      updated_at: now,
      subtask_total: 0,
      subtask_completed: 0,
    },
    {
      id: 'task-welcome-4',
      title: '点击右上角切换至「桌面悬浮迷你便签 (Mini Sticky)」模式',
      description: '类似音乐播放器的迷你小窗，置顶在屏幕角落，随时打勾划掉已办，单机持久化存储。',
      completed: false,
      completed_at: null,
      priority: 3,
      due_date: null,
      category_id: 'life',
      tags: ['便签', '悬浮窗'],
      estimated_pomodoros: 1,
      completed_pomodoros: 0,
      kanban_status: 'todo',
      eisenhower_quadrant: 3,
      sort_order: 3,
      created_at: now,
      updated_at: now,
      subtask_total: 0,
      subtask_completed: 0,
    },
  ]
}

function getInitialSubtasks(): SubTask[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'sub-welcome-1',
      task_id: 'task-welcome-1',
      title: '尝试按下快捷键 Cmd + K',
      completed: true,
      sort_order: 0,
      created_at: now,
    },
    {
      id: 'sub-welcome-2',
      task_id: 'task-welcome-1',
      title: '输入自然语言新建一条待办',
      completed: false,
      sort_order: 1,
      created_at: now,
    },
  ]
}

export const localDb = {
  // ================= 任务 CRUD =================
  getTasks(): Task[] {
    let tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    if (!tasks || tasks.length === 0) {
      tasks = getInitialTasks()
      setStored(STORAGE_KEYS.TASKS, tasks)
      setStored(STORAGE_KEYS.SUBTASKS, getInitialSubtasks())
    }

    const subtasks = this.getAllSubtasks()
    return tasks.map(t => {
      const subs = subtasks.filter(s => s.task_id === t.id)
      return {
        ...t,
        subtask_total: subs.length,
        subtask_completed: subs.filter(s => s.completed).length,
      }
    })
  },

  createTask(payload: Partial<Task>): Task {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const now = new Date().toISOString()
    const newTask: Task = {
      id: payload.id || 'task_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: payload.title || '新任务',
      description: payload.description || '',
      completed: false,
      completed_at: null,
      priority: payload.priority || 2,
      due_date: payload.due_date || null,
      category_id: payload.category_id || 'inbox',
      tags: payload.tags || [],
      estimated_pomodoros: payload.estimated_pomodoros || 1,
      completed_pomodoros: 0,
      kanban_status: payload.kanban_status || 'todo',
      eisenhower_quadrant: payload.eisenhower_quadrant || (payload.priority === 1 ? 1 : 2),
      sort_order: tasks.length,
      created_at: now,
      updated_at: now,
      subtask_total: 0,
      subtask_completed: 0,
    }

    tasks.unshift(newTask)
    setStored(STORAGE_KEYS.TASKS, tasks)
    return newTask
  },

  updateTask(id: string, payload: Partial<Task>): Task {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) throw new Error('任务未找到')

    const current = tasks[idx]
    const updated: Task = {
      ...current,
      ...payload,
      updated_at: new Date().toISOString(),
    }

    if (payload.completed !== undefined && payload.completed !== current.completed) {
      updated.completed = payload.completed
      updated.completed_at = payload.completed ? new Date().toISOString() : null
      if (payload.completed && updated.kanban_status !== 'done') {
        updated.kanban_status = 'done'
      } else if (!payload.completed && updated.kanban_status === 'done') {
        updated.kanban_status = 'todo'
      }
    }

    tasks[idx] = updated
    setStored(STORAGE_KEYS.TASKS, tasks)
    return updated
  },

  toggleTask(id: string): boolean {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const task = tasks.find(t => t.id === id)
    if (!task) throw new Error('任务未找到')

    const nextCompleted = !task.completed
    this.updateTask(id, { completed: nextCompleted })
    return nextCompleted
  },

  deleteTask(id: string): void {
    let tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    tasks = tasks.filter(t => t.id !== id)
    setStored(STORAGE_KEYS.TASKS, tasks)

    // 级联删除子任务
    let subtasks = this.getAllSubtasks()
    subtasks = subtasks.filter(s => s.task_id !== id)
    setStored(STORAGE_KEYS.SUBTASKS, subtasks)
  },

  batchUpdateTasks(updates: Array<{ id: string; sort_order?: number; eisenhower_quadrant?: number; kanban_status?: any }>): void {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const map = new Map(updates.map(u => [u.id, u]))

    const newTasks = tasks.map(t => {
      const u = map.get(t.id)
      if (!u) return t
      return {
        ...t,
        sort_order: u.sort_order !== undefined ? u.sort_order : t.sort_order,
        eisenhower_quadrant: u.eisenhower_quadrant !== undefined ? u.eisenhower_quadrant : t.eisenhower_quadrant,
        kanban_status: u.kanban_status !== undefined ? u.kanban_status : t.kanban_status,
        updated_at: new Date().toISOString(),
      }
    })

    setStored(STORAGE_KEYS.TASKS, newTasks)
  },

  // ================= 分类 CRUD =================
  getCategories(): Category[] {
    let cats = getStored<Category[]>(STORAGE_KEYS.CATEGORIES, [])
    if (!cats || cats.length === 0) {
      cats = [...DEFAULT_CATEGORIES]
      setStored(STORAGE_KEYS.CATEGORIES, cats)
    }

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    return cats.map(c => ({
      ...c,
      uncompleted_count: tasks.filter(t => t.category_id === c.id && !t.completed).length,
    }))
  },

  createCategory(payload: { name: string; icon?: string; color?: string }): Category {
    const cats = this.getCategories()
    const newCat: Category = {
      id: 'cat_' + Date.now().toString(36),
      name: payload.name.trim(),
      icon: payload.icon || 'Folder',
      color: payload.color || '#6366f1',
      sort_order: cats.length,
      uncompleted_count: 0,
    }

    cats.push(newCat)
    setStored(STORAGE_KEYS.CATEGORIES, cats)
    return newCat
  },

  deleteCategory(id: string): void {
    let cats = getStored<Category[]>(STORAGE_KEYS.CATEGORIES, [])
    cats = cats.filter(c => c.id !== id)
    setStored(STORAGE_KEYS.CATEGORIES, cats)

    // 将原分类下的任务重设为 inbox
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const updatedTasks = tasks.map(t => (t.category_id === id ? { ...t, category_id: 'inbox' } : t))
    setStored(STORAGE_KEYS.TASKS, updatedTasks)
  },

  // ================= 子任务 CRUD =================
  getAllSubtasks(): SubTask[] {
    return getStored<SubTask[]>(STORAGE_KEYS.SUBTASKS, [])
  },

  getSubtasks(taskId: string): SubTask[] {
    const subtasks = this.getAllSubtasks()
    return subtasks.filter(s => s.task_id === taskId).sort((a, b) => a.sort_order - b.sort_order)
  },

  createSubtask(taskId: string, title: string, due_date?: string | null): SubTask {
    const subtasks = this.getAllSubtasks()
    const newSub: SubTask = {
      id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      task_id: taskId,
      title: title.trim(),
      completed: false,
      sort_order: subtasks.filter(s => s.task_id === taskId).length,
      created_at: new Date().toISOString(),
      due_date: due_date || null,
    }

    subtasks.push(newSub)
    setStored(STORAGE_KEYS.SUBTASKS, subtasks)
    return newSub
  },

  updateSubtask(id: string, payload: { title?: string; completed?: boolean; due_date?: string | null }): SubTask {
    const subtasks = this.getAllSubtasks()
    const idx = subtasks.findIndex(s => s.id === id)
    if (idx === -1) throw new Error('子任务未找到')

    const updated = { ...subtasks[idx], ...payload }
    subtasks[idx] = updated
    setStored(STORAGE_KEYS.SUBTASKS, subtasks)
    return updated
  },

  deleteSubtask(id: string): void {
    let subtasks = this.getAllSubtasks()
    subtasks = subtasks.filter(s => s.id !== id)
    setStored(STORAGE_KEYS.SUBTASKS, subtasks)
  },

  // ================= 番茄专注 =================
  logPomodoro(taskId: string | null, durationMinutes: number, mode: 'work' | 'short_break' | 'long_break'): void {
    const pomos = getStored<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, [])
    pomos.push({
      id: 'pomo_' + Date.now().toString(36),
      task_id: taskId,
      duration_minutes: durationMinutes,
      completed: true,
      mode,
      created_at: new Date().toISOString(),
    })
    setStored(STORAGE_KEYS.POMODOROS, pomos)

    if (taskId && mode === 'work') {
      const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        task.completed_pomodoros = (task.completed_pomodoros || 0) + 1
        setStored(STORAGE_KEYS.TASKS, tasks)
      }
    }
  },

  // ================= 统计数据 =================
  getStats(): StatsData {
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, [])
    const pomos = getStored<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, [])
    const todayStr = new Date().toISOString().split('T')[0]

    const todayCompleted = tasks.filter(t => t.completed && t.completed_at?.startsWith(todayStr)).length
    const totalPending = tasks.filter(t => !t.completed).length
    const totalCompleted = tasks.filter(t => t.completed).length

    const todayPomosList = pomos.filter(p => p.created_at.startsWith(todayStr) && p.mode === 'work')
    const todayPomodoros = todayPomosList.length
    const todayFocusMinutes = todayPomosList.reduce((acc, cur) => acc + cur.duration_minutes, 0)

    const quadrants = [1, 2, 3, 4].map(q => ({
      eisenhower_quadrant: q,
      count: tasks.filter(t => !t.completed && t.eisenhower_quadrant === q).length,
    }))

    return {
      todayCompleted,
      totalPending,
      totalCompleted,
      todayPomodoros,
      todayFocusMinutes,
      quadrants,
    }
  },

  // ================= 备份与恢复 =================
  exportBackupData() {
    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      tasks: getStored<Task[]>(STORAGE_KEYS.TASKS, []),
      categories: getStored<Category[]>(STORAGE_KEYS.CATEGORIES, []),
      subtasks: this.getAllSubtasks(),
      pomodoros: getStored<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, []),
    }
  },

  importBackupData(jsonData: any): number {
    if (!jsonData || !Array.isArray(jsonData.tasks)) {
      throw new Error('导入文件格式不合法，未包含 tasks 数组')
    }

    if (Array.isArray(jsonData.categories) && jsonData.categories.length > 0) {
      setStored(STORAGE_KEYS.CATEGORIES, jsonData.categories)
    }
    if (Array.isArray(jsonData.subtasks)) {
      setStored(STORAGE_KEYS.SUBTASKS, jsonData.subtasks)
    }
    if (Array.isArray(jsonData.pomodoros)) {
      setStored(STORAGE_KEYS.POMODOROS, jsonData.pomodoros)
    }

    setStored(STORAGE_KEYS.TASKS, jsonData.tasks)
    return jsonData.tasks.length
  },
}
