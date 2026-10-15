<script setup lang="ts">
import { ref } from 'vue'
import {
  Sun,
  Inbox,
  Calendar,
  Grid2x2,
  Kanban,
  CheckCircle2,
  ListTodo,
  Plus,
  Tag,
  Timer,
  FolderPlus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Server,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { usePomodoroStore } from '../stores/pomodoro'
import { useServerStore } from '../stores/server'
import { api } from '../services/api'
import type { ActiveNavView } from '../types/todo'

const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()
const serverStore = useServerStore()

const showAddCategory = ref(false)
const newCatName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function setView(view: ActiveNavView) {
  taskStore.activeView = view
  taskStore.activeTag = null
}

function handleAddCategory() {
  if (!newCatName.value.trim()) return
  taskStore.createCategory(newCatName.value.trim())
  newCatName.value = ''
  showAddCategory.value = false
}

function handleExportBackup() {
  api.exportBackup()
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const count = await api.importBackup(json)
    alert(`成功恢复导入 ${count} 条待办任务！`)
    await taskStore.init()
  } catch (err: any) {
    alert('导入失败，请检查备份文件格式：' + err.message)
  }
}
</script>

<template>
  <aside class="w-64 h-full flex flex-col bg-[#0f111a]/90 border-r border-white/5 select-none shrink-0 backdrop-blur-xl">
    <!-- 头部品牌 -->
    <div class="p-4 pb-2 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="AuraTask" class="w-8 h-8 rounded-xl shadow-lg shadow-indigo-500/20 object-contain hover:scale-105 transition-transform" />
        <div>
          <h1 class="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            AuraTask
            <span class="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-normal">v1.0</span>
          </h1>
          <p class="text-[11px] text-neutral-400">极简高效待办工作流</p>
        </div>
      </div>
    </div>

    <!-- 极速录入快捷按钮 -->
    <div class="px-3 py-2">
      <button
        class="w-full h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
        @click="taskStore.isQuickAddOpen = true"
      >
        <Plus class="w-4 h-4" />
        <span>新建待办任务</span>
        <kbd class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-black/20 text-indigo-100 font-mono">⌘K</kbd>
      </button>
    </div>

    <!-- 导航菜单项 -->
    <div class="flex-1 overflow-y-auto px-2 space-y-6 py-2">
      <!-- 核心视图 -->
      <div class="space-y-0.5">
        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'today' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('today')"
        >
          <div class="flex items-center gap-2.5">
            <Sun class="w-4 h-4 text-amber-400" />
            <span>我的一天</span>
          </div>
          <span v-if="taskStore.todayProgress.total > 0" class="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400">
            {{ taskStore.todayProgress.completed }}/{{ taskStore.todayProgress.total }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'inbox' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('inbox')"
        >
          <div class="flex items-center gap-2.5">
            <Inbox class="w-4 h-4 text-blue-400" />
            <span>收集箱</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400">
            {{ taskStore.tasks.filter(t => !t.completed && t.category_id === 'inbox').length }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'upcoming' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('upcoming')"
        >
          <div class="flex items-center gap-2.5">
            <Calendar class="w-4 h-4 text-violet-400" />
            <span>近期安排</span>
          </div>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'matrix' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('matrix')"
        >
          <div class="flex items-center gap-2.5">
            <Grid2x2 class="w-4 h-4 text-rose-400" />
            <span>四象限分析</span>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">矩阵</span>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'kanban' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('kanban')"
        >
          <div class="flex items-center gap-2.5">
            <Kanban class="w-4 h-4 text-emerald-400" />
            <span>看板工作流</span>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">看板</span>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'all' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('all')"
        >
          <div class="flex items-center gap-2.5">
            <ListTodo class="w-4 h-4 text-neutral-400" />
            <span>全部待办</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400">
            {{ taskStore.tasks.filter(t => !t.completed).length }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          :class="taskStore.activeView === 'completed' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
          @click="setView('completed')"
        >
          <div class="flex items-center gap-2.5">
            <CheckCircle2 class="w-4 h-4 text-emerald-500" />
            <span>已完成归档</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400">
            {{ taskStore.tasks.filter(t => t.completed).length }}
          </span>
        </button>
      </div>

      <!-- 分类清单列表 -->
      <div class="space-y-1">
        <div class="flex items-center justify-between px-3 text-[11px] font-semibold text-neutral-500 tracking-wider uppercase">
          <span>分类清单</span>
          <button
            class="p-1 hover:text-neutral-200 transition-colors cursor-pointer"
            title="添加分类"
            @click="showAddCategory = !showAddCategory"
          >
            <FolderPlus class="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-if="showAddCategory" class="px-2 py-1 flex items-center gap-1.5">
          <input
            v-model="newCatName"
            type="text"
            placeholder="输入分类名称..."
            class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            @keyup.enter="handleAddCategory"
          />
          <button
            class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs cursor-pointer"
            @click="handleAddCategory"
          >
            确定
          </button>
        </div>

        <div class="space-y-0.5">
          <div
            v-for="cat in taskStore.categories"
            :key="cat.id"
            class="group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            :class="taskStore.activeView === cat.id ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'"
            @click="setView(cat.id)"
          >
            <div class="flex items-center gap-2.5 truncate">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color || '#6366f1' }"></span>
              <span class="truncate">{{ cat.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[11px] text-neutral-500">{{ cat.uncompleted_count || 0 }}</span>
              <button
                v-if="cat.id !== 'inbox'"
                class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-opacity cursor-pointer"
                title="删除分类"
                @click.stop="taskStore.deleteCategory(cat.id)"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签筛选云 -->
      <div v-if="taskStore.allTags.length > 0" class="space-y-2">
        <div class="px-3 text-[11px] font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-1">
          <Tag class="w-3 h-3" />
          <span>标签筛选</span>
        </div>
        <div class="flex flex-wrap gap-1 px-2.5">
          <button
            v-for="tag in taskStore.allTags"
            :key="tag"
            class="px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer border"
            :class="taskStore.activeTag === tag
              ? 'bg-indigo-500/25 border-indigo-500/40 text-indigo-200'
              : 'bg-white/5 border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/10'"
            @click="taskStore.activeTag = taskStore.activeTag === tag ? null : tag"
          >
            #{{ tag }}
          </button>
        </div>
      </div>
    </div>

    <!-- 底部功能区域：番茄钟概览与备份 -->
    <div class="p-3 border-t border-white/5 space-y-2.5">
      <!-- 番茄专注卡片 -->
      <div
        class="p-2.5 rounded-xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between"
        @click="taskStore.isPomodoroOpen = true"
      >
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Timer class="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div class="text-xs font-semibold text-white">番茄专注钟</div>
            <div class="text-[10px] text-neutral-400">
              今日: {{ taskStore.stats?.todayPomodoros || 0 }} 番茄 ({{ taskStore.stats?.todayFocusMinutes || 0 }}分钟)
            </div>
          </div>
        </div>
        <span class="text-xs font-mono text-indigo-300 font-medium">
          {{ pomodoroStore.formattedTime }}
        </span>
      </div>

      <!-- 数据备份与恢复 及 服务器配置 -->
      <div class="flex items-center justify-between text-neutral-400 text-[11px] px-1 pt-1">
        <button
          class="flex items-center gap-1.5 transition-colors cursor-pointer group text-[11px]"
          :class="serverStore.isStandalone ? 'text-emerald-400/90 hover:text-emerald-300' : 'text-neutral-400 hover:text-white'"
          :title="serverStore.isStandalone ? '当前处于本地单机模式 (零依赖·无须服务)，点击可配置 NAS 云端同步' : '已连接远程 NAS，点击管理节点'"
          @click="serverStore.isSettingsOpen = true"
        >
          <span
            class="w-2 h-2 rounded-full transition-all shrink-0"
            :class="serverStore.isStandalone ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : (serverStore.isConnected ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50' : 'bg-rose-400 animate-pulse')"
          ></span>
          <span class="group-hover:text-white transition-colors truncate max-w-[85px]">
            {{ serverStore.isStandalone ? '单机模式' : (serverStore.activeServer?.name || 'NAS 节点') }}
          </span>
        </button>

        <div class="flex items-center gap-2.5">
          <button
            class="flex items-center gap-1 hover:text-neutral-200 transition-colors cursor-pointer"
            title="导出备份 JSON"
            @click="handleExportBackup"
          >
            <Download class="w-3 h-3" />
            <span>导出</span>
          </button>

          <button
            class="flex items-center gap-1 hover:text-neutral-200 transition-colors cursor-pointer"
            title="恢复备份 JSON"
            @click="triggerImport"
          >
            <Upload class="w-3 h-3" />
            <span>恢复</span>
          </button>
        </div>
        <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileImport" />
      </div>
    </div>
  </aside>
</template>
