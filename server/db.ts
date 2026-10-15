import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'todo.db')
export const db = new Database(dbPath)

// 启用 WAL 模式提高读写并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Folder',
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      priority INTEGER DEFAULT 3,
      due_date TEXT,
      category_id TEXT DEFAULT 'inbox',
      tags TEXT DEFAULT '[]',
      estimated_pomodoros INTEGER DEFAULT 1,
      completed_pomodoros INTEGER DEFAULT 0,
      kanban_status TEXT DEFAULT 'todo',
      eisenhower_quadrant INTEGER DEFAULT 2,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET DEFAULT
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      duration_minutes INTEGER DEFAULT 25,
      completed INTEGER DEFAULT 1,
      mode TEXT DEFAULT 'work',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // 初始化默认清单分类
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
    insertCat.run('inbox', '收集箱', 'Inbox', '#3b82f6', 0)
    insertCat.run('work', '工作项目', 'Briefcase', '#8b5cf6', 1)
    insertCat.run('life', '生活日常', 'Smile', '#10b981', 2)
    insertCat.run('study', '阅读学习', 'BookOpen', '#f59e0b', 3)
  }

  // 如果没有任务，生成几条新手体验示例任务
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
  if (taskCount.count === 0) {
    const now = new Date().toISOString()
    const todayStr = new Date().toISOString().split('T')[0]
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, title, description, completed, priority, due_date, category_id, tags,
        estimated_pomodoros, completed_pomodoros, kanban_status, eisenhower_quadrant,
        sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertTask.run(
      'task-welcome-1',
      '快捷键唤出极速录入 (按 Cmd/Ctrl + K 体验自然语言录入)',
      '试试在输入框中输入：明天下午3点 买咖啡 !高 #生活，程序会自动解析时间、优先级与标签。',
      0, 1, todayStr, 'inbox', JSON.stringify(['快捷键', '新手必读']),
      2, 1, 'todo', 1, 0, now, now
    )

    insertTask.run(
      'task-welcome-2',
      '体验 25 分钟番茄专注模式 (点击右侧番茄钟图标启动)',
      '内置纯 Web Audio 合成的轻柔颂钵起止提醒铃声与心流白噪音，专注更高效。',
      0, 2, todayStr, 'work', JSON.stringify(['专注', '番茄工作法']),
      4, 2, 'in_progress', 2, 1, now, now
    )

    insertTask.run(
      'task-welcome-3',
      '切换顶部视图：体验「四象限」与「看板」工作流',
      '支持在不同象限或看板列之间自由拖拽与流转，直观掌控所有任务轻重缓急。',
      0, 2, null, 'work', JSON.stringify(['视图', '进阶']),
      1, 0, 'waiting', 2, 2, now, now
    )

    insertTask.run(
      'task-welcome-4',
      '点击右上角切换至「桌面悬浮迷你便签 (Mini Sticky)」模式',
      '类似音乐播放器的迷你小窗，置顶在屏幕角落，随时打勾划掉已办，不遮挡主工作区。',
      0, 3, null, 'life', JSON.stringify(['便签', '悬浮窗']),
      1, 0, 'todo', 3, 3, now, now
    )

    // 添加一些子任务
    const insertSub = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    insertSub.run('sub-1-1', 'task-welcome-1', '按下 Cmd/Ctrl + K 呼出 Spotlight 风格弹窗', 1, 0, now)
    insertSub.run('sub-1-2', 'task-welcome-1', '体验输入 !1 !2 !3 快速指定优先级', 0, 1, now)
    insertSub.run('sub-1-3', 'task-welcome-1', '体验输入 #标签 自动归类', 0, 2, now)
  }
}
