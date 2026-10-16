import { ref } from 'vue'
import { isDesktopApp } from './desktop'
import type { Update } from '@tauri-apps/plugin-updater'

export interface UpdateInfo {
  currentVersion: string
  version: string
  date?: string
  body?: string
}

export const isChecking = ref(false)
export const hasUpdate = ref(false)
export const isModalOpen = ref(false)
export const isDownloading = ref(false)
export const isDownloaded = ref(false)
export const downloadProgress = ref(0)
export const updateError = ref<string | null>(null)
export const updateInfo = ref<UpdateInfo | null>(null)

let activeUpdate: Update | null = null

export const updaterService = {
  isChecking,
  hasUpdate,
  isModalOpen,
  isDownloading,
  isDownloaded,
  downloadProgress,
  updateError,
  updateInfo,

  async checkForUpdates(silent = false): Promise<boolean> {
    if (!isDesktopApp()) {
      if (!silent) {
        alert('当前为网页模式，无需客户端更新。')
      }
      return false
    }

    try {
      isChecking.value = true
      updateError.value = null

      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()

      if (update) {
        activeUpdate = update
        hasUpdate.value = true
        updateInfo.value = {
          currentVersion: update.currentVersion,
          version: update.version,
          date: update.date,
          body: update.body,
        }
        isModalOpen.value = true
        return true
      } else {
        hasUpdate.value = false
        activeUpdate = null
        if (!silent) {
          isModalOpen.value = true
        }
        return false
      }
    } catch (err: any) {
      console.warn('Check for updates failed:', err)
      updateError.value = err?.message || String(err)
      if (!silent) {
        isModalOpen.value = true
      }
      return false
    } finally {
      isChecking.value = false
    }
  },

  async downloadAndInstall(): Promise<void> {
    if (!activeUpdate) return

    try {
      isDownloading.value = true
      downloadProgress.value = 0
      updateError.value = null

      let totalBytes = 0
      let downloadedBytes = 0

      await activeUpdate.download((event) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength || 0
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) {
            downloadProgress.value = Math.min(
              100,
              Math.round((downloadedBytes / totalBytes) * 100)
            )
          } else {
            downloadProgress.value = 50
          }
        } else if (event.event === 'Finished') {
          downloadProgress.value = 100
        }
      })

      isDownloaded.value = true

      // 安装更新
      await activeUpdate.install()

      // 重启应用以应用更新
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (err: any) {
      console.error('Failed to download or install update:', err)
      updateError.value = err?.message || '下载安装更新失败，请稍后重试'
    } finally {
      isDownloading.value = false
    }
  },

  closeModal(): void {
    isModalOpen.value = false
  },
}
