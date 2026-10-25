<template>
  <div class="page-container" v-loading="loading">
    <!-- 头部:返回 + 设备档案 -->
    <div class="card">
      <div class="detail-header">
        <el-button :icon="Back" link type="primary" @click="router.back()">返回列表</el-button>
        <div class="device-title">
          <span class="device-name">{{ device?.name }}</span>
          <StatusTag v-if="device" :status="device.status" />
        </div>
      </div>

      <el-descriptions v-if="device" :column="4" border size="small" class="device-desc">
        <el-descriptions-item label="设备编号">{{ device.code }}</el-descriptions-item>
        <el-descriptions-item label="所属区域">{{ device.region }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ device.type }}</el-descriptions-item>
        <el-descriptions-item label="能源类型">{{ device.energyType }}</el-descriptions-item>
        <el-descriptions-item label="安装位置">{{ device.position }}</el-descriptions-item>
        <el-descriptions-item label="通讯协议">{{ device.protocol }}</el-descriptions-item>
        <el-descriptions-item label="通讯地址">{{ device.commAddress }}</el-descriptions-item>
        <el-descriptions-item label="安装日期">{{ device.installDate }}</el-descriptions-item>
        <el-descriptions-item label="今日能耗">{{ formatNumber(device.todayEnergy, 1) }}</el-descriptions-item>
        <el-descriptions-item label="本月累计">{{ formatNumber(device.monthEnergy) }}</el-descriptions-item>
        <el-descriptions-item label="30天在线率">{{ device.onlineRate }}%</el-descriptions-item>
        <el-descriptions-item label="最后采集时间">{{ device.lastCollectTime }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 主体:实时参数 / 历史曲线 / 维保记录 -->
    <div class="card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="实时采集参数" name="points">
          <div class="points-grid" v-loading="pointsLoading">
            <div v-for="p in points" :key="p.id" class="point-card" :class="{ over: p.over }">
              <div class="point-name">{{ p.name }}</div>
              <div class="point-value num-font">
                {{ p.value }}<span class="point-unit">{{ p.unit }}</span>
              </div>
              <div class="point-range">
                量程 {{ p.lower }} ~ {{ p.upper }} {{ p.unit }}
                <el-tag v-if="p.over" type="danger" size="small" class="point-tag">超限</el-tag>
              </div>
              <div class="point-time">更新于 {{ p.updateTime }}</div>
            </div>
            <EmptyBox v-if="!pointsLoading && points.length === 0" description="暂无采集数据" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="历史曲线" name="history">
          <div class="history-toolbar">
            <el-radio-group v-model="historyRange" @change="loadHistory">
              <el-radio-button value="day">今日</el-radio-button>
              <el-radio-button value="week">近7天</el-radio-button>
              <el-radio-button value="month">近30天</el-radio-button>
            </el-radio-group>
            <span class="history-unit">单位:kWh(折算电量)</span>
          </div>
          <div ref="historyEl" class="history-chart" v-loading="historyLoading" />
        </el-tab-pane>

        <el-tab-pane label="维保记录" name="maintenance">
          <el-timeline v-if="maintenances.length" class="mt-timeline">
            <el-timeline-item
              v-for="m in maintenances"
              :key="m.id"
              :timestamp="m.date"
              placement="top"
              :type="m.type === '故障维修' ? 'danger' : 'primary'"
            >
              <div class="mt-item">
                <el-tag size="small" :type="m.type === '故障维修' ? 'danger' : m.type === '例行巡检' ? 'success' : 'info'">
                  {{ m.type }}
                </el-tag>
                <span class="mt-content">{{ m.content }}</span>
                <span class="mt-person">处理人:{{ m.person }} · 结果:{{ m.result }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
          <EmptyBox v-else description="暂无维保记录" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyBox from '@/components/EmptyBox.vue'
import { getDeviceDetail, getDeviceHistory, getDeviceMaintenances, getDevicePoints } from '@/api/device'
import { useEcharts } from '@/hooks/useEcharts'
import { usePolling } from '@/hooks/usePolling'
import { formatNumber } from '@/utils/format'
import type { Device, DevicePoint, Maintenance } from '@/types'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const device = ref<Device | null>(null)
const activeTab = ref('points')

// ---- 实时参数(10s 轮询刷新) ----
const pointsLoading = ref(false)
const points = ref<DevicePoint[]>([])

async function loadPoints(): Promise<void> {
  try {
    points.value = await getDevicePoints(route.params.id as string)
  } catch {
    /* 轮询静默 */
  }
}

usePolling(loadPoints, 10000, { immediate: false })

// ---- 历史曲线 ----
const historyRange = ref<'day' | 'week' | 'month'>('day')
const historyLoading = ref(false)
const historyData = ref<{ times: string[]; values: number[] }>({ times: [], values: [] })

const { elRef: historyEl, render: renderHistory } = useEcharts(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 30, left: 10, right: 16, bottom: 0, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: historyData.value.times },
  yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  series: [
    {
      name: '能耗',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#2f6bff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(47, 107, 255, 0.25)' },
            { offset: 1, color: 'rgba(47, 107, 255, 0)' }
          ]
        }
      },
      data: historyData.value.values
    }
  ]
}))

async function loadHistory(): Promise<void> {
  historyLoading.value = true
  try {
    historyData.value = await getDeviceHistory(route.params.id as string, historyRange.value)
    await nextTick()
    renderHistory()
  } finally {
    historyLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'history' && historyData.value.times.length === 0) loadHistory()
})

// ---- 维保记录 ----
const maintenances = ref<Maintenance[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const id = route.params.id as string
    const [detail, pts, mts] = await Promise.all([
      getDeviceDetail(id),
      getDevicePoints(id),
      getDeviceMaintenances(id)
    ])
    device.value = detail
    points.value = pts
    maintenances.value = mts
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.detail-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 14px;

  .device-title {
    display: flex;
    align-items: center;
    gap: 10px;

    .device-name {
      font-size: 17px;
      font-weight: 600;
    }
  }
}

.device-desc {
  margin-bottom: 4px;
}

.points-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  min-height: 120px;
}

.point-card {
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fafbfd;

  &.over {
    border-color: var(--danger-color);
    background: #fef2f3;

    .point-value {
      color: var(--danger-color);
    }
  }

  .point-name {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .point-value {
    margin-top: 6px;
    font-size: 26px;
    font-weight: 700;
    color: var(--text-main);

    .point-unit {
      margin-left: 4px;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary);
    }
  }

  .point-range {
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-secondary);

    .point-tag {
      margin-left: 6px;
    }
  }

  .point-time {
    margin-top: 4px;
    font-size: 11px;
    color: #a8b4c4;
  }
}

.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .history-unit {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.history-chart {
  height: 360px;
}

.mt-timeline {
  padding: 12px 8px 0 8px;

  .mt-item {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    .mt-content {
      font-size: 13px;
    }

    .mt-person {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
}
</style>
