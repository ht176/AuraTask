<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import gsap from 'gsap'
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
import { animationService } from '../services/animation'
import { sound } from '../services/audio'
import type { Task, PriorityLevel } from '../types/todo'

const props = defineProps<{
  task: Task
}>()

const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()

const checkBtnRef = ref<HTMLElement | null>(null)
const isToggling = ref(false)

onUnmounted(() => {
  if (checkBtnRef.value) {
    gsap.killTweensOf(checkBtnRef.value)
  }
})

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

async function handleToggle(e: MouseEvent) {
  if (isToggling.value) return

  const willComplete = !props.task.completed

  if (willComplete) {
    isToggling.value = true

    // 1. GSAP 弹性复选框回弹微动效
    if (checkBtnRef.value) {
      animationService.bounceCheckButton(checkBtnRef.value)
    }

    // 2. 音效与局部精准坐标微撒花 (避免全屏 Canvas 绘制导致掉帧)
    sound.playCheckSound()
    animationService.triggerCheckConfetti({ x: e.clientX, y: e.clientY })

    // 3. 留出 150ms 视觉驻留感知打勾成果，随后由 TransitionGroup 顺滑交接
    setTimeout(async () => {
      await taskStore.toggleTask(props.task.id, { skipFx: true })
      isToggling.value = false
    }, 150)
  } else {
    // 反选恢复任务
    if (checkBtnRef.value) {
      animationService.bounceCheckButton(checkBtnRef.value)
    }
    await taskStore.toggleTask(props.task.id, { skipFx: true })
  }
}

function handleStartPomodoro(e: MouseEvent) {
  e.stopPropagation()
  pomodoroStore.startForTask(props.task.id)
  taskStore.isPomodoroOpen = true
}

function formatCompletedTime(isoStr?: string | null): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    if (isToday) {
      return `今天 ${timeStr}`
    }
    const month = d.getMonth() + 1
    const date = d.getDate()
    return `${month}月${date}日 ${timeStr}`
  } catch {
    return isoStr.slice(0, 10)
  }
}

function handleSelect() {
  taskStore.selectedTaskId = props.task.id
}
</script>

<template>
  <div
    class="group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl glass-card transition-all cursor-pointer"
    :class="[
      task.completed ? 'opacity-55 bg-white/[0.015]' : 'hover:border-white/15',
      taskStore.selectedTaskId === task.id ? 'glass-card-active' : ''
    ]"
    @click="handleSelect"
  >
    <!-- 左侧优先级细线指示条 -->
    <div
      v-if="!task.completed && task.priority <= 3"
      class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r transition-colors"
      :class="{
        'bg-rose-500': task.priority === 1,
        'bg-amber-400': task.priority === 2,
        'bg-indigo-400': task.priority === 3,
      }"
    ></div>

    <div class="flex items-center gap-3 min-w-0 flex-1 pl-1">
      <!-- 完成勾选圆形按钮 -->
      <button
        ref="checkBtnRef"
        class="w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer will-change-transform"
        :class="(task.completed || isToggling)
          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
          : 'border-white/20 hover:border-indigo-400 hover:bg-white/5'"
        @click.stop="handleToggle"
      >
        <Check v-if="task.completed || isToggling" class="w-3 h-3 stroke-[2.5]" />
      </button>

      <!-- 任务标题与详情摘要 -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="text-xs sm:text-[13px] font-medium tracking-tight truncate transition-colors"
            :class="(task.completed || isToggling) ? 'line-through text-neutral-500' : 'text-neutral-100'"
          >
            {{ task.title }}
          </span>

          <!-- 优先级标志徽章 (仅高优先级轻巧呈现，避免多重重复编码) -->
          <span
            v-if="task.priority === 1 && !task.completed"
            class="text-[10px] px-1.5 py-0.2 rounded font-medium bg-rose-500/15 text-rose-300 shrink-0"
          >
            紧急
          </span>
          <span
            v-else-if="task.priority === 2 && !task.completed"
            class="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-500/15 text-amber-300 shrink-0"
          >
            重要
          </span>
        </div>

        <!-- 任务副标题元数据行 (时间/标签/子任务/番茄) -->
        <div class="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-neutral-400">
          <!-- 完成时间 (已完成任务清晰呈现) -->
          <div
            v-if="task.completed && (task.completed_at || task.updated_at)"
            class="flex items-center gap-1 font-mono text-[11px] text-emerald-400/90 font-medium"
          >
            <Check class="w-3 h-3 stroke-[2.5]" />
            <span>完成于 {{ formatCompletedTime(task.completed_at || task.updated_at) }}</span>
          </div>

          <!-- 截止时间 (未完成任务展示) -->
          <div
            v-else-if="dueDateInfo"
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
