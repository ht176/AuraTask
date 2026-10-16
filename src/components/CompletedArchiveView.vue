<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Tag,
  Folder,
  BarChart3,
  Flame,
  Check,
  SlidersHorizontal,
  X,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { tagService, customTags } from '../services/tags'
import TaskItem from './TaskItem.vue'
import type { Task } from '../types/todo'

const taskStore = useTaskStore()

// 1. 维度与筛选器状态
type ArchiveDimension = 'week' | 'month' | 'timeline'
const dimension = ref<ArchiveDimension>('week')

type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'custom'
const datePreset = ref<DatePreset>('this_month')
const customStartDate = ref('')
const customEndDate = ref('')

const selectedCategoryId = ref('all')
const selectedTag = ref('all')
const keyword = ref('')

// 折叠状态集合 (Set 保存折叠的 group id)
const collapsedGroups = ref<Set<string>>(new Set())

function toggleGroup(groupId: string) {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId)
  } else {
    collapsedGroups.value.add(groupId)
  }
}

function expandAll() {
  collapsedGroups.value.clear()
}

function collapseAll(groupIds: string[]) {
  groupIds.forEach(id => collapsedGroups.value.add(id))
}

function resetFilters() {
  datePreset.value = 'all'
  customStartDate.value = ''
  customEndDate.value = ''
  selectedCategoryId.value = 'all'
  selectedTag.value = 'all'
  keyword.value = ''
}

const isFilterActive = computed(() => {
  return datePreset.value !== 'all' ||
    selectedCategoryId.value !== 'all' ||
    selectedTag.value !== 'all' ||
    Boolean(keyword.value.trim())
})

// 2. 日期工具函数
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getSunday(monday: Date): Date {
  const date = new Date(monday)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function getISOWeekInfo(d: Date): { year: number; week: number; label: string; dateRange: string } {
  const monday = getMonday(d)
  const sunday = getSunday(monday)

  const target = new Date(monday.valueOf())
  const dayNr = (monday.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  const year = monday.getFullYear()

  const startStr = `${monday.getMonth() + 1}月${monday.getDate()}日`
  const endStr = `${sunday.getMonth() + 1}月${sunday.getDate()}日`

  return {
    year,
    week,
    label: `${year}年 第${week}周`,
    dateRange: `${startStr} ~ ${endStr}`
  }
}

function getMonthInfo(d: Date): { year: number; month: number; key: string; label: string } {
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return {
    year,
    month,
    key: `${year}-${month.toString().padStart(2, '0')}`,
    label: `${year}年 ${month.toString().padStart(2, '0')}月`
  }
}

function getDayInfo(d: Date): { key: string; label: string } {
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const date = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[d.getDay()]

  let prefix = ''
  if (isToday) prefix = '今天 · '
  else if (isYesterday) prefix = '昨天 · '

  return {
    key: `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`,
    label: `${prefix}${month}月${date}日 (${weekday})`
  }
}

// 3. 所有已完成任务的基础列表
const allCompletedTasks = computed(() => {
  return taskStore.tasks.filter(t => t.completed)
})

// 4. 统计概览指标
const now = new Date()
const thisMonday = getMonday(now)
const thisSunday = getSunday(thisMonday)

const statsThisWeek = computed(() => {
  return allCompletedTasks.value.filter(t => {
    const ts = t.completed_at || t.updated_at || t.created_at
    const d = new Date(ts)
    return d >= thisMonday && d <= thisSunday
  }).length
})

const statsThisMonth = computed(() => {
  return allCompletedTasks.value.filter(t => {
    const ts = t.completed_at || t.updated_at || t.created_at
    const d = new Date(ts)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
})

// 5. 综合筛选后的已完成任务列表
const filteredCompletedTasks = computed(() => {
  const nowDate = new Date()

  // 计算筛选的时间上下限
  let rangeStart: Date | null = null
  let rangeEnd: Date | null = null

  switch (datePreset.value) {
    case 'today': {
      rangeStart = new Date(nowDate)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(nowDate)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'yesterday': {
      rangeStart = new Date(nowDate)
      rangeStart.setDate(nowDate.getDate() - 1)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(rangeStart)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'this_week': {
      rangeStart = thisMonday
      rangeEnd = thisSunday
      break
    }
    case 'last_week': {
      const lastMon = new Date(thisMonday)
      lastMon.setDate(lastMon.getDate() - 7)
      rangeStart = lastMon
      rangeEnd = getSunday(lastMon)
      break
    }
    case 'this_month': {
      rangeStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0)
      rangeEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    }
    case 'last_month': {
      rangeStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1, 0, 0, 0, 0)
      rangeEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0, 23, 59, 59, 999)
      break
    }
    case 'last_30_days': {
      rangeStart = new Date(nowDate)
      rangeStart.setDate(nowDate.getDate() - 29)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(nowDate)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'custom': {
      if (customStartDate.value) {
        rangeStart = new Date(customStartDate.value + 'T00:00:00')
      }
      if (customEndDate.value) {
        rangeEnd = new Date(customEndDate.value + 'T23:59:59.999')
      }
      break
    }
    case 'all':
    default:
      break
  }

  return allCompletedTasks.value.filter(task => {
    const ts = task.completed_at || task.updated_at || task.created_at
    const d = new Date(ts)

    // 1. 日期区间过滤
    if (rangeStart && d < rangeStart) return false
    if (rangeEnd && d > rangeEnd) return false

    // 2. 分类过滤
    if (selectedCategoryId.value !== 'all' && task.category_id !== selectedCategoryId.value) {
      return false
    }

    // 3. 标签过滤
    if (selectedTag.value !== 'all') {
      if (!Array.isArray(task.tags) || !task.tags.includes(selectedTag.value)) {
        return false
      }
    }

    // 4. 关键字检索过滤
    if (keyword.value.trim()) {
      const q = keyword.value.toLowerCase().trim()
      const matchTitle = task.title.toLowerCase().includes(q)
      const matchDesc = task.description.toLowerCase().includes(q)
      const matchTags = Array.isArray(task.tags) && task.tags.some(tg => tg.toLowerCase().includes(q))
      if (!matchTitle && !matchDesc && !matchTags) return false
    }

    return true
  })
})

// 6. 统计当前筛选结果的专注番茄数与分钟数
const totalPomodoros = computed(() => {
  return filteredCompletedTasks.value.reduce((acc, t) => acc + (t.completed_pomodoros || 0), 0)
})

const totalFocusMinutes = computed(() => {
  return totalPomodoros.value * 25
})

// 7. 按选定维度进行分组聚合
interface ArchiveGroup {
  id: string
  title: string
  subtitle?: string
  dateRange?: string
  tasks: Task[]
  totalTasks: number
  totalPomodoros: number
  p1Count: number
}

const groupedArchives = computed<ArchiveGroup[]>(() => {
  const tasks = [...filteredCompletedTasks.value]
  // 首先按完成时间倒序
  tasks.sort((a, b) => {
    const tsA = a.completed_at || a.updated_at || a.created_at
    const tsB = b.completed_at || b.updated_at || b.created_at
    return tsB.localeCompare(tsA)
  })

  if (dimension.value === 'week') {
    // 按周聚合
    const map = new Map<string, { info: ReturnType<typeof getISOWeekInfo>; tasks: Task[] }>()
    tasks.forEach(t => {
      const d = new Date(t.completed_at || t.updated_at || t.created_at)
      const weekInfo = getISOWeekInfo(d)
      const key = `${weekInfo.year}-W${weekInfo.week.toString().padStart(2, '0')}`
      if (!map.has(key)) {
        map.set(key, { info: weekInfo, tasks: [] })
      }
      map.get(key)!.tasks.push(t)
    })

    const groups: ArchiveGroup[] = []
    map.forEach((val, key) => {
      const poms = val.tasks.reduce((acc, cur) => acc + (cur.completed_pomodoros || 0), 0)
      const p1 = val.tasks.filter(cur => cur.priority === 1).length
      groups.push({
        id: key,
        title: val.info.label,
        dateRange: val.info.dateRange,
        tasks: val.tasks,
        totalTasks: val.tasks.length,
        totalPomodoros: poms,
        p1Count: p1,
      })
    })

    return groups.sort((a, b) => b.id.localeCompare(a.id))
  }

  if (dimension.value === 'month') {
    // 按月聚合
    const map = new Map<string, { info: ReturnType<typeof getMonthInfo>; tasks: Task[] }>()
    tasks.forEach(t => {
      const d = new Date(t.completed_at || t.updated_at || t.created_at)
      const monthInfo = getMonthInfo(d)
      if (!map.has(monthInfo.key)) {
        map.set(monthInfo.key, { info: monthInfo, tasks: [] })
      }
      map.get(monthInfo.key)!.tasks.push(t)
    })

    const groups: ArchiveGroup[] = []
    map.forEach((val, key) => {
      const poms = val.tasks.reduce((acc, cur) => acc + (cur.completed_pomodoros || 0), 0)
      const p1 = val.tasks.filter(cur => cur.priority === 1).length
      groups.push({
        id: key,
        title: val.info.label,
        subtitle: `共 ${val.tasks.length} 项成果`,
        tasks: val.tasks,
        totalTasks: val.tasks.length,
        totalPomodoros: poms,
        p1Count: p1,
      })
    })

    return groups.sort((a, b) => b.id.localeCompare(a.id))
  }

  // 时间流水模式：按自然日聚合
  const map = new Map<string, { info: ReturnType<typeof getDayInfo>; tasks: Task[] }>()
  tasks.forEach(t => {
    const d = new Date(t.completed_at || t.updated_at || t.created_at)
    const dayInfo = getDayInfo(d)
    if (!map.has(dayInfo.key)) {
      map.set(dayInfo.key, { info: dayInfo, tasks: [] })
    }
    map.get(dayInfo.key)!.tasks.push(t)
  })

  const groups: ArchiveGroup[] = []
  map.forEach((val, key) => {
    const poms = val.tasks.reduce((acc, cur) => acc + (cur.completed_pomodoros || 0), 0)
    const p1 = val.tasks.filter(cur => cur.priority === 1).length
    groups.push({
      id: key,
      title: val.info.label,
      tasks: val.tasks,
      totalTasks: val.tasks.length,
      totalPomodoros: poms,
      p1Count: p1,
    })
  })

  return groups.sort((a, b) => b.id.localeCompare(a.id))
})

// 8. 批量清空当前归档
async function handleClearCurrentArchive() {
  if (filteredCompletedTasks.value.length === 0) return
  const count = filteredCompletedTasks.value.length
  if (confirm(`确定要彻底清空当前筛选出的 ${count} 项已完成待办吗？此操作无法撤销。`)) {
    for (const t of filteredCompletedTasks.value) {
      await taskStore.deleteTask(t.id)
    }
  }
}
</script>

<template>
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-transparent select-none">
    <!-- 头部顶栏：标题与归档概览统计 -->
    <header class="px-6 py-4 border-b border-white/5 shrink-0 space-y-3 bg-black/10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 class="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <span>已完成归档</span>
              <span class="text-xs font-medium text-emerald-400 font-mono px-2 py-0.2 rounded-full bg-emerald-500/15">
                {{ filteredCompletedTasks.length }} 项已达成
              </span>
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">
              按周、月维度查看历史完成记录与专注投入统计
            </p>
          </div>
        </div>

        <!-- 右侧快速操作：清空当前归档 -->
        <div class="flex items-center gap-2">
          <button
            v-if="filteredCompletedTasks.length > 0"
            @click="handleClearCurrentArchive"
            class="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="清空当前符合筛选条件的已完成任务"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>清空筛选归档</span>
          </button>
        </div>
      </div>

      <!-- 概览指标卡片条 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Check class="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div class="text-[11px] text-neutral-400">筛选范围内完成</div>
            <div class="text-sm font-semibold font-mono text-white">
              {{ filteredCompletedTasks.length }} <span class="text-xs font-normal text-neutral-500">项</span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] text-neutral-400">本周已达成</div>
            <div class="text-sm font-semibold font-mono text-indigo-300">
              {{ statsThisWeek }} <span class="text-xs font-normal text-neutral-500">项</span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <BarChart3 class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] text-neutral-400">本月累计达成</div>
            <div class="text-sm font-semibold font-mono text-purple-300">
              {{ statsThisMonth }} <span class="text-xs font-normal text-neutral-500">项</span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Flame class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] text-neutral-400">专注番茄投入</div>
            <div class="text-sm font-semibold font-mono text-amber-300">
              {{ totalPomodoros }} <span class="text-xs font-normal text-neutral-500">番茄 ({{ totalFocusMinutes }}m)</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 筛选与维度切换工具栏 -->
    <div class="px-6 py-3 border-b border-white/5 space-y-2.5 shrink-0 bg-black/20 text-xs">
      <!-- 第一行：展示维度切换 (按周 / 按月 / 时间流水) + 搜索框 -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- 维度切换 Tabs -->
        <div class="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
          <button
            @click="dimension = 'week'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
            :class="dimension === 'week' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'"
          >
            <Calendar class="w-3.5 h-3.5" />
            <span>按周维度</span>
          </button>

          <button
            @click="dimension = 'month'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
            :class="dimension === 'month' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'"
          >
            <BarChart3 class="w-3.5 h-3.5" />
            <span>按月维度</span>
          </button>

          <button
            @click="dimension = 'timeline'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
            :class="dimension === 'timeline' ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'"
          >
            <Clock class="w-3.5 h-3.5" />
            <span>时间流水</span>
          </button>
        </div>

        <!-- 搜索与折叠全部操作 -->
        <div class="flex items-center gap-2 flex-1 max-w-xs">
          <div class="relative w-full flex items-center">
            <Search class="absolute left-2.5 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
            <input
              v-model="keyword"
              type="text"
              placeholder="搜索已完成任务或标签..."
              class="w-full h-8 pl-8 pr-7 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              v-if="keyword"
              @click="keyword = ''"
              class="absolute right-2 text-neutral-500 hover:text-white"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            v-if="groupedArchives.length > 0"
            @click="expandAll"
            class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5 transition-all shrink-0 cursor-pointer text-[11px]"
            title="全部展开"
          >
            全部展开
          </button>
        </div>
      </div>

      <!-- 第二行：精细化筛选条件 (日期区间、分类、标签) -->
      <div class="flex flex-wrap items-center gap-2 text-neutral-300">
        <span class="text-[11px] text-neutral-400 flex items-center gap-1">
          <SlidersHorizontal class="w-3.5 h-3.5 text-indigo-400" />
          <span>筛选：</span>
        </span>

        <!-- 日期区间预设下拉 / 按钮组 -->
        <div class="flex items-center gap-1">
          <select
            v-model="datePreset"
            class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all" class="bg-neutral-900 text-white">全部时间</option>
            <option value="today" class="bg-neutral-900 text-white">今天完成</option>
            <option value="yesterday" class="bg-neutral-900 text-white">昨天完成</option>
            <option value="this_week" class="bg-neutral-900 text-white">本周 (周一~周日)</option>
            <option value="last_week" class="bg-neutral-900 text-white">上周</option>
            <option value="this_month" class="bg-neutral-900 text-white">本月</option>
            <option value="last_month" class="bg-neutral-900 text-white">上月</option>
            <option value="last_30_days" class="bg-neutral-900 text-white">最近 30 天</option>
            <option value="custom" class="bg-neutral-900 text-white">自定义日期区间...</option>
          </select>
        </div>

        <!-- 自定义日期区间选择器输入框 -->
        <div v-if="datePreset === 'custom'" class="flex items-center gap-1.5 animate-in fade-in">
          <input
            v-model="customStartDate"
            type="date"
            class="bg-white/5 border border-white/10 rounded-xl px-2 py-0.5 text-xs text-white focus:outline-none font-mono"
            title="起始日期"
          />
          <span class="text-neutral-500">至</span>
          <input
            v-model="customEndDate"
            type="date"
            class="bg-white/5 border border-white/10 rounded-xl px-2 py-0.5 text-xs text-white focus:outline-none font-mono"
            title="结束日期"
          />
        </div>

        <!-- 分类选择器 -->
        <div class="flex items-center gap-1">
          <Folder class="w-3 h-3 text-neutral-500 ml-1" />
          <select
            v-model="selectedCategoryId"
            class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all" class="bg-neutral-900 text-white">全部分类</option>
            <option value="inbox" class="bg-neutral-900 text-white">📥 收集箱</option>
            <option
              v-for="cat in taskStore.categories.filter(c => c.id !== 'inbox')"
              :key="cat.id"
              :value="cat.id"
              class="bg-neutral-900 text-white"
            >
              📁 {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- 标签类型选择器 -->
        <div class="flex items-center gap-1">
          <Tag class="w-3 h-3 text-neutral-500 ml-1" />
          <select
            v-model="selectedTag"
            class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all" class="bg-neutral-900 text-white">全部标签</option>
            <option
              v-for="tg in customTags"
              :key="tg.id"
              :value="tg.name"
              class="bg-neutral-900 text-white"
            >
              #{{ tg.name }}
            </option>
            <option
              v-for="tg in taskStore.allTags.filter(t => !customTags.some(c => c.name.toLowerCase() === t.toLowerCase()))"
              :key="tg"
              :value="tg"
              class="bg-neutral-900 text-white"
            >
              #{{ tg }}
            </option>
          </select>
        </div>

        <!-- 重置筛选按钮 -->
        <button
          v-if="isFilterActive"
          @click="resetFilters"
          class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5 transition-all cursor-pointer text-xs ml-auto"
        >
          <RotateCcw class="w-3 h-3" />
          <span>重置筛选</span>
        </button>
      </div>
    </div>

    <!-- 主列表区域：按分组呈现 -->
    <main class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
      <div v-if="groupedArchives.length > 0" class="space-y-4">
        <div
          v-for="grp in groupedArchives"
          :key="grp.id"
          class="space-y-2 rounded-2xl glass-panel p-4 border border-white/10 shadow-lg shadow-black/10 transition-all"
        >
          <!-- 分组卡片头部 -->
          <div
            class="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-white/5"
            @click="toggleGroup(grp.id)"
          >
            <div class="flex items-center gap-2.5">
              <button class="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors">
                <ChevronDown v-if="!collapsedGroups.has(grp.id)" class="w-4 h-4" />
                <ChevronRight v-else class="w-4 h-4" />
              </button>

              <div>
                <div class="text-sm font-bold text-white flex items-center gap-2">
                  <span>{{ grp.title }}</span>
                  <span v-if="grp.dateRange" class="text-xs font-normal text-neutral-400 font-mono">
                    ({{ grp.dateRange }})
                  </span>
                </div>
                <div v-if="grp.subtitle" class="text-[11px] text-neutral-400">
                  {{ grp.subtitle }}
                </div>
              </div>
            </div>

            <!-- 分组指标徽章 -->
            <div class="flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono font-medium">
                {{ grp.totalTasks }} 项已完成
              </span>
              <span v-if="grp.totalPomodoros > 0" class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono">
                {{ grp.totalPomodoros }} 番茄
              </span>
              <span v-if="grp.p1Count > 0" class="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-mono">
                {{ grp.p1Count }} 紧急事项
              </span>
            </div>
          </div>

          <!-- 分组内任务清单 -->
          <div v-if="!collapsedGroups.has(grp.id)" class="space-y-2 pt-2 animate-in fade-in duration-150">
            <TaskItem
              v-for="task in grp.tasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </div>
      </div>

      <!-- 筛选无结果空状态 -->
      <div v-else class="py-20 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-3xl bg-white/5 text-neutral-400 flex items-center justify-center mb-3.5 border border-white/5">
          <CheckCircle2 class="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 class="text-sm font-semibold text-neutral-200">
          {{ isFilterActive ? '当前筛选条件下暂无已完成待办' : '还没有已完成的任务归档' }}
        </h3>
        <p class="text-xs text-neutral-400 mt-1 max-w-sm">
          {{ isFilterActive ? '可以尝试放宽日期区间、调整分类或重置标签筛选条件。' : '每完成一项待办任务，都会自动归档至此，便于随时全景复盘与周报整理。' }}
        </p>
        <button
          v-if="isFilterActive"
          @click="resetFilters"
          class="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>重置所有筛选条件</span>
        </button>
      </div>
    </main>
  </div>
</template>
