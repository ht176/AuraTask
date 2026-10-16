<script setup lang="ts">
import {
  updaterService,
  isModalOpen,
  hasUpdate,
  isDownloading,
  downloadProgress,
  updateError,
  updateInfo,
  isChecking,
} from '../services/updater'
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-vue-next'

function handleClose() {
  if (isDownloading.value) return
  updaterService.closeModal()
}

function handleUpdate() {
  updaterService.downloadAndInstall()
}

function handleRetry() {
  updaterService.checkForUpdates(false)
}

function openGitHubReleases() {
  window.open('https://github.com/ht176/AuraTask/releases', '_blank')
}
</script>

<template>
  <div
    v-if="isModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-md glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- 头部 -->
      <div class="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            :class="
              hasUpdate
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
                : updateError
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            "
          >
            <Sparkles v-if="hasUpdate" class="w-4 h-4" />
            <AlertTriangle v-else-if="updateError" class="w-4 h-4" />
            <CheckCircle2 v-else class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white tracking-wide">
              {{ hasUpdate ? '软件更新' : updateError ? '检查更新失败' : '当前已是最新' }}
            </h3>
            <p class="text-[11px] text-neutral-400">
              {{ hasUpdate ? '发现新版本可供升级' : updateError ? '网络连接或更新检测异常' : 'AuraTask 运行正常' }}
            </p>
          </div>
        </div>

        <button
          v-if="!isDownloading"
          @click="handleClose"
          class="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 内容区 -->
      <div class="p-5 space-y-4 text-xs">
        <!-- 发现新版本状态 -->
        <template v-if="hasUpdate && updateInfo">
          <!-- 版本号流向 -->
          <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-3.5">
            <div class="text-left">
              <span class="text-[10px] text-neutral-500 block uppercase tracking-wider">当前版本</span>
              <span class="text-xs font-medium text-neutral-300">v{{ updateInfo.currentVersion }}</span>
            </div>

            <div class="flex items-center justify-center px-3 text-neutral-500">
              <ArrowRight class="w-4 h-4 text-indigo-400" />
            </div>

            <div class="text-right">
              <span class="text-[10px] text-indigo-400 block uppercase tracking-wider font-semibold">最新版本</span>
              <span class="text-xs font-semibold text-white">v{{ updateInfo.version }}</span>
            </div>
          </div>

          <!-- 更新日志 -->
          <div v-if="updateInfo.body" class="space-y-1.5">
            <span class="text-[11px] font-medium text-neutral-400">更新内容：</span>
            <div
              class="max-h-36 overflow-y-auto p-3 bg-black/30 border border-white/5 rounded-xl text-neutral-300 whitespace-pre-wrap leading-relaxed select-text"
            >
              {{ updateInfo.body }}
            </div>
          </div>

          <!-- 下载进度条 -->
          <div v-if="isDownloading" class="space-y-2 pt-1">
            <div class="flex justify-between text-[11px]">
              <span class="text-neutral-400 flex items-center gap-1.5">
                <Download class="w-3.5 h-3.5 animate-bounce text-indigo-400" />
                正在下载更新包...
              </span>
              <span class="font-medium text-indigo-400">{{ downloadProgress }}%</span>
            </div>
            <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                :style="{ width: `${downloadProgress}%` }"
              ></div>
            </div>
          </div>
        </template>

        <!-- 无新版本状态 -->
        <template v-else-if="!updateError">
          <div class="py-4 text-center space-y-2">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 class="w-6 h-6" />
            </div>
            <p class="text-sm font-medium text-white">您使用的是最新版本</p>
            <p class="text-[11px] text-neutral-400">
              当前客户端已具备所有全新功能，无需进行更新。
            </p>
          </div>
        </template>

        <!-- 错误状态 -->
        <template v-else>
          <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
            <div class="flex items-center gap-1.5 text-red-400 font-medium">
              <AlertTriangle class="w-3.5 h-3.5" />
              <span>检测更新失败</span>
            </div>
            <p class="text-[11px] text-red-300/80 leading-relaxed break-all">
              {{ updateError }}
            </p>
          </div>
        </template>
      </div>

      <!-- 底部操作按钮 -->
      <div class="px-5 py-3.5 bg-black/20 border-t border-white/5 flex items-center justify-between">
        <button
          @click="openGitHubReleases"
          class="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ExternalLink class="w-3 h-3" />
          查看 GitHub Releases
        </button>

        <div class="flex items-center gap-2">
          <template v-if="hasUpdate">
            <button
              v-if="!isDownloading"
              @click="handleClose"
              class="px-3 py-1.5 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 transition-all text-xs"
            >
              稍后再说
            </button>
            <button
              @click="handleUpdate"
              :disabled="isDownloading"
              class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download class="w-3.5 h-3.5" />
              {{ isDownloading ? '下载安装中...' : '立即升级并重启' }}
            </button>
          </template>

          <template v-else-if="updateError">
            <button
              @click="handleRetry"
              :disabled="isChecking"
              class="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              重试检测
            </button>
          </template>

          <template v-else>
            <button
              @click="handleClose"
              class="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-all"
            >
              完成
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
