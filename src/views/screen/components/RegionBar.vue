<template>
  <div ref="elRef" class="chart-box" />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEcharts } from '@/hooks/useEcharts'
import { ENERGY_COLORS } from '@/constants'

/** 区域能耗对比(今日,横向堆叠柱状图) */
const props = defineProps<{ data: { region: string; 电: number; 水: number; 气: number }[] }>()

const { elRef, render } = useEcharts(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: 'rgba(8, 22, 46, 0.9)',
    borderColor: 'rgba(55,198,255,0.4)',
    textStyle: { color: '#d7e3f4' }
  },
  legend: {
    top: 0,
    icon: 'circle',
    textStyle: { color: '#7d93b8' }
  },
  grid: { top: 32, left: 10, right: 20, bottom: 4, containLabel: true },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(125, 147, 184, 0.12)' } },
    axisLabel: { color: '#7d93b8' }
  },
  yAxis: {
    type: 'category',
    data: props.data.map((r) => r.region),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#9db8dd' }
  },
  series: (['电', '水', '气'] as const).map((k) => ({
    name: k,
    type: 'bar',
    stack: 'total',
    barWidth: 12,
    itemStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [
          { offset: 0, color: ENERGY_COLORS[k] },
          { offset: 1, color: `${ENERGY_COLORS[k]}66` }
        ]
      },
      borderRadius: k === '气' ? [0, 3, 3, 0] : 0
    },
    data: props.data.map((r) => r[k])
  }))
}))

watch(() => props.data, () => render(), { deep: true })
onMounted(() => render())
</script>
