import dayjs from 'dayjs'

/** 数字千分位,numeral 保留 decimal 位 */
export function formatNumber(value: number | string | null | undefined, decimal = 0): string {
  const num = Number(value)
  if (Number.isNaN(num)) return '--'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal
  })
}

/** 时间格式化 */
export function formatTime(value?: string | number | Date | null, template = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!value) return '--'
  return dayjs(value).format(template)
}

/** 相对时间:几分钟前 / 几小时前 */
export function fromNow(value?: string | number | Date | null): string {
  if (!value) return '--'
  const diff = dayjs().diff(dayjs(value), 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

/** 百分比 */
export function formatPercent(value: number | null | undefined, decimal = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${Number(value).toFixed(decimal)}%`
}

/** 能耗数值:按量级自动带单位(kWh -> MWh) */
export function formatEnergy(value: number, decimal = 1): string {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(decimal)}万`
  return value.toFixed(decimal)
}
