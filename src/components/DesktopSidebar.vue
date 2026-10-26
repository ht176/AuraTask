<script setup lang="ts">
import { ref, computed } from 'vue'
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
  Keyboard,
  BookOpen,
  Settings,
  X,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { usePomodoroStore } from '../stores/pomodoro'
import { useServerStore } from '../stores/server'
import { api } from '../services/api'
import { updaterService, hasUpdate, isChecking } from '../services/updater'
import { tagService, customTags } from '../services/tags'
import { shortcutService } from '../services/shortcut'
import type { ActiveNavView } from '../types/todo'

const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()
const serverStore = useServerStore()

const quickAddShortcutBadge = computed(() => {
  const k = shortcutService.getConfig().shortcuts.quickAdd
  return k || 'Ctrl+Alt+K'
})

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

async function handleDeleteTagFromSidebar(tagName: string) {
  const count = taskStore.tasks.filter(t => Array.isArray(t.tags) && t.tags.includes(tagName)).length
  let msg = `确定要清理标签「#${tagName}」吗？`
  if (count > 0) {
    msg += `\n此操作将同时从 ${count} 条待办任务中移除该标签。`
  }
  if (confirm(msg)) {
    const libTag = customTags.value.find(t => t.name.toLowerCase() === tagName.toLowerCase())
    if (libTag) {
      tagService.deleteTag(libTag.id)
    }
    await taskStore.deleteTagAcrossTasks(tagName)
  }
}

function handleExportBackup() {
  api.exportBackup()
}

function triggerImport() {
  fileInput.value?.click()
}

function handleCheckUpdate() {
  updaterService.checkForUpdates(false)
}

const displayTags = computed(() => {
  const map = new Map<string, { name: string; color: string; bgColor: string }>()
  customTags.value.forEach(t => {
    map.set(t.name.toLowerCase(), { name: t.name, color: t.color, bgColor: t.bgColor })
  })
  taskStore.allTags.forEach(tagName => {
    if (!map.has(tagName.toLowerCase())) {
      const info = tagService.getTagInfo(tagName)
      map.set(tagName.toLowerCase(), info)
    }
  })
  return Array.from(map.values())
})

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
  <aside class="w-60 h-full flex flex-col theme-sidebar border-r select-none shrink-0 backdrop-blur-xl">
    <!-- 头部品牌 -->
    <div class="px-4 py-3.5 flex items-center justify-between border-b border-white/5">
      <div class="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="AuraTask" class="w-7 h-7 rounded-xl object-contain shadow-xs" />
        <span class="text-sm font-semibold tracking-tight text-white">AuraTask</span>
      </div>
    </div>

    <!-- 极速录入快捷按钮 -->
    <div class="px-3 pt-3 pb-1">
      <button
        class="w-full h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-between px-3 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        @click="taskStore.isQuickAddOpen = true"
      >
        <span class="flex items-center gap-2">
          <Plus class="w-3.5 h-3.5" />
          <span>新建待办</span>
        </span>
        <kbd class="px-1.5 py-0.5 rounded text-[10px] bg-black/20 text-indigo-100 font-mono">{{ quickAddShortcutBadge }}</kbd>
      </button>
    </div>

    <!-- 导航菜单项 -->
    <div class="flex-1 overflow-y-auto px-2 space-y-5 py-2">
      <!-- 核心视图 -->
      <div class="space-y-0.5">
        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'today' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('today')"
        >
          <div class="flex items-center gap-2.5">
            <Sun class="w-4 h-4 text-amber-400 shrink-0" />
            <span>我的一天</span>
          </div>
          <span v-if="taskStore.todayProgress.total > 0" class="text-[11px] px-1.5 py-0.2 rounded-full bg-white/5 text-neutral-400 font-mono">
            {{ taskStore.todayProgress.completed }}/{{ taskStore.todayProgress.total }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'inbox' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('inbox')"
        >
          <div class="flex items-center gap-2.5">
            <Inbox class="w-4 h-4 text-sky-400 shrink-0" />
            <span>收集箱</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.2 rounded-full bg-white/5 text-neutral-400 font-mono">
            {{ taskStore.tasks.filter(t => !t.completed && t.category_id === 'inbox').length }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'upcoming' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('upcoming')"
        >
          <div class="flex items-center gap-2.5">
            <Calendar class="w-4 h-4 text-violet-400 shrink-0" />
            <span>近期安排</span>
          </div>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'matrix' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('matrix')"
        >
          <div class="flex items-center gap-2.5">
            <Grid2x2 class="w-4 h-4 text-rose-400 shrink-0" />
            <span>四象限分析</span>
          </div>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'kanban' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('kanban')"
        >
          <div class="flex items-center gap-2.5">
            <Kanban class="w-4 h-4 text-emerald-400 shrink-0" />
            <span>看板工作流</span>
          </div>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'all' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('all')"
        >
          <div class="flex items-center gap-2.5">
            <ListTodo class="w-4 h-4 text-neutral-400 shrink-0" />
            <span>全部待办</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.2 rounded-full bg-white/5 text-neutral-400 font-mono">
            {{ taskStore.tasks.filter(t => !t.completed).length }}
          </span>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
          :class="taskStore.activeView === 'completed' ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
          @click="setView('completed')"
        >
          <div class="flex items-center gap-2.5">
            <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
            <span>已完成归档</span>
          </div>
          <span class="text-[11px] px-1.5 py-0.2 rounded-full bg-white/5 text-neutral-400 font-mono">
            {{ taskStore.stats?.totalCompleted || 0 }}
          </span>
        </button>
      </div>

      <!-- 分类清单列表 -->
      <div class="space-y-1">
        <div class="flex items-center justify-between px-2.5 text-[11px] font-medium text-neutral-400">
          <span>清单分类</span>
          <button
            class="p-1 hover:text-white transition-colors cursor-pointer"
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
            class="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
            :class="taskStore.activeView === cat.id ? 'bg-white/10 text-white font-medium' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'"
            @click="setView(cat.id)"
          >
            <div class="flex items-center gap-2.5 truncate">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: cat.color || '#6366f1' }"></span>
              <span class="truncate">{{ cat.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[11px] text-neutral-500 font-mono">{{ cat.uncompleted_count || 0 }}</span>
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

      <!-- 标签筛选云 (支持自定义标签与色彩) -->
      <div v-if="displayTags.length > 0" class="space-y-1.5">
        <div class="px-2.5 text-[11px] font-medium text-neutral-400 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Tag class="w-3 h-3 text-neutral-400" />
            <span>分类标签</span>
          </div>
          <button
            @click="serverStore.openSettings('tags')"
            class="p-0.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="管理自定义标签库 (重命名/调色/收录)"
          >
            <Settings class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5 px-2">
          <div
            v-for="tg in displayTags"
            :key="tg.name"
            class="group/tag inline-flex items-center rounded-md border text-[11px] font-mono transition-all overflow-hidden"
            :style="{
              borderColor: taskStore.activeTag === tg.name ? tg.color : 'rgba(255, 255, 255, 0.08)',
              backgroundColor: taskStore.activeTag === tg.name ? tg.bgColor : 'rgba(255, 255, 255, 0.02)',
              color: taskStore.activeTag === tg.name ? tg.color : 'inherit',
              opacity: taskStore.activeTag === tg.name ? 1 : 0.8
            }"
          >
            <button
              class="px-2 py-0.5 flex items-center gap-1 cursor-pointer"
              @click="taskStore.activeTag = taskStore.activeTag === tg.name ? null : tg.name"
              :title="`筛选 #${tg.name}`"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: tg.color }"></span>
              <span>#{{ tg.name }}</span>
            </button>
            <button
              @click.stop="handleDeleteTagFromSidebar(tg.name)"
              class="hidden group-hover/tag:flex items-center justify-center pr-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
              title="从标签库及任务中移除此标签"
            >
              <X class="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部功能区域：番茄钟概览与极简设置栏 -->
    <div class="p-3 border-t border-white/5 space-y-2">
      <!-- 番茄专注卡片 (克制优雅的微暗调，去除不必要的持续动画) -->
      <div
        class="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors cursor-pointer flex items-center justify-between"
        @click="taskStore.isPomodoroOpen = true"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-6.5 h-6.5 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
            <Timer class="w-3.5 h-3.5" />
          </div>
          <div>
            <div class="text-xs font-medium text-white">番茄专注</div>
            <div class="text-[10px] text-neutral-400 font-mono">
              今日: {{ taskStore.stats?.todayPomodoros || 0 }} 番茄 ({{ taskStore.stats?.todayFocusMinutes || 0 }}m)
            </div>
          </div>
        </div>
        <span class="text-xs font-mono text-neutral-300 font-medium">
          {{ pomodoroStore.formattedTime }}
        </span>
      </div>

      <!-- 极简底部：仅保留版本号状态与设置入口，彻底告别拥挤与换行变形 -->
      <div class="pt-1 flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5">
          <span class="font-mono text-[11px] text-neutral-400">v1.0.7</span>

          <!-- 状态徽标 -->
          <span
            v-if="hasUpdate"
            class="px-1.5 py-0.5 rounded-md text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
            @click="serverStore.isSettingsOpen = true"
            title="发现新版本，点击打开控制中心更新"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            更新
          </span>
          <span
            v-else-if="serverStore.isStandalone"
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-300 flex items-center gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            单机
          </span>
          <span
            v-else
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-500/10 text-indigo-300 flex items-center gap-1 truncate max-w-[80px]"
            :title="serverStore.activeServer?.name"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            {{ serverStore.activeServer?.name }}
          </span>
        </div>

        <!-- 统一设置入口按钮 -->
        <button
          @click="serverStore.isSettingsOpen = true"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 hover:border-white/10 transition-all cursor-pointer text-xs"
          title="打开控制中心与偏好设置"
        >
          <Settings class="w-3.5 h-3.5 text-indigo-400" />
          <span>设置</span>
        </button>
      </div>
    </div>
  </aside>
</template>
