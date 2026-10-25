import http from './request'
import type { MenuItem, UserInfo } from '@/types'

export interface LoginPayload {
  username: string
  password: string
}

/** 登录:换取 token */
export function loginApi(payload: LoginPayload): Promise<{ token: string }> {
  return http.post('/auth/login', payload)
}

/** 当前用户信息 */
export function getUserInfoApi(): Promise<UserInfo> {
  return http.get('/auth/userinfo')
}

/** 角色菜单树 + 按钮权限标识(动态路由数据源) */
export function getMenusApi(): Promise<{ menus: MenuItem[]; permissions: string[] }> {
  return http.get('/auth/menus')
}

/** 修改密码 */
export function changePasswordApi(payload: { oldPassword: string; newPassword: string }): Promise<boolean> {
  return http.post('/auth/password', payload)
}
