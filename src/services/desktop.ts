export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /android|iphone|ipad|ipod|mobile/i.test(ua)
}

export function isDesktopApp(): boolean {
  return isTauriApp() && !isMobileDevice()
}

export function isWebApp(): boolean {
  return !isTauriApp()
}

export async function minimizeWindow() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.minimize()
  } catch (err) {
    console.warn('Failed to minimize window', err)
  }
}

export async function toggleMaximizeWindow() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.toggleMaximize()
  } catch (err) {
    console.warn('Failed to toggle maximize window', err)
  }
}

export async function closeWindow() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.hide()
  } catch (err) {
    console.warn('Failed to hide window', err)
  }
}

export async function isWindowMaximized(): Promise<boolean> {
  if (!isDesktopApp()) return false
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    return await win.isMaximized()
  } catch {
    return false
  }
}

export const DEFAULT_WINDOW_WIDTH = 1120
export const DEFAULT_WINDOW_HEIGHT = 740
export const MINI_WINDOW_WIDTH = 250
export const MINI_WINDOW_HEIGHT = 320

export async function enterMiniMode() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const isMax = await win.isMaximized().catch(() => false)
    if (isMax) {
      await win.unmaximize().catch(() => {})
      await new Promise(r => setTimeout(r, 60))
    }
    await win.unminimize().catch(() => {})
    await win.show().catch(() => {})
    await win.setMaximizable(false).catch(() => {})
    await win.setResizable(true).catch(() => {})
    await win.setMinSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
    await win.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
    setTimeout(async () => {
      try {
        await win.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
      } catch {}
    }, 60)
    await win.setAlwaysOnTop(true).catch(() => {})
    await win.setFocus().catch(() => {})
    if (typeof window !== 'undefined') {
      window.focus()
    }
  } catch (err) {
    console.warn('Failed to enter mini mode', err)
  }
}

/**
 * 待办到期自动唤醒迷你便签小窗 (强置顶、取消最小化、聚焦并请求系统注意)
 */
export async function wakeUpMiniWindow() {
  if (isDesktopApp()) {
    try {
      const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      const isMax = await win.isMaximized().catch(() => false)
      if (isMax) {
        await win.unmaximize().catch(() => {})
        await new Promise(r => setTimeout(r, 60))
      }
      await win.unminimize().catch(() => {})
      await win.show().catch(() => {})
      await win.setMaximizable(false).catch(() => {})
      await win.setResizable(true).catch(() => {})
      await win.setMinSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
      await win.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
      setTimeout(async () => {
        try {
          await win.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
        } catch {}
      }, 60)
      await win.setAlwaysOnTop(true).catch(() => {})
      await win.setFocus().catch(() => {})
      try {
        await (win as any).requestUserAttention(2) // 2: Informational / Critical
      } catch {}
    } catch (err) {
      console.warn('Failed to wake up mini window', err)
    }
  }
  if (typeof window !== 'undefined') {
    window.focus()
  }
}

export async function exitMiniMode() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.setAlwaysOnTop(false)
    await win.setResizable(true)
    await win.setMaximizable(true)
    await win.setMinSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
    await win.setSize(new LogicalSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT))
    await win.center()
    await win.setFocus()
  } catch (err) {
    console.warn('Failed to exit mini mode', err)
  }
}

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isDesktopApp()) return false
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch (err) {
    console.warn('Failed to check autostart status', err)
    return false
  }
}

export async function setAutostartEnabled(enableLaunch: boolean): Promise<boolean> {
  if (!isDesktopApp()) return false
  try {
    const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart')
    if (enableLaunch) {
      await enable()
    } else {
      await disable()
    }
    return await isEnabled()
  } catch (err) {
    console.warn('Failed to toggle autostart', err)
    return false
  }
}

export async function showAndFocusWindow() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.unminimize()
    await win.show()
    await win.setFocus()
    if (typeof window !== 'undefined') {
      window.focus()
    }
  } catch (err) {
    console.warn('Failed to show and focus window', err)
  }
}

export async function toggleWindowVisibility() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const isVisible = await win.isVisible()
    if (isVisible) {
      await win.hide()
    } else {
      await win.unminimize()
      await win.show()
      await win.setFocus()
    }
  } catch (err) {
    console.warn('Failed to toggle window visibility', err)
  }
}

