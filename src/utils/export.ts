import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { recordLog } from '@/api/system'

interface ExportTableOptions {
  /** 表头文案 */
  headers: string[]
  /** 数据行(与表头同序) */
  rows: (string | number)[][]
  /** 文件名(不含扩展名) */
  filename: string
  sheetName?: string
}

/**
 * 统一 Excel 导出:AOA 模式生成 sheet,列宽自适应,
 * 并写入一条操作日志(便于审计导出行为)。
 */
export function exportToExcel({ headers, rows, filename, sheetName = 'Sheet1' }: ExportTableOptions): void {
  const aoa: (string | number)[][] = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)

  // 按内容长度估算列宽(中文按 2 个字符宽度)
  const colWidths = headers.map((header, colIdx) => {
    const maxLen = aoa.reduce((max, row) => {
      const cell = String(row[colIdx] ?? '')
      const width = [...cell].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
      return Math.max(max, width)
    }, header.length * 2)
    return { wch: Math.min(Math.max(maxLen + 4, 8), 40) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)

  recordLog({ module: '系统管理', action: '数据导出', detail: `导出【${filename}】共 ${rows.length} 条` }).catch(() => {})
}
