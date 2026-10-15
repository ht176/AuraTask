import type { PriorityLevel } from '../types/todo'

export interface ParsedTaskResult {
  title: string
  priority: PriorityLevel
  due_date: string | null
  tags: string[]
  estimated_pomodoros: number
  rawInput: string
}

export function parseNaturalLanguage(rawInput: string): ParsedTaskResult {
  let text = rawInput.trim()
  let priority: PriorityLevel = 3
  const tags: string[] = []
  let estimated_pomodoros = 1
  let dueDate: Date | null = null
  let hasSpecificTime = false

  // 1. 解析优先级：!1, !p1, !高, !紧急 => 1; !2, !p2, !重要 => 2; !3, !中 => 3; !4, !低 => 4
  const p1Match = text.match(/(?:!|！)(?:1|p1|高|紧急|urgent)/i)
  const p2Match = text.match(/(?:!|！)(?:2|p2|重要|重|high)/i)
  const p3Match = text.match(/(?:!|！)(?:3|p3|中|普通|normal)/i)
  const p4Match = text.match(/(?:!|！)(?:4|p4|低|low)/i)

  if (p1Match) {
    priority = 1
    text = text.replace(p1Match[0], '')
  } else if (p2Match) {
    priority = 2
    text = text.replace(p2Match[0], '')
  } else if (p3Match) {
    priority = 3
    text = text.replace(p3Match[0], '')
  } else if (p4Match) {
    priority = 4
    text = text.replace(p4Match[0], '')
  }

  // 2. 解析标签：#工作 #学习 #生活
  const tagMatches = text.match(/#([\u4e00-\u9fa5a-zA-Z0-9_-]+)/g)
  if (tagMatches) {
    for (const tm of tagMatches) {
      const tag = tm.substring(1).trim()
      if (tag && !tags.includes(tag)) {
        tags.push(tag)
      }
      text = text.replace(tm, '')
    }
  }

  // 3. 解析预估番茄数：*2 或 2个番茄
  const pomoMatch = text.match(/\*([1-9]\d*)|([1-9]\d*)个番茄/)
  if (pomoMatch) {
    const val = parseInt(pomoMatch[1] || pomoMatch[2], 10)
    if (!isNaN(val) && val > 0 && val <= 20) {
      estimated_pomodoros = val
    }
    text = text.replace(pomoMatch[0], '')
  }

  // 4. 解析日期与时间
  const now = new Date()
  const target = new Date(now)

  // 基础日期词匹配
  if (/(?:今天|今晚)/.test(text)) {
    dueDate = new Date(target)
    text = text.replace(/(?:今天|今晚)/, '')
  } else if (/(?:明天|明晚)/.test(text)) {
    target.setDate(target.getDate() + 1)
    dueDate = new Date(target)
    text = text.replace(/(?:明天|明晚)/, '')
  } else if (/(?:后天|后晚)/.test(text)) {
    target.setDate(target.getDate() + 2)
    dueDate = new Date(target)
    text = text.replace(/(?:后天|后晚)/, '')
  } else if (/(?:大后天)/.test(text)) {
    target.setDate(target.getDate() + 3)
    dueDate = new Date(target)
    text = text.replace(/(?:大后天)/, '')
  }

  // 周几解析（周一至周日 / 星期一至星期天 / 下周一至下周日）
  const weekMatch = text.match(/(下周|这周|周|星期)([一二三四五六日天1-7])/)
  if (weekMatch) {
    const isNextWeek = weekMatch[1] === '下周'
    const dayMap: Record<string, number> = {
      '一': 1, '1': 1,
      '二': 2, '2': 2,
      '三': 3, '3': 3,
      '四': 4, '4': 4,
      '五': 5, '5': 5,
      '六': 6, '6': 6,
      '日': 0, '天': 0, '7': 0
    }
    const targetDay = dayMap[weekMatch[2]]
    if (targetDay !== undefined) {
      const currentDay = now.getDay()
      let diff = targetDay - currentDay
      if (diff <= 0 || isNextWeek) {
        diff += isNextWeek ? 7 : 7
      }
      target.setDate(target.getDate() + diff)
      dueDate = new Date(target)
      text = text.replace(weekMatch[0], '')
    }
  }

  // 显式日期格式匹配：YYYY-MM-DD 或 MM-DD
  const datePattern = text.match(/(\d{4}[-/年])?(\d{1,2})[-/月](\d{1,2})日?/)
  if (datePattern) {
    const year = datePattern[1] ? parseInt(datePattern[1], 10) : now.getFullYear()
    const month = parseInt(datePattern[2], 10) - 1
    const day = parseInt(datePattern[3], 10)
    target.setFullYear(year, month, day)
    dueDate = new Date(target)
    text = text.replace(datePattern[0], '')
  }

  // 具体时间匹配：下午3点、15:00、上午10:30、晚上8点
  const timeMatch = text.match(/(上午|下午|晚上|中午|清晨)?\s*(\d{1,2})(?::|：|点)(\d{1,2})?分?/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[2], 10)
    const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    const period = timeMatch[1]

    if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12
    } else if (period === '中午' && hour === 12) {
      // 保持 12
    } else if (period === '上午' && hour === 12) {
      hour = 0
    }

    if (!dueDate) {
      dueDate = new Date(now)
    }
    dueDate.setHours(hour, minute, 0, 0)
    hasSpecificTime = true
    text = text.replace(timeMatch[0], '')
  }

  // 格式化输出最终 due_date 字符串
  let formattedDueDate: string | null = null
  if (dueDate) {
    const y = dueDate.getFullYear()
    const m = String(dueDate.getMonth() + 1).padStart(2, '0')
    const d = String(dueDate.getDate()).padStart(2, '0')
    if (hasSpecificTime) {
      const hh = String(dueDate.getHours()).padStart(2, '0')
      const mm = String(dueDate.getMinutes()).padStart(2, '0')
      formattedDueDate = `${y}-${m}-${d} ${hh}:${mm}`
    } else {
      formattedDueDate = `${y}-${m}-${d}`
    }
  }

  // 清洗干净标题文本
  const cleanTitle = text.replace(/\s+/g, ' ').trim()

  return {
    title: cleanTitle || rawInput.trim(),
    priority,
    due_date: formattedDueDate,
    tags,
    estimated_pomodoros,
    rawInput
  }
}
