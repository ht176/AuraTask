<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Calendar,
  Flag,
  Tag,
  CheckCircle,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { parseNaturalLanguage } from '../services/nlp'
import TaskItem from './TaskItem.vue'

const taskStore = useTaskStore()
const quickInputText = ref('')
const isShowCompleted = ref(true)
const sortBy = ref<'priority' | 'due_date' | 'created_at'>('priority')

// 实时自然语言解析预览
const nlpPreview = computed(() => {
  if (!quickInputText.value.trim()) return null
  return parseNaturalLanguage(quickInputText.value)
})

// 分离未完成与已完成
const pendingTasks = computed(() => {
  let list = taskStore.filteredTasks.filter(t => !t.completed)
  if (sortBy.value === 'priority') {
    list.sort((a, b) => a.priority - b.priority)
  } else if (sortBy.value === 'due_date') {
    list.sort((a, b) => (a.due_date || '9999') > (b.due_date || '9999') ? 1 : -1)
  } else {
    list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  return list
})

const completedTasks = computed(() => {
  return taskStore.filteredTasks.filter(t => t.completed)
})

const viewTitle = computed(() => {
  switch (taskStore.activeView) {
    case 'today': return '☀️ 我的一天'
    case 'inbox': return '📥 收集箱'
    case 'upcoming': return '📅 近期安排'
    case 'all': return '📦 全部待办'
    case 'completed': return '✅ 已完成归档'
    default: {
      const cat = taskStore.categories.find(c => c.id === taskStore.activeView)
      return cat ? `📁 ${cat.name}` : '待办清单'
    }
  }
})

async function handleQuickAdd() {
  if (!quickInputText.value.trim()) return
  const currentCategory = ['today', 'upcoming', 'all', 'completed', 'matrix', 'kanban'].includes(taskStore.activeView)
    ? 'inbox'
    : taskStore.activeView

  await taskStore.createTaskFromNLP(quickInputText.value, currentCategory)
  quickInputText.value = ''
}
</script>

<template>
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-[#0b0d14]/50 select-none">
    <!-- 头部顶栏：标题、进度与排序 -->
    <header class="px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-bold tracking-tight text-white">{{ viewTitle }}</h2>
          <span
            v-if="taskStore.activeTag"
            class="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium"
          >
            #{{ taskStore.activeTag }}
          </span>
        </div>
        <p class="text-xs text-neutral-400 mt-0.5">
          {{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}
          <span v-if="pendingTasks.length > 0" class="ml-2 font-mono text-indigo-400">
            · {{ pendingTasks.length }} 项待办
          </span>
        </p>
      </div>

      <!-- 排序与过滤选择器 -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-300">
          <SlidersHorizontal class="w-3.5 h-3.5 text-neutral-400" />
          <select
            v-model="sortBy"
            class="bg-transparent border-none text-xs text-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value="priority" class="bg-neutral-900 text-white">按优先级排序</option>
            <option value="due_date" class="bg-neutral-900 text-white">按截止日期</option>
            <option value="created_at" class="bg-neutral-900 text-white">按创建时间</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 主体区域：输入框与任务列表 -->
    <main class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <!-- 极速快捷录入框 (内嵌于列表顶部) -->
      <div class="glass-panel p-2.5 rounded-2xl border border-white/10 shadow-lg shadow-black/20 focus-within:border-indigo-500/50 transition-all">
        <div class="flex items-center gap-2.5 px-2">
          <Plus class="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            v-model="quickInputText"
            type="text"
            placeholder="快速添加待办... (试试输入: 明天下午3点 买咖啡 !高 #工作 *2)"
            class="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
            @keyup.enter="handleQuickAdd"
          />
          <button
            class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
            :disabled="!quickInputText.trim()"
            @click="handleQuickAdd"
          >
            添加
          </button>
        </div>

        <!-- 实时智能 NLP 语义解析高亮胶囊预览 -->
        <div v-if="nlpPreview && (nlpPreview.priority !== 3 || nlpPreview.due_date || nlpPreview.tags.length > 0 || nlpPreview.estimated_pomodoros > 1)" class="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5 px-2 text-xs">
          <span class="text-[11px] text-neutral-400 flex items-center gap-1">
            <Sparkles class="w-3 h-3 text-indigo-400" />
            智能识别：
          </span>

          <!-- 优先级识别 -->
          <span v-if="nlpPreview.priority !== 3" class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1">
            <Flag class="w-3 h-3" />
            P{{ nlpPreview.priority }}
          </span>

          <!-- 截止时间识别 -->
          <span v-if="nlpPreview.due_date" class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1 font-mono">
            <Calendar class="w-3 h-3" />
            {{ nlpPreview.due_date }}
          </span>

          <!-- 标签识别 -->
          <span v-for="tag in nlpPreview.tags" :key="tag" class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] flex items-center gap-1">
            <Tag class="w-3 h-3" />
            #{{ tag }}
          </span>
        </div>
      </div>

      <!-- 任务列表容器 -->
      <div v-if="pendingTasks.length > 0 || completedTasks.length > 0" class="space-y-2">
        <!-- 未完成任务列表 -->
        <div class="space-y-2">
          <TaskItem
            v-for="task in pendingTasks"
            :key="task.id"
            :task="task"
          />
        </div>

        <!-- 已完成任务折叠区域 -->
        <div v-if="completedTasks.length > 0" class="pt-4">
          <button
            class="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors py-1 cursor-pointer"
            @click="isShowCompleted = !isShowCompleted"
          >
            <ChevronDown v-if="isShowCompleted" class="w-3.5 h-3.5" />
            <ChevronRight v-else class="w-3.5 h-3.5" />
            <span>已完成 ({{ completedTasks.length }})</span>
          </button>

          <div v-if="isShowCompleted" class="space-y-2 mt-2">
            <TaskItem
              v-for="task in completedTasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-16 flex flex-col items-center justify-center text-center">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
          <CheckCircle class="w-7 h-7" />
        </div>
        <h3 class="text-sm font-semibold text-neutral-200">太棒了，所有事项已处理完毕！</h3>
        <p class="text-xs text-neutral-400 mt-1 max-w-xs">
          享受当下的从容，或在上方快速录入新想法。按 <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-mono">⌘K</kbd> 随时呼出录入框。
        </p>
      </div>
    </main>
  </div>
</template>
