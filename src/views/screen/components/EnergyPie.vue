<template>
  <div ref="elRef" class="chart-box" />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEcharts } from '@/hooks/useEcharts'
import { ENERGY_COLORS } from '@/constants'

/** 电 / 水 / 气能耗占比(本月累计) */
const props = defineProps<{ data: { name: string; value: number }[] }>()

const units: Record<string, string> = { 电: 'kWh', 水: 'm³', 气: 'm³' }

const { elRef, render } = useEcharts(() => ({
  color: ['#f5b73c', '#3d8eff', '#25d0ab'],
  tooltip: {
    trigger: 'item',
    formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString()} ${units[p.name] ?? ''} (${p.percent}%)`,
    backgroundColor: 'rgba(8, 22, 46, 0.9)',
    borderColor: 'rgba(55,198,255,0.4)',
    textStyle: { color: '#d7e3f4' }
  },
  legend: {
    bottom: 4,
    icon: 'circle',
    textStyle: { color: '#7d93b8' }
  },
  series: [
    {
      type: 'pie',
      radius: ['48%', '68%'],
      center: ['50%', '44%'],
      label: {
        show: true,
        position: 'center',
        formatter: '占比',
        color: '#7d93b8',
        fontSize: 12
      },
      itemStyle: { borderColor: '#08101f', borderWidth: 2 },
      data: props.data.map((d) => ({
        ...d,
        itemStyle: { color: ENERGY_COLORS[d.name] }
      }))
    }
  ]
}))

watch(() => props.data, () => render(), { deep: true })
onMounted(() => render())
</script>
