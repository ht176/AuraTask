<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Server,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-vue-next'
import { useServerStore, type ServerConfig } from '../stores/server'
import { useTaskStore } from '../stores/task'

const serverStore = useServerStore()
const taskStore = useTaskStore()

const showAddForm = ref(false)
const formName = ref('群晖 NAS')
const formUrl = ref('http://192.168.1.100:3001')
const formToken = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)

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

async function handleSwitch(id: string) {
  serverStore.activeServerId = id
  serverStore.saveConfig()
  await taskStore.init()
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
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Server class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              NAS 后台服务对接设置
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1"
                :class="serverStore.isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'"
              >
                <Wifi v-if="serverStore.isConnected" class="w-2.5 h-2.5" />
                <WifiOff v-else class="w-2.5 h-2.5" />
                {{ serverStore.isConnected ? '已连接' : '待连接' }}
              </span>
            </h3>
            <p class="text-xs text-neutral-400">配置客户端直连的 NAS 服务端地址与密钥</p>
          </div>
        </div>
        <button class="p-1.5 hover:text-white text-neutral-400 cursor-pointer" @click="handleClose">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 核心内容 -->
      <div class="py-4 space-y-4">
        <!-- 当前连接节点状态卡片 -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-neutral-400">当前活跃服务器：</span>
            <span class="font-mono text-indigo-300 font-semibold">{{ serverStore.baseUrl || '默认当前域 / 内置服务' }}</span>
          </div>
          <div class="text-[11px] text-neutral-500">
            桌面客户端与 NAS 部署的服务端将通过标准 REST API 与 SQLite 数据库双向实时同步。
          </div>
        </div>

        <!-- 服务器节点列表 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold text-neutral-400">
            <span>已保存的节点 (支持内网/外网切换)</span>
            <button
              class="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
              @click="showAddForm = !showAddForm"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>添加节点</span>
            </button>
          </div>

          <div v-if="serverStore.servers.length > 0" class="space-y-1.5">
            <div
              v-for="srv in serverStore.servers"
              :key="srv.id"
              class="flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer"
              :class="serverStore.activeServerId === srv.id
                ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                : 'bg-white/5 border-transparent text-neutral-300 hover:bg-white/10'"
              @click="handleSwitch(srv.id)"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 v-if="serverStore.activeServerId === srv.id" class="w-4 h-4 text-indigo-400" />
                <div class="w-4 h-4 rounded-full border border-neutral-500" v-else></div>
                <div>
                  <div class="font-semibold">{{ srv.name }}</div>
                  <div class="text-[11px] text-neutral-400 font-mono">{{ srv.url }}</div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                  title="删除"
                  @click.stop="serverStore.removeServer(srv.id)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-xs text-neutral-500 py-2 text-center bg-white/[0.02] rounded-xl border border-dashed border-white/10">
            暂未添加远程 NAS 节点，默认直连本地服务
          </div>
        </div>

        <!-- 添加服务器表单 -->
        <div v-if="showAddForm" class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 text-xs">
          <div>
            <label class="block text-neutral-400 mb-1">节点名称</label>
            <input
              v-model="formName"
              type="text"
              placeholder="如：家庭群晖 NAS (局域网) / 外网访问"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-neutral-400 mb-1">服务器地址 (含端口)</label>
            <input
              v-model="formUrl"
              type="text"
              placeholder="http://192.168.1.100:3001 或 https://todo.nas.com"
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
