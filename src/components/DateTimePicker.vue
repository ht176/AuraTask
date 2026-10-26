<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Calendar, Clock, X, Check, ChevronDown } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    placeholder?: string
  }>(),
  {
    placeholder: '设置截止日期与时间...',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const isOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// 内部状态：日期 YYYY-MM-DD，时间 HH:mm，是否包含具体时间
const internalDate = ref('')
const internalTime = ref('18:00')
const hasTime = ref(false)

function parseValue(val: string | null) {
  if (!val) {
    internalDate.value = ''
    internalTime.value = '18:00'
    hasTime.value = false
    return
  }

  const trimmed = val.trim()
  if (trimmed.includes(' ')) {
    const [d, t] = trimmed.split(' ')
    internalDate.value = d || ''
    internalTime.value = t ? t.slice(0, 5) : '18:00'
    hasTime.value = Boolean(t)
  } else if (trimmed.includes('T')) {
    const [d, t] = trimmed.split('T')
    internalDate.value = d || ''
    internalTime.value = t ? t.slice(0, 5) : '18:00'
    hasTime.value = Boolean(t)
  } else {
    internalDate.value = trimmed
    internalTime.value = '18:00'
    hasTime.value = false
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    parseValue(newVal)
  },
  { immediate: true }
)

// 人性化展示文案
const displayInfo = computed(() => {
  if (!props.modelValue) return null

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  const datePart = internalDate.value
  const timePart = hasTime.value ? internalTime.value : ''

  let relative = datePart
  if (datePart === todayStr) {
    relative = '今天'
  } else if (datePart === tomorrowStr) {
    relative = '明天'
  }

  const isOverdue = Boolean(datePart && datePart < todayStr)

  return {
    label: timePart ? `${relative} ${timePart}` : relative,
    full: timePart ? `${datePart} ${timePart}` : datePart,
    isOverdue,
  }
})

function togglePopover() {
  if (!isOpen.value) {
    parseValue(props.modelValue)
    // 若当前未选日期，默认设定为今天
    if (!internalDate.value) {
      const now = new Date()
      internalDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      internalTime.value = '18:00'
      hasTime.value = false
    }
  }
  isOpen.value = !isOpen.value
}

function closePopover() {
  isOpen.value = false
}

// 快速日期设定
function setQuickDate(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  internalDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function setThisFriday() {
  const now = new Date()
  const day = now.getDay()
  const diff = (5 - day + 7) % 7 || 7
  const d = new Date(now)
  d.setDate(d.getDate() + diff)
  internalDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function setNextMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = (1 - day + 7) % 7 || 7
  const d = new Date(now)
  d.setDate(d.getDate() + (diff <= 0 ? diff + 7 : diff))
  internalDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 快速时间设定
function setQuickTime(timeStr: string) {
  hasTime.value = true
  internalTime.value = timeStr
}

function handleConfirm() {
  if (!internalDate.value) {
    emit('update:modelValue', null)
  } else {
    const formatted = hasTime.value
      ? `${internalDate.value} ${internalTime.value}`
      : internalDate.value
    emit('update:modelValue', formatted)
  }
  closePopover()
}

function handleClear(e?: MouseEvent) {
  e?.stopPropagation()
  internalDate.value = ''
  hasTime.value = false
  emit('update:modelValue', null)
  closePopover()
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (
    popoverRef.value &&
    !popoverRef.value.contains(target) &&
    triggerRef.value &&
    !triggerRef.value.contains(target)
  ) {
    closePopover()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative w-full select-none">
    <!-- 触发控件 -->
    <div
      ref="triggerRef"
      @click="togglePopover"
      class="group w-full flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all"
      :class="[
        displayInfo
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:border-amber-500/50'
          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-400 hover:border-indigo-500/40 hover:text-neutral-200'
      ]"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <Calendar
          class="w-3.5 h-3.5 shrink-0"
          :class="displayInfo ? 'text-amber-400' : 'text-neutral-400 group-hover:text-indigo-400'"
        />
        <div v-if="displayInfo" class="flex items-center gap-1.5 truncate">
          <span class="font-medium text-amber-300">{{ displayInfo.label }}</span>
          <span class="text-[10px] text-amber-400/70 font-mono truncate">({{ displayInfo.full }})</span>
          <span
            v-if="displayInfo.isOverdue"
            class="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] shrink-0 font-medium"
          >
            逾期
          </span>
        </div>
        <span v-else class="truncate text-neutral-400">{{ placeholder }}</span>
      </div>

      <div class="flex items-center gap-1 shrink-0 ml-1.5">
        <button
          v-if="displayInfo"
          @click="handleClear"
          class="p-0.5 rounded-md hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
          title="清除截止时间"
        >
          <X class="w-3.5 h-3.5" />
        </button>
        <ChevronDown
          class="w-3 h-3 text-neutral-500 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
        />
      </div>
    </div>

    <!-- 交互式浮层面板 (Popover) -->
    <div
      v-if="isOpen"
      ref="popoverRef"
      class="absolute left-0 top-full mt-2 z-50 w-80 p-3.5 rounded-2xl glass-panel border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-150 space-y-3"
      @click.stop
    >
      <!-- 快捷预设日期 -->
      <div class="space-y-1.5">
        <div class="text-[10px] font-semibold text-neutral-400 flex items-center justify-between">
          <span>快捷日期推荐</span>
          <span class="text-[9px] text-neutral-500">点击即选</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5 text-xs">
          <button
            type="button"
            class="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-black/5 dark:border-white/5 transition-colors cursor-pointer text-center text-[11px]"
            @click="setQuickDate(0)"
          >
            今天
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-black/5 dark:border-white/5 transition-colors cursor-pointer text-center text-[11px]"
            @click="setQuickDate(1)"
          >
            明天
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-black/5 dark:border-white/5 transition-colors cursor-pointer text-center text-[11px]"
            @click="setThisFriday"
          >
            本周五
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-black/5 dark:border-white/5 transition-colors cursor-pointer text-center text-[11px]"
            @click="setNextMonday"
          >
            下周一
          </button>
        </div>
      </div>

      <!-- 具体日期选取 -->
      <div class="space-y-1">
        <label class="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
          <Calendar class="w-3 h-3 text-indigo-400" />
          <span>具体日期 (年-月-日)</span>
        </label>
        <input
          v-model="internalDate"
          type="date"
          class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <!-- 具体时间选取 (小时 : 分钟) -->
      <div class="space-y-1.5 pt-1 border-t border-black/5 dark:border-white/5">
        <div class="flex items-center justify-between">
          <label class="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
            <Clock class="w-3 h-3 text-amber-400" />
            <span>具体到期时刻</span>
          </label>
          <button
            type="button"
            class="text-[10px] font-medium cursor-pointer transition-colors"
            :class="hasTime ? 'text-indigo-400 hover:text-indigo-300' : 'text-neutral-500 hover:text-neutral-300'"
            @click="hasTime = !hasTime"
          >
            {{ hasTime ? '包含具体时间 (点击取消)' : '+ 增加具体时间' }}
          </button>
        </div>

        <div v-if="hasTime" class="space-y-2 animate-in fade-in">
          <!-- 快捷时间芯片 -->
          <div class="grid grid-cols-4 gap-1 text-[10px] font-mono">
            <button
              type="button"
              class="px-1.5 py-0.5 rounded-md border text-center transition-colors cursor-pointer"
              :class="internalTime === '09:00' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 text-neutral-400'"
              @click="setQuickTime('09:00')"
            >
              09:00
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded-md border text-center transition-colors cursor-pointer"
              :class="internalTime === '14:00' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 text-neutral-400'"
              @click="setQuickTime('14:00')"
            >
              14:00
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded-md border text-center transition-colors cursor-pointer"
              :class="internalTime === '18:00' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 text-neutral-400'"
              @click="setQuickTime('18:00')"
            >
              18:00
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded-md border text-center transition-colors cursor-pointer"
              :class="internalTime === '21:00' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 text-neutral-400'"
              @click="setQuickTime('21:00')"
            >
              21:00
            </button>
          </div>

          <!-- 精确时间输入框 -->
          <input
            v-model="internalTime"
            type="time"
            class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <!-- 底部控制按钮 -->
      <div class="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
        <button
          type="button"
          class="px-2.5 py-1 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          @click="handleClear"
        >
          清除
        </button>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            @click="closePopover"
          >
            取消
          </button>
          <button
            type="button"
            class="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            @click="handleConfirm"
          >
            <Check class="w-3 h-3" />
            <span>确定</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
