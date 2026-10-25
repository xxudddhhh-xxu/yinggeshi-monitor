<template>
  <div ref="elRef" class="chart-box" />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEcharts } from '@/hooks/useEcharts'
import { ENERGY_COLORS } from '@/constants'
import type { TrendSeries } from '@/types'

/**
 * 24h 能耗趋势:电/水/气三序列,
 * 用电超过阈值(threshold)的点自动标红预警,并绘制阈值虚线。
 */
const props = defineProps<{ trend: TrendSeries | null }>()

const { elRef, render } = useEcharts(() => {
  const t = props.trend
  const threshold = t?.threshold ?? 0
  const power = t ? t.series.电 : []
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 22, 46, 0.9)',
      borderColor: 'rgba(55,198,255,0.4)',
      textStyle: { color: '#d7e3f4' }
    },
    legend: {
      top: 0,
      right: 10,
      icon: 'circle',
      textStyle: { color: '#7d93b8' }
    },
    grid: { top: 34, left: 10, right: 14, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: t?.times ?? [],
      axisLine: { lineStyle: { color: 'rgba(125, 147, 184, 0.3)' } },
      axisLabel: { color: '#7d93b8' }
    },
    yAxis: {
      type: 'value',
      name: 'kWh / m³',
      nameTextStyle: { color: '#7d93b8' },
      splitLine: { lineStyle: { color: 'rgba(125, 147, 184, 0.12)' } },
      axisLabel: { color: '#7d93b8' }
    },
    series: [
      {
        name: '电',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: ENERGY_COLORS.电 },
        itemStyle: { color: ENERGY_COLORS.电 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 183, 60, 0.28)' },
              { offset: 1, color: 'rgba(245, 183, 60, 0)' }
            ]
          }
        },
        // 超阈值的点整点标红 + 展示标记
        data: power.map((v) => ({
          value: v,
          symbol: v > threshold ? 'circle' : 'none',
          symbolSize: v > threshold ? 8 : 0,
          itemStyle: v > threshold ? { color: '#ff4d5e', borderColor: '#fff', borderWidth: 1 } : undefined
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#ff4d5e', type: 'dashed', width: 1 },
          label: { formatter: `阈值 ${threshold}`, color: '#ff8f9a', position: 'insideEndTop' },
          data: [{ yAxis: threshold }]
        }
      },
      { name: '水', type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: ENERGY_COLORS.水 }, data: t?.series.水 ?? [] },
      { name: '气', type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: ENERGY_COLORS.气 }, data: t?.series.气 ?? [] }
    ]
  }
})

watch(() => props.trend, () => render(), { deep: true })
onMounted(() => render())
</script>
