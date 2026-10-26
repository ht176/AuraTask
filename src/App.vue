<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import DesktopSidebar from './components/DesktopSidebar.vue'
import TaskListView from './components/TaskListView.vue'
import EisenhowerMatrix from './components/EisenhowerMatrix.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import CompletedArchiveView from './components/CompletedArchiveView.vue'
import TaskDetailDrawer from './components/TaskDetailDrawer.vue'
import QuickAddModal from './components/QuickAddModal.vue'
import PomodoroModal from './components/PomodoroModal.vue'
import MiniTodoWindow from './components/MiniTodoWindow.vue'
import WindowControls from './components/WindowControls.vue'
import UnifiedSettingsModal from './components/UnifiedSettingsModal.vue'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal.vue'
import UpdateModal from './components/UpdateModal.vue'
import UserGuideModal from './components/UserGuideModal.vue'
import { shortcutService } from './services/shortcut'
import { updaterService } from './services/updater'
import { themeService } from './services/theme'
import { tagService } from './services/tags'
import { reminderService } from './services/reminder'
import { isDesktopApp } from './services/desktop'
import { useTaskStore } from './stores/task'
import { usePomodoroStore } from './stores/pomodoro'
import { useServerStore } from './stores/server'
import { Search } from 'lucide-vue-next'

const isDesktop = ref(isDesktopApp())
const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()
const serverStore = useServerStore()

function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

  // 1. 极速录入待办 (默认 Ctrl+Alt+K，支持自定义绑定，兼容 Cmd/Ctrl+K)
  if (shortcutService.matches(e, 'quickAdd') || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault()
    taskStore.isQuickAddOpen = !taskStore.isQuickAddOpen
    return
  }

  // 2. 切换迷你桌面便签 (默认 Ctrl+Alt+M)
  if (shortcutService.matches(e, 'toggleMini')) {
    e.preventDefault()
    taskStore.toggleMiniMode()
    return
  }

  // 3. 随时唤起番茄钟 (默认 Ctrl+Alt+P)
  if (shortcutService.matches(e, 'togglePomodoro') || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p')) {
    e.preventDefault()
    taskStore.isPomodoroOpen = !taskStore.isPomodoroOpen
    return
  }

  // 4. 快捷键快速打开操作手册指南 (默认 Ctrl+Alt+H，同时保留单键 F1)
  if (e.key === 'F1' || shortcutService.matches(e, 'userGuide')) {
    e.preventDefault()
    taskStore.isUserGuideOpen = !taskStore.isUserGuideOpen
    return
  }

  // 5. 唤起快捷键速查面板 (默认 Ctrl+Alt+/，兼容 ⌘/Ctrl+/)
  if (shortcutService.matches(e, 'shortcutsPanel') || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
    e.preventDefault()
    taskStore.isShortcutsOpen = !taskStore.isShortcutsOpen
    return
  }

  // Esc 键关闭所有弹窗/抽屉
  if (e.key === 'Escape') {
    if (taskStore.isUserGuideOpen) {
      taskStore.isUserGuideOpen = false
      return
    }
    if (taskStore.isShortcutsOpen) {
      taskStore.isShortcutsOpen = false
      return
    }
    if (taskStore.isQuickAddOpen) {
      taskStore.isQuickAddOpen = false
      return
    }
    if (taskStore.isPomodoroOpen) {
      taskStore.isPomodoroOpen = false
      return
    }
    if (serverStore.isSettingsOpen) {
      serverStore.isSettingsOpen = false
      return
    }
    if (taskStore.selectedTaskId) {
      taskStore.selectedTaskId = null
      return
    }
  }

  if (isInput) return

  // 非输入状态下按 n 快捷唤起新建待办
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault()
    taskStore.isQuickAddOpen = true
    return
  }

  // 快捷键视图切换: 1~6
  if (!e.metaKey && !e.ctrlKey) {
    if (e.key === '1') taskStore.activeView = 'today'
    if (e.key === '2') taskStore.activeView = 'inbox'
    if (e.key === '3') taskStore.activeView = 'upcoming'
    if (e.key === '4') taskStore.activeView = 'matrix'
    if (e.key === '5') taskStore.activeView = 'kanban'
    if (e.key === '6') taskStore.activeView = 'completed'
  }
}

onMounted(async () => {
  themeService.init()
  tagService.init()
  serverStore.loadConfig()
  taskStore.init()
  reminderService.init()
  window.addEventListener('keydown', handleKeyDown)

  // 注册全局系统热键与系统托盘菜单动作响应
  await shortcutService.registerAll({
    onQuickAdd: () => {
      if (taskStore.isMiniMode) {
        // 在迷你便签模式下，严格保持模式一致性，不弹常规界面的 QuickAddModal，直接聚焦便签输入框
        taskStore.isQuickAddOpen = false
        taskStore.focusMiniInputTrigger++
      } else {
        taskStore.isQuickAddOpen = true
      }
      if (typeof window !== 'undefined') {
        window.focus()
      }
    },
    onToggleWindow: () => {},
    onToggleMini: () => {
      taskStore.isQuickAddOpen = false
      taskStore.toggleMiniMode()
    },
    onTogglePomodoro: () => {
      taskStore.isPomodoroOpen = !taskStore.isPomodoroOpen
    },
  })

  // 应用启动后延迟 3 秒在后台静默检测是否有新版本
  setTimeout(() => {
    updaterService.checkForUpdates(true)
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  shortcutService.unregisterAll()
  reminderService.stopPolling()
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden app-container flex flex-col font-sans select-none">
    <!-- 迷你桌面便签浮窗视图 -->
    <template v-if="taskStore.isMiniMode">
      <div v-if="!isDesktop" class="w-full h-full flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
        <div class="w-[250px] h-[320px] shadow-2xl relative rounded-2xl overflow-hidden">
          <MiniTodoWindow />
        </div>
      </div>
      <MiniTodoWindow v-else />
    </template>

    <!-- 完整主界面视图 -->
    <template v-else>
      <!-- 顶部自定义无边框拖拽栏 -->
      <header
        data-tauri-drag-region
        class="h-10 px-3 theme-header border-b flex items-center justify-between select-none shrink-0 z-30"
      >
        <!-- 左侧窗口拖拽感知区 -->
        <div data-tauri-drag-region class="flex items-center gap-3">
          <span class="text-xs font-semibold text-neutral-400 pointer-events-none tracking-wider">
            AuraTask
          </span>
        </div>

        <!-- 中部快速全局搜索框 -->
        <div class="flex-1 max-w-sm mx-4">
          <div class="relative flex items-center">
            <Search class="absolute left-2.5 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
            <input
              v-model="taskStore.searchQuery"
              type="text"
              placeholder="搜索待办任务或标签 (快捷键 1~5 切换视图)..."
              class="w-full h-7 pl-8 pr-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
            />
          </div>
        </div>

        <!-- 右侧无边框窗口控件及便签切换按钮 -->
        <WindowControls />
      </header>

      <!-- 下部主工作区 (侧边栏 + 主内容 + 详情抽屉) -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- 左侧可导航栏 -->
        <DesktopSidebar />

        <!-- 中间内容视图切换 -->
        <div class="flex-1 flex overflow-hidden relative">
          <Transition name="view-fade" mode="out-in">
            <EisenhowerMatrix v-if="taskStore.activeView === 'matrix'" key="matrix" />
            <KanbanBoard v-else-if="taskStore.activeView === 'kanban'" key="kanban" />
            <CompletedArchiveView v-else-if="taskStore.activeView === 'completed'" key="completed" />
            <TaskListView v-else key="list" />
          </Transition>
        </div>

        <!-- 右侧任务详情与子任务清单抽屉 -->
        <TaskDetailDrawer />
      </div>

      <!-- Spotlight 极速录入弹窗 -->
      <QuickAddModal />

      <!-- 番茄专注钟弹窗 -->
      <PomodoroModal />

      <!-- 控制中心与统一偏好设置弹窗 (数据同步/主题外观/标签库/快捷键/备份) -->
      <UnifiedSettingsModal />

      <!-- 键盘快捷键与全局热键速查弹窗 -->
      <KeyboardShortcutsModal />

      <!-- 自动更新弹窗 -->
      <UpdateModal />

      <!-- 使用手册与操作指南弹窗 -->
      <UserGuideModal />
    </template>
  </div>
</template>
