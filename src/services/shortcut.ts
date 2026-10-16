import { isDesktopApp, showAndFocusWindow, toggleWindowVisibility } from './desktop'

export interface ShortcutConfig {
  quickAdd: string
  toggleWindow: string
  toggleMini: string
  togglePomodoro: string
  enabled: boolean
}

const STORAGE_KEY = 'auratask_shortcut_settings'

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  quickAdd: 'CommandOrControl+Shift+K',
  toggleWindow: 'CommandOrControl+Shift+T',
  toggleMini: 'CommandOrControl+Shift+M',
  togglePomodoro: 'CommandOrControl+Shift+P',
  enabled: true,
}

let unlistenTray: (() => void) | null = null
let unlistenShortcut: (() => void) | null = null

export const shortcutService = {
  getConfig(): ShortcutConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT_SHORTCUTS, ...JSON.parse(raw) }
    } catch (e) {
      console.warn('Failed to parse shortcut settings', e)
    }
    return { ...DEFAULT_SHORTCUTS }
  },

  saveConfig(config: ShortcutConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (e) {
      console.error('Failed to save shortcut settings', e)
    }
  },

  async registerAll(callbacks: {
    onQuickAdd: () => void
    onToggleWindow: () => void
    onToggleMini: () => void
    onTogglePomodoro: () => void
  }): Promise<void> {
    if (!isDesktopApp()) return

    const config = this.getConfig()
    if (!config.enabled) return

    // 1. 监听 Rust 原生系统级全局热键动作 (Windows/macOS/Linux 原生零延迟捕获，即使窗口隐藏在托盘也能秒级唤醒)
    try {
      const { listen } = await import('@tauri-apps/api/event')
      if (unlistenShortcut) unlistenShortcut()

      unlistenShortcut = await listen<string>('shortcut-action', async (event) => {
        if (event.payload === 'quick_add') {
          await showAndFocusWindow()
          callbacks.onQuickAdd()
        } else if (event.payload === 'toggle_mini') {
          callbacks.onToggleMini()
        } else if (event.payload === 'toggle_pomodoro') {
          callbacks.onTogglePomodoro()
        }
      })
    } catch (err) {
      console.warn('Failed to listen to native shortcut actions:', err)
    }

    // 2. 监听系统托盘点击动作 (Rust -> Vue)
    try {
      const { listen } = await import('@tauri-apps/api/event')
      if (unlistenTray) unlistenTray()

      unlistenTray = await listen<string>('tray-action', async (event) => {
        if (event.payload === 'quick_add') {
          await showAndFocusWindow()
          callbacks.onQuickAdd()
        } else if (event.payload === 'toggle_mini') {
          callbacks.onToggleMini()
        } else if (event.payload === 'show') {
          await showAndFocusWindow()
        }
      })
    } catch (err) {
      console.warn('Failed to listen to tray actions:', err)
    }

    console.log('[AuraTask] Native global shortcuts and tray listener successfully registered.')
  },

  async unregisterAll(): Promise<void> {
    if (unlistenShortcut) {
      unlistenShortcut()
      unlistenShortcut = null
    }
    if (unlistenTray) {
      unlistenTray()
      unlistenTray = null
    }
  },
}
