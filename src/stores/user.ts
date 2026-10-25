import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MenuItem, UserInfo } from '@/types'
import { getMenusApi, getUserInfoApi, loginApi } from '@/api/auth'
import { getToken, removeToken, setToken } from '@/utils/auth'

/**
 * 用户/权限 store:token、用户信息、菜单树、按钮权限标识,
 * 全量持久化到 localStorage,刷新页面无需重新拉取。
 */
export const useUserStore = defineStore(
  'ysrc-user',
  () => {
    const token = ref<string>(getToken() ?? '')
    const userInfo = ref<UserInfo | null>(null)
    const menus = ref<MenuItem[]>([])
    const permissions = ref<string[]>([])

    const isFirstLevel = computed(() => menus.value.filter((m) => !m.hidden))

    /** 登录:仅保存 token,信息与菜单在守卫中拉取 */
    async function login(payload: { username: string; password: string }): Promise<void> {
      const { token: tk } = await loginApi(payload)
      token.value = tk
      setToken(tk)
    }

    /** 拉取用户信息 + 角色菜单 + 权限标识 */
    async function fetchUserAndMenus(): Promise<void> {
      const [info, menuData] = await Promise.all([getUserInfoApi(), getMenusApi()])
      userInfo.value = info
      menus.value = menuData.menus
      permissions.value = menuData.permissions
    }

    /** 按钮级权限:admin 持有通配符 * */
    function hasPerm(code?: string): boolean {
      if (!code) return true
      return permissions.value.includes('*') || permissions.value.includes(code)
    }

    /** 退出:清空状态与本地 token(动态路由由 guard 重置) */
    function resetAuth(): void {
      token.value = ''
      userInfo.value = null
      menus.value = []
      permissions.value = []
      removeToken()
    }

    return { token, userInfo, menus, permissions, isFirstLevel, login, fetchUserAndMenus, hasPerm, resetAuth }
  },
  { persist: true }
)
