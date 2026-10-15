import { defineStore } from 'pinia'
import { isTauriApp } from '../services/desktop'

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
    activeServerId: '',
    isConnected: true,
    isSettingsOpen: false,
    isTesting: false,
  }),

  getters: {
    activeServer(state): ServerConfig | null {
      return state.servers.find(s => s.id === state.activeServerId) || state.servers[0] || null
    },
    baseUrl(): string {
      // 在浏览器/Docker 自托管模式下，默认使用当前同源路径
      if (!isTauriApp()) {
        const custom = this.activeServer?.url
        return custom ? custom.replace(/\/+$/, '') : ''
      }
      // 在 Tauri 桌面客户端环境下，使用配置的 NAS 服务端地址
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
    loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          this.servers = JSON.parse(raw)
        }
        const activeId = localStorage.getItem(ACTIVE_ID_KEY)
        if (activeId && this.servers.some(s => s.id === activeId)) {
          this.activeServerId = activeId
        } else if (this.servers.length > 0) {
          this.activeServerId = this.servers[0].id
        }
      } catch (err) {
        console.warn('Failed to load server config', err)
      }
    },

    saveConfig() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.servers))
      localStorage.setItem(ACTIVE_ID_KEY, this.activeServerId)
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
          return { success: false, message: '连接超时，请检查 NAS IP/域名及端口是否开放' }
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
        this.activeServerId = this.servers[0]?.id || ''
      }
      this.saveConfig()
    }
  }
})
