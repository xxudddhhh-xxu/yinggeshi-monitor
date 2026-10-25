<template>
  <div class="page-container" v-loading="loading">
    <!-- 维度切换工具条 -->
    <div class="card">
      <div class="toolbar">
        <el-radio-group v-model="dimension" @change="renderMainChart">
          <el-radio-button value="region">按区域统计</el-radio-button>
          <el-radio-button value="device">按设备统计</el-radio-button>
        </el-radio-group>
        <el-button v-permission="'energy:export'" type="success" plain :icon="Download" @click="handleExport">
          导出当前维度数据
        </el-button>
      </div>
    </div>

    <!-- 主图 + 同比环比 -->
    <el-row :gutter="12" class="mt12">
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-title">{{ dimension === 'region' ? '区域能耗对比(今日)' : '设备用能排行 TOP10(本月)' }}</div>
          <div ref="mainEl" class="chart" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-title">园区总用电 · 同比 / 环比(近12个月)</div>
          <div ref="yoyEl" class="chart" />
        </div>
      </el-col>
    </el-row>

    <!-- 节能指标 -->
    <div class="card mt12">
      <div class="card-title">节能指标汇总</div>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :lg="12">
          <div class="saving-block">
            <div class="saving-head">
              <span>月度用能(计划 vs 实际)</span>
              <el-tag :type="(saving?.monthSavingRate ?? 0) >= 0 ? 'success' : 'danger'" size="small">
                节能率 {{ saving?.monthSavingRate ?? 0 }}%
              </el-tag>
            </div>
            <el-progress
              :percentage="monthPercent"
              :stroke-width="14"
              :color="[{ color: '#2f6bff', percentage: 100 }]"
              :format="() => `${formatNumber(saving?.monthActual ?? 0)} / ${formatNumber(saving?.monthPlan ?? 0)} kWh`"
            />
          </div>
          <div class="saving-block">
            <div class="saving-head">
              <span>年度用能(计划 vs 实际)</span>
              <el-tag :type="(saving?.yearSavingRate ?? 0) >= 0 ? 'success' : 'danger'" size="small">
                节能率 {{ saving?.yearSavingRate ?? 0 }}%
              </el-tag>
            </div>
            <el-progress
              :percentage="yearPercent"
              :stroke-width="14"
              :color="[{ color: '#25d0ab', percentage: 100 }]"
              :format="() => `${formatNumber(saving?.yearActual ?? 0)} / ${formatNumber(saving?.yearPlan ?? 0)} kWh`"
            />
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="6">
          <div class="eco-card">
            <div class="eco-value num-font">{{ formatNumber(saving?.pvToday ?? 0) }}</div>
            <div class="eco-label">光伏今日发电(kWh)</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="6">
          <div class="eco-card">
            <div class="eco-value num-font">{{ formatNumber(saving?.carbonReduce ?? 0) }}</div>
            <div class="eco-label">累计碳减排(t)</div>
          </div>
        </el-col>
      </el-row>
      <ul v-if="saving?.tips?.length" class="tips-list">
        <li v-for="(tip, i) in saving.tips" :key="i">{{ tip }}</li>
      </ul>
    </div>

    <!-- 用能异常 -->
    <div class="card mt12">
      <div class="card-title between">
        <span>用能异常统计(实时越限)</span>
        <el-tag type="warning" size="small">超限点将同步触发告警</el-tag>
      </div>
      <el-table :data="abnormal" size="small" border stripe empty-text="当前无越限用能点">
        <el-table-column prop="time" label="发生时间" width="140" />
        <el-table-column prop="device" label="设备" min-width="140" show-overflow-tooltip />
        <el-table-column prop="region" label="所属区域" min-width="130" show-overflow-tooltip />
        <el-table-column prop="point" label="越限测点" width="130" />
        <el-table-column label="实时值" width="120" align="center">
          <template #default="{ row }">
            <span class="value-over">{{ row.value }} {{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="阈值上限" width="110" align="center">
          <template #default="{ row }">{{ row.threshold }} {{ row.unit }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import {
  getDeviceRank,
  getEnergyAbnormal,
  getEnergySaving,
  getEnergyYoY,
  getRegionEnergy,
  type EnergyAbnormal,
  type EnergySaving
} from '@/api/energy'
import { useEcharts } from '@/hooks/useEcharts'
import { formatNumber } from '@/utils/format'
import { exportToExcel } from '@/utils/export'
import { ENERGY_COLORS } from '@/constants'

const loading = ref(false)
const dimension = ref<'region' | 'device'>('region')
const regionData = ref<{ region: string; 电: number; 水: number; 气: number }[]>([])
const rankData = ref<Awaited<ReturnType<typeof getDeviceRank>>>([])
const yoy = ref<Awaited<ReturnType<typeof getEnergyYoY>> | null>(null)
const saving = ref<EnergySaving | null>(null)
const abnormal = ref<EnergyAbnormal[]>([])

// ---- 主图:区域对比 / 设备排行 ----
const { elRef: mainEl, render: renderMain } = useEcharts(() => {
  if (dimension.value === 'region') {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['电', '水', '气'], top: 0 },
      grid: { top: 36, left: 8, right: 12, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: regionData.value.map((r) => r.region) },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      series: (['电', '水', '气'] as const).map((k) => ({
        name: k,
        type: 'bar',
        stack: 'total',
        barWidth: 30,
        itemStyle: { color: ENERGY_COLORS[k], borderRadius: k === '气' ? [3, 3, 0, 0] : 0 },
        data: regionData.value.map((r) => r[k])
      }))
    }
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 16, left: 8, right: 30, bottom: 0, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      axisLabel: { color: '#606266' },
      data: rankData.value.map((r) => r.name).reverse()
    },
    series: [
      {
        name: '本月用能',
        type: 'bar',
        barWidth: 14,
        label: { show: true, position: 'right' },
        itemStyle: {
          borderRadius: [0, 3, 3, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f5b73c' }, { offset: 1, color: '#f5862c' }] }
        },
        data: rankData.value.map((r) => r.value).reverse()
      }
    ]
  }
})

function renderMainChart(): void {
  renderMain()
}

// ---- 同比 / 环比 ----
const { elRef: yoyEl, render: renderYoy } = useEcharts(() => {
  const y = yoy.value
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['本年', '上年同期', '环比增长'], top: 0 },
    grid: { top: 36, left: 8, right: 14, bottom: 0, containLabel: true },
    xAxis: { type: 'category', data: y?.months ?? [] },
    yAxis: [
      { type: 'value', name: 'kWh', splitLine: { lineStyle: { type: 'dashed' } } },
      { type: 'value', name: '%', axisLabel: { formatter: '{value}%' }, splitLine: { show: false } }
    ],
    series: [
      { name: '本年', type: 'bar', barWidth: 14, itemStyle: { color: '#2f6bff', borderRadius: [3, 3, 0, 0] }, data: y?.thisYear ?? [] },
      { name: '上年同期', type: 'bar', barWidth: 14, itemStyle: { color: '#b8c6e0', borderRadius: [3, 3, 0, 0] }, data: y?.lastYear ?? [] },
      {
        name: '环比增长',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#ff9f40' },
        data: y?.mom ?? []
      }
    ]
  }
})

const monthPercent = computed(() =>
  Math.min(100, Math.round(((saving.value?.monthActual ?? 0) / (saving.value?.monthPlan ?? 1)) * 100))
)
const yearPercent = computed(() =>
  Math.min(100, Math.round(((saving.value?.yearActual ?? 0) / (saving.value?.yearPlan ?? 1)) * 100))
)

// ---- 导出 ----
function handleExport(): void {
  if (dimension.value === 'region') {
    exportToExcel({
      filename: '区域能耗统计',
      headers: ['区域', '电(kWh)', '水(m³)', '气(m³)'],
      rows: regionData.value.map((r) => [r.region, r.电, r.水, r.气])
    })
  } else {
    exportToExcel({
      filename: '设备用能排行',
      headers: ['设备名称', '所属区域', '设备类型', '本月用能', '状态'],
      rows: rankData.value.map((r) => [
        r.name,
        r.region,
        r.type,
        r.value,
        { online: '在线', offline: '离线', fault: '异常', disabled: '停用' }[r.status]
      ])
    })
  }
  ElMessage.success('导出成功')
}

onMounted(async () => {
  loading.value = true
  try {
    const [region, rank, yoyData, savingData, abnormalData] = await Promise.all([
      getRegionEnergy(),
      getDeviceRank(10),
      getEnergyYoY(),
      getEnergySaving(),
      getEnergyAbnormal()
    ])
    regionData.value = region
    rankData.value = rank
    yoy.value = yoyData
    saving.value = savingData
    abnormal.value = abnormalData
    renderMain()
    renderYoy()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  height: 330px;
}

.mt12 {
  margin-top: 12px;
}

.saving-block {
  margin-bottom: 18px;

  .saving-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--text-main);
  }
}

.eco-card {
  height: 100%;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-color);
  border-radius: 8px;

  .eco-value {
    font-size: 26px;
    font-weight: 700;
    color: #2eaf7c;
  }

  .eco-label {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.tips-list {
  margin-top: 6px;
  padding: 10px 14px;
  background: #f7fafe;
  border-radius: 6px;

  li {
    list-style: none;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 22px;

    &::before {
      content: '💡';
      margin-right: 6px;
    }
  }
}

.value-over {
  color: var(--danger-color);
  font-weight: 700;
}
</style>
