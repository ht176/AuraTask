<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  Sparkles,
  Calendar,
  Flag,
  Tag,
  Timer,
  Folder,
  X,
  Plus,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { parseNaturalLanguage } from '../services/nlp'

const taskStore = useTaskStore()
const inputRef = ref<HTMLInputElement | null>(null)
const text = ref('')
const selectedCategoryId = ref('inbox')

const parsed = computed(() => {
  if (!text.value.trim()) return null
  return parseNaturalLanguage(text.value)
})

function focusInputField() {
  if (inputRef.value) {
    inputRef.value.focus()
    inputRef.value.select()
  }
}

watch(
  () => taskStore.isQuickAddOpen,
  async (isOpen) => {
    if (isOpen) {
      text.value = ''
      selectedCategoryId.value = ['today', 'upcoming', 'all', 'completed', 'matrix', 'kanban'].includes(taskStore.activeView)
        ? 'inbox'
        : taskStore.activeView

      await nextTick()
      focusInputField()

      // 多阶段微延迟，确保系统原生激活窗口、动画展开以及按键冒泡完全结束后聚焦
      requestAnimationFrame(() => focusInputField())
      setTimeout(focusInputField, 30)
      setTimeout(focusInputField, 80)
      setTimeout(focusInputField, 160)
      setTimeout(focusInputField, 300)
    }
  },
  { flush: 'post' }
)

// 当窗口从后台被重新激活时，若弹窗处于开启状态则自动重新聚拢焦点
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (taskStore.isQuickAddOpen) {
      focusInputField()
    }
  })
}

async function handleSave() {
  if (!text.value.trim()) return
  await taskStore.createTaskFromNLP(text.value, selectedCategoryId.value)
  taskStore.isQuickAddOpen = false
  text.value = ''
}

function handleClose() {
  taskStore.isQuickAddOpen = false
}
</script>

<template>
  <div
    v-if="taskStore.isQuickAddOpen"
    class="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200"
    @click.self="handleClose"
    @keydown.esc="handleClose"
  >
    <div class="w-full max-w-xl mx-4 rounded-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden scale-100 transition-all">
      <!-- 弹窗顶栏 -->
      <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs text-neutral-400">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles class="w-3 h-3" />
          </div>
          <span class="font-medium text-neutral-300">极速待办录入 (Spotlight 智能模式)</span>
        </div>
        <button class="p-1 hover:text-white transition-colors cursor-pointer" @click="handleClose">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 输入主体 -->
      <div class="p-4 space-y-3">
        <input
          ref="inputRef"
          v-model="text"
          type="text"
          autofocus
          placeholder="输入待办... 如: 明天下午3点 提交技术方案 !高 #工作 *3"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 transition-all"
          @keyup.enter="handleSave"
        />

        <!-- 语义高亮解析胶囊预览 -->
        <div v-if="parsed && (parsed.priority !== 3 || parsed.due_date || parsed.tags.length > 0 || parsed.estimated_pomodoros > 1)" class="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div class="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
            <span>智能提取任务属性：</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <!-- 纯净标题 -->
            <span class="px-2 py-0.5 rounded-md bg-white/10 text-neutral-200 text-xs">
              任务: {{ parsed.title }}
            </span>

            <!-- 优先级 -->
            <span v-if="parsed.priority !== 3" class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-xs flex items-center gap-1">
              <Flag class="w-3 h-3" />
              P{{ parsed.priority }}
            </span>

            <!-- 截止时间 -->
            <span v-if="parsed.due_date" class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 font-mono">
              <Calendar class="w-3 h-3" />
              {{ parsed.due_date }}
            </span>

            <!-- 标签 -->
            <span v-for="tag in parsed.tags" :key="tag" class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs flex items-center gap-1">
              <Tag class="w-3 h-3" />
              #{{ tag }}
            </span>

            <!-- 番茄钟 -->
            <span v-if="parsed.estimated_pomodoros > 1" class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs flex items-center gap-1">
              <Timer class="w-3 h-3" />
              {{ parsed.estimated_pomodoros }} 个番茄
            </span>
          </div>
        </div>

        <!-- 归类所属清单选择 -->
        <div class="flex items-center justify-between text-xs pt-1">
          <div class="flex items-center gap-2 text-neutral-400">
            <Folder class="w-3.5 h-3.5" />
            <span>存入清单:</span>
            <select
              v-model="selectedCategoryId"
              class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none"
            >
              <option
                v-for="cat in taskStore.categories"
                :key="cat.id"
                :value="cat.id"
                class="bg-neutral-900 text-white"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- 保存按钮 -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-neutral-500">按 Enter 保存</span>
            <button
              class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              :disabled="!text.trim()"
              @click="handleSave"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>保存待办</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
