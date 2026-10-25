<template>
  <!-- 目录 -->
  <el-sub-menu v-if="menu.children?.length" :index="menu.path">
    <template #title>
      <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
      <span>{{ menu.name }}</span>
    </template>
    <SidebarItem v-for="child in menu.children" :key="child.id" :menu="child" />
  </el-sub-menu>

  <!-- 叶子节点 -->
  <el-menu-item v-else :index="menu.path">
    <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
    <template #title>
      <span>{{ menu.name }}</span>
      <el-tag v-if="menu.isLink" size="small" type="primary" effect="plain" class="link-tag">大屏</el-tag>
    </template>
  </el-menu-item>
</template>

<script setup lang="ts">
import type { MenuItem } from '@/types'

defineProps<{ menu: MenuItem }>()
</script>

<style scoped lang="scss">
.link-tag {
  margin-left: 6px;
  transform: scale(0.85);
}
</style>
