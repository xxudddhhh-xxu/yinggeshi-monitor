<template>
  <el-container class="admin-layout">
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="layout-aside">
      <Sidebar />
    </el-aside>
    <el-container>
      <el-header class="layout-header" height="56px">
        <Navbar />
      </el-header>
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<style scoped lang="scss">
.admin-layout {
  width: 100%;
  height: 100%;
}

.layout-aside {
  transition: width 0.25s ease;
  overflow: hidden;
  background: #101a2c;
}

.layout-header {
  padding: 0 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.layout-main {
  background: var(--bg-page);
  padding: 0;
  overflow-y: auto;
}
</style>
