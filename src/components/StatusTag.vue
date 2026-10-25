<template>
  <el-tag :type="map.tag" :effect="effect" size="small">{{ map.label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DEVICE_STATUS } from '@/constants'

/** 设备采集状态标签 */
const props = defineProps<{
  status: string
  effect?: 'light' | 'plain' | 'dark'
}>()

const map = computed(() => DEVICE_STATUS[props.status] ?? { label: props.status, tag: 'info' as const })
</script>
