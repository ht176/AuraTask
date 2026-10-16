<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Maximize2,
  Plus,
  Check,
  Sparkles,
  Flame,
  Minus,
  X,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { isDesktopApp, exitMiniMode, minimizeWindow, closeWindow } from '../services/desktop'

const taskStore = useTaskStore()
const quickText = ref('')
const isDesktop = ref(isDesktopApp())

const pendingTasks = computed(() => {
  return taskStore.tasks.filter(t => !t.completed).slice(0, 15)
})

async function handleRestore() {
  taskStore.isMiniMode = false
  if (isDesktop.value) {
    await exitMiniMode()
  }
}

async function handleAdd() {
  if (!quickText.value.trim()) return
  await taskStore.createTaskFromNLP(quickText.value.trim(), 'inbox')
  quickText.value = ''
}
</script>

<template>
  <div class="w-full h-full flex flex-col glass-panel border border-white/10 select-none overflow-hidden text-neutral-100 rounded-2xl shadow-2xl backdrop-blur-2xl">
    <!-- 顶部拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="h-9 px-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02] cursor-grab active:cursor-grabbing shrink-0"
    >
      <div class="flex items-center gap-2 pointer-events-none">
        <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
        <span class="text-xs font-bold text-white tracking-tight">便签浮窗</span>
        <span class="text-[10px] text-neutral-400 font-mono">
          ({{ pendingTasks.length }})
        </span>
      </div>

      <!-- 右侧控制按钮 -->
      <div class="flex items-center gap-1">
        <!-- 还原至主窗口 -->
        <button
          class="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="展开还原为主界面"
          @click="handleRestore"
        >
          <Maximize2 class="w-3.5 h-3.5" />
        </button>

        <template v-if="isDesktop">
          <button
            class="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="最小化"
            @click="minimizeWindow"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-rose-600 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="隐藏到托盘"
            @click="closeWindow"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </template>
      </div>
    </div>

    <!-- 极速快捷录入 -->
    <div class="p-2 border-b border-white/5 shrink-0">
      <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/5">
        <Plus class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <input
          v-model="quickText"
          type="text"
          placeholder="快速随记 (按回车保存)..."
          class="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
          @keyup.enter="handleAdd"
        />
      </div>
    </div>

    <!-- 待办清单滚动区域 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
      <div
        v-for="task in pendingTasks"
        :key="task.id"
        class="group flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-all text-xs"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <button
            class="w-4 h-4 rounded-full border border-neutral-500 hover:border-emerald-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            @click="taskStore.toggleTask(task.id)"
          >
            <Check v-if="task.completed" class="w-3 h-3 text-emerald-400" />
          </button>
          <span class="truncate text-neutral-200 group-hover:text-white">
            {{ task.title }}
          </span>
        </div>

        <Flame
          v-if="task.priority === 1"
          class="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1.5"
        />
      </div>

      <div
        v-if="pendingTasks.length === 0"
        class="py-12 flex flex-col items-center justify-center text-center text-neutral-500 text-xs"
      >
        <Sparkles class="w-5 h-5 text-indigo-400 mb-1" />
        <span>所有事项已划掉！</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="px-3 py-1.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] text-neutral-500 shrink-0">
      <span>置顶屏幕角落 · 随时随记</span>
      <button class="hover:text-indigo-400 cursor-pointer" @click="handleRestore">
        完整版视图 →
      </button>
    </div>
  </div>
</template>
