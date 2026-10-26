<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, Square, Copy, X, PanelTopClose, PanelTopOpen } from 'lucide-vue-next'
import { isDesktopApp, minimizeWindow, toggleMaximizeWindow, closeWindow, isWindowMaximized, enterMiniMode, exitMiniMode } from '../services/desktop'
import { useTaskStore } from '../stores/task'

const taskStore = useTaskStore()
const isDesktop = ref(isDesktopApp())
const isMaximized = ref(false)

async function checkMaximized() {
  if (isDesktop.value) {
    isMaximized.value = await isWindowMaximized()
  }
}

async function handleToggleMaximize() {
  await toggleMaximizeWindow()
  await checkMaximized()
}

async function handleToggleMini() {
  taskStore.isQuickAddOpen = false
  taskStore.isMiniMode = !taskStore.isMiniMode
  if (isDesktop.value) {
    if (taskStore.isMiniMode) {
      await enterMiniMode()
    } else {
      await exitMiniMode()
    }
  }
}

onMounted(() => {
  checkMaximized()
  window.addEventListener('resize', checkMaximized)
})
</script>

<template>
  <div class="flex items-center h-9 z-50 select-none text-neutral-400">
    <!-- 桌面悬浮迷你便签切换按钮 -->
    <button
      class="px-2.5 h-7 mr-2 rounded-lg flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
      :title="taskStore.isMiniMode ? '展开为主界面' : '进入桌面便签迷你浮窗模式'"
      @click="handleToggleMini"
    >
      <PanelTopClose v-if="!taskStore.isMiniMode" class="w-3.5 h-3.5 text-indigo-400" />
      <PanelTopOpen v-else class="w-3.5 h-3.5 text-emerald-400" />
      <span class="hidden sm:inline font-medium">{{ taskStore.isMiniMode ? '主窗口' : '迷你便签' }}</span>
    </button>

    <!-- 原生窗口控件 (仅在桌面端显示) -->
    <div v-if="isDesktop" class="flex items-center">
      <button
        class="w-10 h-9 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        title="最小化"
        @click="minimizeWindow"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        class="w-10 h-9 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        :title="isMaximized ? '向下还原' : '最大化'"
        @click="handleToggleMaximize"
      >
        <Copy v-if="isMaximized" class="w-3 h-3 rotate-180" />
        <Square v-else class="w-3 h-3" />
      </button>
      <button
        class="w-10 h-9 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
        title="关闭窗口"
        @click="closeWindow"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
