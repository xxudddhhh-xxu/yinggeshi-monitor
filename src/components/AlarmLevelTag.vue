<template>
  <el-tag :type="map.tag" size="small" class="alarm-level-tag" :class="`level-${level}`">
    {{ map.label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ALARM_LEVELS } from '@/constants'

/** 告警等级徽章:紧急/重要/一般 */
const props = defineProps<{ level: number }>()

const map = computed(() => ALARM_LEVELS[props.level] ?? ALARM_LEVELS[3])
</script>

<style scoped lang="scss">
.alarm-level-tag {
  &.level-1 {
    box-shadow: 0 0 6px rgba(255, 77, 94, 0.5);
  }
  &.level-2 {
    box-shadow: 0 0 6px rgba(255, 159, 64, 0.4);
  }
}
</style>
