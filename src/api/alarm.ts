import http from './request'
import type { AlarmRecord, PageResult } from '@/types'

export interface AlarmQuery {
  page: number
  pageSize: number
  level?: number | ''
  status?: number | ''
  region?: string
  type?: string
  keyword?: string
  timeRange?: string[]
}

/** 告警分页列表 */
export function getAlarmPage(params: AlarmQuery): Promise<PageResult<AlarmRecord>> {
  return http.get('/alarm/page', params)
}

/** 全量(导出用) */
export function getAlarmAll(params: Omit<AlarmQuery, 'page' | 'pageSize'>): Promise<PageResult<AlarmRecord>> {
  return http.get('/alarm/page', { ...params, page: 1, pageSize: 9999 })
}

export interface AlarmStats {
  cards: { today: number; pending: number; urgent: number; closedRate: number }
  trend: { days: string[]; level1: number[]; level2: number[]; level3: number[] }
  top: { names: string[]; values: number[] }
  typePie: { name: string; value: number }[]
}

/** 告警统计(卡片/趋势/高频TOP/类型占比) */
export function getAlarmStats(days = 7): Promise<AlarmStats> {
  return http.get('/alarm/stats', { days })
}

/** 确认告警 */
export function confirmAlarmApi(ids: number[]): Promise<boolean> {
  return http.post('/alarm/confirm', { ids })
}

/** 闭环告警 */
export function closeAlarmApi(ids: number[], note?: string): Promise<boolean> {
  return http.post('/alarm/close', { ids, note })
}

/** 转运维派单 */
export function dispatchAlarmApi(payload: { id: number; assignee: string; note?: string }): Promise<boolean> {
  return http.post('/alarm/dispatch', payload)
}
