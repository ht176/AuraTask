import { ref } from 'vue'

export type ThemeType = 'titanium' | 'cyber' | 'aurora' | 'matrix' | 'light'

export interface ThemeOption {
  id: ThemeType
  name: string
  desc: string
  bgPreview: string
  accentColor: string
  isDark: boolean
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'titanium',
    name: '钛金深空 (默认)',
    desc: '高质感哑光深灰与微光描边，科技感与沉浸感兼备',
    bgPreview: 'from-[#141724] to-[#1a1f30]',
    accentColor: '#6366f1',
    isDark: true,
  },
  {
    id: 'cyber',
    name: '赛博深蓝 (Cyber)',
    desc: '深邃太空深蓝与极客电光青，未来数字科技风格',
    bgPreview: 'from-[#0b1122] to-[#121d38]',
    accentColor: '#0ea5e9',
    isDark: true,
  },
  {
    id: 'aurora',
    name: '极光流夜 (Aurora)',
    desc: '神秘深紫暗夜与流光霓虹，极具艺术感与心流专注',
    bgPreview: 'from-[#120e22] to-[#1e1538]',
    accentColor: '#a855f7',
    isDark: true,
  },
  {
    id: 'matrix',
    name: '黑客矩阵 (Matrix)',
    desc: '黑曜石极客黑与青翠荧光绿，护眼低眩光高对比度',
    bgPreview: 'from-[#0a1412] to-[#122320]',
    accentColor: '#10b981',
    isDark: true,
  },
  {
    id: 'light',
    name: '极简明亮 (Light)',
    desc: '纯净白昼明亮模式，清爽干净，适合明亮采光环境',
    bgPreview: 'from-[#f1f5f9] to-[#ffffff]',
    accentColor: '#4f46e5',
    isDark: false,
  },
]

const STORAGE_KEY = 'auratask_theme_preference'

export const currentTheme = ref<ThemeType>('titanium')

export const themeService = {
  currentTheme,

  init(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeType | null
      if (saved && THEME_OPTIONS.some(t => t.id === saved)) {
        this.setTheme(saved)
      } else {
        this.setTheme('titanium')
      }
    } catch {
      this.setTheme('titanium')
    }
  },

  setTheme(theme: ThemeType): void {
    currentTheme.value = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch (e) {
      console.warn('Failed to save theme setting', e)
    }

    if (typeof document !== 'undefined') {
      const root = document.documentElement
      // 移除旧主题类
      THEME_OPTIONS.forEach(t => {
        root.classList.remove(`theme-${t.id}`)
      })
      root.classList.add(`theme-${theme}`)
      root.setAttribute('data-theme', theme)

      if (theme === 'light') {
        root.classList.remove('dark')
        root.classList.add('light')
      } else {
        root.classList.remove('light')
        root.classList.add('dark')
      }
    }
  },
}
