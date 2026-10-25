<template>
  <div class="page-container">
    <div class="card">
      <!-- 筛选 -->
      <SearchForm @search="search" @reset="reset">
        <el-form-item label="操作模块">
          <el-select v-model="searchParams.module" placeholder="全部模块" clearable style="width: 150px">
            <el-option v-for="m in LOG_MODULES" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchParams.keyword" placeholder="操作人 / 操作内容" clearable style="width: 190px" @keyup.enter="search" />
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
          <el-button type="success" plain :icon="Download" @click="handleExport">导出日志</el-button>
        </template>
      </SearchForm>

      <el-table v-loading="loading" :data="tableData" border stripe empty-text="暂无操作日志">
        <el-table-column prop="time" label="操作时间" width="170" />
        <el-table-column prop="operator" label="操作人" width="110" />
        <el-table-column prop="module" label="所属模块" width="110" />
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="tagOf(row.action)">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="操作内容" min-width="280" show-overflow-tooltip />
        <el-table-column prop="ip" label="来源 IP" width="130" />
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
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import SearchForm from '@/components/SearchForm.vue'
import { useTable } from '@/hooks/useTable'
import { getLogPage } from '@/api/system'
import { LOG_MODULES } from '@/constants'
import { exportToExcel } from '@/utils/export'
import type { OpLog } from '@/types'

interface LogSearchParams {
  module?: string
  keyword?: string
  timeRange?: string[]
}

const {
  loading,
  tableData,
  total,
  pagination,
  searchParams,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange
} = useTable<OpLog, LogSearchParams>((params) => getLogPage(params), {
  defaultParams: { module: '', keyword: '', timeRange: [] },
  immediate: true
})

function tagOf(action: string): 'success' | 'warning' | 'danger' | 'info' {
  if (action.includes('导出')) return 'success'
  if (action.includes('删除') || action.includes('停用')) return 'danger'
  if (action.includes('告警')) return 'warning'
  return 'info'
}

async function handleExport(): Promise<void> {
  const { list } = await getLogPage({
    page: 1,
    pageSize: 9999,
    module: searchParams.module,
    keyword: searchParams.keyword,
    timeRange: searchParams.timeRange
  })
  exportToExcel({
    filename: '操作日志',
    headers: ['操作时间', '操作人', '所属模块', '操作类型', '操作内容', '来源IP'],
    rows: list.map((l) => [l.time, l.operator, l.module, l.action, l.detail, l.ip])
  })
  ElMessage.success(`已导出 ${list.length} 条日志`)
}
</script>

<style scoped lang="scss">
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
