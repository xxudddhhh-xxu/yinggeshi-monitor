<template>
  <div class="page-container">
    <div class="card">
      <!-- 组合筛选 -->
      <SearchForm @search="search" @reset="reset">
        <el-form-item label="告警等级">
          <el-select v-model="searchParams.level" placeholder="全部等级" clearable style="width: 120px">
            <el-option v-for="(v, k) in ALARM_LEVELS" :key="k" :label="v.label" :value="Number(k)" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="searchParams.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option v-for="(v, k) in ALARM_STATUS" :key="k" :label="v.label" :value="Number(k)" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属区域">
          <el-select v-model="searchParams.region" placeholder="全部区域" clearable style="width: 170px">
            <el-option v-for="r in REGION_NAMES" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警类型">
          <el-select v-model="searchParams.type" placeholder="全部类型" clearable style="width: 130px">
            <el-option v-for="t in ALARM_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchParams.keyword" placeholder="设备 / 内容" clearable style="width: 160px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="时间区间">
          <el-date-picker
            v-model="searchParams.timeRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <template #btns>
          <el-button v-permission="'alarm:export'" type="success" plain :icon="Download" @click="handleExport">
            导出记录
          </el-button>
        </template>
      </SearchForm>

      <!-- 批量操作 -->
      <div class="table-toolbar">
        <div>
          <el-button
            v-permission="'alarm:confirm'"
            type="warning"
            plain
            :disabled="pendingSelection.length === 0"
            @click="handleBatch(confirmAlarmApi, '确认')"
          >
            确认所选({{ pendingSelection.length }})
          </el-button>
          <el-button
            v-permission="'alarm:close'"
            type="success"
            plain
            :disabled="openSelection.length === 0"
            @click="handleBatch(closeAlarmApi, '闭环')"
          >
            闭环所选({{ openSelection.length }})
          </el-button>
        </div>
        <span class="auto-refresh-tip">列表每 30s 自动刷新,新告警将出现「新」标识</span>
      </div>

      <!-- 告警表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        row-key="id"
        empty-text="暂无符合条件的告警"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="42" :selectable="(row: AlarmRecord) => row.status !== 2" />
        <el-table-column label="告警时间" width="165" sortable prop="time">
          <template #default="{ row }">
            {{ row.time }}
            <el-tag v-if="isNew(row)" type="danger" size="small" effect="dark" class="new-tag">新</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="所属区域" min-width="130" show-overflow-tooltip />
        <el-table-column prop="deviceName" label="设备名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="type" label="告警类型" width="100" />
        <el-table-column label="等级" width="80" align="center">
          <template #default="{ row }">
            <AlarmLevelTag :level="row.level" />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="告警内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="处理状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="ALARM_STATUS[row.status].tag" size="small">{{ ALARM_STATUS[row.status].label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 0" v-permission="'alarm:confirm'" link type="warning" size="small" @click="handleSingle(confirmAlarmApi, [row.id], '确认')">
              确认
            </el-button>
            <el-button v-if="row.status !== 2" v-permission="'alarm:close'" link type="success" size="small" @click="handleSingle(closeAlarmApi, [row.id], '闭环')">
              闭环
            </el-button>
            <el-button v-if="row.status !== 2" v-permission="'alarm:dispatch'" link size="small" @click="openDispatch(row)">
              派单
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="pagination.pageSizes"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="告警详情" size="480px">
      <template v-if="detailAlarm">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="告警编号">AL-{{ detailAlarm.id }}</el-descriptions-item>
          <el-descriptions-item label="告警时间">{{ detailAlarm.time }}</el-descriptions-item>
          <el-descriptions-item label="告警等级">
            <AlarmLevelTag :level="detailAlarm.level" />
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">{{ detailAlarm.type }}</el-descriptions-item>
          <el-descriptions-item label="所属区域">{{ detailAlarm.region }}</el-descriptions-item>
          <el-descriptions-item label="告警设备">{{ detailAlarm.deviceName }}</el-descriptions-item>
          <el-descriptions-item label="告警内容">{{ detailAlarm.content }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="ALARM_STATUS[detailAlarm.status].tag" size="small">{{ ALARM_STATUS[detailAlarm.status].label }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailAlarm.handleNote" label="处理说明">{{ detailAlarm.handleNote }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button v-if="detailAlarm.status === 0" v-permission="'alarm:confirm'" type="warning" @click="handleSingle(confirmAlarmApi, [detailAlarm.id], '确认', detailAlarm)">
            确认告警
          </el-button>
          <el-button v-if="detailAlarm.status !== 2" v-permission="'alarm:close'" type="success" @click="handleSingle(closeAlarmApi, [detailAlarm.id], '闭环', detailAlarm)">
            闭环告警
          </el-button>
          <el-button v-if="detailAlarm.status !== 2" v-permission="'alarm:dispatch'" type="primary" plain @click="openDispatch(detailAlarm)">
            转运维派单
          </el-button>
        </div>

        <!-- 处理过程时间线 -->
        <h4 class="flow-title">处理过程</h4>
        <el-timeline>
          <el-timeline-item :timestamp="detailAlarm.time" placement="top" type="danger">
            系统产生告警({{ ALARM_LEVELS[detailAlarm.level].label }})
          </el-timeline-item>
          <el-timeline-item v-if="detailAlarm.confirmTime" :timestamp="detailAlarm.confirmTime" placement="top" type="warning">
            {{ detailAlarm.confirmBy }} 确认告警
          </el-timeline-item>
          <el-timeline-item v-if="detailAlarm.dispatchTime" :timestamp="detailAlarm.dispatchTime" placement="top" type="primary">
            派单至 {{ detailAlarm.dispatchTo }}
          </el-timeline-item>
          <el-timeline-item v-if="detailAlarm.closedTime" :timestamp="detailAlarm.closedTime" placement="top" type="success">
            {{ detailAlarm.closedBy }} 完成闭环
          </el-timeline-item>
        </el-timeline>
      </template>
    </el-drawer>

    <!-- 派单弹窗 -->
    <el-dialog v-model="dispatchVisible" title="转运维派单" width="440px" destroy-on-close>
      <el-form :model="dispatchForm" label-width="80px">
        <el-form-item label="告警设备">{{ dispatchForm.deviceName }}</el-form-item>
        <el-form-item label="派单人员" required>
          <el-select v-model="dispatchForm.assignee" placeholder="请选择运维人员" style="width: 100%">
            <el-option v-for="p in staff" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="派单备注">
          <el-input v-model="dispatchForm.note" type="textarea" :rows="3" placeholder="填写故障现象与处理要求(可选)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatching" @click="handleDispatch">确认派单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import SearchForm from '@/components/SearchForm.vue'
import AlarmLevelTag from '@/components/AlarmLevelTag.vue'
import { useTable } from '@/hooks/useTable'
import { usePolling } from '@/hooks/usePolling'
import {
  closeAlarmApi,
  confirmAlarmApi,
  dispatchAlarmApi,
  getAlarmAll,
  getAlarmPage
} from '@/api/alarm'
import { ALARM_LEVELS, ALARM_STATUS, ALARM_TYPES, REGION_NAMES } from '@/constants'
import { exportToExcel } from '@/utils/export'
import type { AlarmRecord } from '@/types'

interface AlarmSearchParams {
  level?: number | ''
  status?: number | ''
  region?: string
  type?: string
  keyword?: string
  timeRange?: string[]
}

// ---- 列表 ----
const {
  loading,
  tableData,
  total,
  selection,
  pagination,
  searchParams,
  fetchList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useTable<AlarmRecord, AlarmSearchParams>((params) => getAlarmPage(params), {
  defaultParams: { level: '', status: '', region: '', type: '', keyword: '', timeRange: [] },
  immediate: true
})

// 30s 静默刷新:不打 loading,不打扰用户操作(高频刷新节流由 usePolling 隐藏页签跳过保证)
usePolling(() => fetchList(), 30000, { immediate: false })

const pendingSelection = computed(() => selection.value.filter((a) => a.status === 0))
const openSelection = computed(() => selection.value.filter((a) => a.status !== 2))

/** 5 分钟内视为新告警 */
function isNew(row: AlarmRecord): boolean {
  return row.status === 0 && dayjs().diff(dayjs(row.time), 'minute') < 5
}

// ---- 确认 / 闭环 ----
async function handleSingle(
  api: (ids: number[]) => Promise<boolean>,
  ids: number[],
  action: string,
  detailRow?: AlarmRecord
): Promise<void> {
  await ElMessageBox.confirm(`确认${action}选中的 ${ids.length} 条告警?`, '操作确认', { type: 'warning' })
  await api(ids)
  ElMessage.success(`告警已${action}`)
  if (detailRow) refreshDetail()
  fetchList()
}

async function handleBatch(api: (ids: number[]) => Promise<boolean>, action: string): Promise<void> {
  const ids = (action === '确认' ? pendingSelection.value : openSelection.value).map((a) => a.id)
  await handleSingle(api, ids, action)
}

// ---- 详情抽屉 ----
const detailVisible = ref(false)
const detailAlarm = ref<AlarmRecord | null>(null)
/** 记录当前详情 id,操作后从列表同步最新状态 */
const detailId = ref<number>(0)

function openDetail(row: AlarmRecord): void {
  detailId.value = row.id
  detailAlarm.value = row
  detailVisible.value = true
}

function refreshDetail(): void {
  const latest = tableData.value.find((a) => a.id === detailId.value)
  if (latest) detailAlarm.value = { ...latest }
}

// ---- 派单 ----
const dispatchVisible = ref(false)
const dispatching = ref(false)
const staff = ['李运维', '赵巡检', '周班长', '钱工']
const dispatchForm = ref({ id: 0, deviceName: '', assignee: '', note: '' })

function openDispatch(row: AlarmRecord): void {
  dispatchForm.value = { id: row.id, deviceName: row.deviceName, assignee: '', note: '' }
  dispatchVisible.value = true
}

async function handleDispatch(): Promise<void> {
  if (!dispatchForm.value.assignee) {
    ElMessage.warning('请选择派单人员')
    return
  }
  dispatching.value = true
  try {
    await dispatchAlarmApi({
      id: dispatchForm.value.id,
      assignee: dispatchForm.value.assignee,
      note: dispatchForm.value.note
    })
    ElMessage.success('派单成功')
    dispatchVisible.value = false
    fetchList()
  } finally {
    dispatching.value = false
  }
}

// ---- 导出 ----
async function handleExport(): Promise<void> {
  const { list } = await getAlarmAll({
    level: searchParams.level,
    status: searchParams.status,
    region: searchParams.region,
    type: searchParams.type,
    keyword: searchParams.keyword,
    timeRange: searchParams.timeRange
  })
  exportToExcel({
    filename: '告警记录',
    sheetName: '告警记录',
    headers: ['告警时间', '所属区域', '设备名称', '告警类型', '告警等级', '告警内容', '处理状态', '确认人', '闭环人'],
    rows: list.map((a) => [
      a.time,
      a.region,
      a.deviceName,
      a.type,
      ALARM_LEVELS[a.level].label,
      a.content,
      ALARM_STATUS[a.status].label,
      a.confirmBy ?? '-',
      a.closedBy ?? '-'
    ])
  })
  ElMessage.success(`已导出 ${list.length} 条告警记录`)
}
</script>

<style scoped lang="scss">
.new-tag {
  margin-left: 4px;
  transform: scale(0.85);
}

.auto-refresh-tip {
  font-size: 12px;
  color: var(--text-secondary);
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin: 16px 0;
}

.flow-title {
  margin: 8px 0 12px;
  font-size: 14px;
  color: var(--text-main);
}
</style>
