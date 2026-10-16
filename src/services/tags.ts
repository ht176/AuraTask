import { ref } from 'vue'

export interface CustomTag {
  id: string
  name: string
  color: string // 颜色值，如 '#6366f1'
  bgColor: string // 浅色背景，如 'rgba(99, 102, 241, 0.15)'
}

export const TAG_COLOR_PALETTE = [
  { name: '经典靛蓝', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.18)' },
  { name: '活力玫瑰', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.18)' },
  { name: '翡翠生机', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.18)' },
  { name: '琥珀暖阳', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.18)' },
  { name: '赛博电青', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.18)' },
  { name: '极光魅紫', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.18)' },
  { name: '霓虹粉桃', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.18)' },
  { name: '深邃天蓝', color: '#0284c7', bgColor: 'rgba(2, 132, 199, 0.18)' },
]

const STORAGE_KEY = 'auratask_custom_tags_v1'

const DEFAULT_TAGS: CustomTag[] = [
  { id: 'tag_work', name: '工作', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.18)' },
  { id: 'tag_study', name: '学习', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.18)' },
  { id: 'tag_life', name: '生活', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.18)' },
  { id: 'tag_important', name: '重要', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.18)' },
  { id: 'tag_project', name: '项目', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.18)' },
]

export const customTags = ref<CustomTag[]>([])

export const tagService = {
  customTags,

  init(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        customTags.value = JSON.parse(raw)
      } else {
        customTags.value = [...DEFAULT_TAGS]
        this.save()
      }
    } catch {
      customTags.value = [...DEFAULT_TAGS]
    }
  },

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTags.value))
    } catch (e) {
      console.warn('Failed to save custom tags', e)
    }
  },

  addTag(name: string, color?: string): CustomTag | null {
    const trimmed = name.trim().replace(/^#/, '')
    if (!trimmed) return null

    // 检查是否已存在
    const existing = customTags.value.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing

    const palette = TAG_COLOR_PALETTE
    const chosen = color
      ? palette.find(p => p.color === color) || { color, bgColor: `${color}25` }
      : palette[customTags.value.length % palette.length]

    const newTag: CustomTag = {
      id: 'tag_' + Date.now().toString(36),
      name: trimmed,
      color: chosen.color,
      bgColor: chosen.bgColor,
    }

    customTags.value.push(newTag)
    this.save()
    return newTag
  },

  updateTag(id: string, name: string, color: string): boolean {
    const tag = customTags.value.find(t => t.id === id)
    if (!tag) return false
    const trimmed = name.trim().replace(/^#/, '')
    if (!trimmed) return false

    tag.name = trimmed
    tag.color = color
    const matched = TAG_COLOR_PALETTE.find(p => p.color === color)
    tag.bgColor = matched ? matched.bgColor : `${color}25`
    this.save()
    return true
  },

  deleteTag(id: string): void {
    customTags.value = customTags.value.filter(t => t.id !== id)
    this.save()
  },

  getTagInfo(name: string): CustomTag {
    const trimmed = name.trim().replace(/^#/, '')
    const found = customTags.value.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
    if (found) return found

    // 未注册的标签动态生成柔和颜色
    const palette = TAG_COLOR_PALETTE
    let hash = 0
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash << 5) - hash + trimmed.charCodeAt(i)
    }
    const idx = Math.abs(hash) % palette.length
    return {
      id: 'dynamic_' + trimmed,
      name: trimmed,
      color: palette[idx].color,
      bgColor: palette[idx].bgColor,
    }
  },
}
