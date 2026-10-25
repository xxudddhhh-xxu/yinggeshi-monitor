<template>
  <div class="screen-root">
    <!-- 1920x1080 设计稿画布,整体等比缩放适配任意分辨率 / 拼接屏 / 投影 -->
    <div class="screen-canvas" :style="canvasStyle">
      <ScreenHeader :countdown="secondsLeft" :interval="INTERVAL" @refresh="refreshNow" />

      <div class="screen-body">
        <!-- 左列 -->
        <div class="screen-col side">
          <PanelBox title="设备在线监测" extra="实时采集">
            <div class="gauge-panel">
              <OnlineGauge :rate="overview?.onlineRate ?? 0" />
              <div class="gauge-legend">
                <div class="legend-item">
                  <span class="legend-num online num-font">{{ overview?.online ?? 0 }}</span>
                  <span class="legend-label">在线(台)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-num offline num-font">{{ overview?.offline ?? 0 }}</span>
                  <span class="legend-label">离线/异常(台)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-num fault num-font">{{ overview?.fault ?? 0 }}</span>
                  <span class="legend-label">异常(台)</span>
                </div>
              </div>
            </div>
          </PanelBox>

          <PanelBox title="能源结构占比" extra="本月累计">
            <EnergyPie :data="overview?.pie ?? []" />
          </PanelBox>
        </div>

        <!-- 中列 -->
        <div class="screen-col center">
          <div class="stat-strip">
            <div v-for="stat in statCards" :key="stat.label" class="screen-stat stat-card" :style="{ '--accent': stat.color }">
              <div class="stat-value num-font">
                {{ stat.text }}<span class="stat-unit">{{ stat.unit }}</span>
              </div>
              <div class="stat-label">{{ stat.label }}</div>
              <span class="stat-deco" />
            </div>
          </div>

          <PanelBox title="园区设备分布" extra="点击点位可查看设备详情">
            <ParkMap :points="overview?.points ?? []" />
          </PanelBox>

          <PanelBox title="园区能耗趋势(24h)" extra="用电超阈值自动标红">
            <TrendLine :trend="overview?.trend ?? null" />
          </PanelBox>
        </div>

        <!-- 右列 -->
        <div class="screen-col side">
          <PanelBox title="实时告警" :extra="`待处理 ${overview?.pendingAlarm ?? 0} 条`">
            <AlarmMarquee :alarms="overview?.latestAlarms ?? []" />
          </PanelBox>

          <PanelBox title="区域能耗对比" extra="今日">
            <RegionBar :data="overview?.regionEnergy ?? []" />
          </PanelBox>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ScreenHeader from './components/ScreenHeader.vue'
import PanelBox from './components/PanelBox.vue'
import ParkMap from './components/ParkMap.vue'
import OnlineGauge from './components/OnlineGauge.vue'
import EnergyPie from './components/EnergyPie.vue'
import TrendLine from './components/TrendLine.vue'
import RegionBar from './components/RegionBar.vue'
import AlarmMarquee from './components/AlarmMarquee.vue'
import { getScreenOverview } from '@/api/screen'
import { formatNumber } from '@/utils/format'
import type { ScreenOverview } from '@/types'

/** 设计稿基准尺寸 */
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
/** 轮询周期(秒) */
const INTERVAL = 15

// ---- 等比缩放:scale = min(宽比, 高比),画布居中,黑边留白 ----
const scale = ref(1)

function updateScale(): void {
  scale.value = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
}

const canvasStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${DESIGN_HEIGHT}px`,
  transform: `translate(-50%, -50%) scale(${scale.value})`
}))

// ---- 数据轮询:倒计时驱动,页签隐藏时暂停 ----
const overview = ref<ScreenOverview | null>(null)
const loading = ref(false)
const secondsLeft = ref(INTERVAL)
let countdownTimer: number | null = null

async function fetchOverview(): Promise<void> {
  loading.value = true
  try {
    overview.value = await getScreenOverview(14)
  } catch {
    /* 轮询失败静默,等待下个周期 */
  } finally {
    loading.value = false
  }
}

function refreshNow(): void {
  secondsLeft.value = INTERVAL
  fetchOverview()
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
  fetchOverview()
  countdownTimer = window.setInterval(() => {
    if (document.hidden) return
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      secondsLeft.value = INTERVAL
      fetchOverview()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScale)
  if (countdownTimer) window.clearInterval(countdownTimer)
})

// ---- 顶部指标条 ----
const statCards = computed(() => {
  const o = overview.value
  return [
    { label: '设备总数(台)', text: formatNumber(o?.deviceTotal ?? 0), unit: '', color: '#37c6ff' },
    { label: '在线率', text: formatNumber(o?.onlineRate ?? 0, 1), unit: '%', color: '#2ee6a6' },
    { label: '离线/异常(台)', text: formatNumber(o?.offline ?? 0), unit: '', color: '#ff4d5e' },
    { label: '今日总用电(kWh)', text: formatNumber(o?.todayEnergy ?? 0), unit: '', color: '#f5b73c' },
    { label: '待处理告警(条)', text: formatNumber(o?.pendingAlarm ?? 0), unit: '', color: '#ff9f40' }
  ]
})
</script>

<style scoped lang="scss">
.screen-body {
  display: flex;
  gap: 14px;
  height: calc(1080px - 76px);
  padding: 0 16px 16px;
}

.screen-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;

  &.side {
    width: 430px;

    .screen-panel {
      flex: 1;
    }
  }

  &.center {
    flex: 1;

    .stat-strip {
      flex: none;
      height: 108px;
    }

    > .screen-panel:nth-child(2) {
      flex: 1;
    }

    > .screen-panel:nth-child(3) {
      flex: none;
      height: 316px;
    }
  }
}

// ---- 指标条 ----
.stat-strip {
  display: flex;
  gap: 14px;
}

.stat-card {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(64, 128, 255, 0.22);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(19, 38, 74, 0.55), rgba(8, 17, 34, 0.75));
  overflow: hidden;

  .stat-deco {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent);
  }

  .stat-value {
    color: var(--accent);
    font-size: 32px;
    font-weight: 700;
    text-shadow: 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .stat-label {
    margin-top: 4px;
    font-size: 13px;
    color: #7d93b8;
    letter-spacing: 1px;
  }
}

// ---- 在线率面板 ----
.gauge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gauge-legend {
  display: flex;
  justify-content: space-around;
  padding: 0 10px 6px;

  .legend-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .legend-num {
    font-size: 22px;
    font-weight: 700;

    &.online { color: #2ee6a6; }
    &.offline { color: #7a8ba6; }
    &.fault { color: #ff4d5e; }
  }

  .legend-label {
    font-size: 12px;
    color: #7d93b8;
  }
}
</style>
