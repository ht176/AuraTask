import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db, initDatabase } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// 初始化数据库与数据表
initDatabase()

// 服务健康检查与连通性测试 (客户端 Ping)
app.get('/api/ping', (req, res) => {
  res.json({
    success: true,
    message: 'AuraTask server connected successfully',
    version: '1.0.0',
    time: new Date().toISOString()
  })
})

// 可选的安全令牌鉴权（若环境变量设置了 API_TOKEN，则开启外网鉴权保护）
const REQUIRED_TOKEN = process.env.API_TOKEN
if (REQUIRED_TOKEN) {
  app.use('/api', (req, res, next) => {
    if (req.path === '/ping') return next()
    const authHeader = req.headers.authorization
    if (!authHeader || authHeader !== `Bearer ${REQUIRED_TOKEN}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Token' })
    }
    next()
  })
}

// --- Tasks API ---

// 获取所有任务（含子任务统计）
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id) as subtask_total,
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id AND completed = 1) as subtask_completed
      FROM tasks t
      ORDER BY t.completed ASC, t.sort_order ASC, t.priority ASC, t.created_at DESC
    `).all() as any[]

    // 解析 JSON 字段
    const formatted = tasks.map(t => ({
      ...t,
      completed: Boolean(t.completed),
      tags: JSON.parse(t.tags || '[]')
    }))

    res.json({ success: true, data: formatted })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 创建新任务
app.post('/api/tasks', (req, res) => {
  try {
    const {
      title,
      description = '',
      priority = 3,
      due_date = null,
      category_id = 'inbox',
      tags = [],
      estimated_pomodoros = 1,
      kanban_status = 'todo',
      eisenhower_quadrant = 2
    } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' })
    }

    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, title, description, completed, priority, due_date, category_id,
        tags, estimated_pomodoros, completed_pomodoros, kanban_status,
        eisenhower_quadrant, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
    `)

    stmt.run(
      id,
      title.trim(),
      description,
      priority,
      due_date,
      category_id,
      JSON.stringify(tags),
      estimated_pomodoros,
      kanban_status,
      eisenhower_quadrant,
      now,
      now
    )

    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    created.completed = Boolean(created.completed)
    created.tags = JSON.parse(created.tags || '[]')
    created.subtask_total = 0
    created.subtask_completed = 0

    res.json({ success: true, data: created })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const {
      title = task.title,
      description = task.description,
      priority = task.priority,
      due_date = task.due_date,
      category_id = task.category_id,
      tags = JSON.parse(task.tags || '[]'),
      estimated_pomodoros = task.estimated_pomodoros,
      completed_pomodoros = task.completed_pomodoros,
      kanban_status = task.kanban_status,
      eisenhower_quadrant = task.eisenhower_quadrant,
      completed = Boolean(task.completed)
    } = req.body

    const now = new Date().toISOString()
    const completedAt = completed && !task.completed ? now : (!completed ? null : task.completed_at)

    db.prepare(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        priority = ?,
        due_date = ?,
        category_id = ?,
        tags = ?,
        estimated_pomodoros = ?,
        completed_pomodoros = ?,
        kanban_status = ?,
        eisenhower_quadrant = ?,
        completed = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description,
      priority,
      due_date,
      category_id,
      JSON.stringify(tags),
      estimated_pomodoros,
      completed_pomodoros,
      kanban_status,
      eisenhower_quadrant,
      completed ? 1 : 0,
      completedAt,
      now,
      id
    )

    const updated = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id) as subtask_total,
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id AND completed = 1) as subtask_completed
      FROM tasks t WHERE t.id = ?
    `).get(id) as any

    updated.completed = Boolean(updated.completed)
    updated.tags = JSON.parse(updated.tags || '[]')

    res.json({ success: true, data: updated })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 快速切换任务完成状态
app.post('/api/tasks/:id/toggle', (req, res) => {
  try {
    const { id } = req.params
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const nextCompleted = task.completed ? 0 : 1
    const now = new Date().toISOString()
    const completedAt = nextCompleted ? now : null

    db.prepare('UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?')
      .run(nextCompleted, completedAt, now, id)

    res.json({ success: true, completed: Boolean(nextCompleted) })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    res.json({ success: true, id })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 批量调整任务顺序/四象限/看板状态
app.post('/api/tasks/batch-update', (req, res) => {
  try {
    const { updates } = req.body // [{ id, sort_order, eisenhower_quadrant, kanban_status }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Invalid updates payload' })
    }

    const stmt = db.prepare(`
      UPDATE tasks SET
        sort_order = COALESCE(?, sort_order),
        eisenhower_quadrant = COALESCE(?, eisenhower_quadrant),
        kanban_status = COALESCE(?, kanban_status),
        updated_at = ?
      WHERE id = ?
    `)

    const now = new Date().toISOString()
    const runBatch = db.transaction((items: any[]) => {
      for (const item of items) {
        stmt.run(
          item.sort_order ?? null,
          item.eisenhower_quadrant ?? null,
          item.kanban_status ?? null,
          now,
          item.id
        )
      }
    })

    runBatch(updates)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- Subtasks API ---

app.get('/api/subtasks', (_req, res) => {
  try {
    const subtasks = db.prepare('SELECT * FROM subtasks ORDER BY sort_order ASC, created_at ASC').all() as any[]
    res.json({
      success: true,
      data: subtasks.map(s => ({ ...s, completed: Boolean(s.completed) }))
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const { id } = req.params
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC').all(id) as any[]
    res.json({
      success: true,
      data: subtasks.map(s => ({ ...s, completed: Boolean(s.completed) }))
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const { id } = req.params
    const { title, due_date } = req.body
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Subtask title required' })
    }

    const subId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    const now = new Date().toISOString()
    const finalDueDate = due_date || null

    db.prepare('INSERT INTO subtasks (id, task_id, title, completed, sort_order, created_at, due_date) VALUES (?, ?, ?, 0, 0, ?, ?)')
      .run(subId, id, title.trim(), now, finalDueDate)

    res.json({ success: true, data: { id: subId, task_id: id, title: title.trim(), completed: false, created_at: now, due_date: finalDueDate } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.put('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params
    const { title, completed, due_date } = req.body
    const current = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as any
    if (!current) return res.status(404).json({ success: false, error: 'Subtask not found' })

    const newTitle = title !== undefined ? title.trim() : current.title
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : current.completed
    const newDueDate = due_date !== undefined ? (due_date || null) : current.due_date

    db.prepare('UPDATE subtasks SET title = ?, completed = ?, due_date = ? WHERE id = ?').run(newTitle, newCompleted, newDueDate, id)
    res.json({ success: true, data: { ...current, title: newTitle, completed: Boolean(newCompleted), due_date: newDueDate } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
    res.json({ success: true, id })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- Categories API ---

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM tasks WHERE category_id = c.id AND completed = 0) as uncompleted_count
      FROM categories c
      ORDER BY c.sort_order ASC
    `).all()
    res.json({ success: true, data: categories })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/categories', (req, res) => {
  try {
    const { name, icon = 'Folder', color = '#6366f1' } = req.body
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Name is required' })

    const id = 'cat_' + Date.now().toString(36)
    db.prepare('INSERT INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, 99)')
      .run(id, name.trim(), icon, color)

    res.json({ success: true, data: { id, name: name.trim(), icon, color, sort_order: 99, uncompleted_count: 0 } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params
    if (id === 'inbox') {
      return res.status(400).json({ success: false, error: 'Cannot delete Inbox' })
    }
    // 将该分类的任务移至 inbox
    db.prepare("UPDATE tasks SET category_id = 'inbox' WHERE category_id = ?").run(id)
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    res.json({ success: true, id })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- Pomodoro API ---

app.post('/api/pomodoro', (req, res) => {
  try {
    const { task_id = null, duration_minutes = 25, mode = 'work' } = req.body
    const id = 'pomo_' + Date.now()
    const now = new Date().toISOString()

    db.prepare('INSERT INTO pomodoro_sessions (id, task_id, duration_minutes, completed, mode, created_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(id, task_id, duration_minutes, mode, now)

    if (task_id && mode === 'work') {
      db.prepare('UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1 WHERE id = ?').run(task_id)
    }

    res.json({ success: true, id })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 获取统计仪表盘数据
app.get('/api/stats', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    
    // 今日完成数
    const todayCompleted = (db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE completed = 1 AND completed_at LIKE ?
    `).get(`${todayStr}%`) as any).count

    // 总待办数与总完成数
    const counts = db.prepare(`
      SELECT 
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM tasks
    `).get() as any

    // 今日番茄数与累计专注分钟
    const pomoStats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM pomodoro_sessions 
      WHERE mode = 'work' AND created_at LIKE ?
    `).get(`${todayStr}%`) as any

    // 四象限分布
    const quadrantCounts = db.prepare(`
      SELECT eisenhower_quadrant, COUNT(*) as count
      FROM tasks
      WHERE completed = 0
      GROUP BY eisenhower_quadrant
    `).all() as any[]

    res.json({
      success: true,
      data: {
        todayCompleted,
        totalPending: counts.pending || 0,
        totalCompleted: counts.completed || 0,
        todayPomodoros: pomoStats.total_sessions || 0,
        todayFocusMinutes: pomoStats.total_minutes || 0,
        quadrants: quadrantCounts
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- Backup & Restore API ---

app.get('/api/backup/export', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks').all()
    const subtasks = db.prepare('SELECT * FROM subtasks').all()
    const categories = db.prepare('SELECT * FROM categories').all()
    const pomodoros = db.prepare('SELECT * FROM pomodoro_sessions').all()

    const backupData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      categories,
      tasks,
      subtasks,
      pomodoros
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="auratask_backup_${Date.now()}.json"`)
    res.json(backupData)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/backup/import', (req, res) => {
  try {
    const { categories, tasks, subtasks } = req.body
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, error: 'Invalid backup file structure' })
    }

    const importTx = db.transaction(() => {
      if (Array.isArray(categories) && categories.length > 0) {
        const catStmt = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
        for (const c of categories) {
          catStmt.run(c.id, c.name, c.icon || 'Folder', c.color || '#6366f1', c.sort_order || 0)
        }
      }

      const taskStmt = db.prepare(`
        INSERT OR REPLACE INTO tasks (
          id, title, description, completed, completed_at, priority, due_date,
          category_id, tags, estimated_pomodoros, completed_pomodoros,
          kanban_status, eisenhower_quadrant, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const t of tasks) {
        taskStmt.run(
          t.id, t.title, t.description || '', t.completed ? 1 : 0, t.completed_at || null,
          t.priority || 3, t.due_date || null, t.category_id || 'inbox',
          typeof t.tags === 'string' ? t.tags : JSON.stringify(t.tags || []),
          t.estimated_pomodoros || 1, t.completed_pomodoros || 0,
          t.kanban_status || 'todo', t.eisenhower_quadrant || 2, t.sort_order || 0,
          t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()
        )
      }

      if (Array.isArray(subtasks)) {
        const subStmt = db.prepare('INSERT OR REPLACE INTO subtasks (id, task_id, title, completed, sort_order, created_at, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
        for (const s of subtasks) {
          subStmt.run(s.id, s.task_id, s.title, s.completed ? 1 : 0, s.sort_order || 0, s.created_at || new Date().toISOString(), s.due_date || null)
        }
      }
    })

    importTx()
    res.json({ success: true, importedTasks: tasks.length })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 生产环境托管前端静态资源
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[AuraTask Server] Running at http://localhost:${PORT}`)
})
