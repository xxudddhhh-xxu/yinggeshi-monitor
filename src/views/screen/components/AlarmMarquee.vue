<template>
  <div class="alarm-marquee">
    <div v-if="alarms.length === 0" class="marquee-empty">暂无实时告警</div>

    <!-- 列表复制一份实现无缝衔接滚动,悬停暂停 -->
    <div v-else class="marquee-wrap">
      <div class="marquee-list">
        <div v-for="(alarm, idx) in loopList" :key="`${alarm.id}-${idx}`" class="alarm-item">
          <span class="item-dot" :style="{ background: levelColor(alarm.level) }" />
          <div class="item-body">
            <div class="item-title">
              <span class="item-level" :style="{ color: levelColor(alarm.level) }">{{ levelText(alarm.level) }}</span>
              <span class="item-device">{{ alarm.deviceName }}</span>
              <span v-if="isNew(alarm)" class="item-new">NEW</span>
            </div>
            <div class="item-content">{{ alarm.content }}</div>
            <div class="item-time">{{ alarm.region.split('·')[1] }} · {{ alarm.time.slice(5, 16) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import type { AlarmRecord } from '@/types'
import { ALARM_LEVELS } from '@/constants'

/** 实时告警走马灯:垂直无缝滚动,新告警高亮 NEW 徽标 */
const props = defineProps<{ alarms: AlarmRecord[] }>()

const loopList = computed(() => [...props.alarms, ...props.alarms])

function levelColor(level: number): string {
  return ALARM_LEVELS[level as 1 | 2 | 3]?.color ?? '#5b8ff9'
}

function levelText(level: number): string {
  return ALARM_LEVELS[level as 1 | 2 | 3]?.label ?? '一般'
}

/** 2 分钟内的告警视为新告警 */
function isNew(alarm: AlarmRecord): boolean {
  return dayjs().diff(dayjs(alarm.time), 'minute') < 2
}
</script>

<style scoped lang="scss">
.alarm-marquee {
  width: 100%;
  height: 100%;

  .marquee-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #5d7396;
    font-size: 13px;
  }
}

.alarm-item {
  display: flex;
  gap: 10px;
  padding: 9px 6px;
  border-bottom: 1px dashed rgba(93, 115, 150, 0.25);

  .item-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 5px;
    box-shadow: 0 0 8px currentColor;
  }

  .item-body {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    display: flex;
    align-items: center;
    gap: 6px;

    .item-level {
      font-size: 12px;
      font-weight: 600;
    }

    .item-device {
      font-size: 13px;
      color: #d7e3f4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-new {
      flex: none;
      padding: 0 4px;
      font-size: 10px;
      line-height: 16px;
      border-radius: 3px;
      color: #ff4d5e;
      border: 1px solid #ff4d5e;
      animation: blink 1.2s ease-in-out infinite;
    }
  }

  .item-content {
    margin-top: 2px;
    font-size: 12px;
    color: #7d93b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-time {
    margin-top: 2px;
    font-size: 11px;
    color: #5d7396;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
