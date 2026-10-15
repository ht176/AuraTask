import { defineStore } from 'pinia'
import { sound } from '../services/audio'
import { api } from '../services/api'
import { useTaskStore } from './task'

export type PomodoroMode = 'work' | 'short_break' | 'long_break'

export const usePomodoroStore = defineStore('pomodoro', {
  state: () => ({
    mode: 'work' as PomodoroMode,
    timeLeft: 25 * 60, // 25 分钟
    totalTime: 25 * 60,
    isRunning: false,
    activeTaskId: null as string | null,
    completedSessions: 0,
    isNoisePlaying: false,
    timerId: null as any,
  }),

  getters: {
    formattedTime(state): string {
      const minutes = Math.floor(state.timeLeft / 60)
      const seconds = state.timeLeft % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    },
    progressPercent(state): number {
      if (state.totalTime === 0) return 0
      return Math.round(((state.totalTime - state.timeLeft) / state.totalTime) * 100)
    },
    activeTaskTitle(state): string {
      if (!state.activeTaskId) return '自由专注'
      const taskStore = useTaskStore()
      const task = taskStore.tasks.find(t => t.id === state.activeTaskId)
      return task ? task.title : '已选任务'
    }
  },

  actions: {
    startForTask(taskId: string) {
      this.activeTaskId = taskId
      this.switchMode('work')
      this.start()
    },

    start() {
      if (this.isRunning) return
      sound.playStartBell()
      this.isRunning = true

      if (this.isNoisePlaying) {
        sound.startAmbientNoise()
      }

      this.timerId = setInterval(() => {
        this.tick()
      }, 1000)
    },

    pause() {
      if (!this.isRunning) return
      this.isRunning = false
      if (this.timerId) {
        clearInterval(this.timerId)
        this.timerId = null
      }
      sound.stopAmbientNoise()
    },

    togglePlay() {
      if (this.isRunning) {
        this.pause()
      } else {
        this.start()
      }
    },

    reset() {
      this.pause()
      this.setTimeForMode(this.mode)
    },

    switchMode(newMode: PomodoroMode) {
      this.pause()
      this.mode = newMode
      this.setTimeForMode(newMode)
    },

    setTimeForMode(m: PomodoroMode) {
      let mins = 25
      if (m === 'short_break') mins = 5
      if (m === 'long_break') mins = 15
      this.totalTime = mins * 60
      this.timeLeft = mins * 60
    },

    async tick() {
      if (this.timeLeft > 0) {
        this.timeLeft--
      } else {
        // 完成倒计时
        this.pause()
        sound.playCompleteBell()

        const sessionDuration = Math.round(this.totalTime / 60)
        if (this.mode === 'work') {
          this.completedSessions++
          await api.logPomodoro(this.activeTaskId, sessionDuration, 'work')
          const taskStore = useTaskStore()
          taskStore.fetchStats()
          taskStore.fetchTasks()

          // 自动切换为休息
          if (this.completedSessions % 4 === 0) {
            this.switchMode('long_break')
          } else {
            this.switchMode('short_break')
          }
        } else {
          // 休息结束，切回工作
          this.switchMode('work')
        }
      }
    },

    toggleNoise() {
      this.isNoisePlaying = !this.isNoisePlaying
      if (this.isNoisePlaying && this.isRunning) {
        sound.startAmbientNoise()
      } else {
        sound.stopAmbientNoise()
      }
    }
  }
})
