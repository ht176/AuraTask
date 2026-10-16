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

    try {
      const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')

      // 先清空旧的注册
      await unregisterAll()

      // 1. 全局极速录入待办
      try {
        await register(config.quickAdd, async (event) => {
          if (event.state === 'Pressed') {
            await showAndFocusWindow()
            callbacks.onQuickAdd()
          }
        })
      } catch (err) {
        console.warn(`Failed to register global shortcut ${config.quickAdd}:`, err)
      }

      // 同时注册 Alt+Space 作为极速录入的备选组合
      try {
        await register('Alt+Space', async (event) => {
          if (event.state === 'Pressed') {
            await showAndFocusWindow()
            callbacks.onQuickAdd()
          }
        })
      } catch {
        // 如果系统已被 Spotlight / Alfred 占用则静默忽略备用键
      }

      // 2. 全局显示/隐藏窗口
      try {
        await register(config.toggleWindow, async (event) => {
          if (event.state === 'Pressed') {
            await toggleWindowVisibility()
            callbacks.onToggleWindow()
          }
        })
      } catch (err) {
        console.warn(`Failed to register global shortcut ${config.toggleWindow}:`, err)
      }

      // 3. 全局切换迷你桌面便签
      try {
        await register(config.toggleMini, async (event) => {
          if (event.state === 'Pressed') {
            await showAndFocusWindow()
            callbacks.onToggleMini()
          }
        })
      } catch (err) {
        console.warn(`Failed to register global shortcut ${config.toggleMini}:`, err)
      }

      // 4. 全局番茄钟
      try {
        await register(config.togglePomodoro, async (event) => {
          if (event.state === 'Pressed') {
            await showAndFocusWindow()
            callbacks.onTogglePomodoro()
          }
        })
      } catch (err) {
        console.warn(`Failed to register global shortcut ${config.togglePomodoro}:`, err)
      }

      console.log('[AuraTask] Global shortcuts successfully registered.')
    } catch (err) {
      console.warn('Failed to initialize global shortcuts plugin:', err)
    }

    // 监听系统托盘点击动作 (Rust -> Vue)
    try {
      const { listen } = await import('@tauri-apps/api/event')
      if (unlistenTray) unlistenTray()

      unlistenTray = await listen<string>('tray-action', async (event) => {
        if (event.payload === 'quick_add') {
          await showAndFocusWindow()
          callbacks.onQuickAdd()
        } else if (event.payload === 'toggle_mini') {
          await showAndFocusWindow()
          callbacks.onToggleMini()
        } else if (event.payload === 'show') {
          await showAndFocusWindow()
        }
      })
    } catch (err) {
      console.warn('Failed to listen to tray actions:', err)
    }
  },

  async unregisterAll(): Promise<void> {
    if (!isDesktopApp()) return
    try {
      const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
      await unregisterAll()
    } catch (err) {
      console.warn('Failed to unregister global shortcuts:', err)
    }
    if (unlistenTray) {
      unlistenTray()
      unlistenTray = null
    }
  },
}
