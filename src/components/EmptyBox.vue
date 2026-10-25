<template>
  <el-empty :image-size="imageSize" :description="description">
    <slot />
  </el-empty>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string
    imageSize?: number
  }>(),
  { description: '暂无数据', imageSize: 90 }
)
</script>
