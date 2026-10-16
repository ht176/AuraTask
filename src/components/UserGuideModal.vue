<script setup lang="ts">
import { ref } from 'vue'
import {
  BookOpen,
  X,
  Sparkles,
  Grid2x2,
  Zap,
  Timer,
  Server,
  Download,
  HelpCircle,
  Flame,
  Target,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderSync,
} from 'lucide-vue-next'
import { useTaskStore } from '../stores/task'

const taskStore = useTaskStore()
const activeTab = ref<'quickstart' | 'matrix' | 'shortcuts' | 'pomodoro' | 'sync' | 'nlp' | 'backup'>('quickstart')

const tabs = [
  { id: 'quickstart', label: '快速上手', icon: Sparkles },
  { id: 'matrix', label: '优先级与四象限', icon: Grid2x2 },
  { id: 'shortcuts', label: '全局热键与便签', icon: Zap },
  { id: 'pomodoro', label: '番茄心流工作法', icon: Timer },
  { id: 'sync', label: '单机离线与数据同步', icon: Server },
  { id: 'nlp', label: '自然语言极速录入', icon: HelpCircle },
  { id: 'backup', label: '数据备份与迁移', icon: Download },
]

function handleClose() {
  taskStore.isUserGuideOpen = false
}
</script>

<template>
  <div
    v-if="taskStore.isUserGuideOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-4xl h-[640px] max-h-[90vh] glass-panel border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
    >
      <!-- 弹窗顶栏 -->
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <BookOpen class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              AuraTask 使用手册与操作指南
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-normal">v1.0.4 指南</span>
            </h2>
            <p class="text-xs text-neutral-400">掌握高效专注的工作流，彻底告别琐碎拖延</p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 主体双栏区域 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左侧分类导航 -->
        <aside class="w-52 border-r border-white/5 p-3 space-y-1 shrink-0 bg-black/20 overflow-y-auto text-xs">
          <button
            v-for="t in tabs"
            :key="t.id"
            @click="activeTab = t.id as any"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left"
            :class="
              activeTab === t.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            "
          >
            <component :is="t.icon" class="w-4 h-4 shrink-0" />
            <span>{{ t.label }}</span>
          </button>
        </aside>

        <!-- 右侧内容滚动区 -->
        <main class="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-300 leading-relaxed">
          <!-- 1. 快速上手 -->
          <section v-if="activeTab === 'quickstart'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-indigo-400" />
              欢迎使用 AuraTask 极简高效待办
            </h3>
            <p class="text-neutral-400">
              AuraTask 专为追求极致流畅与专注体验的用户打造。它支持<strong>纯单机零依赖运行</strong>，也可无缝连接自己的<strong>远程数据同步节点</strong>进行多端数据同步。
            </p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">1</span>
                  三种工作流视图
                </div>
                <p class="text-neutral-400 text-[11px]">
                  按快捷键 <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">1~5</kbd> 可快速在「我的一天」、「收集箱」、「近期安排」、「四象限矩阵」与「任务看板」之间无缝切换。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">2</span>
                  随时随地极速录入
                </div>
                <p class="text-neutral-400 text-[11px]">
                  在任何软件中按下 <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Ctrl+Shift+K</kbd> (Mac: ⌘ShiftK)，无需切出前台，闪电呼出 Spotlight 智能录入。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">3</span>
                  悬浮桌面便签模式
                </div>
                <p class="text-neutral-400 text-[11px]">
                  按下 <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Ctrl+Shift+M</kbd> 可一键将全尺寸窗口折叠为小巧常驻桌面的置顶微型便签。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">4</span>
                  全自动增量与离线缓存
                </div>
                <p class="text-neutral-400 text-[11px]">
                  离线编辑自动留存本地数据库，连接远程节点后自动上传同步，断网或单机运行毫不受限。
                </p>
              </div>
            </div>
          </section>

          <!-- 2. 优先级与四象限法则关系 -->
          <section v-if="activeTab === 'matrix'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Grid2x2 class="w-4 h-4 text-rose-400" />
              优先级与艾森豪威尔四象限的关系说明
            </h3>

            <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <div class="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Target class="w-4 h-4 text-indigo-400" />
                优先级 (P1~P4) 与四象限是同一个事物的两种视角
              </div>
              <p class="text-neutral-300 text-xs leading-relaxed">
                在 AuraTask 中，<strong>「优先级」与「四象限」不是相互孤立的重复属性，而是完全联动同步的同一套维度</strong>：
                <br />• <strong>清单列表/看板</strong>：以一维线性「P1/P2/P3/P4」标签展示，方便快速排序与筛选；
                <br />• <strong>四象限矩阵</strong>：以二维「重要程度 × 紧急程度」九宫格展示，方便全局规划与直接拖拽迁移。
              </p>
            </div>

            <!-- 映射对照表 -->
            <div class="space-y-2.5 pt-1">
              <h4 class="text-xs font-semibold text-white">四大象限与优先级映射对应表：</h4>
              
              <div class="grid grid-cols-2 gap-3">
                <!-- 第一象限 -->
                <div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-rose-400 flex items-center gap-1">
                      <Flame class="w-3.5 h-3.5" />
                      P1 · 第一象限 (Do First)
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300">重要且紧急</span>
                  </div>
                  <p class="text-[11px] text-neutral-300">
                    危机、临近截止日的关键项目、紧急突发事件。
                  </p>
                  <div class="text-[10px] text-rose-300/80 font-mono">策略：立刻集中精力优先处理，避免拖延。</div>
                </div>

                <!-- 第二象限 -->
                <div class="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-indigo-400 flex items-center gap-1">
                      <Target class="w-3.5 h-3.5" />
                      P2 · 第二象限 (Schedule)
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">重要不紧急</span>
                  </div>
                  <p class="text-[11px] text-neutral-300">
                    个人成长、健康锻炼、深度思考、长期战略规划。
                  </p>
                  <div class="text-[10px] text-indigo-300/80 font-mono">策略：主线任务！每天分配大块专注时间主动推进。</div>
                </div>

                <!-- 第三象限 -->
                <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-amber-400 flex items-center gap-1">
                      <Clock class="w-3.5 h-3.5" />
                      P3 · 第三象限 (Delegate)
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">紧急不重要</span>
                  </div>
                  <p class="text-[11px] text-neutral-300">
                    不速之客、琐碎回复、他人催促但非自己职责的工作。
                  </p>
                  <div class="text-[10px] text-amber-300/80 font-mono">策略：授权他人、批量处理或在碎片时间快速了结。</div>
                </div>

                <!-- 第四象限 -->
                <div class="p-3 rounded-2xl bg-neutral-500/10 border border-neutral-500/25 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-neutral-400 flex items-center gap-1">
                      <Sparkles class="w-3.5 h-3.5" />
                      P4 · 第四象限 (Eliminate)
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-neutral-500/20 text-neutral-300">不紧不重</span>
                  </div>
                  <p class="text-[11px] text-neutral-300">
                    无目的刷资讯、杂乱无章的消遣、可做可不做的细枝末节。
                  </p>
                  <div class="text-[10px] text-neutral-400 font-mono">策略：尽量精简、延后甚至直接删除，保护精力。</div>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                <span>在四象限矩阵中，您可以直接将卡片<strong>拖放</strong>到任意象限，任务的优先级会自动同步更新！</span>
              </div>
            </div>
          </section>

          <!-- 3. 全局热键与便签 -->
          <section v-if="activeTab === 'shortcuts'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Zap class="w-4 h-4 text-amber-400" />
              全局热键与置顶便签模式
            </h3>
            <p class="text-neutral-400">
              AuraTask 由 Rust 底层原生注册系统全局热键，<strong>即使客户端被最小化或隐藏在托盘，也能被瞬间唤醒并置顶</strong>。
            </p>

            <div class="space-y-2">
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">全局极速录入待办</div>
                  <div class="text-[11px] text-neutral-400">任意软件中一键唤出智能 Spotlight 录入框</div>
                </div>
                <div class="flex items-center gap-1">
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">Ctrl + Shift + K</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ Shift K</kbd>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">显示 / 隐藏主窗口</div>
                  <div class="text-[11px] text-neutral-400">快速唤出主应用或一键收拢到系统托盘</div>
                </div>
                <div class="flex items-center gap-1">
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">Ctrl + Shift + T</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ Shift T</kbd>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">切换迷你悬浮便签</div>
                  <div class="text-[11px] text-neutral-400">在屏幕一角置顶常驻，像便签纸一样实时对照打勾</div>
                </div>
                <div class="flex items-center gap-1">
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">Ctrl + Shift + M</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ Shift M</kbd>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">随时唤起番茄钟</div>
                  <div class="text-[11px] text-neutral-400">随时开始或暂停 25 分钟专注心流</div>
                </div>
                <div class="flex items-center gap-1">
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">Ctrl + Shift + P</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ Shift P</kbd>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <div class="font-medium text-white">快速打开操作手册指南</div>
                  <div class="text-[11px] text-neutral-400">随时呼出本指南或查阅快捷键</div>
                </div>
                <div class="flex items-center gap-1">
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">F1</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ ?</kbd>
                  <span class="text-neutral-500 text-[10px]">/</span>
                  <kbd class="px-2 py-1 rounded bg-white/10 font-mono text-white text-xs">⌘ H</kbd>
                </div>
              </div>
            </div>
          </section>

          <!-- 4. 番茄工作法 -->
          <section v-if="activeTab === 'pomodoro'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Timer class="w-4 h-4 text-rose-400" />
              番茄心流工作法与专注
            </h3>
            <p class="text-neutral-400">
              通过将工作时间分割为标准节奏，消除心理压力，进入深度心流状态：
            </p>

            <div class="space-y-3">
              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div class="flex items-center gap-2 text-white font-medium">
                  <span class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-xs">25 min</span>
                  <span>专注工作阶段</span>
                </div>
                <p class="text-neutral-400 text-[11px]">
                  选定一个任务并点击其番茄钟图标，在此 25 分钟内仅聚焦于这一件事。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div class="flex items-center gap-2 text-white font-medium">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-xs">5 min</span>
                  <span>短休息阶段</span>
                </div>
                <p class="text-neutral-400 text-[11px]">
                  番茄钟完成后会有清脆提示音，站起喝水、眺望远方或简单拉伸，让大脑恢复精力。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div class="flex items-center gap-2 text-white font-medium">
                  <span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs">15 min</span>
                  <span>长休息阶段（每 4 个番茄后）</span>
                </div>
                <p class="text-neutral-400 text-[11px]">
                  完成一组 4 个番茄钟后，享受 15 分钟的深度放松，彻底消除疲惫感。
                </p>
              </div>
            </div>
          </section>

          <!-- 5. 单机模式与远程节点数据同步 -->
          <section v-if="activeTab === 'sync'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Server class="w-4 h-4 text-emerald-400" />
              单机离线模式与远程节点数据同步
            </h3>
            <p class="text-neutral-400">
              AuraTask 采用<strong>离线优先（Offline First）</strong>架构，无论是否配置服务端，都能提供完整的待办管理。
            </p>

            <div class="space-y-3">
              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  纯单机模式 (零依赖·开箱即用)
                </div>
                <p class="text-neutral-400 text-[11px]">
                  无需搭建任何服务器，数据全部安全存储在本地高可靠 SQLite 引擎中，断网也可流畅使用。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                  连接自建私有云 / 远程数据同步节点
                </div>
                <p class="text-neutral-400 text-[11px]">
                  点击侧边栏底部设置进入「数据同步与节点」，填入服务地址（如 <code class="bg-black/30 px-1 py-0.5 rounded text-indigo-300">https://todo.xiaoyunjia.site:6</code>），即可开启多设备实时同步。
                </p>
                <div class="pt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                  <FolderSync class="w-3.5 h-3.5 text-indigo-400" />
                  <span>支持「单机数据同步至远程节点」与「从远程节点拉取至本地」双向同步保障。</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 6. 自然语言智能录入 -->
          <section v-if="activeTab === 'nlp'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle class="w-4 h-4 text-violet-400" />
              自然语言与智能快捷语法
            </h3>
            <p class="text-neutral-400">
              在极速录入框中直接输入平时口语化的句子，内置 NLP 引擎会自动提取时间、优先级、标签与预估番茄数：
            </p>

            <div class="space-y-2">
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div class="text-white font-mono text-[11px]">明天下午3点 和产品经理开需求评审会 #项目 !高 *2</div>
                <div class="text-[11px] text-indigo-300 flex items-center gap-2">
                  <span>📅 截止日期: 明天</span>
                  <span>🔥 优先级: P1</span>
                  <span>🏷️ 标签: 项目</span>
                  <span>🍅 预估: 2个番茄</span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div class="text-white font-mono text-[11px]">周五晚上整理书房 #生活 *1</div>
                <div class="text-[11px] text-indigo-300 flex items-center gap-2">
                  <span>📅 截止日期: 本周五</span>
                  <span>🏷️ 标签: 生活</span>
                  <span>🍅 预估: 1个番茄</span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div class="text-white font-mono text-[11px]">后天提交季报 !紧急</div>
                <div class="text-[11px] text-indigo-300 flex items-center gap-2">
                  <span>📅 截止日期: 后天</span>
                  <span>🔥 优先级: P1</span>
                </div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 space-y-1">
              <div class="font-medium text-neutral-300">语法助记符：</div>
              <div>• 优先级标识：<code class="text-rose-400">!高</code> 或 <code class="text-rose-400">!紧急</code> (P1), <code class="text-blue-400">!中</code> (P2), <code class="text-amber-400">!低</code> (P3)</div>
              <div>• 标签分类：<code class="text-indigo-400">#标签名</code></div>
              <div>• 番茄钟预估：<code class="text-emerald-400">*数字</code>（如 *3 表示预估 3 个番茄钟）</div>
            </div>
          </section>

          <!-- 7. 备份与迁移 -->
          <section v-if="activeTab === 'backup'" class="space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Download class="w-4 h-4 text-emerald-400" />
              数据备份与跨设备迁移
            </h3>
            <p class="text-neutral-400">
              数据完全属于您。您可以随时全量导出标准 JSON 备份，并在任意电脑上无损恢复。
            </p>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <Download class="w-4 h-4 text-indigo-400" />
                  导出全量备份
                </div>
                <p class="text-neutral-400 text-[11px]">
                  点击侧边栏底部的「导出」按钮，系统会生成包含所有待办、分类、标签、子任务及历史番茄时长的 JSON 备份文件。
                </p>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div class="font-semibold text-white flex items-center gap-1.5">
                  <FolderSync class="w-4 h-4 text-emerald-400" />
                  恢复与合并导入
                </div>
                <p class="text-neutral-400 text-[11px]">
                  点击「恢复」按钮并选择历史备份文件，AuraTask 会自动进行幂等合并导入，不覆盖现有未完成项。
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <!-- 弹窗底栏 -->
      <div class="px-6 py-3 border-t border-white/5 bg-black/30 flex items-center justify-between text-xs text-neutral-400 shrink-0">
        <div class="flex items-center gap-1 text-[11px]">
          <span>提示：按</span>
          <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">F1</kbd>
          <span>随时打开或关闭此操作文档</span>
        </div>

        <button
          @click="handleClose"
          class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>
