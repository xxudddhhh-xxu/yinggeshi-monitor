import http from './request'
import type { DeviceStatusType } from '@/types'

/** 能源占比(按本月累计) */
export function getEnergyPie(): Promise<{ name: string; value: number }[]> {
  return http.get('/energy/pie')
}

/** 区域能耗对比 */
export function getRegionEnergy(): Promise<{ region: string; 电: number; 水: number; 气: number }[]> {
  return http.get('/energy/region')
}

/** 能耗同比 / 环比 */
export function getEnergyYoY(): Promise<{ months: string[]; thisYear: number[]; lastYear: number[]; mom: number[] }> {
  return http.get('/energy/yoy')
}

/** 设备用能排行 */
export function getDeviceRank(limit = 10): Promise<{ name: string; region: string; type: string; value: number; status: DeviceStatusType }[]> {
  return http.get('/energy/device-rank', { limit })
}

/** 用能异常记录 */
export interface EnergyAbnormal {
  time: string
  device: string
  region: string
  point: string
  unit: string
  value: number
  threshold: number
}

export function getEnergyAbnormal(): Promise<EnergyAbnormal[]> {
  return http.get('/energy/abnormal')
}

/** 节能指标 */
export interface EnergySaving {
  monthPlan: number
  monthActual: number
  monthSavingRate: number
  yearPlan: number
  yearActual: number
  yearSavingRate: number
  pvToday: number
  carbonReduce: number
  tips: string[]
}

export function getEnergySaving(): Promise<EnergySaving> {
  return http.get('/energy/saving')
}

/** 报表生成 */
export interface ReportPayload {
  reportType: 'region' | 'device' | 'alarm'
  period: 'day' | 'month' | 'year'
  dateRange?: string[]
  regions?: string[]
}

export interface ReportResult {
  title: string
  headers: string[]
  rows: (string | number)[][]
  summary?: string
}

export function generateReport(payload: ReportPayload): Promise<ReportResult> {
  return http.post('/energy/report', payload)
}
