<script setup lang="ts">
import { ref } from 'vue'
import {
  Keyboard,
  X,
  Zap,
  Command,
  Sliders,
  Check,
  Sparkles,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { shortcutService, type ShortcutConfig } from '../services/shortcut'
import { isDesktopApp } from '../services/desktop'

const taskStore = useTaskStore()
const config = ref<ShortcutConfig>(shortcutService.getConfig())
const isDesktop = ref(isDesktopApp())
const isSaved = ref(false)

function handleToggleEnabled() {
  config.value.enabled = !config.value.enabled
  shortcutService.saveConfig(config.value)
  isSaved.value = true
  setTimeout(() => (isSaved.value = false), 2000)
}

function handleClose() {
  taskStore.isShortcutsOpen = false
}
</script>

<template>
  <div
    v-if="taskStore.isShortcutsOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4 animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div class="w-full max-w-lg rounded-3xl glass-panel border border-white/10 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Keyboard class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              快捷键与全局热键
              <span
                v-if="isDesktop"
                class="px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1"
                :class="config.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-500/20 text-neutral-400'"
              >
                <Check v-if="config.enabled" class="w-2.5 h-2.5" />
                {{ config.enabled ? '全局热键已启用' : '已停用' }}
              </span>
            </h3>
            <p class="text-xs text-neutral-400">无需切换到应用，即可随时随地唤出待办与专注</p>
          </div>
        </div>
        <button class="p-1.5 hover:text-white text-neutral-400 cursor-pointer" @click="handleClose">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 核心内容滚动区 -->
      <div class="py-4 space-y-5 overflow-y-auto pr-1 text-xs">
        <!-- 全局热键（桌面原生独享） -->
        <div v-if="isDesktop" class="space-y-2">
          <div class="flex items-center justify-between text-neutral-300 font-semibold">
            <div class="flex items-center gap-1.5 text-indigo-400">
              <Zap class="w-3.5 h-3.5" />
              <span>全局系统快捷键（随时随地生效）</span>
            </div>
            <button
              class="px-2 py-0.5 rounded-lg border text-[11px] transition-colors cursor-pointer"
              :class="config.enabled ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-neutral-400'"
              @click="handleToggleEnabled"
            >
              {{ config.enabled ? '已开启' : '点击开启' }}
            </button>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
            <div class="py-2 flex items-center justify-between">
              <div>
                <div class="font-medium text-white">全局极速录入待办</div>
                <div class="text-[11px] text-neutral-400">任意软件中一键呼出待办录入框</div>
              </div>
              <div class="flex items-center gap-1">
                <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">Option + Space</kbd>
                <span class="text-neutral-500 text-[10px]">或</span>
                <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">⌘ Shift K</kbd>
              </div>
            </div>

            <div class="py-2 flex items-center justify-between">
              <div>
                <div class="font-medium text-white">显示 / 隐藏主窗口</div>
                <div class="text-[11px] text-neutral-400">一键快速置顶或最小化主界面</div>
              </div>
              <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">⌘ Shift T</kbd>
            </div>

            <div class="py-2 flex items-center justify-between">
              <div>
                <div class="font-medium text-white">切换迷你悬浮便签</div>
                <div class="text-[11px] text-neutral-400">进入/退出桌面置顶小窗便签模式</div>
              </div>
              <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">⌘ Shift M</kbd>
            </div>

            <div class="py-2 flex items-center justify-between">
              <div>
                <div class="font-medium text-white">唤起番茄专注钟</div>
                <div class="text-[11px] text-neutral-400">随时开启或暂停心流番茄钟</div>
              </div>
              <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">⌘ Shift P</kbd>
            </div>
          </div>
        </div>

        <!-- 窗口内常用快捷键 -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <Command class="w-3.5 h-3.5 text-emerald-400" />
            <span>应用内快捷键（窗口激活时）</span>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
            <div class="py-2 flex items-center justify-between">
              <span class="text-neutral-200">呼出极速录入弹窗</span>
              <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-white">⌘ K / Ctrl K</kbd>
            </div>
            <div class="py-2 flex items-center justify-between">
              <span class="text-neutral-200">切换视图（我的一天 / 收集箱 / 近期 / 四象限 / 看板）</span>
              <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-white">按数字键 1 ~ 5</kbd>
            </div>
            <div class="py-2 flex items-center justify-between">
              <span class="text-neutral-200">快速关闭弹窗 / 取消聚焦 / 退出抽屉</span>
              <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-white">Esc</kbd>
            </div>
          </div>
        </div>

        <!-- 智能语法速查 -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>智能自然语言语法 (NLP)</span>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-neutral-300">
            <div class="p-2 rounded-xl bg-white/[0.03] font-mono text-indigo-300 text-[11px]">
              明天下午3点 买咖啡 !高 #生活 *2
            </div>
            <ul class="space-y-1 text-[11px] text-neutral-400 list-disc list-inside">
              <li><strong class="text-white">时间词</strong>：支持 <code class="text-amber-300">今天</code>、<code class="text-amber-300">明天</code>、<code class="text-amber-300">后天</code>、<code class="text-amber-300">周一~周日</code> 等智能提取</li>
              <li><strong class="text-white">优先级</strong>：输入 <code class="text-rose-300">!高</code> (P1)、<code class="text-amber-300">!中</code> (P2)、<code class="text-blue-300">!低</code> (P3) 自动设定权重</li>
              <li><strong class="text-white">标签归类</strong>：以 <code class="text-indigo-300">#标签名</code> 标记（如 #工作 #日常）</li>
              <li><strong class="text-white">番茄钟预估</strong>：输入 <code class="text-emerald-300">*2</code> 自动设置预估 2 个番茄钟</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
