export type PriorityLevel = 1 | 2 | 3 | 4 // 1: 紧急重要(P1), 2: 重要不紧急(P2), 3: 紧急不重要(P3), 4: 不紧急不重要(P4)
export type KanbanStatus = 'todo' | 'in_progress' | 'waiting' | 'done'
export type EisenhowerQuadrant = 1 | 2 | 3 | 4 // 1: 紧且重, 2: 重不紧, 3: 紧不重, 4: 不紧不重

export interface SubTask {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  completed_at?: string | null
  priority: PriorityLevel
  due_date: string | null
  category_id: string
  tags: string[]
  estimated_pomodoros: number
  completed_pomodoros: number
  kanban_status: KanbanStatus
  eisenhower_quadrant: EisenhowerQuadrant
  sort_order: number
  created_at: string
  updated_at: string
  subtask_total?: number
  subtask_completed?: number
}

export type TodoItem = Task

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  sort_order: number
  uncompleted_count?: number
}

export interface PomodoroSession {
  id: string
  task_id: string | null
  duration_minutes: number
  completed: boolean
  mode: 'work' | 'short_break' | 'long_break'
  created_at: string
}

export interface StatsData {
  todayCompleted: number
  totalPending: number
  totalCompleted: number
  todayPomodoros: number
  todayFocusMinutes: number
  quadrants: { eisenhower_quadrant: number; count: number }[]
}

export type ActiveNavView = 'today' | 'inbox' | 'upcoming' | 'matrix' | 'kanban' | 'all' | 'completed' | string
