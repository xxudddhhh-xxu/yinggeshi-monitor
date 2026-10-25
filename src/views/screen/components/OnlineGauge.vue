<template>
  <div ref="elRef" class="chart-box" />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEcharts } from '@/hooks/useEcharts'

/** 设备在线率仪表盘 */
const props = defineProps<{ rate: number }>()

const { elRef, render } = useEcharts(() => ({
  series: [
    {
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      radius: '92%',
      center: ['50%', '58%'],
      progress: {
        show: true,
        width: 14,
        roundCap: true,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#2f6bff' },
              { offset: 1, color: '#2ee6a6' }
            ]
          }
        }
      },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(64, 128, 255, 0.15)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: {
        offsetCenter: [0, '38%'],
        color: '#7d93b8',
        fontSize: 13
      },
      detail: {
        offsetCenter: [0, '2%'],
        formatter: '{value}%',
        color: '#eaf3ff',
        fontSize: 38,
        fontWeight: 700,
        fontFamily: 'DIN Alternate, Bahnschrift, sans-serif'
      },
      data: [{ value: props.rate, name: `在线 ${onlineText}` }]
    }
  ]
}))

const onlineText = '运行稳定'

watch(() => props.rate, () => render())
onMounted(() => render())
</script>
