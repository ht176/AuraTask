<script setup lang="ts">
import { ref } from 'vue'
import {
  Flame,
  Target,
  Clock,
  Sparkles,
  Plus,
  Check,
  Flag,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import type { Task, EisenhowerQuadrant } from '../types/todo'

const taskStore = useTaskStore()
const draggedTaskId = ref<string | null>(null)
const addingQuadrant = ref<EisenhowerQuadrant | null>(null)
const newTitle = ref('')

const quadrantsConfig = [
  {
    id: 1 as EisenhowerQuadrant,
    name: '重要且紧急',
    action: '立刻执行 (Do First)',
    color: 'from-rose-500/20 via-rose-500/5 to-transparent',
    border: 'border-rose-500/30',
    headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: Flame,
    iconColor: 'text-rose-400',
  },
  {
    id: 2 as EisenhowerQuadrant,
    name: '重要不紧急',
    action: '战略规划 (Schedule)',
    color: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
    border: 'border-indigo-500/30',
    headerBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: Target,
    iconColor: 'text-indigo-400',
  },
  {
    id: 3 as EisenhowerQuadrant,
    name: '紧急不重要',
    action: '快速处理或授权 (Delegate)',
    color: 'from-amber-500/20 via-amber-500/5 to-transparent',
    border: 'border-amber-500/30',
    headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Clock,
    iconColor: 'text-amber-400',
  },
  {
    id: 4 as EisenhowerQuadrant,
    name: '不紧急不重要',
    action: '精简或舍弃 (Eliminate)',
    color: 'from-neutral-500/20 via-neutral-500/5 to-transparent',
    border: 'border-neutral-500/30',
    headerBadge: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
    icon: Sparkles,
    iconColor: 'text-neutral-400',
  },
]

function getTasksForQuadrant(quadrant: EisenhowerQuadrant): Task[] {
  return taskStore.tasks.filter(t => !t.completed && (t.eisenhower_quadrant === quadrant || (!t.eisenhower_quadrant && t.priority === quadrant)))
}

function handleDragStart(e: DragEvent, taskId: string) {
  draggedTaskId.value = taskId
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

async function handleDrop(targetQuadrant: EisenhowerQuadrant) {
  if (!draggedTaskId.value) return
  await taskStore.updateQuadrant(draggedTaskId.value, targetQuadrant)
  draggedTaskId.value = null
}

async function handleQuickAdd(quadrant: EisenhowerQuadrant) {
  if (!newTitle.value.trim()) return
  await taskStore.createTask({
    title: newTitle.value.trim(),
    priority: quadrant,
    eisenhower_quadrant: quadrant,
    category_id: 'inbox',
  })
  newTitle.value = ''
  addingQuadrant.value = null
}
</script>

<template>
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-transparent select-none p-6">
    <div class="flex items-center justify-between pb-3.5 border-b border-white/5">
      <div>
        <h2 class="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
          <span>四象限时间管理</span>
        </h2>
        <p class="text-xs text-neutral-400 mt-0.5">
          按重要与紧急程度科学分配精力，优先聚焦高价值事项
        </p>
      </div>
    </div>

    <!-- 2x2 四象限网格 -->
    <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5 overflow-hidden">
      <div
        v-for="q in quadrantsConfig"
        :key="q.id"
        class="flex flex-col rounded-xl glass-panel p-3.5 border transition-colors overflow-hidden"
        :class="q.border"
        @dragover.prevent
        @drop="handleDrop(q.id)"
      >
        <!-- 象限头部 -->
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <component :is="q.icon" class="w-4 h-4" :class="q.iconColor" />
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">{{ q.name }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full border font-mono" :class="q.headerBadge">
                  {{ q.action }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-mono text-neutral-400">
              {{ getTasksForQuadrant(q.id).length }}
            </span>
            <button
              class="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="在此象限添加任务"
              @click="addingQuadrant = q.id"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 快速添加输入框 -->
        <div v-if="addingQuadrant === q.id" class="mb-3 flex items-center gap-1.5 shrink-0">
          <input
            v-model="newTitle"
            type="text"
            placeholder="输入待办并按回车..."
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            autofocus
            @keyup.enter="handleQuickAdd(q.id)"
            @keyup.esc="addingQuadrant = null"
          />
          <button
            class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs cursor-pointer"
            @click="handleQuickAdd(q.id)"
          >
            添加
          </button>
        </div>

        <!-- 任务卡片滚动区域 -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div
            v-for="task in getTasksForQuadrant(q.id)"
            :key="task.id"
            draggable="true"
            class="group p-2.5 rounded-xl glass-card border border-white/5 hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
            @dragstart="handleDragStart($event, task.id)"
            @click="taskStore.selectedTaskId = task.id"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                class="w-4 h-4 rounded-full border border-neutral-500 hover:border-emerald-400 flex items-center justify-center shrink-0 cursor-pointer"
                @click.stop="taskStore.toggleTask(task.id)"
              >
                <Check v-if="task.completed" class="w-3 h-3 text-emerald-400" />
              </button>
              <span class="text-xs text-neutral-200 truncate group-hover:text-white">
                {{ task.title }}
              </span>
            </div>

            <div class="flex items-center gap-1 shrink-0 ml-2">
              <span v-if="task.due_date" class="text-[10px] text-neutral-400 font-mono">
                {{ task.due_date.split(' ')[0] }}
              </span>
              <Flag class="w-3 h-3" :class="q.iconColor" />
            </div>
          </div>

          <div
            v-if="getTasksForQuadrant(q.id).length === 0"
            class="h-28 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-neutral-500 text-xs"
          >
            暂无任务，可将任务拖入此处
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
