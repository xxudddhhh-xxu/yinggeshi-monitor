<template>
  <div class="park-map">
    <svg class="map-svg" viewBox="0 0 1160 500">
      <!-- 园区边界 -->
      <rect x="24" y="24" width="1112" height="452" rx="14" class="park-boundary" />

      <!-- 道路 -->
      <line x1="400" y1="24" x2="400" y2="476" class="park-road" />
      <line x1="790" y1="24" x2="790" y2="476" class="park-road" />
      <line x1="24" y1="250" x2="400" y2="250" class="park-road dashed" />

      <!-- 各分区 -->
      <g v-for="zone in zones" :key="zone.name">
        <rect :x="zone.x" :y="zone.y" :width="zone.w" :height="zone.h" rx="8" class="zone-block" />
        <text :x="zone.x + 10" :y="zone.y + 20" class="zone-label">{{ zone.name }}</text>
      </g>

      <!-- 设备点位 -->
      <g
        v-for="point in points"
        :key="point.deviceId"
        class="marker"
        @mouseenter="hoveredId = point.deviceId"
        @mouseleave="hoveredId = null"
        @click="openDevice(point)"
      >
        <circle
          v-if="point.status === 'fault'"
          :cx="point.x"
          :cy="point.y"
          r="7"
          fill="none"
          stroke="#ff4d5e"
          stroke-width="2"
          class="pulse-ring"
        />
        <circle
          :cx="point.x"
          :cy="point.y"
          :r="hoveredId === point.deviceId ? 8 : 5"
          :fill="statusColor[point.status]"
          class="marker-dot"
        />
        <title>{{ point.name }} · {{ statusLabel[point.status] }}</title>
      </g>
    </svg>

    <!-- 悬浮信息卡 -->
    <transition name="fade-slide">
      <div
        v-if="hoverPoint"
        class="marker-pop"
        :style="{ left: `${(hoverPoint.x / 1160) * 100}%`, top: `${(hoverPoint.y / 500) * 100}%` }"
      >
        <div class="pop-name">{{ hoverPoint.name }}</div>
        <div class="pop-row">
          <span :class="['pop-status', hoverPoint.status]">{{ statusLabel[hoverPoint.status] }}</span>
          <span>{{ hoverPoint.region.split('·')[1] }}</span>
        </div>
        <div class="pop-tip">点击查看设备详情</div>
      </div>
    </transition>

    <!-- 图例 -->
    <div class="map-legend">
      <span v-for="(label, key) in statusLabel" :key="key" class="legend-item">
        <i :style="{ background: statusColor[key] }" />{{ label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScreenOverview } from '@/types'

/** 园区平面图:分区轮廓 + 设备点位(在线绿 / 离线灰 / 异常红闪烁) */
const props = defineProps<{ points: ScreenOverview['points'] }>()

const hoveredId = ref<number | null>(null)

const zones = [
  { name: 'A区·研发办公楼', x: 60, y: 70, w: 300, h: 200 },
  { name: 'B区·生产厂房', x: 430, y: 60, w: 330, h: 160 },
  { name: 'C区·数据中心', x: 430, y: 280, w: 330, h: 170 },
  { name: 'D区·综合服务区', x: 820, y: 70, w: 280, h: 380 },
  { name: 'E区·地下管廊', x: 60, y: 330, w: 300, h: 180 }
]

const statusColor: Record<string, string> = {
  online: '#2ee6a6',
  offline: '#7a8ba6',
  fault: '#ff4d5e',
  disabled: '#8a6d3b'
}

const statusLabel: Record<string, string> = {
  online: '在线',
  offline: '离线',
  fault: '异常',
  disabled: '停用'
}

const hoverPoint = computed(() => props.points.find((p) => p.deviceId === hoveredId.value) ?? null)

function openDevice(point: ScreenOverview['points'][number]): void {
  // 大屏独立页签,详情在新窗口打开管理页
  window.open(`/device/detail/${point.deviceId}`, '_blank')
}
</script>

<style scoped lang="scss">
.park-map {
  position: relative;
  width: 100%;
  height: 100%;

  .map-svg {
    width: 100%;
    height: 100%;
  }

  .park-boundary {
    fill: rgba(20, 45, 90, 0.18);
    stroke: rgba(55, 198, 255, 0.45);
    stroke-width: 1.5;
    stroke-dasharray: 8 4;
  }

  .park-road {
    stroke: rgba(90, 140, 220, 0.35);
    stroke-width: 6;
    stroke-linecap: round;

    &.dashed {
      stroke-width: 2;
      stroke-dasharray: 10 8;
    }
  }

  .zone-block {
    fill: rgba(30, 70, 140, 0.28);
    stroke: rgba(96, 165, 250, 0.5);
    stroke-width: 1.2;
  }

  .zone-label {
    fill: #8fb4e8;
    font-size: 13px;
    letter-spacing: 1px;
  }

  .marker {
    cursor: pointer;
  }

  .marker-dot {
    filter: drop-shadow(0 0 4px currentColor);
    transition: r 0.15s ease;
  }

  .pulse-ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse-ring 1.6s ease-out infinite;
  }

  .marker-pop {
    position: absolute;
    transform: translate(-50%, -130%);
    min-width: 140px;
    padding: 8px 10px;
    background: rgba(8, 22, 46, 0.92);
    border: 1px solid rgba(55, 198, 255, 0.5);
    border-radius: 6px;
    pointer-events: none;
    z-index: 3;

    .pop-name {
      font-size: 13px;
      color: #eaf3ff;
      font-weight: 600;
    }

    .pop-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
      font-size: 12px;
      color: #7d93b8;

      .pop-status.online { color: #2ee6a6; }
      .pop-status.offline { color: #7a8ba6; }
      .pop-status.fault { color: #ff4d5e; }
      .pop-status.disabled { color: #b08545; }
    }

    .pop-tip {
      margin-top: 4px;
      font-size: 11px;
      color: #5d7396;
    }
  }

  .map-legend {
    position: absolute;
    left: 12px;
    bottom: 6px;
    display: flex;
    gap: 14px;

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #7d93b8;

      i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
    }
  }
}
</style>
