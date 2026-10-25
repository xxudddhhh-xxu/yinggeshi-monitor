<template>
  <div class="page-container">
    <!-- 报表生成器 -->
    <div class="card">
      <div class="card-title">自定义报表</div>
      <el-form inline class="filter-bar">
        <el-form-item label="报表类型">
          <el-select v-model="form.reportType" style="width: 170px">
            <el-option label="区域能耗汇总" value="region" />
            <el-option label="设备能耗明细" value="device" />
            <el-option label="告警记录" value="alarm" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计粒度">
          <el-radio-group v-model="form.period">
            <el-radio-button value="day">按日</el-radio-button>
            <el-radio-button value="month">按月</el-radio-button>
            <el-radio-button value="year">按年</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item label="区域范围">
          <el-select v-model="form.regions" multiple collapse-tags placeholder="默认全部区域" clearable style="width: 240px">
            <el-option v-for="r in REGION_NAMES" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generating" :icon="DataAnalysis" @click="handleGenerate">生成报表</el-button>
          <el-button :disabled="!result" :icon="View" @click="previewVisible = true">预览</el-button>
          <el-button v-permission="'energy:export'" type="success" plain :disabled="!result" :icon="Download" @click="handleExport">
            导出 Excel
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 报表结果 -->
    <div class="card" v-loading="generating">
      <div class="card-title between">
        <span>{{ result?.title ?? '报表结果' }}</span>
        <span v-if="result" class="report-meta">生成时间 {{ generatedAt }} · 共 {{ result.rows.length }} 条</span>
      </div>

      <template v-if="result">
        <el-alert v-if="result.summary" :title="result.summary" type="info" :closable="false" class="summary-bar" />
        <el-table :data="result.rows" border stripe size="small" max-height="520" empty-text="该条件下无数据">
          <el-table-column type="index" label="#" width="52" align="center" />
          <el-table-column
            v-for="(header, idx) in result.headers"
            :key="header"
            :prop="String(idx)"
            :label="header"
            :min-width="columnWidth(header)"
            align="center"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span :class="{ 'cell-number': isNumeric(row[idx]) }">{{ row[idx] }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <EmptyBox v-else description="请选择统计维度与时间范围,点击「生成报表」" />
    </div>

    <!-- 报表预览(打印版式) -->
    <el-dialog v-model="previewVisible" :title="result?.title" width="860px">
      <div class="report-preview">
        <div class="preview-head">
          <h3>{{ result?.title }}</h3>
          <p>英歌石科学城综合资源监测可视化平台 · 生成时间 {{ generatedAt }}</p>
        </div>
        <table class="preview-table">
          <thead>
            <tr>
              <th v-for="header in result?.headers ?? []" :key="header">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in result?.rows ?? []" :key="i">
              <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="result?.summary" class="preview-foot">{{ result.summary }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Download, View } from '@element-plus/icons-vue'
import EmptyBox from '@/components/EmptyBox.vue'
import { generateReport, type ReportPayload, type ReportResult } from '@/api/energy'
import { REGION_NAMES } from '@/constants'
import { exportToExcel } from '@/utils/export'

/** 报表中心:选择维度/范围生成 → 预览 → 导出 */
const form = ref<ReportPayload>({
  reportType: 'region',
  period: 'day',
  dateRange: [dayjs().subtract(7, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
  regions: []
})

const generating = ref(false)
const result = ref<ReportResult | null>(null)
const previewVisible = ref(false)
const generatedAt = ref('')

async function handleGenerate(): Promise<void> {
  generating.value = true
  try {
    result.value = await generateReport({ ...form.value })
    generatedAt.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
    ElMessage.success(`报表已生成,共 ${result.value.rows.length} 条`)
  } finally {
    generating.value = false
  }
}

function handleExport(): void {
  if (!result.value) return
  exportToExcel({
    filename: result.value.title,
    sheetName: '报表',
    headers: result.value.headers,
    rows: result.value.rows
  })
  ElMessage.success('报表已导出')
}

/** 内容列宽启发式:数值列窄,文本列宽 */
function columnWidth(header: string): number {
  return header.includes('内容') || header.includes('区域') || header.includes('名称') ? 180 : 120
}

function isNumeric(value: unknown): boolean {
  return typeof value === 'number'
}
</script>

<style scoped lang="scss">
.card-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;

  &.between {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .report-meta {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary);
    }
  }
}

.summary-bar {
  margin-bottom: 12px;
}

.cell-number {
  font-variant-numeric: tabular-nums;
}

// ---- 预览版式 ----
.report-preview {
  .preview-head {
    text-align: center;
    margin-bottom: 14px;

    h3 {
      font-size: 17px;
      letter-spacing: 1px;
    }

    p {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }

  .preview-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      border: 1px solid var(--border-color);
      padding: 7px 10px;
      font-size: 13px;
      text-align: center;
    }

    th {
      background: #f5f8fd;
      font-weight: 600;
    }

    tbody tr:nth-child(even) {
      background: #fafbfd;
    }
  }

  .preview-foot {
    margin-top: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: right;
  }
}
</style>
