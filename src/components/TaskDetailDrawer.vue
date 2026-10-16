<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  X,
  Check,
  Plus,
  Trash2,
  Calendar,
  Flag,
  Tag,
  Folder,
  Timer,
  CheckSquare2,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'
import { api } from '../services/api'
import { tagService, customTags } from '../services/tags'
import type { SubTask, PriorityLevel, KanbanStatus, EisenhowerQuadrant } from '../types/todo'

const taskStore = useTaskStore()
const subtasks = ref<SubTask[]>([])
const newSubtaskTitle = ref('')
const newTagInput = ref('')

const task = ref(taskStore.selectedTask)

watch(() => taskStore.selectedTaskId, async (id) => {
  if (id) {
    task.value = taskStore.tasks.find(t => t.id === id)
    if (task.value) {
      subtasks.value = await api.getSubtasks(id)
    }
  } else {
    task.value = undefined
    subtasks.value = []
  }
})

async function handleUpdateField(fields: Record<string, any>) {
  if (!task.value) return
  await taskStore.updateTask(task.value.id, fields)
  task.value = taskStore.tasks.find(t => t.id === task.value?.id)
}

async function handleAddSubtask() {
  if (!task.value || !newSubtaskTitle.value.trim()) return
  const sub = await api.createSubtask(task.value.id, newSubtaskTitle.value.trim())
  subtasks.value.push(sub)
  newSubtaskTitle.value = ''
  taskStore.fetchTasks()
}

async function handleToggleSubtask(sub: SubTask) {
  const nextCompleted = !sub.completed
  sub.completed = nextCompleted
  await api.updateSubtask(sub.id, { completed: nextCompleted })
  taskStore.fetchTasks()
}

async function handleDeleteSubtask(subId: string) {
  subtasks.value = subtasks.value.filter(s => s.id !== subId)
  await api.deleteSubtask(subId)
  taskStore.fetchTasks()
}

function handleAddTag() {
  if (!task.value || !newTagInput.value.trim()) return
  const t = newTagInput.value.replace(/^#/, '').trim()
  if (t && !task.value.tags.includes(t)) {
    tagService.addTag(t)
    const updatedTags = [...task.value.tags, t]
    handleUpdateField({ tags: updatedTags })
  }
  newTagInput.value = ''
}

function toggleCustomTag(tagName: string) {
  if (!task.value) return
  if (task.value.tags.includes(tagName)) {
    handleRemoveTag(tagName)
  } else {
    const updatedTags = [...task.value.tags, tagName]
    handleUpdateField({ tags: updatedTags })
  }
}

function handleRemoveTag(tagToRemove: string) {
  if (!task.value) return
  const updatedTags = task.value.tags.filter(t => t !== tagToRemove)
  handleUpdateField({ tags: updatedTags })
}

function setQuickDate(offsetDays: number | null) {
  if (!task.value) return
  if (offsetDays === null) {
    task.value.due_date = null
  } else {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    task.value.due_date = `${y}-${m}-${day}`
  }
  handleUpdateField({ due_date: task.value.due_date })
}

function handleClose() {
  taskStore.selectedTaskId = null
}
</script>

<template>
  <aside
    v-if="taskStore.selectedTaskId && task"
    class="w-80 sm:w-96 h-full flex flex-col theme-sidebar border-l select-none shrink-0 backdrop-blur-2xl shadow-2xl z-20 animate-in slide-in-from-right duration-200"
  >
    <!-- 抽屉头部 -->
    <div class="p-4 border-b border-white/5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          class="w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer"
          :class="task.completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-neutral-500 hover:border-indigo-400'"
          @click="taskStore.toggleTask(task.id)"
        >
          <Check v-if="task.completed" class="w-3.5 h-3.5" />
        </button>
        <span class="text-xs text-neutral-400 font-medium">任务详情</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded-lg hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
          title="删除此任务"
          @click="taskStore.deleteTask(task.id)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="关闭"
          @click="handleClose"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 抽屉内容滚动区域 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- 标题编辑 -->
      <div>
        <label class="block text-[11px] font-semibold text-neutral-400 mb-1">标题</label>
        <textarea
          v-model="task.title"
          rows="2"
          class="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 resize-none"
          @blur="handleUpdateField({ title: task.title })"
        ></textarea>
      </div>

      <!-- 属性配置卡片 -->
      <div class="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
        <!-- 优先级 (四象限联动) -->
        <div>
          <span class="text-neutral-400 flex items-center gap-1 mb-1" title="优先级与艾森豪威尔四象限一一映射联动">
            <Flag class="w-3 h-3 text-rose-400" />
            <span>优先级 / 象限</span>
          </span>
          <select
            v-model.number="task.priority"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none cursor-pointer"
            @change="handleUpdateField({ priority: task.priority, eisenhower_quadrant: task.priority })"
          >
            <option :value="1" class="bg-neutral-900">P1 · 紧急且重要 (象限 I)</option>
            <option :value="2" class="bg-neutral-900">P2 · 重要不紧急 (象限 II)</option>
            <option :value="3" class="bg-neutral-900">P3 · 紧急不重要 (象限 III)</option>
            <option :value="4" class="bg-neutral-900">P4 · 不紧不重 (象限 IV)</option>
          </select>
        </div>

        <!-- 所属清单 -->
        <div>
          <span class="text-neutral-400 flex items-center gap-1 mb-1">
            <Folder class="w-3 h-3 text-indigo-400" />
            <span>所属清单</span>
          </span>
          <select
            v-model="task.category_id"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
            @change="handleUpdateField({ category_id: task.category_id })"
          >
            <option
              v-for="cat in taskStore.categories"
              :key="cat.id"
              :value="cat.id"
              class="bg-neutral-900"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- 截止日期 -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-neutral-400 flex items-center gap-1">
              <Calendar class="w-3 h-3 text-amber-400" />
              <span>截止日期</span>
            </span>
            <span
              v-if="task.due_date"
              class="text-[10px] text-neutral-500 hover:text-rose-400 cursor-pointer"
              @click="setQuickDate(null)"
            >
              清除
            </span>
          </div>
          <input
            v-model="task.due_date"
            type="date"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono focus:outline-none"
            @change="handleUpdateField({ due_date: task.due_date })"
          />
          <div class="flex items-center gap-1 mt-1 text-[10px]">
            <button class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 cursor-pointer transition-colors" @click="setQuickDate(0)">今天</button>
            <button class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 cursor-pointer transition-colors" @click="setQuickDate(1)">明天</button>
            <button class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 cursor-pointer transition-colors" @click="setQuickDate(3)">3天后</button>
          </div>
        </div>

        <!-- 预估番茄数 -->
        <div>
          <span class="text-neutral-400 flex items-center gap-1 mb-1">
            <Timer class="w-3 h-3 text-rose-400" />
            <span>预估番茄</span>
          </span>
          <input
            v-model.number="task.estimated_pomodoros"
            type="number"
            min="1"
            max="20"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white font-mono focus:outline-none"
            @blur="handleUpdateField({ estimated_pomodoros: task.estimated_pomodoros })"
          />
        </div>

        <!-- 看板状态 -->
        <div>
          <span class="text-neutral-400 flex items-center gap-1 mb-1">看板阶段</span>
          <select
            v-model="task.kanban_status"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
            @change="handleUpdateField({ kanban_status: task.kanban_status })"
          >
            <option value="todo" class="bg-neutral-900">待处理</option>
            <option value="in_progress" class="bg-neutral-900">进行中</option>
            <option value="waiting" class="bg-neutral-900">等待/搁置</option>
            <option value="done" class="bg-neutral-900">已完成</option>
          </select>
        </div>

        <!-- 四象限归属 -->
        <div>
          <span class="text-neutral-400 flex items-center gap-1 mb-1">四象限</span>
          <select
            v-model.number="task.eisenhower_quadrant"
            class="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
            @change="handleUpdateField({ eisenhower_quadrant: task.eisenhower_quadrant })"
          >
            <option :value="1" class="bg-neutral-900">第1象限 (紧急重要)</option>
            <option :value="2" class="bg-neutral-900">第2象限 (重要不紧急)</option>
            <option :value="3" class="bg-neutral-900">第3象限 (紧急不重要)</option>
            <option :value="4" class="bg-neutral-900">第4象限 (不紧不重)</option>
          </select>
        </div>
      </div>

      <!-- 子任务清单 (Checklist) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          <span class="flex items-center gap-1">
            <CheckSquare2 class="w-3.5 h-3.5 text-indigo-400" />
            <span>子步骤拆解 ({{ subtasks.filter(s => s.completed).length }}/{{ subtasks.length }})</span>
          </span>
        </div>

        <!-- 子任务项列表 -->
        <div class="space-y-1.5">
          <div
            v-for="sub in subtasks"
            :key="sub.id"
            class="group flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <button
                class="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer"
                :class="sub.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-neutral-500 hover:border-indigo-400'"
                @click="handleToggleSubtask(sub)"
              >
                <Check v-if="sub.completed" class="w-3 h-3" />
              </button>
              <span class="truncate" :class="{ 'line-through text-neutral-500': sub.completed }">
                {{ sub.title }}
              </span>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity cursor-pointer"
              @click="handleDeleteSubtask(sub.id)"
            >
              <Trash2 class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- 添加子任务输入框 -->
        <div class="flex items-center gap-1.5 pt-1">
          <input
            v-model="newSubtaskTitle"
            type="text"
            placeholder="添加子任务步骤..."
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            @keyup.enter="handleAddSubtask"
          />
          <button
            class="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 cursor-pointer transition-colors"
            @click="handleAddSubtask"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 标签体系 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
          <span>分类标签</span>
          <span class="text-[10px] text-neutral-500">点击下方快捷标签可快速打标</span>
        </div>

        <!-- 当前任务已有的标签 -->
        <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="t in task.tags"
            :key="t"
            class="px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 font-mono border"
            :style="{
              color: tagService.getTagInfo(t).color,
              backgroundColor: tagService.getTagInfo(t).bgColor,
              borderColor: `${tagService.getTagInfo(t).color}40`
            }"
          >
            #{{ t }}
            <button class="hover:text-rose-400 cursor-pointer ml-0.5 font-bold" @click="handleRemoveTag(t)">×</button>
          </span>
        </div>

        <!-- 常用自定义标签快速点选条 -->
        <div v-if="customTags.length > 0" class="pt-1">
          <div class="text-[10px] text-neutral-500 mb-1">快捷添加自定义标签：</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="ct in customTags"
              :key="ct.id"
              type="button"
              class="px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer border flex items-center gap-1"
              :style="{
                borderColor: task.tags?.includes(ct.name) ? ct.color : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: task.tags?.includes(ct.name) ? ct.bgColor : 'rgba(255, 255, 255, 0.02)',
                color: task.tags?.includes(ct.name) ? ct.color : 'inherit',
                opacity: task.tags?.includes(ct.name) ? 1 : 0.65
              }"
              @click="toggleCustomTag(ct.name)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: ct.color }"></span>
              <span>{{ ct.name }}</span>
              <Check v-if="task.tags?.includes(ct.name)" class="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>
        </div>

        <!-- 手动输入新标签 -->
        <div class="flex items-center gap-1.5 pt-1">
          <input
            v-model="newTagInput"
            type="text"
            placeholder="输入新标签 (回车快速创建)..."
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            @keyup.enter="handleAddTag"
          />
        </div>
      </div>

      <!-- 详细备忘/笔记 -->
      <div>
        <label class="block text-[11px] font-semibold text-neutral-400 mb-1">备注说明</label>
        <textarea
          v-model="task.description"
          rows="4"
          placeholder="添加更详细的补充说明、灵感或参考链接..."
          class="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 resize-none"
          @blur="handleUpdateField({ description: task.description })"
        ></textarea>
      </div>
    </div>
  </aside>
</template>
