<template>
  <div class="navbar">
    <div class="navbar-left">
      <el-icon class="collapse-btn" :size="18" @click="appStore.toggleSidebar">
        <Expand v-if="appStore.sidebarCollapsed" />
        <Fold v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="navbar-right">
      <el-tooltip content="能源可视化大屏" placement="bottom">
        <el-icon class="nav-action" :size="17" @click="openScreen"><Monitor /></el-icon>
      </el-tooltip>

      <!-- 未处理告警:轮询刷新角标,高频刷新节流防卡顿 -->
      <el-popover placement="bottom-end" :width="380" trigger="click">
        <template #reference>
          <el-badge :value="pendingCount" :max="99" :hidden="pendingCount === 0" class="alarm-badge">
            <el-icon class="nav-action" :size="17"><Bell /></el-icon>
          </el-badge>
        </template>
        <div class="alarm-pop">
          <div class="alarm-pop-header">
            <span>最新未处理告警</span>
            <el-button link type="primary" size="small" @click="router.push('/alarm/list')">查看全部</el-button>
          </div>
          <el-empty v-if="latestAlarms.length === 0" description="暂无未处理告警" :image-size="60" />
          <div
            v-for="alarm in latestAlarms"
            :key="alarm.id"
            class="alarm-pop-item"
            @click="router.push('/alarm/list')"
          >
            <span class="alarm-dot" :style="{ background: levelColor(alarm.level) }" />
            <div class="alarm-pop-body">
              <div class="alarm-pop-text" :title="alarm.content">{{ alarm.content }}</div>
              <div class="alarm-pop-time">{{ alarm.region }} · {{ formatTime(alarm.time, 'MM-DD HH:mm') }}</div>
            </div>
          </div>
        </div>
      </el-popover>

      <el-dropdown trigger="click" @command="handleUserCommand">
        <div class="user-entry">
          <el-avatar :size="30" class="user-avatar">{{ avatarChar }}</el-avatar>
          <span class="user-name">{{ userStore.userInfo?.name ?? '-' }}</span>
          <el-icon :size="12"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><Avatar /></el-icon>个人中心
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { getAlarmPage } from '@/api/alarm'
import { resetDynamicRoutes } from '@/router/guard'
import { usePolling } from '@/hooks/usePolling'
import { formatTime } from '@/utils/format'
import { ALARM_LEVELS } from '@/constants'
import type { AlarmRecord } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const breadcrumbs = computed(() =>
  route.matched
    .filter((item) => item.meta?.title)
    .map((item) => ({ path: item.path, title: item.meta.title as string }))
    .slice(1)
)

const avatarChar = computed(() => (userStore.userInfo?.name ?? '用').slice(0, 1))

// ---- 未处理告警轮询(12s,页签隐藏自动跳过) ----
const pendingCount = ref(0)
const latestAlarms = ref<AlarmRecord[]>([])

async function fetchPending(): Promise<void> {
  try {
    const data = await getAlarmPage({ page: 1, pageSize: 5, status: 0 })
    pendingCount.value = data.total
    latestAlarms.value = data.list
  } catch {
    /* 静默失败:角标轮询不打扰用户 */
  }
}

usePolling(fetchPending, 12000)

function levelColor(level: number): string {
  return ALARM_LEVELS[level as 1 | 2 | 3]?.color ?? '#5b8ff9'
}

function openScreen(): void {
  window.open(router.resolve('/screen').href, '_blank')
}

async function handleUserCommand(command: string): Promise<void> {
  if (command === 'profile') {
    router.push('/profile')
    return
  }
  if (command === 'logout') {
    userStore.resetAuth()
    resetDynamicRoutes(router)
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped lang="scss">
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 14px;

    .collapse-btn {
      cursor: pointer;
      color: var(--text-secondary);

      &:hover {
        color: var(--primary-color);
      }
    }
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .nav-action {
      cursor: pointer;
      color: var(--text-secondary);
      outline: none;

      &:hover {
        color: var(--primary-color);
      }
    }
  }

  .user-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    .user-avatar {
      background: linear-gradient(135deg, #2f6bff, #37c6ff);
      color: #fff;
      font-size: 14px;
    }

    .user-name {
      font-size: 14px;
    }
  }
}

.alarm-pop {
  .alarm-pop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 4px;
  }

  .alarm-pop-item {
    display: flex;
    gap: 8px;
    padding: 8px 4px;
    border-bottom: 1px dashed var(--border-color);
    cursor: pointer;

    &:hover {
      background: #f5f8ff;
    }

    .alarm-dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
    }

    .alarm-pop-body {
      flex: 1;
      min-width: 0;
    }

    .alarm-pop-text {
      font-size: 13px;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .alarm-pop-time {
      margin-top: 2px;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
}
</style>
