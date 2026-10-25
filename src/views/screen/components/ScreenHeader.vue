<template>
  <div class="screen-header">
    <div class="header-side left">
      <div class="num-font header-time">{{ timeText }}</div>
      <div class="header-date">{{ dateText }} · 晴 12℃ · 东北风2级</div>
    </div>

    <div class="header-title">
      <span class="title-wing left" />
      <h1>英歌石科学城综合资源监测可视化平台</h1>
      <span class="title-wing right" />
    </div>

    <div class="header-side right">
      <div class="refresh-tip">
        <el-progress
          type="circle"
          :percentage="countdownPercent"
          :width="30"
          :stroke-width="3"
          :show-text="false"
          color="#37c6ff"
        />
        <span>{{ countdown }}s</span>
      </div>
      <el-tooltip content="立即刷新" placement="bottom">
        <el-icon class="header-btn" :size="18" @click="emit('refresh')"><Refresh /></el-icon>
      </el-tooltip>
      <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏'" placement="bottom">
        <el-icon class="header-btn" :size="18" @click="toggleFullscreen">
          <FullScreen v-if="!isFullscreen" />
          <Aim v-else />
        </el-icon>
      </el-tooltip>
      <el-tooltip content="返回管理后台" placement="bottom">
        <el-icon class="header-btn" :size="18" @click="router.push('/dashboard')"><Back /></el-icon>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

const props = defineProps<{
  /** 距下次自动刷新秒数 */
  countdown: number
  /** 轮询周期(秒) */
  interval: number
}>()

const emit = defineEmits<{ (e: 'refresh'): void }>()

const router = useRouter()
const now = ref(dayjs())
const isFullscreen = ref(false)

let timer: number | null = null
onMounted(() => {
  timer = window.setInterval(() => (now.value = dayjs()), 1000)
  document.addEventListener('fullscreenchange', onFsChange)
})
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  document.removeEventListener('fullscreenchange', onFsChange)
})

function onFsChange(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

const timeText = computed(() => now.value.format('HH:mm:ss'))
const dateText = computed(() => now.value.format('YYYY年MM月DD日 dddd').replace('dddd', weekText()))
const countdownPercent = computed(() => Math.max(0, Math.min(100, ((props.interval - props.countdown) / props.interval) * 100)))

function weekText(): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.value.day()]
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}
</script>

<style scoped lang="scss">
.screen-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  padding: 0 24px;

  .header-side {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 380px;

    &.right {
      justify-content: flex-end;
    }
  }

  .header-time {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #eaf3ff;
    text-shadow: 0 0 14px rgba(55, 198, 255, 0.5);
  }

  .header-date {
    margin-top: 2px;
    font-size: 12px;
    color: #6d84a8;
  }

  .header-title {
    position: absolute;
    left: 50%;
    top: 6px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 18px;

    h1 {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 6px;
      white-space: nowrap;
      background: linear-gradient(180deg, #ffffff 20%, #7fc4ff 90%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 6px 24px rgba(38, 110, 255, 0.35);
    }

    .title-wing {
      width: 190px;
      height: 14px;
      background:
        linear-gradient(90deg, transparent, rgba(55, 198, 255, 0.8)) left center / 100% 1px no-repeat;

      &.left {
        transform: rotate(180deg);
      }

      &::after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        background: #37c6ff;
        transform: rotate(45deg);
        box-shadow: 0 0 10px #37c6ff;
      }
    }
  }

  .refresh-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6d84a8;
  }

  .header-btn {
    cursor: pointer;
    color: #9db8dd;
    transition: all 0.2s;

    &:hover {
      color: #37c6ff;
      text-shadow: 0 0 10px rgba(55, 198, 255, 0.8);
    }
  }
}
</style>
