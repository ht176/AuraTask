<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Settings,
  Server,
  Palette,
  Tag,
  Zap,
  Download,
  Upload,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Edit3,
  Wifi,
  WifiOff,
  UploadCloud,
  Check,
  RotateCcw,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
  HelpCircle,
  ArrowRight,
  Command,
  BellRing,
} from 'lucide-vue-next'
import { useServerStore, type ServerConfig } from '../stores/server'
import { useTaskStore } from '../stores/task'
import { reminderService } from '../services/reminder'
import { themeService, currentTheme, THEME_OPTIONS, type ThemeType } from '../services/theme'
import { tagService, customTags, TAG_COLOR_PALETTE, type CustomTag } from '../services/tags'
import { updaterService, hasUpdate, isChecking, isDownloading, downloadProgress, updateError, updateInfo } from '../services/updater'
import { api } from '../services/api'
import {
  shortcutService,
  SHORTCUT_DEFINITIONS,
  type ShortcutConfig,
  type ShortcutMap,
} from '../services/shortcut'
import { isDesktopApp, isAutostartEnabled, setAutostartEnabled } from '../services/desktop'

const serverStore = useServerStore()
const taskStore = useTaskStore()

type SettingsTab = 'server' | 'theme' | 'tags' | 'shortcuts' | 'backup' | 'about'
const activeTab = ref<SettingsTab>('server')

// 监听由外部侧边栏等呼出的指定选项卡
watch(
  () => serverStore.settingsInitialTab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab
    }
  },
  { immediate: true }
)

// 服务器配置相关状态
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('自建同步节点')
const formUrl = ref('https://todo.xiaoyunjia.site:6')
const formToken = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)
const syncMsg = ref<string | null>(null)

// 标签配置与编辑相关状态
const newTagName = ref('')
const selectedTagColor = ref(TAG_COLOR_PALETTE[0].color)
const editingTagId = ref<string | null>(null)
const editTagName = ref('')
const editTagColor = ref(TAG_COLOR_PALETTE[0].color)
const fileInput = ref<HTMLInputElement | null>(null)

// 快捷键配置与在线录制状态
const shortcutConfig = ref<ShortcutConfig>(shortcutService.getConfig())
const isDesktop = ref(isDesktopApp())
const isAutostart = ref(false)
const recordingShortcutId = ref<keyof ShortcutMap | null>(null)
const recordingShortcutPreview = ref('')
const shortcutSavedToast = ref(false)

async function checkAutostart() {
  if (isDesktop.value) {
    isAutostart.value = await isAutostartEnabled()
  }
}

async function handleToggleAutostart() {
  const next = !isAutostart.value
  isAutostart.value = await setAutostartEnabled(next)
}

function startRecordingShortcut(id: keyof ShortcutMap) {
  recordingShortcutId.value = id
  recordingShortcutPreview.value = '按下组合键...'
}

function cancelRecordingShortcut() {
  recordingShortcutId.value = null
  recordingShortcutPreview.value = ''
}

function handleResetShortcutDefaults() {
  shortcutConfig.value = shortcutService.resetToDefaults()
  recordingShortcutId.value = null
  recordingShortcutPreview.value = ''
  showShortcutSaved()
}

function handleToggleShortcutEnabled() {
  shortcutConfig.value.enabled = !shortcutConfig.value.enabled
  shortcutService.saveConfig(shortcutConfig.value)
  showShortcutSaved()
}

function showShortcutSaved() {
  shortcutSavedToast.value = true
  setTimeout(() => (shortcutSavedToast.value = false), 2000)
}

function handleTestAlarm() {
  handleClose()
  setTimeout(() => {
    reminderService.testAlarm()
  }, 250)
}

function onUnifiedModalKeyDown(e: KeyboardEvent) {
  if (!recordingShortcutId.value) return

  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
    cancelRecordingShortcut()
    return
  }

  const res = shortcutService.parseKeyEvent(e)
  if (!res) return

  if (res.isComplete) {
    shortcutService.updateShortcutKey(recordingShortcutId.value, res.shortcut)
    shortcutConfig.value = shortcutService.getConfig()
    recordingShortcutId.value = null
    recordingShortcutPreview.value = ''
    showShortcutSaved()
  } else {
    recordingShortcutPreview.value = `${res.shortcut} + ...`
  }
}

function formatKeyBadges(shortcutStr: string): string[] {
  return shortcutStr.split('+').map(k => k.trim())
}

onMounted(() => {
  serverStore.loadConfig()
  themeService.init()
  tagService.init()
  checkAutostart()
  window.addEventListener('keydown', onUnifiedModalKeyDown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onUnifiedModalKeyDown, true)
})

function handleClose() {
  cancelRecordingShortcut()
  serverStore.isSettingsOpen = false
}

// =================== 1. 数据同步与节点配置方法 ===================
function startAddServer() {
  isEditing.value = true
  editingId.value = null
  formName.value = '自建私有云节点'
  formUrl.value = 'https://todo.xiaoyunjia.site:6'
  formToken.value = ''
  testResult.value = null
}

function startEditServer(srv: ServerConfig) {
  isEditing.value = true
  editingId.value = srv.id
  formName.value = srv.name
  formUrl.value = srv.url
  formToken.value = srv.token || ''
  testResult.value = null
}

function cancelEditServer() {
  isEditing.value = false
  editingId.value = null
  testResult.value = null
}

async function handleTestConnection() {
  testResult.value = null
  const res = await serverStore.testConnection(formUrl.value, formToken.value)
  testResult.value = res
}

async function handleSaveServer() {
  if (!formUrl.value.trim()) return
  const id = editingId.value || ('srv_' + Date.now().toString(36))
  const cfg: ServerConfig = {
    id,
    name: formName.value.trim() || '远程数据节点',
    url: formUrl.value.trim(),
    token: formToken.value.trim() || undefined,
  }

  const ok = await serverStore.addOrUpdateServer(cfg)
  if (ok) {
    isEditing.value = false
    editingId.value = null
    testResult.value = null
    await taskStore.init()
  } else {
    alert('连接测试失败，请检查地址与端口！')
  }
}

async function handleSelectStandalone() {
  serverStore.setStandalone()
  await taskStore.init()
}

async function handleSwitchServer(id: string) {
  serverStore.activeServerId = id
  serverStore.saveConfig()
  await taskStore.init()
}

async function handleSyncToRemote() {
  syncMsg.value = null
  const res = await serverStore.syncLocalDataToRemote()
  if (res.success) {
    syncMsg.value = `✓ 成功将本地 ${res.count} 条待办同步至远程数据节点！`
    await taskStore.init()
  } else {
    syncMsg.value = `✗ 同步失败：${res.error}`
  }
  setTimeout(() => {
    syncMsg.value = null
  }, 4000)
}

// =================== 2. 主题管理方法 ===================
function selectTheme(themeId: ThemeType) {
  themeService.setTheme(themeId)
}

// =================== 3. 标签库管理与联动方法 ===================
function handleAddTag() {
  if (!newTagName.value.trim()) return
  tagService.addTag(newTagName.value.trim(), selectedTagColor.value)
  newTagName.value = ''
}

function startEditTag(tg: CustomTag) {
  editingTagId.value = tg.id
  editTagName.value = tg.name
  editTagColor.value = tg.color
}

function cancelEditTag() {
  editingTagId.value = null
}

async function handleSaveTagEdit() {
  if (!editingTagId.value || !editTagName.value.trim()) return
  const res = tagService.updateTag(editingTagId.value, editTagName.value.trim(), editTagColor.value)
  if (res.success && res.oldName && res.newName && res.oldName !== res.newName) {
    await taskStore.renameTagAcrossTasks(res.oldName, res.newName)
  }
  editingTagId.value = null
}

async function handleDeleteTagWithPrompt(tg: CustomTag) {
  const count = getTaskCountForTag(tg.name)
  let msg = `确定要从标签库中删除「#${tg.name}」吗？`
  if (count > 0) {
    msg += `\n检测到有 ${count} 条待办任务正在使用此标签。确认后将同时从所有待办任务中移除此标签。`
  }
  if (confirm(msg)) {
    tagService.deleteTag(tg.id)
    if (count > 0) {
      await taskStore.deleteTagAcrossTasks(tg.name)
    }
  }
}

// 扫描所有任务中已使用、但尚未收录在标签库中的散落标签
const orphanTags = computed(() => {
  const libSet = new Set(customTags.value.map(t => t.name.toLowerCase()))
  const orphans = new Set<string>()
  for (const t of taskStore.tasks) {
    if (Array.isArray(t.tags)) {
      for (const tag of t.tags) {
        if (tag && !libSet.has(tag.toLowerCase())) {
          orphans.add(tag)
        }
      }
    }
  }
  return Array.from(orphans)
})

function importOrphanTag(tagName: string) {
  tagService.addTag(tagName)
}

function importAllOrphanTags() {
  orphanTags.value.forEach(t => tagService.addTag(t))
}

function getTaskCountForTag(tagName: string): number {
  return taskStore.tasks.filter(t => Array.isArray(t.tags) && t.tags.includes(tagName)).length
}

// =================== 4. 备份管理方法 ===================
function handleExport() {
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

function handleOpenUserGuide() {
  handleClose()
  taskStore.isUserGuideOpen = true
}
</script>

<template>
  <div
    v-if="serverStore.isSettingsOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-3xl h-[620px] max-h-[90vh] glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-800 dark:text-neutral-200 border border-black/10 dark:border-white/10"
    >
      <!-- 弹窗顶栏 -->
      <div class="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-neutral-100/60 dark:bg-black/20">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Settings class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
              控制中心与偏好设置
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">管理主题风格、自定义标签、远程数据同步与数据灾备</p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 主体双栏区域 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左侧设置分类选项卡 -->
        <aside class="w-48 border-r border-black/5 dark:border-white/5 p-3 space-y-1 shrink-0 bg-neutral-50/80 dark:bg-black/30 overflow-y-auto text-xs">
          <button
            @click="activeTab = 'server'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'server' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Server class="w-4 h-4 shrink-0" />
            <span>数据同步与节点</span>
          </button>

          <button
            @click="activeTab = 'theme'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'theme' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Palette class="w-4 h-4 shrink-0" />
            <span>视觉主题外观</span>
          </button>

          <button
            @click="activeTab = 'tags'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'tags' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Tag class="w-4 h-4 shrink-0" />
            <span>自定义标签库</span>
          </button>

          <button
            @click="activeTab = 'shortcuts'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'shortcuts' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Zap class="w-4 h-4 shrink-0" />
            <span>快捷键与热键</span>
          </button>

          <button
            @click="activeTab = 'backup'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Download class="w-4 h-4 shrink-0" />
            <span>数据灾备与迁移</span>
          </button>

          <button
            @click="activeTab = 'about'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'about' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'"
          >
            <Sparkles class="w-4 h-4 shrink-0" />
            <span>软件版本与更新</span>
            <span v-if="hasUpdate" class="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-auto"></span>
          </button>
        </aside>

        <!-- 右侧主内容展示区 -->
        <main class="flex-1 overflow-y-auto p-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <!-- 1. 数据同步与远程节点配置 -->
          <section v-if="activeTab === 'server'" class="space-y-4">
            <div class="flex items-center justify-between pb-1">
              <div>
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Server class="w-4 h-4 text-indigo-500" />
                  工作模式与远程数据同步节点
                </h3>
                <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">切换单机离线存储或配置私有云/远程数据节点</p>
              </div>

              <button
                v-if="!isEditing"
                @click="startAddServer"
                class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>添加同步节点</span>
              </button>
            </div>

            <!-- 当前状态横幅 -->
            <div class="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :class="serverStore.isStandalone ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : (serverStore.isConnected ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-rose-500 animate-pulse')"
                ></span>
                <div>
                  <div class="font-semibold text-neutral-900 dark:text-white">
                    {{ serverStore.isStandalone ? '本地单机模式 (零依赖·无须服务)' : `已连接远程节点: ${serverStore.activeServer?.name}` }}
                  </div>
                  <div class="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                    {{ serverStore.isStandalone ? '数据存储在本地 SQLite，断网随开随用' : serverStore.baseUrl }}
                  </div>
                </div>
              </div>

              <!-- 若处于远程模式，展示一键同步本地数据到远程节点按钮 -->
              <button
                v-if="!serverStore.isStandalone"
                @click="handleSyncToRemote"
                :disabled="serverStore.isSyncing"
                class="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <UploadCloud class="w-3.5 h-3.5" :class="{ 'animate-bounce': serverStore.isSyncing }" />
                <span>{{ serverStore.isSyncing ? '同步中...' : '同步单机数据至远程节点' }}</span>
              </button>
            </div>

            <div v-if="syncMsg" class="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 text-center animate-in fade-in">
              {{ syncMsg }}
            </div>

            <!-- 编辑/添加表单 -->
            <div v-if="isEditing" class="p-4 rounded-2xl bg-neutral-100/70 dark:bg-black/40 border border-indigo-500/30 space-y-3.5 animate-in fade-in">
              <div class="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
                <span class="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Edit3 class="w-3.5 h-3.5 text-indigo-500" />
                  {{ editingId ? '编辑远程同步节点地址' : '配置新数据同步节点' }}
                </span>
                <button @click="cancelEditServer" class="text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-neutral-600 dark:text-neutral-400 text-[11px] mb-1">节点名称</label>
                  <input
                    v-model="formName"
                    type="text"
                    placeholder="如：私有云局域网 / 远程公网域名"
                    class="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-neutral-600 dark:text-neutral-400 text-[11px] mb-1">访问令牌 (API Token · 可选)</label>
                  <input
                    v-model="formToken"
                    type="password"
                    placeholder="如无密码保护可留空"
                    class="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-neutral-600 dark:text-neutral-400 text-[11px] mb-1">远程服务完整地址 (含协议与端口)</label>
                <input
                  v-model="formUrl"
                  type="text"
                  placeholder="如: https://todo.xiaoyunjia.site:6 或 http://192.168.1.8:3001"
                  class="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl px-3 py-2 text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <!-- 测试结果提示 -->
              <div
                v-if="testResult"
                class="p-2.5 rounded-xl text-xs flex items-center gap-2"
                :class="testResult.success ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'"
              >
                <CheckCircle2 v-if="testResult.success" class="w-4 h-4 shrink-0" />
                <AlertCircle v-else class="w-4 h-4 shrink-0" />
                <span>{{ testResult.message }}</span>
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  @click="handleTestConnection"
                  :disabled="serverStore.isTesting"
                  class="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {{ serverStore.isTesting ? '正在探测...' : '测试连接' }}
                </button>
                <button
                  @click="cancelEditServer"
                  class="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  @click="handleSaveServer"
                  class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  保存并连接
                </button>
              </div>
            </div>

            <!-- 节点列表 -->
            <div class="space-y-2">
              <div class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">可用存储模式与节点列表</div>

              <!-- 单机离线模式 -->
              <div
                class="flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer"
                :class="serverStore.isStandalone
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-neutral-900 dark:text-white shadow-xs'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-neutral-800 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'"
                @click="handleSelectStandalone"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0"
                    :class="serverStore.isStandalone ? 'bg-emerald-500 text-white' : 'border border-neutral-400 dark:border-neutral-500 text-transparent'"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <div class="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                      <span>本地单机模式 (Standalone)</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">纯净离线</span>
                    </div>
                    <div class="text-[11px] text-neutral-600 dark:text-neutral-400">数据仅驻留在本设备，无需网络，极速安全</div>
                  </div>
                </div>
              </div>

              <!-- 远程节点列表 -->
              <div
                v-for="srv in serverStore.servers"
                :key="srv.id"
                class="flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group"
                :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-neutral-900 dark:text-white shadow-xs'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-neutral-800 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'"
                @click="handleSwitchServer(srv.id)"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0"
                    :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id ? 'bg-indigo-600 text-white' : 'border border-neutral-400 dark:border-neutral-500 text-transparent'"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <div class="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                      <span>{{ srv.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">远程实时同步</span>
                    </div>
                    <div class="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">{{ srv.url }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- 编辑按钮 -->
                  <button
                    @click.stop="startEditServer(srv)"
                    class="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title="编辑此远程地址与端口"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <!-- 删除按钮 -->
                  <button
                    @click.stop="serverStore.removeServer(srv.id)"
                    class="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title="删除节点"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. 视觉主题外观 -->
          <section v-if="activeTab === 'theme'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Palette class="w-4 h-4 text-indigo-500" />
                主题与视觉风格选择
              </h3>
              <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">告别单一沉闷，挑选适合当前采光与审美偏好的沉浸主题</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                v-for="th in THEME_OPTIONS"
                :key="th.id"
                @click="selectTheme(th.id)"
                class="p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group"
                :class="currentTheme === th.id
                  ? 'border-indigo-500 bg-indigo-50/30 dark:bg-white/[0.08] shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                  : 'border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'"
              >
                <!-- 预览色条背景 -->
                <div
                  class="h-10 w-full rounded-xl bg-gradient-to-r mb-3 border border-black/5 dark:border-white/10 flex items-center justify-end px-3 shadow-inner"
                  :class="th.bgPreview"
                >
                  <span class="w-4 h-4 rounded-full shadow-md" :style="{ backgroundColor: th.accentColor }"></span>
                </div>

                <div class="flex items-center justify-between">
                  <div class="font-bold text-neutral-900 dark:text-white text-xs">{{ th.name }}</div>
                  <div
                    v-if="currentTheme === th.id"
                    class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                  {{ th.desc }}
                </p>
              </div>
            </div>
          </section>

          <!-- 3. 自定义标签管理与联动机制 -->
          <section v-if="activeTab === 'tags'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Tag class="w-4 h-4 text-emerald-500" />
                自定义分类标签库
              </h3>
              <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">标准化标签颜色与命名，并与左侧栏及所有待办实时双向联动</p>
            </div>

            <!-- 标签机制说明卡片 (直接解答用户疑问) -->
            <div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-neutral-700 dark:text-neutral-300 space-y-1.5">
              <div class="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                <HelpCircle class="w-4 h-4 shrink-0 text-indigo-500" />
                <span>自定义标签库与左侧栏的关系及使用说明</span>
              </div>
              <ul class="text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400 list-disc list-inside leading-relaxed">
                <li><strong>标签库（Tag Library）</strong>：系统级标准词表，定义推荐标签及其专属配色，新建或编辑待办时作为智能联想候选。</li>
                <li><strong>左侧栏分类标签</strong>：动态汇总「已定义的标签库」与「任务中正在使用中的标签」，点击即可单选过滤。</li>
                <li><strong>双向联动修改</strong>：在下方编辑标签名称或色彩，系统将<strong>自动批量更新</strong>所有关联待办；删除标签时可一键将该标签从待办中解绑。</li>
              </ul>
            </div>

            <!-- 添加新标签条 -->
            <div class="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-3">
              <div class="flex items-center gap-2">
                <input
                  v-model="newTagName"
                  type="text"
                  placeholder="输入新标签名称... (如: 财务、重构、学习)"
                  class="flex-1 bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  @keyup.enter="handleAddTag"
                />
                <button
                  @click="handleAddTag"
                  :disabled="!newTagName.trim()"
                  class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  添加标签
                </button>
              </div>

              <!-- 颜色选择器 -->
              <div class="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                <span>选择标签标识色：</span>
                <div class="flex items-center gap-1.5">
                  <button
                    v-for="pal in TAG_COLOR_PALETTE"
                    :key="pal.color"
                    @click="selectedTagColor = pal.color"
                    class="w-5 h-5 rounded-full transition-transform cursor-pointer relative"
                    :style="{ backgroundColor: pal.color }"
                    :class="selectedTagColor === pal.color ? 'scale-125 ring-2 ring-indigo-600 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-black' : 'hover:scale-110'"
                  ></button>
                </div>
              </div>
            </div>

            <!-- 现有标签库网格 (支持就地重命名、调色与删除联动) -->
            <div class="space-y-2 pt-1">
              <div class="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                <span>标签库标准清单 ({{ customTags.length }} 个)</span>
                <span class="text-[10px] text-neutral-400">点击铅笔即可重命名并联动修改全部待办</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="tg in customTags"
                  :key="tg.id"
                  class="p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between group hover:border-black/15 dark:hover:border-white/15 transition-all"
                >
                  <!-- 正常展示态 -->
                  <div v-if="editingTagId !== tg.id" class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: tg.color }"></span>
                    <span
                      class="px-2 py-0.5 rounded-md font-medium text-xs font-mono truncate"
                      :style="{ color: tg.color, backgroundColor: tg.bgColor }"
                    >
                      #{{ tg.name }}
                    </span>
                    <span class="text-[10px] text-neutral-500 shrink-0 font-mono">({{ getTaskCountForTag(tg.name) }}项)</span>
                  </div>

                  <!-- 正在编辑态 -->
                  <div v-else class="flex-1 flex items-center gap-2">
                    <input
                      v-model="editTagName"
                      type="text"
                      class="flex-1 bg-white dark:bg-white/10 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      @keyup.enter="handleSaveTagEdit"
                    />
                    <!-- 调色快捷选择 -->
                    <div class="flex items-center gap-1">
                      <button
                        v-for="pal in TAG_COLOR_PALETTE.slice(0, 4)"
                        :key="pal.color"
                        @click="editTagColor = pal.color"
                        class="w-3.5 h-3.5 rounded-full cursor-pointer"
                        :style="{ backgroundColor: pal.color }"
                        :class="editTagColor === pal.color ? 'ring-1 ring-indigo-500 scale-110' : ''"
                      ></button>
                    </div>
                  </div>

                  <!-- 操作按钮区 -->
                  <div class="flex items-center gap-1 shrink-0 ml-2">
                    <template v-if="editingTagId === tg.id">
                      <button
                        @click="handleSaveTagEdit"
                        class="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        title="保存修改"
                      >
                        <Check class="w-3.5 h-3.5" />
                      </button>
                      <button
                        @click="cancelEditTag"
                        class="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        title="取消编辑"
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </template>
                    <template v-else>
                      <button
                        @click="startEditTag(tg)"
                        class="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer"
                        title="编辑标签名称与标识色"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                      </button>
                      <button
                        @click="handleDeleteTagWithPrompt(tg)"
                        class="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition-all cursor-pointer"
                        title="删除标签 (联动清理现有待办)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 发现任务中未收录的标签 (一键收录进库) -->
            <div v-if="orphanTags.length > 0" class="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
              <div class="flex items-center justify-between text-[11px]">
                <div class="text-neutral-600 dark:text-neutral-400 font-semibold flex items-center gap-1.5">
                  <span>从待办中检测到 {{ orphanTags.length }} 个未收录至库的散落标签：</span>
                </div>
                <button
                  @click="importAllOrphanTags"
                  class="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] cursor-pointer transition-colors"
                >
                  一键全部收录进库
                </button>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="tgName in orphanTags"
                  :key="tgName"
                  @click="importOrphanTag(tgName)"
                  class="px-2 py-0.5 rounded-md text-[11px] bg-black/5 dark:bg-white/5 hover:bg-indigo-500/15 border border-black/5 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-300 font-mono transition-colors flex items-center gap-1 cursor-pointer"
                  title="点击收录到标签库"
                >
                  <span>+ #{{ tgName }}</span>
                  <span class="text-[9px] text-neutral-400">({{ getTaskCountForTag(tgName) }})</span>
                </button>
              </div>
            </div>
          </section>

          <!-- 4. 全局快捷键与自定义热键 -->
          <section v-if="activeTab === 'shortcuts'" class="space-y-4">
            <!-- 顶部标题与快捷操作栏 -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Zap class="w-4 h-4 text-amber-500 shrink-0" />
                  <span class="whitespace-nowrap">系统全局热键与快捷键配置</span>
                </h3>
                <p class="text-neutral-500 dark:text-neutral-400 text-[11px] mt-0.5">默认采用 Ctrl+Alt 组合键，点击任意键位可直接录制修改</p>
              </div>

              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  @click="handleTestAlarm"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 text-xs transition-colors cursor-pointer font-medium whitespace-nowrap shrink-0"
                  title="模拟待办到期，测试桌面便签自动唤醒与闹铃抖动"
                >
                  <BellRing class="w-3.5 h-3.5 animate-bell-ring shrink-0" />
                  <span class="whitespace-nowrap">测试闹铃抖动</span>
                </button>
                <button
                  @click="handleResetShortcutDefaults"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs transition-colors cursor-pointer font-medium whitespace-nowrap shrink-0"
                  title="恢复所有快捷键为系统默认值 (Ctrl+Alt+...)"
                >
                  <RotateCcw class="w-3.5 h-3.5 shrink-0" />
                  <span class="whitespace-nowrap">恢复默认</span>
                </button>
                <button
                  v-if="isDesktop"
                  class="px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer font-medium whitespace-nowrap shrink-0"
                  :class="shortcutConfig.enabled ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-400'"
                  @click="handleToggleShortcutEnabled"
                >
                  <span class="whitespace-nowrap">{{ shortcutConfig.enabled ? '全局热键开启' : '点击开启全局热键' }}</span>
                </button>
              </div>
            </div>

            <!-- 开机自启动与桌面行为配置卡片 -->
            <div class="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <div class="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                  <Laptop class="w-4 h-4 text-indigo-500 shrink-0" />
                  <span class="text-xs font-semibold">开机自动启动</span>
                  <span v-if="!isDesktop" class="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-500/10 text-neutral-400">桌面端专属</span>
                </div>
                <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">
                  随电脑开机自动在后台启动并于系统托盘常驻，保障待办到期提醒准时推送与快捷呼出
                </p>
              </div>

              <button
                v-if="isDesktop"
                @click="handleToggleAutostart"
                class="px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer font-medium whitespace-nowrap shrink-0"
                :class="isAutostart ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-400'"
              >
                <span class="whitespace-nowrap">{{ isAutostart ? '开机自启已开启' : '点击开启自启' }}</span>
              </button>
            </div>

            <!-- 保存反馈提示 -->
            <div v-if="shortcutSavedToast" class="p-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs text-center animate-in fade-in flex items-center justify-center gap-1.5 font-medium">
              <Check class="w-3.5 h-3.5" />
              <span>快捷键绑定已更新并即时生效</span>
            </div>

            <!-- 自定义键位绑定清单 -->
            <div class="rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
              <div
                v-for="item in SHORTCUT_DEFINITIONS"
                :key="item.id"
                class="p-3 flex items-center justify-between group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div class="space-y-0.5">
                  <div class="font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span>{{ item.name }}</span>
                    <span
                      v-if="item.isGlobal && isDesktop"
                      class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-mono"
                    >
                      全局系统级
                    </span>
                    <span
                      v-else
                      class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 font-mono"
                    >
                      应用内
                    </span>
                  </div>
                  <div class="text-[11px] text-neutral-500 dark:text-neutral-400">{{ item.desc }}</div>
                </div>

                <!-- 快捷键卡片 / 录制中 -->
                <div class="flex items-center gap-2">
                  <template v-if="recordingShortcutId === item.id">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500 text-indigo-700 dark:text-indigo-300 animate-pulse font-mono font-medium text-xs">
                      <span>{{ recordingShortcutPreview || '按下新组合键...' }}</span>
                    </div>
                    <button
                      @click="cancelRecordingShortcut"
                      class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      title="取消录制 (Esc)"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </template>

                  <template v-else>
                    <button
                      @click="startRecordingShortcut(item.id)"
                      class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-indigo-500/15 border border-black/10 dark:border-white/10 hover:border-indigo-500/40 text-neutral-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer font-mono text-xs group/btn shadow-2xs"
                      title="点击录制自定义快捷键"
                    >
                      <span v-for="key in formatKeyBadges(shortcutConfig.shortcuts[item.id])" :key="key" class="font-semibold">
                        {{ key }}
                      </span>
                      <Edit3 class="w-3 h-3 ml-1 text-neutral-400 group-hover/btn:text-indigo-500 transition-colors" />
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <!-- 通用便捷单键清单 -->
            <div class="space-y-2 pt-1">
              <div class="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Command class="w-3.5 h-3.5 text-emerald-500" />
                <span>应用内高频单键速查</span>
              </div>

              <div class="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 space-y-2">
                <div class="pt-1 flex items-center justify-between">
                  <div>
                    <div class="font-medium text-neutral-900 dark:text-white">列表任意处直接录入待办</div>
                    <div class="text-[10px] text-neutral-500">非输入状态直接按单键 N 极速唤起聚焦</div>
                  </div>
                  <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-indigo-600 dark:text-indigo-300 font-semibold">N</kbd>
                </div>
                <div class="pt-2 flex items-center justify-between">
                  <div>
                    <div class="font-medium text-neutral-900 dark:text-white">一键切换主视图</div>
                    <div class="text-[10px] text-neutral-500">1:我的一天 2:收集箱 3:近期 4:四象限 5:看板 6:已完成</div>
                  </div>
                  <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-white">数字键 1 ~ 6</kbd>
                </div>
                <div class="pt-2 flex items-center justify-between">
                  <div>
                    <div class="font-medium text-neutral-900 dark:text-white">随时查阅使用指南</div>
                    <div class="text-[10px] text-neutral-500">随时调取全功能操作指南与四象限法则</div>
                  </div>
                  <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-white">F1</kbd>
                </div>
                <div class="pt-2 flex items-center justify-between">
                  <div class="font-medium text-neutral-900 dark:text-white">快速退出与关闭窗口</div>
                  <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-white">Esc</kbd>
                </div>
              </div>
            </div>
          </section>

          <!-- 5. 数据灾备与迁移 -->
          <section v-if="activeTab === 'backup'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Download class="w-4 h-4 text-emerald-500" />
                数据灾备与跨设备迁移
              </h3>
              <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">数据完全属于您，支持标准 JSON 全量导出与幂等恢复</p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-2">
                <div class="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Download class="w-4 h-4 text-indigo-500" />
                  <span>导出全量 JSON 备份</span>
                </div>
                <p class="text-neutral-600 dark:text-neutral-400 text-[11px]">
                  生成包含所有清单、待办、四象限、子任务及历史番茄时长的备份文件。
                </p>
                <button
                  @click="handleExport"
                  class="mt-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  立即导出备份
                </button>
              </div>

              <div class="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-2">
                <div class="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Upload class="w-4 h-4 text-emerald-500" />
                  <span>恢复与导入备份</span>
                </div>
                <p class="text-neutral-600 dark:text-neutral-400 text-[11px]">
                  选择历史 JSON 备份文件，系统进行安全幂等合并，不覆盖现有进度。
                </p>
                <button
                  @click="triggerImport"
                  class="mt-2 w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-900 dark:text-white font-medium text-xs transition-colors cursor-pointer border border-neutral-300 dark:border-white/10"
                >
                  选择文件并恢复
                </button>
                <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileImport" />
              </div>
            </div>
          </section>

          <!-- 6. 软件版本与自动更新 -->
          <section v-if="activeTab === 'about'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-indigo-500" />
                版本信息与自动更新
              </h3>
              <p class="text-neutral-500 dark:text-neutral-400 text-[11px]">AuraTask 极简高效待办工作流</p>
            </div>

            <div class="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-bold text-neutral-900 dark:text-white text-sm">AuraTask 客户端</div>
                  <div class="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">当前系统版本：v1.0.7</div>
                </div>

                <button
                  @click="updaterService.checkForUpdates(false)"
                  :disabled="isChecking"
                  class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw class="w-3.5 h-3.5" :class="{ 'animate-spin': isChecking }" />
                  <span>{{ isChecking ? '正在检测更新...' : '立即检查更新' }}</span>
                </button>
              </div>

              <div class="text-[11px] text-neutral-500 dark:text-neutral-400 pt-2 border-t border-black/5 dark:border-white/5 leading-relaxed">
                更新端点连接至官方 GitHub Releases，具备 Minisign 独立数字签名校验，保障更新安全可靠。
              </div>
            </div>

            <!-- 操作手册入口 -->
            <div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <div class="font-semibold text-indigo-700 dark:text-indigo-300">需要查阅详细操作技巧？</div>
                <div class="text-[11px] text-neutral-600 dark:text-neutral-400">包含优先级与四象限法则关系、自然语言智能录入语法、数据同步</div>
              </div>
              <button
                @click="handleOpenUserGuide"
                class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <BookOpen class="w-3.5 h-3.5" />
                <span>打开操作手册</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
