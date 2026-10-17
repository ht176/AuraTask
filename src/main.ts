import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'
import { reminderService } from './services/reminder'
import { themeService } from './services/theme'
import { tagService } from './services/tags'
import { shortcutService } from './services/shortcut'
import { useTaskStore } from './stores/task'
import { usePomodoroStore } from './stores/pomodoro'
import { useServerStore } from './stores/server'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')

if (import.meta.env.DEV) {
  const win = window as any
  win.pinia = pinia
  win.reminderService = reminderService
  win.themeService = themeService
  win.tagService = tagService
  win.shortcutService = shortcutService
  win.useTaskStore = useTaskStore
  win.usePomodoroStore = usePomodoroStore
  win.useServerStore = useServerStore
}
