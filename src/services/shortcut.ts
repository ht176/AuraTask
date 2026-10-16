import { isDesktopApp, showAndFocusWindow } from './desktop'

export interface ShortcutMap {
  quickAdd: string
  toggleWindow: string
  toggleMini: string
  togglePomodoro: string
  userGuide: string
  shortcutsPanel: string
}

export interface ShortcutConfig {
  enabled: boolean
  shortcuts: ShortcutMap
}

export interface ShortcutItemDef {
  id: keyof ShortcutMap
  name: string
  desc: string
  defaultKey: string
  isGlobal: boolean
}

const STORAGE_KEY = 'auratask_shortcut_settings_v2'

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  quickAdd: 'Ctrl+Alt+K',
  toggleWindow: 'Ctrl+Alt+T',
  toggleMini: 'Ctrl+Alt+M',
  togglePomodoro: 'Ctrl+Alt+P',
  userGuide: 'Ctrl+Alt+H',
  shortcutsPanel: 'Ctrl+Alt+/',
}

export const SHORTCUT_DEFINITIONS: ShortcutItemDef[] = [
  {
    id: 'quickAdd',
    name: '全局极速录入待办',
    desc: '任意软件中一键唤醒 Spotlight 极速录入框',
    defaultKey: 'Ctrl+Alt+K',
    isGlobal: true,
  },
  {
    id: 'toggleWindow',
    name: '显示 / 隐藏主窗口',
    desc: '一键将应用窗口置顶显示或最小化到系统托盘',
    defaultKey: 'Ctrl+Alt+T',
    isGlobal: true,
  },
  {
    id: 'toggleMini',
    name: '切换迷你悬浮便签',
    desc: '进入/退出桌面置顶小窗极简便签模式',
    defaultKey: 'Ctrl+Alt+M',
    isGlobal: true,
  },
  {
    id: 'togglePomodoro',
    name: '随时唤起番茄钟',
    desc: '开启、暂停或快速检视 25 分钟专注心流计时',
    defaultKey: 'Ctrl+Alt+P',
    isGlobal: true,
  },
  {
    id: 'userGuide',
    name: '打开操作手册指南',
    desc: '查阅完整操作技巧与智能语法（同时支持 F1）',
    defaultKey: 'Ctrl+Alt+H',
    isGlobal: false,
  },
  {
    id: 'shortcutsPanel',
    name: '打开快捷键速查面板',
    desc: '查看与自定义所有快捷键位绑定',
    defaultKey: 'Ctrl+Alt+/',
    isGlobal: false,
  },
]

let unlistenTray: (() => void) | null = null
let unlistenShortcut: (() => void) | null = null
let cachedCallbacks: {
  onQuickAdd: () => void
  onToggleWindow: () => void
  onToggleMini: () => void
  onTogglePomodoro: () => void
} | null = null

export const shortcutService = {
  getConfig(): ShortcutConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          enabled: parsed.enabled ?? true,
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(parsed.shortcuts || {}) },
        }
      }
    } catch (e) {
      console.warn('[Shortcut] Failed to parse shortcut settings, fallback to defaults', e)
    }
    return {
      enabled: true,
      shortcuts: { ...DEFAULT_SHORTCUTS },
    }
  },

  saveConfig(config: ShortcutConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      // 如果已有桌面端回调，重新动态绑定全局快捷键
      if (cachedCallbacks) {
        this.registerAll(cachedCallbacks)
      }
    } catch (e) {
      console.error('[Shortcut] Failed to save shortcut settings', e)
    }
  },

  updateShortcutKey(id: keyof ShortcutMap, newKey: string): void {
    const config = this.getConfig()
    config.shortcuts[id] = newKey.trim()
    this.saveConfig(config)
  },

  resetToDefaults(): ShortcutConfig {
    const fresh: ShortcutConfig = {
      enabled: true,
      shortcuts: { ...DEFAULT_SHORTCUTS },
    }
    this.saveConfig(fresh)
    return fresh
  },

  /**
   * 将友好的快捷键字符串格式化为统一大写标识
   * 如 "ctrl+alt+k" -> "Ctrl+Alt+K"
   */
  normalizeShortcut(str: string): string {
    return str
      .split('+')
      .map(part => {
        const p = part.trim().toLowerCase()
        if (p === 'ctrl' || p === 'control') return 'Ctrl'
        if (p === 'alt' || p === 'opt' || p === 'option') return 'Alt'
        if (p === 'shift') return 'Shift'
        if (p === 'cmd' || p === 'command' || p === 'meta') return 'Cmd'
        return p.toUpperCase()
      })
      .join('+')
  },

  /**
   * 将快捷键转化为 Tauri global-shortcut 规范字符串
   */
  toTauriShortcut(str: string): string {
    return str
      .split('+')
      .map(p => {
        const lower = p.trim().toLowerCase()
        if (lower === 'ctrl' || lower === 'control') return 'Control'
        if (lower === 'alt' || lower === 'opt' || lower === 'option') return 'Alt'
        if (lower === 'shift') return 'Shift'
        if (lower === 'cmd' || lower === 'command' || lower === 'meta') return 'CommandOrControl'
        return p.trim().toUpperCase()
      })
      .join('+')
  },

  /**
   * 判断一个键盘事件是否精确匹配某个动作配置的快捷键
   */
  matches(e: KeyboardEvent, actionId: keyof ShortcutMap): boolean {
    const config = this.getConfig()
    const shortcutStr = config.shortcuts[actionId]
    if (!shortcutStr) return false

    return this.matchEventWithKey(e, shortcutStr)
  },

  /**
   * 键盘事件匹配逻辑，兼顾跨平台与 Alt 产生的字符映射（如 macOS Option 键）
   */
  matchEventWithKey(e: KeyboardEvent, shortcutStr: string): boolean {
    const parts = shortcutStr.split('+').map(p => p.trim().toLowerCase())
    const hasCtrl = parts.includes('ctrl') || parts.includes('control')
    const hasAlt = parts.includes('alt') || parts.includes('opt') || parts.includes('option')
    const hasShift = parts.includes('shift')
    const hasCmd = parts.includes('cmd') || parts.includes('command') || parts.includes('meta')

    // 修饰键匹配
    const ctrlOk = hasCtrl ? e.ctrlKey : !e.ctrlKey
    const altOk = hasAlt ? e.altKey : !e.altKey
    const shiftOk = hasShift ? e.shiftKey : !e.shiftKey
    const cmdOk = hasCmd ? e.metaKey : !e.metaKey

    if (!ctrlOk || !altOk || !shiftOk || !cmdOk) return false

    // 获取非修饰键目标主体
    const mainKey = parts.find(
      p => !['ctrl', 'control', 'alt', 'opt', 'option', 'shift', 'cmd', 'command', 'meta'].includes(p)
    )
    if (!mainKey) return false

    const codeLower = e.code.toLowerCase()
    const keyLower = e.key.toLowerCase()
    const targetLower = mainKey.toLowerCase()

    // 匹配常规字母键 (code 为 KeyA ~ KeyZ)
    if (codeLower === `key${targetLower}`) return true
    // 匹配数字键 (code 为 Digit0 ~ Digit9)
    if (codeLower === `digit${targetLower}`) return true
    // 匹配斜杠 / (包含 macOS Option 产生的特殊字符 ÷)
    if (targetLower === '/' && (codeLower === 'slash' || keyLower === '/' || keyLower === '÷' || keyLower === '?')) {
      return true
    }
    // 匹配空格键
    if (targetLower === 'space' && (codeLower === 'space' || keyLower === ' ')) return true
    // 匹配回车键
    if (targetLower === 'enter' && (codeLower === 'enter' || keyLower === 'enter')) return true
    // 匹配原生 key
    if (keyLower === targetLower) return true

    return false
  },

  /**
   * 录制用户按下键盘的快捷键组合
   */
  parseKeyEvent(e: KeyboardEvent): { shortcut: string; isComplete: boolean; hasModifier: boolean } | null {
    const isModifierKey = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Cmd')

    const hasModifier = parts.length > 0

    // 如果用户当前只按下了修饰键本身，尚未按下主键，标记为未完成
    if (isModifierKey) {
      return {
        shortcut: parts.join('+'),
        isComplete: false,
        hasModifier,
      }
    }

    // 提取主键名称
    let keyName = ''
    if (e.code.startsWith('Key')) {
      keyName = e.code.slice(3).toUpperCase()
    } else if (e.code.startsWith('Digit')) {
      keyName = e.code.slice(5)
    } else if (e.code === 'Slash') {
      keyName = '/'
    } else if (e.code === 'Space') {
      keyName = 'Space'
    } else if (e.code === 'Enter') {
      keyName = 'Enter'
    } else if (e.code.startsWith('F') && !isNaN(Number(e.code.slice(1)))) {
      keyName = e.code.toUpperCase()
    } else if (e.key && e.key.length === 1) {
      keyName = e.key.toUpperCase()
    } else {
      keyName = e.key
    }

    parts.push(keyName)

    return {
      shortcut: parts.join('+'),
      // 必须包含至少一个修饰键 + 一个有效主键才算录制完整
      isComplete: hasModifier && parts.length >= 2,
      hasModifier,
    }
  },

  async registerAll(callbacks: {
    onQuickAdd: () => void
    onToggleWindow: () => void
    onToggleMini: () => void
    onTogglePomodoro: () => void
  }): Promise<void> {
    cachedCallbacks = callbacks
    if (!isDesktopApp()) return

    const config = this.getConfig()
    if (!config.enabled) {
      await this.unregisterAll()
      return
    }

    // 1. 尝试使用 @tauri-apps/plugin-global-shortcut 进行动态全局热键绑定
    try {
      const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
      await unregisterAll()

      const quickAddKey = this.toTauriShortcut(config.shortcuts.quickAdd)
      if (quickAddKey) {
        await register(quickAddKey, async (ev) => {
          if (ev.state === 'Pressed') {
            await showAndFocusWindow()
            callbacks.onQuickAdd()
          }
        })
      }

      const toggleWinKey = this.toTauriShortcut(config.shortcuts.toggleWindow)
      if (toggleWinKey) {
        await register(toggleWinKey, async (ev) => {
          if (ev.state === 'Pressed') {
            callbacks.onToggleWindow()
          }
        })
      }

      const toggleMiniKey = this.toTauriShortcut(config.shortcuts.toggleMini)
      if (toggleMiniKey) {
        await register(toggleMiniKey, async (ev) => {
          if (ev.state === 'Pressed') {
            callbacks.onToggleMini()
          }
        })
      }

      const togglePomodoroKey = this.toTauriShortcut(config.shortcuts.togglePomodoro)
      if (togglePomodoroKey) {
        await register(togglePomodoroKey, async (ev) => {
          if (ev.state === 'Pressed') {
            callbacks.onTogglePomodoro()
          }
        })
      }

      console.log('[AuraTask] Custom global shortcuts dynamically registered:', config.shortcuts)
    } catch (err) {
      console.warn('[AuraTask] Dynamic plugin-global-shortcut register fallback to native event listener:', err)
    }

    // 2. 同时监听 Rust 底层事件 (兜底默认绑定与系统托盘操作)
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
      console.warn('[AuraTask] Failed to listen to native shortcut actions:', err)
    }

    // 3. 监听系统托盘点击动作 (Rust -> Vue)
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
      console.warn('[AuraTask] Failed to listen to tray actions:', err)
    }
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
    if (isDesktopApp()) {
      try {
        const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
        await unregisterAll()
      } catch (e) {
        // ignore
      }
    }
  },
}
