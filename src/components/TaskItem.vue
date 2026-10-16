<script setup lang="ts">
import { computed } from 'vue'
import {
  Check,
  Calendar,
  CheckSquare2,
  Timer,
  Trash2,
  ChevronRight,
  Flag,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { usePomodoroStore } from '../stores/pomodoro'
import { tagService } from '../services/tags'
import type { Task, PriorityLevel } from '../types/todo'

const props = defineProps<{
  task: Task
}>()

const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()

const priorityColors: Record<PriorityLevel, { border: string; bg: string; text: string; label: string }> = {
  1: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'P1 紧急重要' },
  2: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'P2 重要' },
  3: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'P3 普通' },
  4: { border: 'border-neutral-500/30', bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: 'P4 低' },
}

const dueDateInfo = computed(() => {
  if (!props.task.due_date) return null
  const todayStr = taskStore.todayDateStr
  const isOverdue = !props.task.completed && props.task.due_date < todayStr
  const isToday = props.task.due_date.startsWith(todayStr)

  return {
    text: props.task.due_date,
    isOverdue,
    isToday,
  }
})

function handleToggle() {
  taskStore.toggleTask(props.task.id)
}

function handleStartPomodoro(e: MouseEvent) {
  e.stopPropagation()
  pomodoroStore.startForTask(props.task.id)
  taskStore.isPomodoroOpen = true
}

function handleSelect() {
  taskStore.selectedTaskId = props.task.id
}
</script>

<template>
  <div
    class="group relative flex items-center justify-between px-3.5 py-3 rounded-2xl glass-card transition-all cursor-pointer"
    :class="[
      task.completed ? 'opacity-60 bg-white/[0.02]' : 'hover:border-indigo-500/30',
      taskStore.selectedTaskId === task.id ? 'glass-card-active' : ''
    ]"
    @click="handleSelect"
  >
    <!-- 左侧优先级纵向发光条 -->
    <div
      class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
      :class="{
        'bg-rose-500 glow-p1': task.priority === 1,
        'bg-amber-500 glow-p2': task.priority === 2,
        'bg-blue-500 glow-p3': task.priority === 3,
        'bg-neutral-600': task.priority === 4,
      }"
    ></div>

    <div class="flex items-center gap-3 min-w-0 flex-1 pl-1">
      <!-- 完成勾选圆形按钮 -->
      <button
        class="w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer"
        :class="task.completed
          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
          : 'border-neutral-500 hover:border-indigo-400 hover:scale-110'"
        @click.stop="handleToggle"
      >
        <Check v-if="task.completed" class="w-3.5 h-3.5 stroke-[3]" />
      </button>

      <!-- 任务标题与详情摘要 -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="text-xs sm:text-sm font-medium tracking-tight truncate transition-all"
            :class="task.completed ? 'line-through text-neutral-400' : 'text-neutral-100'"
          >
            {{ task.title }}
          </span>

          <!-- 优先级标志徽章 -->
          <span
            v-if="task.priority <= 2 && !task.completed"
            class="text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0"
            :class="priorityColors[task.priority].bg + ' ' + priorityColors[task.priority].text"
          >
            <Flag class="w-2.5 h-2.5 inline mr-0.5" />
            P{{ task.priority }}
          </span>
        </div>

        <!-- 任务副标题元数据行 (时间/标签/子任务/番茄) -->
        <div class="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-neutral-400">
          <!-- 截止时间 -->
          <div
            v-if="dueDateInfo"
            class="flex items-center gap-1 font-mono text-[11px]"
            :class="{
              'text-rose-400 font-semibold': dueDateInfo.isOverdue,
              'text-amber-400 font-medium': dueDateInfo.isToday,
              'text-neutral-400': !dueDateInfo.isOverdue && !dueDateInfo.isToday
            }"
          >
            <Calendar class="w-3 h-3" />
            <span>{{ dueDateInfo.text }}</span>
          </div>

          <!-- 子任务进度 -->
          <div v-if="task.subtask_total && task.subtask_total > 0" class="flex items-center gap-1 text-neutral-400">
            <CheckSquare2 class="w-3 h-3 text-indigo-400" />
            <span>{{ task.subtask_completed }}/{{ task.subtask_total }}</span>
          </div>

          <!-- 标签小胶囊 (带自定义个性色彩) -->
          <div v-if="task.tags && task.tags.length > 0" class="flex items-center gap-1">
            <span
              v-for="tag in task.tags"
              :key="tag"
              class="px-1.5 py-0.2 rounded-md text-[10px] font-mono border"
              :style="{
                color: tagService.getTagInfo(tag).color,
                backgroundColor: tagService.getTagInfo(tag).bgColor,
                borderColor: `${tagService.getTagInfo(tag).color}30`
              }"
            >
              #{{ tag }}
            </span>
          </div>

          <!-- 预估番茄钟徽章 -->
          <div v-if="task.completed_pomodoros > 0 || task.estimated_pomodoros > 1" class="flex items-center gap-1 text-rose-400/80">
            <Timer class="w-3 h-3" />
            <span>{{ task.completed_pomodoros }}/{{ task.estimated_pomodoros }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧操作栏 (悬浮显示) -->
    <div class="flex items-center gap-1.5 shrink-0 ml-2">
      <!-- 开启番茄钟 -->
      <button
        v-if="!task.completed"
        class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
        title="为此待办开启番茄专注"
        @click="handleStartPomodoro"
      >
        <Timer class="w-4 h-4" />
      </button>

      <!-- 删除按钮 -->
      <button
        class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
        title="删除任务"
        @click.stop="taskStore.deleteTask(task.id)"
      >
        <Trash2 class="w-4 h-4" />
      </button>

      <!-- 展开详情指示箭头 -->
      <ChevronRight class="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
    </div>
  </div>
</template>
