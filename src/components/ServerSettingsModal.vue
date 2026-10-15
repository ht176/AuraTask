<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Server,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  UploadCloud,
  Check,
} from 'lucide-vue-next'
import { useServerStore, type ServerConfig } from '../stores/server'
import { useTaskStore } from '../stores/task'

const serverStore = useServerStore()
const taskStore = useTaskStore()

const showAddForm = ref(false)
const formName = ref('群晖 NAS')
const formUrl = ref('https://todo.xiaoyunjia.site:6')
const formToken = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)
const syncMsg = ref<string | null>(null)

onMounted(() => {
  serverStore.loadConfig()
})

async function handleTest() {
  testResult.value = null
  const res = await serverStore.testConnection(formUrl.value, formToken.value)
  testResult.value = res
}

async function handleSaveServer() {
  if (!formUrl.value.trim()) return
  const id = 'srv_' + Date.now().toString(36)
  const cfg: ServerConfig = {
    id,
    name: formName.value.trim() || '我的 NAS',
    url: formUrl.value.trim(),
    token: formToken.value.trim() || undefined,
  }

  const ok = await serverStore.addOrUpdateServer(cfg)
  if (ok) {
    showAddForm.value = false
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

async function handleSwitch(id: string) {
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

function handleClose() {
  serverStore.isSettingsOpen = false
}
</script>

<template>
  <div
    v-if="serverStore.isSettingsOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4 animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div class="w-full max-w-lg rounded-3xl glass-panel border border-white/10 shadow-2xl p-6 overflow-hidden">
      <!-- 头部 -->
      <div class="flex items-center justify-between pb-4 border-b border-white/5">
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center"
            :class="serverStore.isStandalone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'"
          >
            <HardDrive v-if="serverStore.isStandalone" class="w-4 h-4" />
            <Server v-else class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              工作模式与数据同步
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1"
                :class="serverStore.isStandalone ? 'bg-emerald-500/20 text-emerald-300' : (serverStore.isConnected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-rose-500/20 text-rose-300')"
              >
                <Check v-if="serverStore.isStandalone" class="w-2.5 h-2.5" />
                <Wifi v-else-if="serverStore.isConnected" class="w-2.5 h-2.5" />
                <WifiOff v-else class="w-2.5 h-2.5" />
                {{ serverStore.isStandalone ? '单机模式 (活跃)' : (serverStore.isConnected ? 'NAS 实时同步' : '未连接') }}
              </span>
            </h3>
            <p class="text-xs text-neutral-400">支持纯离线单机运行，或接入群晖 NAS 云端双向同步</p>
          </div>
        </div>
        <button class="p-1.5 hover:text-white text-neutral-400 cursor-pointer" @click="handleClose">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 核心内容 -->
      <div class="py-4 space-y-4">
        <!-- 运行模式说明卡片 -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-neutral-400">当前运行模式：</span>
            <span
              class="font-semibold px-2 py-0.5 rounded text-[11px]"
              :class="serverStore.isStandalone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'"
            >
              {{ serverStore.isStandalone ? '💾 纯本地单机模式 (零依赖·无须服务)' : `🌐 远程 NAS: ${serverStore.activeServer?.name}` }}
            </span>
          </div>
          <div class="text-[11px] text-neutral-400 leading-relaxed">
            <template v-if="serverStore.isStandalone">
              所有清单、四象限、看板与番茄记录持久化保存在当前设备本地，随开随用，零网络请求。随时可绑定远程 NAS 一键上传同步。
            </template>
            <template v-else>
              已连接至 {{ serverStore.baseUrl }}，多端设备将与群晖 SQLite 数据库保持实时双向一致，断网时自动无缝回退至本地离线存储。
            </template>
          </div>
        </div>

        <!-- 节点选择：单机模式 vs 远程 NAS 节点 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold text-neutral-400">
            <span>存储与同步节点选择</span>
            <button
              class="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
              @click="showAddForm = !showAddForm"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>添加 NAS 节点</span>
            </button>
          </div>

          <div class="space-y-1.5">
            <!-- 单机模式选项（永远置顶） -->
            <div
              class="flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer"
              :class="serverStore.isStandalone
                ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-sm shadow-emerald-500/10'
                : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'"
              @click="handleSelectStandalone"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center"
                  :class="serverStore.isStandalone ? 'bg-emerald-500 text-black' : 'border border-neutral-500 text-transparent'"
                >
                  <Check class="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div class="font-semibold flex items-center gap-1.5">
                    <span>本地单机模式</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">离线纯净</span>
                  </div>
                  <div class="text-[11px] text-neutral-400">直接存储在当前机器，无须后端，安全极速</div>
                </div>
              </div>
            </div>

            <!-- 已配置的 NAS 远程节点列表 -->
            <div
              v-for="srv in serverStore.servers"
              :key="srv.id"
              class="flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer"
              :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id
                ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm shadow-indigo-500/10'
                : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'"
              @click="handleSwitch(srv.id)"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center"
                  :class="!serverStore.isStandalone && serverStore.activeServerId === srv.id ? 'bg-indigo-500 text-white' : 'border border-neutral-500 text-transparent'"
                >
                  <Check class="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div class="font-semibold flex items-center gap-1.5">
                    <span>{{ srv.name }}</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">远程同步</span>
                  </div>
                  <div class="text-[11px] text-neutral-400 font-mono">{{ srv.url }}</div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="p-1 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="删除节点"
                  @click.stop="serverStore.removeServer(srv.id)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 若当前处于 NAS 节点，提供一键同步按钮 -->
        <div v-if="!serverStore.isStandalone && serverStore.activeServer" class="pt-1">
          <button
            class="w-full py-2 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            :disabled="serverStore.isSyncing"
            @click="handleSyncToRemote"
          >
            <UploadCloud class="w-3.5 h-3.5" :class="{ 'animate-bounce': serverStore.isSyncing }" />
            <span>{{ serverStore.isSyncing ? '正在同步数据...' : '一键将本地单机待办数据同步至 NAS' }}</span>
          </button>
          <div v-if="syncMsg" class="mt-1.5 text-center text-[11px] text-indigo-200 animate-in fade-in">
            {{ syncMsg }}
          </div>
        </div>

        <!-- 添加服务器表单 -->
        <div v-if="showAddForm" class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 text-xs">
          <div>
            <label class="block text-neutral-400 mb-1">节点名称</label>
            <input
              v-model="formName"
              type="text"
              placeholder="如：群晖 NAS 局域网 / 外网域名"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-neutral-400 mb-1">服务器地址 (含端口)</label>
            <input
              v-model="formUrl"
              type="text"
              placeholder="https://todo.xiaoyunjia.site:6 或 http://192.168.1.8:3001"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-neutral-400 mb-1">API 访问密钥 (可选)</label>
            <input
              v-model="formToken"
              type="password"
              placeholder="若在 NAS 的环境变量中配置了 API_TOKEN 则填写"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- 测试结果提示 -->
          <div
            v-if="testResult"
            class="p-2 rounded-lg text-xs flex items-center gap-1.5"
            :class="testResult.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'"
          >
            <CheckCircle2 v-if="testResult.success" class="w-3.5 h-3.5 shrink-0" />
            <AlertCircle v-else class="w-3.5 h-3.5 shrink-0" />
            <span>{{ testResult.message }}</span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
              :disabled="serverStore.isTesting"
              @click="handleTest"
            >
              <RefreshCw v-if="serverStore.isTesting" class="w-3 h-3 animate-spin" />
              <span>{{ serverStore.isTesting ? '正在探测...' : '测试连接' }}</span>
            </button>
            <button
              class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
              @click="handleSaveServer"
            >
              保存并连接
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
