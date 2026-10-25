<template>
  <div class="screen-panel">
    <div class="panel-title">
      <span>{{ title }}</span>
      <span v-if="extra" class="panel-extra">{{ extra }}</span>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/** 大屏通用面板:标题 + 装饰边角 + 内容插槽 */
defineProps<{
  title: string
  extra?: string
}>()
</script>
