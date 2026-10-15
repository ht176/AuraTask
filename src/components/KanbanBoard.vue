<script setup lang="ts">
import { ref } from 'vue'
import {
  ListTodo,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Plus,
  Calendar,
  Flag,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import type { Task, KanbanStatus } from '../types/todo'

const taskStore = useTaskStore()
const draggedTaskId = ref<string | null>(null)
const addingCol = ref<KanbanStatus | null>(null)
const newTitle = ref('')

const columnsConfig = [
  {
    id: 'todo' as KanbanStatus,
    title: '待处理',
    subtitle: '准备就绪',
    icon: ListTodo,
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/10 text-blue-300',
  },
  {
    id: 'in_progress' as KanbanStatus,
    title: '进行中',
    subtitle: '全力推进',
    icon: PlayCircle,
    iconColor: 'text-amber-400',
    badgeColor: 'bg-amber-500/10 text-amber-300',
  },
  {
    id: 'waiting' as KanbanStatus,
    title: '等待/搁置',
    subtitle: '依赖外部或延后',
    icon: PauseCircle,
    iconColor: 'text-purple-400',
    badgeColor: 'bg-purple-500/10 text-purple-300',
  },
  {
    id: 'done' as KanbanStatus,
    title: '已完成',
    subtitle: '已交付验收',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    badgeColor: 'bg-emerald-500/10 text-emerald-300',
  },
]

function getTasksForColumn(col: KanbanStatus): Task[] {
  if (col === 'done') {
    return taskStore.tasks.filter(t => t.completed || t.kanban_status === 'done')
  }
  return taskStore.tasks.filter(t => !t.completed && (t.kanban_status === col || (!t.kanban_status && col === 'todo')))
}

function handleDragStart(e: DragEvent, taskId: string) {
  draggedTaskId.value = taskId
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

async function handleDrop(targetStatus: KanbanStatus) {
  if (!draggedTaskId.value) return
  await taskStore.updateKanbanStatus(draggedTaskId.value, targetStatus)
  draggedTaskId.value = null
}

async function handleQuickAdd(status: KanbanStatus) {
  if (!newTitle.value.trim()) return
  await taskStore.createTask({
    title: newTitle.value.trim(),
    kanban_status: status,
    category_id: 'inbox',
  })
  newTitle.value = ''
  addingCol.value = null
}
</script>

<template>
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-[#0b0d14]/50 select-none p-6">
    <div class="flex items-center justify-between pb-4 border-b border-white/5">
      <div>
        <h2 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>任务看板工作流</span>
          <span class="text-xs font-normal text-neutral-400 font-mono">Kanban Board</span>
        </h2>
        <p class="text-xs text-neutral-400 mt-0.5">
          在不同推进阶段之间自由拖动卡片，直观把控项目全景流转。
        </p>
      </div>
    </div>

    <!-- 4 列水平看板 -->
    <div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 overflow-hidden">
      <div
        v-for="col in columnsConfig"
        :key="col.id"
        class="flex flex-col rounded-2xl glass-panel p-3.5 border border-white/5 overflow-hidden"
        @dragover.prevent
        @drop="handleDrop(col.id)"
      >
        <!-- 看板列头 -->
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-2">
            <component :is="col.icon" class="w-4 h-4" :class="col.iconColor" />
            <div>
              <span class="text-sm font-semibold text-white">{{ col.title }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full font-mono" :class="col.badgeColor">
              {{ getTasksForColumn(col.id).length }}
            </span>
            <button
              v-if="col.id !== 'done'"
              class="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="在此列添加任务"
              @click="addingCol = col.id"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 快速添加输入框 -->
        <div v-if="addingCol === col.id" class="mb-3 flex items-center gap-1.5 shrink-0">
          <input
            v-model="newTitle"
            type="text"
            placeholder="输入待办..."
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            autofocus
            @keyup.enter="handleQuickAdd(col.id)"
            @keyup.esc="addingCol = null"
          />
          <button
            class="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs cursor-pointer"
            @click="handleQuickAdd(col.id)"
          >
            添加
          </button>
        </div>

        <!-- 卡片列表滚动 -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="task in getTasksForColumn(col.id)"
            :key="task.id"
            draggable="true"
            class="p-3 rounded-xl glass-card border border-white/5 hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-all space-y-2"
            @dragstart="handleDragStart($event, task.id)"
            @click="taskStore.selectedTaskId = task.id"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-medium text-neutral-200 leading-snug line-clamp-2" :class="{ 'line-through opacity-60': task.completed }">
                {{ task.title }}
              </span>
              <Flag
                v-if="task.priority <= 2"
                class="w-3.5 h-3.5 shrink-0"
                :class="task.priority === 1 ? 'text-rose-400' : 'text-amber-400'"
              />
            </div>

            <!-- 卡片底栏 -->
            <div class="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/5">
              <span v-if="task.due_date" class="flex items-center gap-1 font-mono">
                <Calendar class="w-3 h-3" />
                {{ task.due_date.split(' ')[0] }}
              </span>
              <span v-else class="text-neutral-500">无截止期</span>

              <div v-if="task.tags && task.tags.length > 0" class="flex gap-1">
                <span class="px-1.5 py-0.2 rounded bg-white/5">#{{ task.tags[0] }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="getTasksForColumn(col.id).length === 0"
            class="h-28 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-neutral-500 text-xs"
          >
            暂无卡片，支持拖拽流转
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
