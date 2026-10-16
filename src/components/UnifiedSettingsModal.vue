<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
} from 'lucide-vue-next'
import { useServerStore, type ServerConfig } from '../stores/server'
import { useTaskStore } from '../stores/task'
import { themeService, currentTheme, THEME_OPTIONS, type ThemeType } from '../services/theme'
import { tagService, customTags, TAG_COLOR_PALETTE, type CustomTag } from '../services/tags'
import { updaterService, hasUpdate, isChecking, isDownloading, downloadProgress, updateError, updateInfo } from '../services/updater'
import { api } from '../services/api'

const serverStore = useServerStore()
const taskStore = useTaskStore()

type SettingsTab = 'server' | 'theme' | 'tags' | 'shortcuts' | 'backup' | 'about'
const activeTab = ref<SettingsTab>('server')

// 服务器配置相关状态
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('群晖 NAS')
const formUrl = ref('https://todo.xiaoyunjia.site:6')
const formToken = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)
const syncMsg = ref<string | null>(null)

// 标签配置相关状态
const newTagName = ref('')
const selectedTagColor = ref(TAG_COLOR_PALETTE[0].color)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  serverStore.loadConfig()
  themeService.init()
  tagService.init()
})

function handleClose() {
  serverStore.isSettingsOpen = false
}

// =================== 1. 服务器配置方法 ===================
function startAddServer() {
  isEditing.value = true
  editingId.value = null
  formName.value = '群晖 NAS'
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
    name: formName.value.trim() || '我的 NAS',
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
    syncMsg.value = `✓ 成功将本地 ${res.count} 条待办同步至远程 NAS 数据库！`
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

// =================== 3. 标签管理方法 ===================
function handleAddTag() {
  if (!newTagName.value.trim()) return
  tagService.addTag(newTagName.value.trim(), selectedTagColor.value)
  newTagName.value = ''
}

function handleDeleteTag(id: string) {
  tagService.deleteTag(id)
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
      class="w-full max-w-3xl h-[620px] max-h-[90vh] glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200 border border-white/10"
    >
      <!-- 弹窗顶栏 -->
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Settings class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              控制中心与偏好设置
            </h2>
            <p class="text-xs text-neutral-400">管理主题风格、自定义标签、NAS 远程同步与数据灾备</p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 主体双栏区域 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左侧设置分类选项卡 -->
        <aside class="w-48 border-r border-white/5 p-3 space-y-1 shrink-0 bg-black/30 overflow-y-auto text-xs">
          <button
            @click="activeTab = 'server'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'server' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Server class="w-4 h-4 shrink-0" />
            <span>NAS 同步与存储</span>
          </button>

          <button
            @click="activeTab = 'theme'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'theme' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Palette class="w-4 h-4 shrink-0" />
            <span>视觉主题外观</span>
          </button>

          <button
            @click="activeTab = 'tags'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'tags' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Tag class="w-4 h-4 shrink-0" />
            <span>自定义标签库</span>
          </button>

          <button
            @click="activeTab = 'shortcuts'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'shortcuts' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Zap class="w-4 h-4 shrink-0" />
            <span>快捷键与热键</span>
          </button>

          <button
            @click="activeTab = 'backup'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Download class="w-4 h-4 shrink-0" />
            <span>数据灾备与迁移</span>
          </button>

          <button
            @click="activeTab = 'about'"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="activeTab === 'about' ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'"
          >
            <Sparkles class="w-4 h-4 shrink-0" />
            <span>软件版本与更新</span>
            <span v-if="hasUpdate" class="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-auto"></span>
          </button>
        </aside>

        <!-- 右侧主内容展示区 -->
        <main class="flex-1 overflow-y-auto p-6 text-xs text-neutral-300 leading-relaxed">
          <!-- 1. NAS 同步与远程服务配置 -->
          <section v-if="activeTab === 'server'" class="space-y-4">
            <div class="flex items-center justify-between pb-1">
              <div>
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <Server class="w-4 h-4 text-indigo-400" />
                  工作模式与远程 NAS 节点
                </h3>
                <p class="text-neutral-400 text-[11px]">切换单机离线存储或配置私有云群晖/威联通 NAS 服务端</p>
              </div>

              <button
                v-if="!isEditing"
                @click="startAddServer"
                class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>添加 NAS 节点</span>
              </button>
            </div>

            <!-- 当前状态横幅 -->
            <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :class="serverStore.isStandalone ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : (serverStore.isConnected ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50' : 'bg-rose-400 animate-pulse')"
                ></span>
                <div>
                  <div class="font-semibold text-white">
                    {{ serverStore.isStandalone ? '本地单机模式 (零依赖·无须服务)' : `已连接远程 NAS: ${serverStore.activeServer?.name}` }}
                  </div>
                  <div class="text-[11px] text-neutral-400 font-mono">
                    {{ serverStore.isStandalone ? '数据存储在本地 SQLite，断网随开随用' : serverStore.baseUrl }}
                  </div>
                </div>
              </div>

              <!-- 若处于远程 NAS 模式，展示一键同步本地数据到 NAS 按钮 -->
              <button
                v-if="!serverStore.isStandalone"
                @click="handleSyncToRemote"
                :disabled="serverStore.isSyncing"
                class="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UploadCloud class="w-3.5 h-3.5" :class="{ 'animate-bounce': serverStore.isSyncing }" />
                <span>{{ serverStore.isSyncing ? '同步中...' : '同步单机数据至 NAS' }}</span>
              </button>
            </div>

            <div v-if="syncMsg" class="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-200 text-center animate-in fade-in">
              {{ syncMsg }}
            </div>

            <!-- 编辑/添加表单 -->
            <div v-if="isEditing" class="p-4 rounded-2xl bg-black/40 border border-indigo-500/30 space-y-3.5 animate-in fade-in">
              <div class="flex items-center justify-between pb-1 border-b border-white/5">
                <span class="font-bold text-white flex items-center gap-1.5">
                  <Edit3 class="w-3.5 h-3.5 text-indigo-400" />
                  {{ editingId ? '编辑 NAS 远程节点地址' : '配置新 NAS 节点' }}
                </span>
                <button @click="cancelEditServer" class="text-neutral-400 hover:text-white cursor-pointer">
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-neutral-400 text-[11px] mb-1">节点名称</label>
                  <input
                    v-model="formName"
                    type="text"
                    placeholder="如：群晖 NAS 局域网 / 外网域名"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-neutral-400 text-[11px] mb-1">访问令牌 (API Token · 可选)</label>
                  <input
                    v-model="formToken"
                    type="password"
                    placeholder="如无密码保护可留空"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-neutral-400 text-[11px] mb-1">远程服务完整地址 (含端口 / 协议)</label>
                <input
                  v-model="formUrl"
                  type="text"
                  placeholder="如: https://todo.xiaoyunjia.site:6 或 http://192.168.1.8:3001"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <!-- 测试结果提示 -->
              <div
                v-if="testResult"
                class="p-2.5 rounded-xl text-xs flex items-center gap-2"
                :class="testResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'"
              >
                <CheckCircle2 v-if="testResult.success" class="w-4 h-4 shrink-0" />
                <AlertCircle v-else class="w-4 h-4 shrink-0" />
                <span>{{ testResult.message }}</span>
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  @click="handleTestConnection"
                  :disabled="serverStore.isTesting"
                  class="px-3.5 py-1.5 rounded-xl border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {{ serverStore.isTesting ? '正在探测...' : '测试连接' }}
                </button>
                <button
                  @click="cancelEditServer"
                  class="px-3.5 py-1.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
              <div class="text-[11px] font-semibold text-neutral-400">可用存储模式与节点列表</div>

              <!-- 单机离线模式 -->
              <div
                class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer"
                :class="serverStore.isStandalone
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-neutral-300 hover:bg-white/[0.05]'"
                @click="handleSelectStandalone"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    :class="serverStore.isStandalone ? 'bg-emerald-400 text-black' : 'border border-neutral-500 text-transparent'"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <div class="font-semibold flex items-center gap-2">
                      <span>本地单机模式 (Standalone)</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">纯净离线</span>
                    </div>
                    <div class="text-[11px] text-neutral-400">数据仅驻留在本设备，无需网络，极速安全</div>
                  </div>
                </div>
              </div>

              <!-- 远程节点列表 -->
              <div
                v-for="srv in serverStore.servers"
                :key="srv.id"
                class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group"
                :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-neutral-300 hover:bg-white/[0.05]'"
                @click="handleSwitchServer(srv.id)"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id ? 'bg-indigo-500 text-white' : 'border border-neutral-500 text-transparent'"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <div class="font-semibold flex items-center gap-2">
                      <span>{{ srv.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">远程实时同步</span>
                    </div>
                    <div class="text-[11px] text-neutral-400 font-mono">{{ srv.url }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- 编辑按钮 (满足用户的专门需求) -->
                  <button
                    @click.stop="startEditServer(srv)"
                    class="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-300 hover:bg-white/10 transition-all cursor-pointer"
                    title="编辑此远程地址与端口"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <!-- 删除按钮 -->
                  <button
                    @click.stop="serverStore.removeServer(srv.id)"
                    class="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer"
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
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <Palette class="w-4 h-4 text-indigo-400" />
                主题与视觉风格选择
              </h3>
              <p class="text-neutral-400 text-[11px]">告别单一沉闷，挑选适合当前采光与审美偏好的沉浸主题</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                v-for="th in THEME_OPTIONS"
                :key="th.id"
                @click="selectTheme(th.id)"
                class="p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group"
                :class="currentTheme === th.id
                  ? 'border-indigo-500 bg-white/[0.08] shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'"
              >
                <!-- 预览色条背景 -->
                <div
                  class="h-10 w-full rounded-xl bg-gradient-to-r mb-3 border border-white/10 flex items-center justify-end px-3 shadow-inner"
                  :class="th.bgPreview"
                >
                  <span class="w-4 h-4 rounded-full shadow-md" :style="{ backgroundColor: th.accentColor }"></span>
                </div>

                <div class="flex items-center justify-between">
                  <div class="font-bold text-white text-xs">{{ th.name }}</div>
                  <div
                    v-if="currentTheme === th.id"
                    class="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                <p class="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {{ th.desc }}
                </p>
              </div>
            </div>
          </section>

          <!-- 3. 自定义标签管理 -->
          <section v-if="activeTab === 'tags'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <Tag class="w-4 h-4 text-emerald-400" />
                自定义分类标签库
              </h3>
              <p class="text-neutral-400 text-[11px]">自由创建业务、项目、生活标签，并在待办中一键打标筛选</p>
            </div>

            <!-- 添加标签条 -->
            <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div class="flex items-center gap-2">
                <input
                  v-model="newTagName"
                  type="text"
                  placeholder="输入新标签名称... (如: 读书、财务、重构)"
                  class="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  @keyup.enter="handleAddTag"
                />
                <button
                  @click="handleAddTag"
                  :disabled="!newTagName.trim()"
                  class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  添加标签
                </button>
              </div>

              <!-- 颜色选择器 -->
              <div class="flex items-center gap-2 text-[11px] text-neutral-400">
                <span>选择标签标识色：</span>
                <div class="flex items-center gap-1.5">
                  <button
                    v-for="pal in TAG_COLOR_PALETTE"
                    :key="pal.color"
                    @click="selectedTagColor = pal.color"
                    class="w-5 h-5 rounded-full transition-transform cursor-pointer relative"
                    :style="{ backgroundColor: pal.color }"
                    :class="selectedTagColor === pal.color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'"
                  ></button>
                </div>
              </div>
            </div>

            <!-- 现有标签网格 -->
            <div class="space-y-2 pt-1">
              <div class="text-[11px] font-semibold text-neutral-400">已定义的标签清单 ({{ customTags.length }} 个)</div>

              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="tg in customTags"
                  :key="tg.id"
                  class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:border-white/15 transition-all"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: tg.color }"></span>
                    <span
                      class="px-2 py-0.5 rounded-md font-medium text-xs font-mono"
                      :style="{ color: tg.color, backgroundColor: tg.bgColor }"
                    >
                      #{{ tg.name }}
                    </span>
                    <span class="text-[10px] text-neutral-500">({{ getTaskCountForTag(tg.name) }}项)</span>
                  </div>

                  <button
                    @click="handleDeleteTag(tg.id)"
                    class="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 transition-all cursor-pointer"
                    title="删除标签"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 4. 全局快捷键与热键 -->
          <section v-if="activeTab === 'shortcuts'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <Zap class="w-4 h-4 text-amber-400" />
                全局系统快捷键与应用内热键
              </h3>
              <p class="text-neutral-400 text-[11px]">即使窗口最小化到系统托盘，也能毫秒级原生唤醒</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5 space-y-2">
              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">全局极速录入待办</div>
                  <div class="text-[11px] text-neutral-400">任意软件中呼出 Spotlight 智能录入框</div>
                </div>
                <div class="flex items-center gap-1 font-mono text-xs text-white">
                  <kbd class="px-2 py-1 rounded bg-white/10">Ctrl / ⌘ + Shift + K</kbd>
                  <span class="text-neutral-500 text-[10px]">或</span>
                  <kbd class="px-2 py-1 rounded bg-white/10">Alt + Shift + K</kbd>
                </div>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">应用内极速录入待办（自动聚焦输入框）</div>
                  <div class="text-[11px] text-neutral-400">列表任意处直接按单键 N 亦可极速录入</div>
                </div>
                <div class="flex items-center gap-1 font-mono text-xs text-white">
                  <kbd class="px-2 py-1 rounded bg-white/10">⌘ / Ctrl + K</kbd>
                  <kbd class="px-2 py-1 rounded bg-white/10">⌘ / Ctrl + N</kbd>
                  <kbd class="px-1.5 py-1 rounded bg-white/10 text-indigo-300">N</kbd>
                </div>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">一键切换主视图</div>
                  <div class="text-[11px] text-neutral-400">1:我的一天 2:收集箱 3:近期 4:四象限 5:看板 6:已完成</div>
                </div>
                <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white">数字键 1 ~ 6</kbd>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">显示 / 隐藏主窗口</div>
                  <div class="text-[11px] text-neutral-400">一键快速置顶或最小化主界面</div>
                </div>
                <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white">Ctrl / ⌘ + Shift + T</kbd>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">切换迷你悬浮便签</div>
                  <div class="text-[11px] text-neutral-400">进入/退出桌面置顶小窗便签模式</div>
                </div>
                <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white">Ctrl / ⌘ + Shift + M</kbd>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">随时唤起番茄钟</div>
                  <div class="text-[11px] text-neutral-400">开启或暂停 25 分钟心流专注</div>
                </div>
                <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white">Ctrl / ⌘ + Shift + P</kbd>
              </div>

              <div class="pt-2 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">打开完整操作文档</div>
                  <div class="text-[11px] text-neutral-400">随时随地查阅全部功能操作手册</div>
                </div>
                <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-xs text-white">F1</kbd>
              </div>
            </div>
          </section>

          <!-- 5. 数据灾备与迁移 -->
          <section v-if="activeTab === 'backup'" class="space-y-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <Download class="w-4 h-4 text-emerald-400" />
                数据灾备与跨设备迁移
              </h3>
              <p class="text-neutral-400 text-[11px]">数据完全属于您，支持标准 JSON 全量导出与幂等恢复</p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div class="font-semibold text-white flex items-center gap-2">
                  <Download class="w-4 h-4 text-indigo-400" />
                  <span>导出全量 JSON 备份</span>
                </div>
                <p class="text-neutral-400 text-[11px]">
                  生成包含所有清单、待办、四象限、子任务及历史番茄时长的备份文件。
                </p>
                <button
                  @click="handleExport"
                  class="mt-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  立即导出备份
                </button>
              </div>

              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div class="font-semibold text-white flex items-center gap-2">
                  <Upload class="w-4 h-4 text-emerald-400" />
                  <span>恢复与导入备份</span>
                </div>
                <p class="text-neutral-400 text-[11px]">
                  选择历史 JSON 备份文件，系统进行安全幂等合并，不覆盖现有进度。
                </p>
                <button
                  @click="triggerImport"
                  class="mt-2 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
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
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-indigo-400" />
                版本信息与自动更新
              </h3>
              <p class="text-neutral-400 text-[11px]">AuraTask 极简高效待办工作流</p>
            </div>

            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-bold text-white text-sm">AuraTask 客户端</div>
                  <div class="text-[11px] text-neutral-400 font-mono">当前版本：v1.0.4</div>
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

              <div class="text-[11px] text-neutral-400 pt-2 border-t border-white/5 leading-relaxed">
                更新端点连接至官方 GitHub Releases，具备 Minisign 独立数字签名校验，保障更新安全可靠。
              </div>
            </div>

            <!-- 操作手册入口 -->
            <div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <div class="font-semibold text-indigo-300">需要查阅详细操作技巧？</div>
                <div class="text-[11px] text-neutral-400">包含优先级与四象限法则关系、自然语言智能录入语法</div>
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
