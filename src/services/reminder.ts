import { ref, computed } from 'vue'
import { useTaskStore } from '../stores/task'
import type { TodoItem } from '../types/todo'
import { sound } from './audio'
import { wakeUpMiniWindow } from './desktop'
import { localDb } from './localDb'

const STORAGE_NOTIFIED_KEY = 'auratask_notified_due_tasks'
const STORAGE_SNOOZED_KEY = 'auratask_snoozed_tasks'

class ReminderService {
  // 当前处于闹铃状态的到期待办任务列表
  public activeAlarmTasks = ref<TodoItem[]>([])
  // 是否正在发出闹铃警报
  public isAlarming = computed(() => this.activeAlarmTasks.value.length > 0)
  // 用于响应式驱动 GSAP 闹铃物理抖动递增计数
  public ringShakeCount = ref(0)

  private checkIntervalTimer: any = null
  private shakeIntervalTimer: any = null
  private notifiedTasks: Record<string, string> = {} // taskId -> due_date
  private snoozedUntil: Record<string, number> = {} // taskId -> timestamp ms

  init() {
    this.loadState()
    this.requestNotificationPermission()
    this.startPolling()
  }

  // 申请浏览器/系统桌面通知权限
  requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }

  // 启动后台定期巡检 (每 10 秒轻量快速扫描)
  startPolling(intervalMs = 10000) {
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer)
    this.checkIntervalTimer = setInterval(() => {
      this.checkDueTasks()
    }, intervalMs)
    // 启动即刻检查一次
    setTimeout(() => {
      this.checkDueTasks()
    }, 1500)
  }

  stopPolling() {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer)
      this.checkIntervalTimer = null
    }
  }

  // 核心到期检测扫描
  checkDueTasks() {
    const taskStore = useTaskStore()
    if (!taskStore.tasks || taskStore.tasks.length === 0) return

    const now = new Date()
    const nowTime = now.getTime()
    const todayStr = taskStore.todayDateStr

    const newlyDueTasks: TodoItem[] = []

    for (const task of taskStore.tasks) {
      if (task.completed || !task.due_date) continue

      // 若处于用户「稍后提醒 (Snooze)」静默期，则跳过
      if (this.snoozedUntil[task.id] && nowTime < this.snoozedUntil[task.id]) {
        continue
      }

      // 如果当前版本的截止日期已经完整提醒过，不再重复吵闹
      if (this.notifiedTasks[task.id] === task.due_date) {
        continue
      }

      const isDue = this.isTaskDue(task.due_date, now, todayStr)
      if (isDue) {
        newlyDueTasks.push(task)
      }
    }

    // 检查子步骤中的到期与提醒
    try {
      const allSubtasks = localDb.getAllSubtasks()
      for (const sub of allSubtasks) {
        if (sub.completed || !sub.due_date) continue

        if (this.snoozedUntil[sub.id] && nowTime < this.snoozedUntil[sub.id]) {
          continue
        }

        if (this.notifiedTasks[sub.id] === sub.due_date) {
          continue
        }

        const isDue = this.isTaskDue(sub.due_date, now, todayStr)
        if (isDue) {
          const parentTask = taskStore.tasks.find(t => t.id === sub.task_id)
          const pseudoTask: TodoItem = {
            id: sub.id,
            title: `[子步骤] ${sub.title}${parentTask ? ` · ${parentTask.title}` : ''}`,
            description: parentTask ? `所属主待办：${parentTask.title}` : '子步骤到期',
            completed: false,
            priority: parentTask?.priority || 2,
            category_id: parentTask?.category_id || 'inbox',
            due_date: sub.due_date,
            tags: ['子步骤'],
            estimated_pomodoros: 1,
            completed_pomodoros: 0,
            kanban_status: 'todo',
            eisenhower_quadrant: parentTask?.eisenhower_quadrant || 2,
            sort_order: 0,
            created_at: sub.created_at,
            updated_at: sub.created_at,
          }
          newlyDueTasks.push(pseudoTask)
        }
      }
    } catch (e) {
      console.warn('Failed to scan subtask due dates', e)
    }

    if (newlyDueTasks.length > 0) {
      this.triggerAlarm(newlyDueTasks)
    }
  }

  // 判断指定 due_date 字符串是否已到达触发点
  isTaskDue(dueDateStr: string, now: Date, todayStr: string): boolean {
    const trimmed = dueDateStr.trim()

    // 格式一：含具体时刻 "YYYY-MM-DD HH:mm"
    if (trimmed.includes(' ')) {
      const [datePart, timePart] = trimmed.split(' ')
      if (!timePart) return false
      const [y, m, d] = datePart.split('-').map(Number)
      const [hh, mm] = timePart.split(':').map(Number)
      if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return false

      const dueTimestamp = new Date(y, m - 1, d, hh, mm, 0).getTime()
      // 当前时刻已超过截止时间，且在过去 24 小时之内（防止几百天前的远古遗留任务突然疯狂轰炸）
      if (now.getTime() >= dueTimestamp && now.getTime() - dueTimestamp < 24 * 3600 * 1000) {
        return true
      }
    } else {
      // 格式二：仅日期 "YYYY-MM-DD"
      // 若等于今天且处于白昼工作时间，或者已逾期
      if (trimmed <= todayStr) {
        return true
      }
    }
    return false
  }

  // 触发闹铃并自动唤醒迷你便签浮窗
  async triggerAlarm(tasks: TodoItem[]) {
    // 记录已通知
    for (const t of tasks) {
      this.notifiedTasks[t.id] = t.due_date || 'true'
      if (!this.activeAlarmTasks.value.some((x: TodoItem) => x.id === t.id)) {
        this.activeAlarmTasks.value.push(t)
      }
    }
    this.saveState()

    const taskStore = useTaskStore()
    // 1. 自动切换到桌面迷你便签小窗模式
    taskStore.isMiniMode = true

    // 2. 强唤醒窗口 (取消最小化、置顶、聚焦屏幕前列)
    await wakeUpMiniWindow()

    // 3. 播放清脆双音阶晶体闹铃
    sound.playDueAlarm()

    // 4. 激活便签窗口物理震动与闹铃抖动
    this.startAlarmShaking()

    // 5. 触发系统级桌面通知推送
    if (tasks.length > 0) {
      this.sendDesktopNotification(tasks[0])
    }
  }

  // 开启连续节奏抖动 (每 2.5 秒抖动一次，持续 3 组)
  startAlarmShaking() {
    this.ringShakeCount.value++
    if (this.shakeIntervalTimer) clearInterval(this.shakeIntervalTimer)

    let burst = 0
    this.shakeIntervalTimer = setInterval(() => {
      if (!this.isAlarming.value) {
        this.stopAlarmShaking()
        return
      }
      burst++
      this.ringShakeCount.value++
      // 前两轮抖动同步播放柔和晶体钟声
      if (burst <= 2) {
        sound.playDueAlarm()
      }
      // 触发 4 轮后自动转为安静微光状态，避免无休止打扰
      if (burst >= 4) {
        this.stopAlarmShaking()
      }
    }, 2600)
  }

  stopAlarmShaking() {
    if (this.shakeIntervalTimer) {
      clearInterval(this.shakeIntervalTimer)
      this.shakeIntervalTimer = null
    }
  }

  // 用户点击「我知道了」解除当前待办闹铃
  dismissAlarm(taskId?: string) {
    if (taskId) {
      this.activeAlarmTasks.value = this.activeAlarmTasks.value.filter((t: TodoItem) => t.id !== taskId)
    } else {
      this.activeAlarmTasks.value = []
    }
    if (this.activeAlarmTasks.value.length === 0) {
      this.stopAlarmShaking()
    }
  }

  // 稍后提醒 (Snooze，默认 5 分钟后再次提醒)
  snoozeAlarm(taskId: string, minutes = 5) {
    this.snoozedUntil[taskId] = Date.now() + minutes * 60 * 1000
    delete this.notifiedTasks[taskId]
    this.dismissAlarm(taskId)
    this.saveState()
  }

  // 发送操作系统原生横幅通知
  sendDesktopNotification(task: TodoItem) {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(`⏰ 待办到期提醒 · AuraTask`, {
          body: `「${task.title}」已到截止时间，已为您唤醒桌面便签！`,
          icon: '/favicon.ico',
          tag: `auratask-due-${task.id}`,
        })
        notif.onclick = () => {
          const taskStore = useTaskStore()
          taskStore.isMiniMode = true
          wakeUpMiniWindow()
        }
      }
    } catch (e) {
      console.warn('Desktop notification failed', e)
    }
  }

  // 手动测试提醒与闹铃抖动 (供快捷测试与走查)
  testAlarm() {
    const taskStore = useTaskStore()
    // 优先选取当前已有未完成任务，保证其卡片在便签列表中高亮并抖动铃铛；若无则创建一条置顶
    let targetTask = taskStore.tasks.find(t => !t.completed)
    if (!targetTask) {
      targetTask = {
        id: 'test_alarm_' + Date.now(),
        title: '周会进度同步与汇报 (测试到期)',
        description: '到期提醒与便签小窗自动唤醒测试',
        completed: false,
        priority: 1,
        category_id: 'inbox',
        due_date: '今天 14:00',
        tags: ['测试', '到期提醒'],
        estimated_pomodoros: 2,
        completed_pomodoros: 0,
        kanban_status: 'todo',
        eisenhower_quadrant: 1,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      taskStore.tasks.unshift(targetTask)
    }
    this.triggerAlarm([targetTask])
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_NOTIFIED_KEY, JSON.stringify(this.notifiedTasks))
      localStorage.setItem(STORAGE_SNOOZED_KEY, JSON.stringify(this.snoozedUntil))
    } catch {}
  }

  private loadState() {
    try {
      const savedNotified = localStorage.getItem(STORAGE_NOTIFIED_KEY)
      if (savedNotified) this.notifiedTasks = JSON.parse(savedNotified)
      const savedSnoozed = localStorage.getItem(STORAGE_SNOOZED_KEY)
      if (savedSnoozed) this.snoozedUntil = JSON.parse(savedSnoozed)
    } catch {}
  }
}

export const reminderService = new ReminderService()
