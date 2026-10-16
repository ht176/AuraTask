import { defineStore } from 'pinia'
import { isTauriApp } from '../services/desktop'
import { localDb } from '../services/localDb'

export interface ServerConfig {
  id: string
  name: string
  url: string
  token?: string
}

const STORAGE_KEY = 'auratask_servers'
const ACTIVE_ID_KEY = 'auratask_active_server_id'

export const useServerStore = defineStore('server', {
  state: () => ({
    servers: [] as ServerConfig[],
    activeServerId: 'standalone',
    isConnected: true,
    isSettingsOpen: false,
    settingsInitialTab: 'server' as 'server' | 'theme' | 'tags' | 'shortcuts' | 'backup' | 'about',
    isTesting: false,
    isSyncing: false,
  }),

  getters: {
    isStandalone(state): boolean {
      if (state.activeServerId === 'standalone') return true
      if (state.servers.length === 0) return true
      const active = state.servers.find(s => s.id === state.activeServerId)
      return !active || !active.url
    },
    activeServer(state): ServerConfig | null {
      if (state.activeServerId === 'standalone') return null
      return state.servers.find(s => s.id === state.activeServerId) || null
    },
    baseUrl(): string {
      if (this.isStandalone) {
        return ''
      }
      if (!isTauriApp()) {
        const custom = this.activeServer?.url
        return custom ? custom.replace(/\/+$/, '') : ''
      }
      if (this.activeServer?.url) {
        return this.activeServer.url.replace(/\/+$/, '')
      }
      return 'http://localhost:3001'
    },
    authToken(): string | undefined {
      return this.activeServer?.token
    }
  },

  actions: {
    openSettings(tab: 'server' | 'theme' | 'tags' | 'shortcuts' | 'backup' | 'about' = 'server') {
      this.settingsInitialTab = tab
      this.isSettingsOpen = true
    },

    loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          this.servers = JSON.parse(raw)
        }
        const activeId = localStorage.getItem(ACTIVE_ID_KEY)
        if (activeId === 'standalone') {
          this.activeServerId = 'standalone'
        } else if (activeId && this.servers.some(s => s.id === activeId)) {
          this.activeServerId = activeId
        } else if (this.servers.length > 0) {
          this.activeServerId = this.servers[0].id
        } else {
          this.activeServerId = 'standalone'
        }
      } catch (err) {
        console.warn('Failed to load server config', err)
      }
    },

    saveConfig() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.servers))
      localStorage.setItem(ACTIVE_ID_KEY, this.activeServerId)
    },

    setStandalone() {
      this.activeServerId = 'standalone'
      this.isConnected = true
      this.saveConfig()
    },

    async testConnection(url: string, token?: string): Promise<{ success: boolean; message: string }> {
      this.isTesting = true
      try {
        const cleanUrl = url.replace(/\/+$/, '')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(`${cleanUrl}/api/ping`, {
          headers,
          signal: controller.signal
        })
        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          this.isConnected = true
          return { success: true, message: data.message || '连接成功！' }
        } else if (res.status === 401) {
          return { success: false, message: '认证失败：API Token 不匹配' }
        } else {
          return { success: false, message: `连接异常：HTTP ${res.status}` }
        }
      } catch (err: any) {
        this.isConnected = false
        if (err.name === 'AbortError') {
          return { success: false, message: '连接超时，请检查远程节点 IP/域名及端口是否开放' }
        }
        return { success: false, message: '无法连接到服务器，请检查网络或地址' }
      } finally {
        this.isTesting = false
      }
    },

    async addOrUpdateServer(config: ServerConfig): Promise<boolean> {
      const res = await this.testConnection(config.url, config.token)
      if (res.success) {
        const idx = this.servers.findIndex(s => s.id === config.id)
        if (idx >= 0) {
          this.servers[idx] = config
        } else {
          this.servers.push(config)
        }
        this.activeServerId = config.id
        this.saveConfig()
        return true
      }
      return false
    },

    removeServer(id: string) {
      this.servers = this.servers.filter(s => s.id !== id)
      if (this.activeServerId === id) {
        this.activeServerId = this.servers[0]?.id || 'standalone'
      }
      this.saveConfig()
    },

    // 将单机版现有数据全量同步上传到远程节点
    async syncLocalDataToRemote(): Promise<{ success: boolean; count: number; error?: string }> {
      if (this.isStandalone || !this.baseUrl) {
        return { success: false, count: 0, error: '当前未连接远程数据同步节点' }
      }

      this.isSyncing = true
      try {
        const backupData = localDb.exportBackupData()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`

        const res = await fetch(`${this.baseUrl}/api/backup/import`, {
          method: 'POST',
          headers,
          body: JSON.stringify(backupData),
        })
        const data = await res.json()
        if (data.success) {
          return { success: true, count: data.importedTasks || backupData.tasks.length }
        }
        return { success: false, count: 0, error: data.error || '上传同步失败' }
      } catch (err: any) {
        return { success: false, count: 0, error: err.message || '网络请求失败' }
      } finally {
        this.isSyncing = false
      }
    }
  }
})
