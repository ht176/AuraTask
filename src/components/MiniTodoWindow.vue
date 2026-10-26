<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Maximize2,
  Plus,
  Check,
  Sparkles,
  Flame,
  Minus,
  X,
  BellRing,
  Calendar,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { isDesktopApp, exitMiniMode, minimizeWindow, closeWindow } from '../services/desktop'
import { reminderService } from '../services/reminder'
import { animationService } from '../services/animation'
import { api } from '../services/api'
import { localDb } from '../services/localDb'
import type { Task } from '../types/todo'

const taskStore = useTaskStore()
const quickText = ref('')
const quickInputRef = ref<HTMLInputElement | null>(null)
const isDesktop = ref(isDesktopApp())
const windowRef = ref<HTMLElement | null>(null)

const pendingTasks = computed(() => {
  return taskStore.tasks.filter(t => !t.completed).slice(0, 15)
})

function isTaskAlarming(taskId: string): boolean {
  return reminderService.activeAlarmTasks.value.some((t: Task) => t.id === taskId)
}

function focusQuickInput() {
  nextTick(() => {
    quickInputRef.value?.focus()
    quickInputRef.value?.select()
  })
}

// 响应全局快捷键触发的聚焦请求
watch(
  () => taskStore.focusMiniInputTrigger,
  () => {
    focusQuickInput()
  }
)

// 监听闹铃抖动计数器，驱动便签小窗物理抖动 (GSAP)
watch(
  () => reminderService.ringShakeCount.value,
  () => {
    if (windowRef.value) {
      animationService.shakeAlarmNote(windowRef.value)
    }
  }
)

onMounted(() => {
  focusQuickInput()
  setTimeout(focusQuickInput, 50)
  setTimeout(focusQuickInput, 150)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', focusQuickInput)
  }

  // 若刚挂载时便已处于闹铃状态，立即抖动一次便签
  if (reminderService.isAlarming.value && windowRef.value) {
    animationService.shakeAlarmNote(windowRef.value)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', focusQuickInput)
  }
})

async function handleRestore() {
  // 严格重置快捷录入弹窗状态，确保回到常规界面时展示完整的任务视图，杜绝意外残留快捷弹窗
  taskStore.isQuickAddOpen = false
  taskStore.isMiniMode = false
  if (isDesktop.value) {
    await exitMiniMode()
  }
}

async function handleAdd() {
  if (!quickText.value.trim()) return
  await taskStore.createTaskFromNLP(quickText.value.trim(), 'inbox')
  quickText.value = ''
  taskStore.isQuickAddOpen = false
}

async function handleToggleTask(taskId: string) {
  if (taskId.startsWith('sub_')) {
    const sub = localDb.getAllSubtasks().find(s => s.id === taskId)
    if (sub) {
      await api.updateSubtask(taskId, { completed: !sub.completed })
    }
    reminderService.dismissAlarm(taskId)
    return
  }
  await taskStore.toggleTask(taskId)
  // 若完成的任务正在闹铃，立刻解除闹铃
  reminderService.dismissAlarm(taskId)
}

function handleDismissAlarm(taskId?: string) {
  reminderService.dismissAlarm(taskId)
}

function handleSnooze(taskId: string) {
  reminderService.snoozeAlarm(taskId, 5)
}
</script>

<template>
  <div
    ref="windowRef"
    class="w-full h-full flex flex-col glass-panel select-none overflow-hidden text-neutral-800 dark:text-neutral-100 rounded-2xl shadow-2xl backdrop-blur-2xl transition-all duration-300"
    :class="reminderService.isAlarming.value ? 'alarm-glow border-2 border-rose-500/80' : 'border border-black/10 dark:border-white/10'"
  >
    <!-- 顶部拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="h-8 px-2.5 border-b flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0 transition-colors"
      :class="reminderService.isAlarming.value ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30' : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'"
    >
      <div class="flex items-center gap-1.5 pointer-events-none min-w-0">
        <BellRing v-if="reminderService.isAlarming.value" class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 animate-bell-ring shrink-0" />
        <div v-else class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
        <span class="text-xs font-bold tracking-tight truncate" :class="reminderService.isAlarming.value ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-800 dark:text-white'">
          {{ reminderService.isAlarming.value ? '到期闹铃' : '便签' }}
        </span>
        <span class="text-[10px] font-mono shrink-0" :class="reminderService.isAlarming.value ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-neutral-500 dark:text-neutral-400'">
          ({{ pendingTasks.length }})
        </span>
      </div>

      <!-- 右侧控制按钮 -->
      <div class="flex items-center gap-0.5 shrink-0">
        <!-- 还原至主窗口 -->
        <button
          class="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          title="展开还原为主界面"
          @click="handleRestore"
        >
          <Maximize2 class="w-3 h-3" />
        </button>

        <template v-if="isDesktop">
          <button
            class="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            title="最小化"
            @click="minimizeWindow"
          >
            <Minus class="w-3 h-3" />
          </button>
          <button
            class="p-1 rounded-md hover:bg-rose-600 text-neutral-500 hover:text-white dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            title="隐藏到托盘"
            @click="closeWindow"
          >
            <X class="w-3 h-3" />
          </button>
        </template>
      </div>
    </div>

    <!-- 闹铃强提醒横幅 (到期激活时呈现) -->
    <div
      v-if="reminderService.isAlarming.value"
      class="alarm-banner px-2.5 py-1.5 bg-rose-50/95 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-500/40 shrink-0 flex flex-col gap-1 animate-in fade-in duration-200"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 min-w-0">
          <BellRing class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-bell-ring shrink-0" />
          <span class="text-xs font-bold text-rose-950 dark:text-rose-100 truncate">
            待办到期，请处理！
          </span>
        </div>
        <span class="text-[9px] px-1 py-0.2 rounded-md bg-rose-200/90 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-mono font-medium shrink-0 border border-rose-300 dark:border-rose-800">
          {{ reminderService.activeAlarmTasks.value.length }} 项
        </span>
      </div>

      <!-- 首个到期任务摘要与快捷解除 -->
      <div v-if="reminderService.activeAlarmTasks.value[0]" class="flex items-center justify-between text-xs pt-0.5">
        <span class="truncate font-semibold text-rose-900 dark:text-rose-100 flex-1 mr-1.5 text-[10px]" :title="reminderService.activeAlarmTasks.value[0].title">
          {{ reminderService.activeAlarmTasks.value[0].title }}
        </span>
        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="handleSnooze(reminderService.activeAlarmTasks.value[0].id)"
            class="px-1.5 py-0.5 rounded-md bg-rose-200/90 hover:bg-rose-300 dark:bg-white/10 dark:hover:bg-white/20 text-rose-900 dark:text-rose-200 text-[9px] font-medium transition-colors cursor-pointer border border-rose-300/80 dark:border-white/10"
            title="稍后 5 分钟再次提醒"
          >
            稍后
          </button>
          <button
            @click="handleDismissAlarm(reminderService.activeAlarmTasks.value[0].id)"
            class="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-[9px] shadow-sm transition-colors cursor-pointer"
          >
            知道了
          </button>
        </div>
      </div>
    </div>

    <!-- 极速快捷录入 -->
    <div class="p-1.5 border-b border-black/5 dark:border-white/5 shrink-0">
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/5">
        <Plus class="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <input
          ref="quickInputRef"
          v-model="quickText"
          type="text"
          placeholder="随手记待办 (回车保存)..."
          class="w-full bg-transparent text-xs text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          @keyup.enter="handleAdd"
        />
      </div>
    </div>

    <!-- 待办清单滚动区域 -->
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1">
      <div
        v-for="task in pendingTasks"
        :key="task.id"
        class="group flex items-center justify-between p-1.5 rounded-lg border transition-all text-xs"
        :class="isTaskAlarming(task.id)
          ? 'bg-rose-500/15 border-rose-500/60 ring-1 ring-rose-500/40 shadow-xs'
          : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 border-black/5 dark:border-white/5'"
      >
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            class="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            :class="isTaskAlarming(task.id) ? 'border-rose-500 hover:border-emerald-500' : 'border-neutral-400 dark:border-neutral-500 hover:border-emerald-500'"
            @click="handleToggleTask(task.id)"
            title="标记完成"
          >
            <Check v-if="task.completed" class="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
          </button>
          <span
            class="truncate"
            :class="isTaskAlarming(task.id) ? 'text-rose-700 dark:text-rose-200 font-semibold' : 'text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white'"
          >
            {{ task.title }}
          </span>
        </div>

        <div class="flex items-center gap-1 shrink-0 ml-1">
          <!-- 闹铃小铃铛指示 -->
          <BellRing
            v-if="isTaskAlarming(task.id)"
            class="w-3 h-3 text-rose-500 dark:text-rose-400 animate-bell-ring shrink-0"
            title="该任务正在发出到期闹铃"
          />

          <!-- 截止时间标签 -->
          <span
            v-if="task.due_date"
            class="text-[9px] font-mono flex items-center gap-0.5"
            :class="isTaskAlarming(task.id) ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-neutral-500 dark:text-neutral-400'"
          >
            <Calendar class="w-2 h-2" />
            <span>{{ task.due_date.split(' ')[0] }}</span>
          </span>

          <Flame
            v-if="task.priority === 1"
            class="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0"
          />
        </div>
      </div>

      <div
        v-if="pendingTasks.length === 0"
        class="py-8 flex flex-col items-center justify-center text-center text-neutral-500 text-xs"
      >
        <Sparkles class="w-4 h-4 text-indigo-400 mb-1" />
        <span>所有事项已划掉！</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="px-2.5 py-1 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0">
      <span class="truncate">置顶便签</span>
      <button class="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer transition-colors shrink-0" @click="handleRestore">
        完整版 →
      </button>
    </div>
  </div>
</template>
