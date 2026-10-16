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
export const MINI_WINDOW_WIDTH = 340
export const MINI_WINDOW_HEIGHT = 460

export async function enterMiniMode() {
  if (!isDesktopApp()) return
  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.setMaximizable(false)
    await win.setResizable(true)
    await win.setMinSize(new LogicalSize(300, 320))
    await win.setSize(new LogicalSize(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT))
    await win.setAlwaysOnTop(true)
  } catch (err) {
    console.warn('Failed to enter mini mode', err)
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
    await win.setMinSize(new LogicalSize(480, 500))
    await win.setSize(new LogicalSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT))
    await win.center()
    await win.setFocus()
  } catch (err) {
    console.warn('Failed to exit mini mode', err)
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

