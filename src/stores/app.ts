import { ref } from 'vue'
import { defineStore } from 'pinia'

/** 应用全局 UI 状态 */
export const useAppStore = defineStore(
  'ysrc-app',
  () => {
    /** 侧边栏折叠 */
    const sidebarCollapsed = ref(false)

    function toggleSidebar(): void {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    return { sidebarCollapsed, toggleSidebar }
  },
  { persist: true }
)
