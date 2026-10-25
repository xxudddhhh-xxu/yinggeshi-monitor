<template>
  <div class="page-container">
    <div class="card">
      <!-- 多条件筛选 -->
      <SearchForm @search="search" @reset="reset">
        <el-form-item label="园区分区">
          <el-select v-model="searchParams.region" placeholder="全部分区" clearable style="width: 170px">
            <el-option v-for="r in REGION_NAMES" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="searchParams.type" placeholder="全部类型" clearable filterable style="width: 150px">
            <el-option v-for="t in DEVICE_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="在线状态">
          <el-select v-model="searchParams.status" placeholder="全部状态" clearable style="width: 130px">
            <el-option v-for="(v, k) in DEVICE_STATUS" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchParams.keyword"
            placeholder="编号 / 名称 / 位置"
            clearable
            style="width: 190px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item label="安装时间">
          <el-date-picker
            v-model="searchParams.installRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <template #btns>
          <el-button v-permission="'device:export'" type="success" plain :icon="Download" @click="handleExport">
            导出 Excel
          </el-button>
        </template>
      </SearchForm>

      <!-- 工具条:新增 + 列配置 -->
      <div class="table-toolbar">
        <el-button v-permission="'device:add'" type="primary" :icon="Plus" @click="openForm()">新增设备</el-button>
        <ColumnSetting v-model:visible-keys="visibleKeys" :columns="columnOptions" />
      </div>

      <!-- 台账表格:展开行查看测点明细 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        row-key="id"
        empty-text="暂无符合条件的设备"
        @sort-change="handleSortChange"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="points-table" v-loading="pointsCache[row.id] === undefined">
              <el-table v-if="pointsCache[row.id]?.length" :data="pointsCache[row.id]" size="small" border>
                <el-table-column prop="name" label="测点名称" min-width="130" />
                <el-table-column label="实时值" width="130" align="center">
                  <template #default="{ row: p }">
                    <span :class="{ 'value-over': p.over }">
                      {{ p.value }} {{ p.unit }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="量程下限" prop="lower" width="100" align="center" />
                <el-table-column label="量程上限" prop="upper" width="100" align="center" />
                <el-table-column label="状态" width="90" align="center">
                  <template #default="{ row: p }">
                    <el-tag :type="p.over ? 'danger' : 'success'" size="small">{{ p.over ? '超限' : '正常' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="updateTime" label="更新时间" width="170" align="center" />
              </el-table>
              <EmptyBox v-else description="该设备暂无测点数据" :image-size="60" />
            </div>
          </template>
        </el-table-column>

        <el-table-column v-if="isVisible('code')" prop="code" label="设备编号" min-width="130" sortable="custom">
          <template #default="{ row }">
            <el-link type="primary" @click="goDetail(row)">{{ row.code }}</el-link>
          </template>
        </el-table-column>
        <el-table-column v-if="isVisible('name')" prop="name" label="设备名称" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="isVisible('region')" prop="region" label="所属区域" min-width="140" show-overflow-tooltip />
        <el-table-column v-if="isVisible('type')" prop="type" label="设备类型" width="110" />
        <el-table-column v-if="isVisible('position')" prop="position" label="安装位置" min-width="140" show-overflow-tooltip />
        <el-table-column v-if="isVisible('commAddress')" prop="commAddress" label="通讯地址" min-width="150" />
        <el-table-column v-if="isVisible('status')" label="采集状态" width="90" align="center">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column v-if="isVisible('todayEnergy')" prop="todayEnergy" label="今日能耗" width="120" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNumber(row.todayEnergy, 1) }}</template>
        </el-table-column>
        <el-table-column v-if="isVisible('onlineRate')" label="在线率" width="100" align="center">
          <template #default="{ row }">{{ row.onlineRate }}%</template>
        </el-table-column>
        <el-table-column v-if="isVisible('lastCollectTime')" prop="lastCollectTime" label="最后采集时间" width="165" align="center" />

        <el-table-column label="操作" width="190" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
            <el-button v-permission="'device:edit'" link type="primary" size="small" @click="openForm(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 'disabled'"
              v-permission="'device:disable'"
              link
              type="danger"
              size="small"
              @click="handleToggle(row)"
            >
              停用
            </el-button>
            <el-button v-else v-permission="'device:disable'" link type="success" size="small" @click="handleToggle(row)">
              启用
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

    <DeviceFormDialog ref="formRef" @saved="fetchList" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus } from '@element-plus/icons-vue'
import SearchForm from '@/components/SearchForm.vue'
import ColumnSetting, { type ColumnOption } from '@/components/ColumnSetting.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyBox from '@/components/EmptyBox.vue'
import DeviceFormDialog from './DeviceFormDialog.vue'
import { useTable } from '@/hooks/useTable'
import { getDeviceAll, getDevicePage, getDevicePoints, toggleDeviceApi } from '@/api/device'
import { DEVICE_STATUS, DEVICE_TYPES, REGION_NAMES } from '@/constants'
import { formatNumber } from '@/utils/format'
import { exportToExcel } from '@/utils/export'
import type { Device, DevicePoint, DeviceStatusType } from '@/types'

const router = useRouter()

// ---- 列表逻辑(useTable 统一封装搜索/重置/分页) ----
interface DeviceSearchParams {
  region?: string
  type?: string
  status?: DeviceStatusType | ''
  keyword?: string
  installRange?: string[]
  sortField?: string
  sortOrder?: 'asc' | 'desc' | ''
}

const {
  loading,
  tableData,
  total,
  pagination,
  searchParams,
  fetchList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange
} = useTable<Device, DeviceSearchParams>((params) => getDevicePage(params), {
  defaultParams: { region: '', type: '', status: '', keyword: '', installRange: [], sortField: '', sortOrder: '' },
  immediate: true
})

// ---- 列显隐配置 ----
const columnOptions: ColumnOption[] = [
  { key: 'code', label: '设备编号', fixed: true },
  { key: 'name', label: '设备名称' },
  { key: 'region', label: '所属区域' },
  { key: 'type', label: '设备类型' },
  { key: 'position', label: '安装位置' },
  { key: 'commAddress', label: '通讯地址' },
  { key: 'status', label: '采集状态' },
  { key: 'todayEnergy', label: '今日能耗' },
  { key: 'onlineRate', label: '在线率' },
  { key: 'lastCollectTime', label: '最后采集时间' }
]
const visibleKeys = ref(columnOptions.map((c) => c.key))

function isVisible(key: string): boolean {
  return visibleKeys.value.includes(key)
}

// ---- 服务端排序 ----
function handleSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }): void {
  searchParams.sortField = order ? prop : ''
  searchParams.sortOrder = order === 'descending' ? 'desc' : order === 'ascending' ? 'asc' : ''
  fetchList()
}

// ---- 展开行:懒加载测点明细 ----
const pointsCache = reactive<Record<number, DevicePoint[]>>({})

async function handleExpandChange(row: Device, expandedRows: Device[]): Promise<void> {
  const isExpanded = expandedRows.some((r) => r.id === row.id)
  if (isExpanded && !pointsCache[row.id]) {
    pointsCache[row.id] = await getDevicePoints(row.id)
  }
}

// ---- 新增 / 编辑 ----
const formRef = ref<InstanceType<typeof DeviceFormDialog>>()

function openForm(row?: Device): void {
  formRef.value?.open(row)
}

// ---- 停用 / 启用 ----
async function handleToggle(row: Device): Promise<void> {
  const disabling = row.status !== 'disabled'
  await ElMessageBox.confirm(
    `确认${disabling ? '停用' : '启用'}设备【${row.name}】?${disabling ? '停用后将停止数据采集。' : ''}`,
    '操作确认',
    { type: 'warning' }
  )
  await toggleDeviceApi(row.id, disabling ? 'disabled' : 'online')
  ElMessage.success(`${disabling ? '停用' : '启用'}成功`)
  fetchList()
}

// ---- 导出 ----
async function handleExport(): Promise<void> {
  const { list } = await getDeviceAll({
    region: searchParams.region,
    type: searchParams.type,
    status: searchParams.status,
    keyword: searchParams.keyword,
    installRange: searchParams.installRange
  })
  exportToExcel({
    filename: '设备台账',
    sheetName: '设备台账',
    headers: ['设备编号', '设备名称', '所属区域', '设备类型', '安装位置', '通讯地址', '采集状态', '今日能耗', '在线率(%)', '安装日期', '最后采集时间'],
    rows: list.map((d) => [
      d.code,
      d.name,
      d.region,
      d.type,
      d.position,
      d.commAddress,
      DEVICE_STATUS[d.status].label,
      d.todayEnergy,
      d.onlineRate,
      d.installDate,
      d.lastCollectTime
    ])
  })
  ElMessage.success(`已导出 ${list.length} 条设备数据`)
}

function goDetail(row: Device): void {
  router.push(`/device/detail/${row.id}`)
}
</script>

<style scoped lang="scss">
.points-table {
  padding: 8px 16px 8px 56px;
}

.value-over {
  color: var(--danger-color);
  font-weight: 700;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
