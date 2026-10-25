<template>
  <div class="page-container" v-loading="loading">
    <!-- 欢迎条 -->
    <div class="card welcome-bar">
      <div>
        <div class="welcome-title">{{ greeting }},{{ userStore.userInfo?.name }}</div>
        <div class="welcome-sub">今天也要保持对园区能源运行的掌控 · {{ today }}</div>
      </div>
      <el-button type="primary" :icon="Monitor" @click="openScreen">进入能源大屏</el-button>
    </div>

    <!-- 指标卡片 -->
    <el-row :gutter="12" class="stat-row">
      <el-col v-for="stat in statCards" :key="stat.label" :xs="12" :sm="6">
        <div class="card stat-card" :style="{ '--stat-color': stat.color }">
          <div class="stat-icon">
            <el-icon :size="26"><component :is="stat.icon" /></el-icon>
          </div>
          <div>
            <div class="stat-value num-font">{{ formatNumber(stat.value, stat.decimal ?? 0) }}<span class="stat-unit">{{ stat.unit }}</span></div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="12">
      <el-col :xs="24" :lg="14">
        <div class="card">
          <div class="card-title">园区能耗趋势(24h)</div>
          <div ref="trendEl" class="chart chart-lg" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="10">
        <div class="card">
          <div class="card-title">能源结构占比(本月累计)</div>
          <div ref="pieEl" class="chart chart-lg" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="bottom-row">
      <el-col :xs="24" :lg="10">
        <div class="card">
          <div class="card-title">区域能耗对比(今日)</div>
          <div ref="regionEl" class="chart chart-lg" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="14">
        <div class="card">
          <div class="card-title between">
            <span>最新告警</span>
            <el-button link type="primary" @click="router.push('/alarm/list')">更多</el-button>
          </div>
          <el-table :data="recentAlarms" size="small" :show-header="true" style="width: 100%">
            <el-table-column label="等级" width="70">
              <template #default="{ row }">
                <AlarmLevelTag :level="row.level" />
              </template>
            </el-table-column>
            <el-table-column prop="deviceName" label="设备" min-width="130" show-overflow-tooltip />
            <el-table-column prop="content" label="告警内容" min-width="180" show-overflow-tooltip />
            <el-table-column label="时间" width="100">
              <template #default="{ row }">{{ formatTime(row.time, 'MM-DD HH:mm') }}</template>
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
import { Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getScreenOverview } from '@/api/screen'
import { useEcharts } from '@/hooks/useEcharts'
import { formatNumber, formatTime } from '@/utils/format'
import { ENERGY_COLORS } from '@/constants'
import AlarmLevelTag from '@/components/AlarmLevelTag.vue'
import type { AlarmRecord, ScreenOverview } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const overview = ref<ScreenOverview | null>(null)
const recentAlarms = ref<AlarmRecord[]>([])
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const statCards = computed(() => {
  const o = overview.value
  return [
    { label: '设备总数', value: o?.deviceTotal ?? 0, unit: '台', icon: 'Cpu', color: '#2f6bff' },
    { label: '在线设备', value: o?.online ?? 0, unit: '台', icon: 'CircleCheck', color: '#2eaf7c' },
    { label: '离线/异常设备', value: o?.offline ?? 0, unit: '台', icon: 'WarningFilled', color: '#f56c6c' },
    { label: '今日总用电', value: o?.todayEnergy ?? 0, unit: 'kWh', icon: 'Lightning', color: '#e6a23c', decimal: 0 }
  ]
})

// ---- 图表(useEcharts 的 elRef 直接绑定到模板) ----
const { elRef: trendEl, render: renderTrend } = useEcharts(() => {
  const t = overview.value?.trend
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['电', '水', '气'], top: 0 },
    grid: { top: 36, left: 8, right: 16, bottom: 0, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: t?.times ?? [] },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series: (['电', '水', '气'] as const).map((k) => ({
      name: k,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: t?.series[k] ?? []
    }))
  }
})

const { elRef: pieEl, render: renderPie } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: 10, top: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['40%', '52%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: (overview.value?.pie ?? []).map((d) => ({
        ...d,
        itemStyle: { color: ENERGY_COLORS[d.name] }
      }))
    }
  ]
}))

const { elRef: regionEl, render: renderRegion } = useEcharts(() => {
  const rows = overview.value?.regionEnergy ?? []
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['电', '水', '气'], top: 0 },
    grid: { top: 36, left: 8, right: 16, bottom: 0, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'category', data: rows.map((r) => r.region) },
    series: (['电', '水', '气'] as const).map((k) => ({
      name: k,
      type: 'bar',
      stack: 'total',
      barWidth: 14,
      itemStyle: { color: ENERGY_COLORS[k], borderRadius: k === '气' ? [0, 3, 3, 0] : 0 },
      data: rows.map((r) => r[k])
    }))
  }
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getScreenOverview(5)
    overview.value = data
    recentAlarms.value = data.latestAlarms
    await Promise.resolve()
    renderTrend()
    renderPie()
    renderRegion()
  } finally {
    loading.value = false
  }
})

function openScreen(): void {
  window.open(router.resolve('/screen').href, '_blank')
}
</script>

<style scoped lang="scss">
.welcome-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  background: linear-gradient(120deg, #eef4ff 0%, #f7fbff 60%, #effaf6 100%);

  .welcome-title {
    font-size: 18px;
    font-weight: 600;
  }

  .welcome-sub {
    margin-top: 4px;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.stat-row {
  margin-bottom: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 10px;
    color: var(--stat-color);
    background: color-mix(in srgb, var(--stat-color) 12%, white);
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-main);

    .stat-unit {
      margin-left: 4px;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary);
    }
  }

  .stat-label {
    margin-top: 2px;
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
}

.chart-lg {
  height: 300px;
}

.bottom-row {
  margin-top: 12px;
}
</style>
