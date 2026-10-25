import http from './request'
import type { Device, DevicePoint, DeviceStatusType, Maintenance, PageResult } from '@/types'

export interface DeviceQuery {
  page: number
  pageSize: number
  region?: string
  type?: string
  status?: DeviceStatusType | ''
  keyword?: string
  installRange?: string[]
  sortField?: string
  sortOrder?: 'asc' | 'desc' | ''
}

/** 设备台账分页 */
export function getDevicePage(params: DeviceQuery): Promise<PageResult<Device>> {
  return http.get('/device/page', params)
}

/** 全量设备(导出用,复用分页筛选,pageSize 传大值) */
export function getDeviceAll(params: Omit<DeviceQuery, 'page' | 'pageSize'>): Promise<PageResult<Device>> {
  return http.get('/device/page', { ...params, page: 1, pageSize: 9999 })
}

export function getDeviceDetail(id: number | string): Promise<Device> {
  return http.get('/device/detail', { id })
}

/** 实时测点 */
export function getDevicePoints(id: number | string): Promise<DevicePoint[]> {
  return http.get('/device/points', { id })
}

/** 历史曲线 */
export function getDeviceHistory(id: number | string, range: 'day' | 'week' | 'month'): Promise<{ times: string[]; values: number[] }> {
  return http.get('/device/history', { id, range })
}

/** 维保记录 */
export function getDeviceMaintenances(id: number | string): Promise<Maintenance[]> {
  return http.get('/device/maintenances', { id })
}

/** 新增 / 编辑 */
export function saveDeviceApi(data: Partial<Device>): Promise<boolean> {
  return http.post('/device/save', data)
}

/** 停用 / 启用 */
export function toggleDeviceApi(id: number, status: DeviceStatusType): Promise<boolean> {
  return http.post('/device/toggle', { id, status })
}
