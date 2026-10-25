<template>
  <div class="page-container" v-loading="loading">
    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stat-row">
      <el-col v-for="stat in cards" :key="stat.label" :xs="12" :sm="6">
        <div class="card stat-card" :style="{ '--stat-color': stat.color }">
          <div class="stat-value num-font">{{ formatNumber(stat.value, stat.decimal ?? 0) }}<span v-if="stat.suffix" class="stat-unit">{{ stat.suffix }}</span></div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 趋势 + 高频TOP -->
    <el-row :gutter="12">
      <el-col :xs="24" :lg="15">
        <div class="card">
          <div class="card-title between">
            <span>告警趋势(按等级)</span>
            <el-radio-group v-model="days" size="small" @change="loadStats">
              <el-radio-button :value="7">近7天</el-radio-button>
              <el-radio-button :value="30">近30天</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="trendEl" class="chart" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="9">
        <div class="card">
          <div class="card-title">高频告警设备 TOP5</div>
          <div ref="topEl" class="chart" />
        </div>
      </el-col>
    </el-row>

    <!-- 类型占比 -->
    <el-row :gutter="12" class="mt12">
      <el-col :xs="24" :lg="10">
        <div class="card">
          <div class="card-title">告警类型分布</div>
          <div ref="pieEl" class="chart" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="14">
        <div class="card">
          <div class="card-title between">
            <span>最新待处理告警</span>
            <el-button link type="primary" @click="router.push('/alarm/list')">去处理</el-button>
          </div>
          <el-table :data="latest" size="small">
            <el-table-column label="等级" width="70">
              <template #default="{ row }">
                <AlarmLevelTag :level="row.level" />
              </template>
            </el-table-column>
            <el-table-column prop="deviceName" label="设备" min-width="130" show-overflow-tooltip />
            <el-table-column prop="content" label="内容" min-width="180" show-overflow-tooltip />
            <el-table-column label="时间" width="150">
              <template #default="{ row }">{{ row.time }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AlarmLevelTag from '@/components/AlarmLevelTag.vue'
import { getAlarmPage, getAlarmStats, type AlarmStats } from '@/api/alarm'
import { useEcharts } from '@/hooks/useEcharts'
import { formatNumber } from '@/utils/format'
import type { AlarmRecord } from '@/types'

const router = useRouter()

const loading = ref(false)
const days = ref(7)
const stats = ref<AlarmStats | null>(null)
const latest = ref<AlarmRecord[]>([])

const cards = computed(() => {
  const c = stats.value?.cards
  return [
    { label: '今日告警(条)', value: c?.today ?? 0, color: '#2f6bff' },
    { label: '未处理(条)', value: c?.pending ?? 0, color: '#f56c6c' },
    { label: '未闭环紧急告警(条)', value: c?.urgent ?? 0, color: '#ff9f40' },
    { label: '闭环率', value: c?.closedRate ?? 0, suffix: '%', decimal: 1, color: '#2eaf7c' }
  ]
})

// ---- 告警趋势:按等级堆叠柱状图 ----
const { elRef: trendEl, render: renderTrend } = useEcharts(() => {
  const t = stats.value?.trend
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['紧急', '重要', '一般'], top: 0 },
    grid: { top: 36, left: 8, right: 12, bottom: 0, containLabel: true },
    xAxis: { type: 'category', data: t?.days ?? [], axisLabel: { rotate: days.value > 10 ? 40 : 0 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [
      { name: '紧急', type: 'bar', stack: 'total', barWidth: 14, itemStyle: { color: '#ff4d5e' }, data: t?.level1 ?? [] },
      { name: '重要', type: 'bar', stack: 'total', barWidth: 14, itemStyle: { color: '#ff9f40' }, data: t?.level2 ?? [] },
      { name: '一般', type: 'bar', stack: 'total', barWidth: 14, itemStyle: { color: '#5b8ff9', borderRadius: [3, 3, 0, 0] }, data: t?.level3 ?? [] }
    ]
  }
})

// ---- 高频 TOP5:横向条形图 ----
const { elRef: topEl, render: renderTop } = useEcharts(() => {
  const top = stats.value?.top
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 10, left: 8, right: 30, bottom: 0, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      axisLabel: { color: '#606266' },
      data: [...(top?.names ?? [])].reverse()
    },
    series: [
      {
        name: '告警次数',
        type: 'bar',
        barWidth: 14,
        label: { show: true, position: 'right' },
        itemStyle: {
          borderRadius: [0, 3, 3, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#5b8ff9' }, { offset: 1, color: '#2f6bff' }] }
        },
        data: [...(top?.values ?? [])].reverse()
      }
    ]
  }
})

// ---- 类型占比 ----
const { elRef: pieEl, render: renderPie } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
  legend: { bottom: 0, icon: 'circle' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '44%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: stats.value?.typePie ?? []
    }
  ]
}))

async function loadStats(): Promise<void> {
  loading.value = true
  try {
    stats.value = await getAlarmStats(days.value)
    renderTrend()
    renderTop()
    renderPie()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadLatest()])
})

async function loadLatest(): Promise<void> {
  const data = await getAlarmPage({ page: 1, pageSize: 6, status: 0 })
  latest.value = data.list
}
</script>

<style scoped lang="scss">
.stat-row {
  margin-bottom: 12px;
}

.stat-card {
  .stat-value {
    font-size: 26px;
    font-weight: 700;
    color: var(--stat-color);

    .stat-unit {
      margin-left: 4px;
      font-size: 13px;
      font-weight: 400;
      color: var(--text-secondary);
    }
  }

  .stat-label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.card-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;

  &.between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.chart {
  width: 100%;
  height: 320px;
}

.mt12 {
  margin-top: 12px;
}
</style>
