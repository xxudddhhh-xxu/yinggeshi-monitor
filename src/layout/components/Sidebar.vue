<template>
  <div class="sidebar">
    <div class="sidebar-logo" @click="router.push('/')">
      <svg class="logo-icon" viewBox="0 0 24 24" width="26" height="26">
        <path
          d="M12 2L2 8v8l10 6 10-6V8L12 2zm0 2.3l7 4.2v2L12 15l-7-4.5v-2l7-4.2zM5 12.4l6.3 4 1.7-1.1V16l-3 1.8L5 14.6v-2.2zm14 0v2.2L12 17.8 9.7 16.4l1.6-1v-1.2l3.7 2.4L19 12.4z"
          fill="#37c6ff"
        />
      </svg>
      <transition name="fade-slide">
        <span v-if="!appStore.sidebarCollapsed" class="logo-text">英歌石·资源监测</span>
      </transition>
    </div>

    <el-scrollbar class="sidebar-menu-scroll">
      <el-menu
        :default-active="route.path"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        background-color="#101a2c"
        text-color="#8fa3c0"
        active-text-color="#ffffff"
        router
        @select="handleMenuSelect"
      >
        <template v-for="menu in userStore.menus" :key="menu.id">
          <SidebarItem v-if="!menu.hidden" :menu="menu" />
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import SidebarItem from './SidebarItem.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

/** 侧边菜单:数据来自后端角色菜单树,无硬编码 */
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

function handleMenuSelect(path: string): void {
  // 可视化大屏等外链型菜单在新窗口打开,保持后台现场
  const link = findLink(userStore.menus, path)
  if (link) {
    window.open(router.resolve(path).href, '_blank')
  }
}

function findLink(menus: { path: string; isLink?: boolean; children?: any[] }[], path: string): boolean {
  for (const m of menus) {
    if (m.path === path && m.isLink) return true
    if (m.children?.length && findLink(m.children, path)) return true
  }
  return false
}
</script>

<style scoped lang="scss">
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;

  .sidebar-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 56px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .logo-text {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #eaf3ff;
      white-space: nowrap;
    }
  }

  .sidebar-menu-scroll {
    flex: 1;
  }

  :deep(.el-menu) {
    border-right: none;

    .el-menu-item.is-active {
      background: linear-gradient(90deg, rgba(47, 107, 255, 0.45), rgba(47, 107, 255, 0.08));
      border-right: 3px solid #37c6ff;
    }

    .el-menu-item:hover,
    .el-sub-menu__title:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
