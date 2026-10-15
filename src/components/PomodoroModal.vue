<script setup lang="ts">
import { computed } from 'vue'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Flame,
  Coffee,
  CheckCircle2,
} from 'lucide-vue-next'
import { usePomodoroStore } from '../stores/pomodoro'
import { useTaskStore } from '../stores/task'

const pomodoroStore = usePomodoroStore()
const taskStore = useTaskStore()

const radius = 105
const circumference = 2 * Math.PI * radius
const strokeDashoffset = computed(() => {
  return circumference - (circumference * pomodoroStore.progressPercent) / 100
})

function handleClose() {
  taskStore.isPomodoroOpen = false
}

function handleCompleteTask() {
  if (pomodoroStore.activeTaskId) {
    taskStore.toggleTask(pomodoroStore.activeTaskId)
  }
}
</script>

<template>
  <div
    v-if="taskStore.isPomodoroOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl select-none p-4 animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div class="relative w-full max-w-md rounded-3xl glass-panel p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center">
      <!-- 关闭按钮 -->
      <button
        class="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        @click="handleClose"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- 模式切换药丸胶囊 -->
      <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/5 text-xs font-medium mb-6">
        <button
          class="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          :class="pomodoroStore.mode === 'work' ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'"
          @click="pomodoroStore.switchMode('work')"
        >
          <Flame class="w-3.5 h-3.5" />
          <span>专注 (25m)</span>
        </button>

        <button
          class="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          :class="pomodoroStore.mode === 'short_break' ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'"
          @click="pomodoroStore.switchMode('short_break')"
        >
          <Coffee class="w-3.5 h-3.5" />
          <span>短休 (5m)</span>
        </button>

        <button
          class="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          :class="pomodoroStore.mode === 'long_break' ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'"
          @click="pomodoroStore.switchMode('long_break')"
        >
          <span>长休 (15m)</span>
        </button>
      </div>

      <!-- 环形倒计时圆环 -->
      <div class="relative w-64 h-64 flex items-center justify-center my-2">
        <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
          <!-- 背景轨道 -->
          <circle
            cx="120"
            cy="120"
            :r="radius"
            stroke="currentColor"
            stroke-width="8"
            class="text-white/5 fill-none"
          />
          <!-- 动态进度圆环 -->
          <circle
            cx="120"
            cy="120"
            :r="radius"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            class="text-indigo-500 fill-none transition-all duration-1000 ease-linear shadow-lg"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
          />
        </svg>

        <!-- 环内时间与状态 -->
        <div class="absolute flex flex-col items-center">
          <span class="text-5xl font-extrabold tracking-tighter text-white font-mono drop-shadow-md">
            {{ pomodoroStore.formattedTime }}
          </span>
          <span class="text-xs text-neutral-400 mt-2 font-medium">
            {{ pomodoroStore.isRunning ? '心流专注中...' : '准备就绪' }}
          </span>
        </div>
      </div>

      <!-- 绑定聚焦的任务标题 -->
      <div class="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/5 max-w-xs flex items-center justify-between gap-2">
        <span class="text-xs text-neutral-300 truncate">
          {{ pomodoroStore.activeTaskTitle }}
        </span>
        <button
          v-if="pomodoroStore.activeTaskId"
          class="text-xs text-emerald-400 hover:text-emerald-300 shrink-0 flex items-center gap-1 cursor-pointer"
          title="完成此任务"
          @click="handleCompleteTask"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>划掉</span>
        </button>
      </div>

      <!-- 核心控制按钮栏 -->
      <div class="flex items-center gap-4 mt-6">
        <!-- 重置 -->
        <button
          class="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
          title="重置计时"
          @click="pomodoroStore.reset"
        >
          <RotateCcw class="w-4 h-4" />
        </button>

        <!-- 播放/暂停大按钮 -->
        <button
          class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer"
          @click="pomodoroStore.togglePlay"
        >
          <Pause v-if="pomodoroStore.isRunning" class="w-6 h-6" />
          <Play v-else class="w-6 h-6 ml-0.5" />
        </button>

        <!-- 白噪音开关 -->
        <button
          class="p-3 rounded-2xl transition-all cursor-pointer border"
          :class="pomodoroStore.isNoisePlaying
            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
            : 'bg-white/5 border-transparent text-neutral-400 hover:text-white hover:bg-white/10'"
          :title="pomodoroStore.isNoisePlaying ? '关闭专注白噪音' : '开启沉浸专注白噪音'"
          @click="pomodoroStore.toggleNoise"
        >
          <Volume2 v-if="pomodoroStore.isNoisePlaying" class="w-4 h-4 text-indigo-400" />
          <VolumeX v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- 底部统计打卡 -->
      <div class="mt-6 text-xs text-neutral-500 flex items-center gap-2">
        <span>今日已完成 {{ pomodoroStore.completedSessions }} 个番茄钟</span>
        <span>·</span>
        <span>保持心流节奏</span>
      </div>
    </div>
  </div>
</template>
