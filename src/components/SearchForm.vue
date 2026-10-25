<template>
  <el-form inline class="filter-bar" @submit.prevent>
    <slot />
    <el-form-item>
      <el-button type="primary" :icon="Search" @click="emit('search')">查询</el-button>
      <el-button :icon="RefreshLeft" @click="emit('reset')">重置</el-button>
      <slot name="btns" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { RefreshLeft, Search } from '@element-plus/icons-vue'

/**
 * 公共筛选表单容器:统一查询/重置按钮位置,
 * 具体筛选项由页面通过默认插槽插入。
 */
const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()
</script>
