import http from './request'
import type { OpLog, PageResult, RoleKey, UserInfo } from '@/types'

/** 用户列表 */
export function getUsersApi(): Promise<UserInfo[]> {
  return http.get('/system/users')
}

/** 新增 / 编辑用户 */
export function saveUserApi(data: Partial<UserInfo> & { password?: string }): Promise<boolean> {
  return http.post('/system/user/save', data)
}

/** 重置密码 */
export function resetUserPasswordApi(id: number): Promise<boolean> {
  return http.post('/system/user/reset', { id })
}

/** 操作日志分页 */
export function getLogPage(params: {
  page: number
  pageSize: number
  module?: string
  keyword?: string
  timeRange?: string[]
}): Promise<PageResult<OpLog>> {
  return http.get('/system/logs', params)
}

/** 记录操作日志(导出等前端主动行为) */
export function recordLog(data: { operator?: string; module: string; action: string; detail: string }): Promise<boolean> {
  return http.post('/system/log', data)
}
