<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Keyboard,
  X,
  Zap,
  Command,
  RotateCcw,
  Check,
  Sparkles,
  Edit3,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import {
  shortcutService,
  SHORTCUT_DEFINITIONS,
  type ShortcutConfig,
  type ShortcutMap,
} from '../services/shortcut'
import { isDesktopApp } from '../services/desktop'

const taskStore = useTaskStore()
const config = ref<ShortcutConfig>(shortcutService.getConfig())
const isDesktop = ref(isDesktopApp())
const isSaved = ref(false)
const recordingId = ref<keyof ShortcutMap | null>(null)
const recordingPreview = ref('')

function handleToggleEnabled() {
  config.value.enabled = !config.value.enabled
  shortcutService.saveConfig(config.value)
  showSavedToast()
}

function startRecording(id: keyof ShortcutMap) {
  recordingId.value = id
  recordingPreview.value = '按下组合键...'
}

function cancelRecording() {
  recordingId.value = null
  recordingPreview.value = ''
}

function handleResetDefaults() {
  config.value = shortcutService.resetToDefaults()
  recordingId.value = null
  recordingPreview.value = ''
  showSavedToast()
}

function showSavedToast() {
  isSaved.value = true
  setTimeout(() => (isSaved.value = false), 2000)
}

function onWindowKeyDown(e: KeyboardEvent) {
  if (!recordingId.value) return

  e.preventDefault()
  e.stopPropagation()

  // 单按 Esc 键取消录制
  if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
    cancelRecording()
    return
  }

  const res = shortcutService.parseKeyEvent(e)
  if (!res) return

  if (res.isComplete) {
    shortcutService.updateShortcutKey(recordingId.value, res.shortcut)
    config.value = shortcutService.getConfig()
    recordingId.value = null
    recordingPreview.value = ''
    showSavedToast()
  } else {
    recordingPreview.value = `${res.shortcut} + ...`
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown, true)
})

function handleClose() {
  cancelRecording()
  taskStore.isShortcutsOpen = false
}

function formatKeyBadges(shortcutStr: string): string[] {
  return shortcutStr.split('+').map(k => k.trim())
}
</script>

<template>
  <div
    v-if="taskStore.isShortcutsOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4 animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div class="w-full max-w-xl rounded-3xl glass-panel border border-black/10 dark:border-white/10 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col text-neutral-800 dark:text-neutral-200">
      <!-- 头部 -->
      <div class="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <Keyboard class="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              快捷键与系统热键配置
              <span
                v-if="isDesktop"
                class="px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1"
                :class="config.enabled ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-neutral-500/20 text-neutral-500 dark:text-neutral-400'"
              >
                <Check v-if="config.enabled" class="w-2.5 h-2.5" />
                {{ config.enabled ? '全局热键已生效' : '热键已停用' }}
              </span>
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">默认 Ctrl+Alt 组合键，支持点击自由修改定制</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- 恢复默认按钮 -->
          <button
            @click="handleResetDefaults"
            class="flex items-center gap-1 px-2.5 py-1 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs transition-colors cursor-pointer"
            title="恢复全部默认快捷键 (Ctrl+Alt+对应键位)"
          >
            <RotateCcw class="w-3 h-3" />
            <span>恢复默认</span>
          </button>

          <button class="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors" @click="handleClose">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 提示反馈横幅 -->
      <div v-if="isSaved" class="mt-3 p-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs text-center animate-in fade-in flex items-center justify-center gap-1.5 font-medium">
        <Check class="w-3.5 h-3.5" />
        <span>快捷键设置已保存并即时生效</span>
      </div>

      <!-- 核心内容滚动区 -->
      <div class="py-4 space-y-4 overflow-y-auto pr-1 text-xs">
        <!-- 快捷键清单与录制区 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-neutral-700 dark:text-neutral-300 font-semibold">
            <div class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Zap class="w-3.5 h-3.5" />
              <span>按键绑定清单 (点击键位卡片即可录制修改)</span>
            </div>
            <button
              v-if="isDesktop"
              class="px-2 py-0.5 rounded-lg border text-[11px] transition-colors cursor-pointer"
              :class="config.enabled ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-400'"
              @click="handleToggleEnabled"
            >
              {{ config.enabled ? '全局热键开启' : '点击开启全局热键' }}
            </button>
          </div>

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

              <!-- 快捷键按钮 / 录制中态 -->
              <div class="flex items-center gap-2">
                <template v-if="recordingId === item.id">
                  <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500 text-indigo-700 dark:text-indigo-300 animate-pulse font-mono font-medium text-xs">
                    <span>{{ recordingPreview || '按下新组合键...' }}</span>
                  </div>
                  <button
                    @click="cancelRecording"
                    class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                    title="取消录制 (Esc)"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </template>

                <template v-else>
                  <button
                    @click="startRecording(item.id)"
                    class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-indigo-500/15 border border-black/10 dark:border-white/10 hover:border-indigo-500/40 text-neutral-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer font-mono text-xs group/btn shadow-2xs"
                    title="点击录制自定义快捷键"
                  >
                    <span v-for="key in formatKeyBadges(config.shortcuts[item.id])" :key="key" class="font-semibold">
                      {{ key }}
                    </span>
                    <Edit3 class="w-3 h-3 ml-1 text-neutral-400 group-hover/btn:text-indigo-500 transition-colors" />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 窗口内默认便捷操作 -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-semibold">
            <Command class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>通用单键便捷速查</span>
          </div>

          <div class="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
            <div class="py-2 flex items-center justify-between">
              <div>
                <span class="text-neutral-800 dark:text-neutral-200">列表任意处直接录入待办（自动聚焦输入框）</span>
                <div class="text-[10px] text-neutral-500">非输入框焦点状态下直接按单键 N 即可极速触发</div>
              </div>
              <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-indigo-600 dark:text-indigo-300 font-semibold">N</kbd>
            </div>
            <div class="py-2 flex items-center justify-between">
              <div>
                <span class="text-neutral-800 dark:text-neutral-200">一键切换主视图</span>
                <div class="text-[10px] text-neutral-500">1:我的一天 2:收集箱 3:近期 4:四象限 5:看板 6:已完成</div>
              </div>
              <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-neutral-200">数字键 1 ~ 6</kbd>
            </div>
            <div class="py-2 flex items-center justify-between">
              <div>
                <span class="text-neutral-800 dark:text-neutral-200">随时查阅操作手册指南</span>
                <div class="text-[10px] text-neutral-500">免除组合键，单键直达使用说明与四象限指导</div>
              </div>
              <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-neutral-200">F1</kbd>
            </div>
            <div class="py-2 flex items-center justify-between">
              <span class="text-neutral-800 dark:text-neutral-200">快速关闭弹窗 / 取消聚焦 / 退出抽屉</span>
              <kbd class="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-800 dark:text-neutral-200">Esc</kbd>
            </div>
          </div>
        </div>

        <!-- 智能语法速查 -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-semibold">
            <Sparkles class="w-3.5 h-3.5 text-amber-500" />
            <span>智能自然语言语法 (NLP)</span>
          </div>

          <div class="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5 text-neutral-700 dark:text-neutral-300">
            <div class="p-2 rounded-xl bg-black/5 dark:bg-white/[0.03] font-mono text-indigo-700 dark:text-indigo-300 text-[11px]">
              明天下午3点 买咖啡 !高 #生活 *2
            </div>
            <ul class="space-y-1 text-[11px] text-neutral-600 dark:text-neutral-400 list-disc list-inside">
              <li><strong class="text-neutral-900 dark:text-white">时间词</strong>：支持 <code class="text-amber-600 dark:text-amber-300 font-mono">今天</code>、<code class="text-amber-600 dark:text-amber-300 font-mono">明天</code>、<code class="text-amber-600 dark:text-amber-300 font-mono">后天</code>、<code class="text-amber-600 dark:text-amber-300 font-mono">周一~周日</code> 自动提取日期与截止时间</li>
              <li><strong class="text-neutral-900 dark:text-white">优先级</strong>：输入 <code class="text-rose-600 dark:text-rose-300 font-mono">!高</code> (P1)、<code class="text-amber-600 dark:text-amber-300 font-mono">!中</code> (P2)、<code class="text-blue-600 dark:text-blue-300 font-mono">!低</code> (P3) 自动映射四象限</li>
              <li><strong class="text-neutral-900 dark:text-white">标签归类</strong>：以 <code class="text-indigo-600 dark:text-indigo-300 font-mono">#标签名</code> 标记分类</li>
              <li><strong class="text-neutral-900 dark:text-white">番茄专注预估</strong>：输入 <code class="text-emerald-600 dark:text-emerald-300 font-mono">*2</code> 自动设置预估 2 个番茄钟</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
