import type { RouteLocationNormalized, RouteRecordRaw, Router } from 'vue-router'
import type { MenuItem } from '@/types'
import { useUserStore } from '@/stores/user'

/**
 * 路由守卫:
 * 1. token 校验与登录拦截
 * 2. 基于后端菜单动态 addRoute 注册业务路由
 * 3. 页面级权限控制,无权限跳转 403
 */

const viewModules = import.meta.glob('@/views/**/*.vue')

/** 将 views 下的组件路径解析为懒加载函数 */
function resolveComponent(component?: string) {
  if (!component) return undefined
  const entry = Object.keys(viewModules).find((key) => key.endsWith(`views/${component}.vue`))
  return entry ? viewModules[entry] : undefined
}

/** 本会话内已注册的动态路由名,退出登录时逐个移除,保证切换角色不串权限 */
let registeredNames: string[] = []
let dynamicAdded = false

/** 展平菜单树,生成挂载到 Layout 下的子路由 */
export function addDynamicRoutes(menus: MenuItem[], router: Router): void {
  const walk = (nodes: MenuItem[]) => {
    nodes.forEach((node) => {
      if (node.component) {
        const component = resolveComponent(node.component)
        if (component) {
          const name = `menu-${node.id}`
          const route: RouteRecordRaw = {
            path: node.path,
            name,
            component,
            meta: { title: node.name, icon: node.icon, permission: node.permission }
          }
          router.addRoute('Layout', route)
          registeredNames.push(name)
        }
      }
      if (node.children?.length) walk(node.children)
    })
  }
  walk(menus)
  dynamicAdded = true
}

/** 清空动态路由(退出登录/切换账号时调用) */
export function resetDynamicRoutes(router: Router): void {
  registeredNames.forEach((name) => {
    if (router.hasRoute(name)) router.removeRoute(name)
  })
  registeredNames = []
  dynamicAdded = false
}

export function setupRouterGuard(router: Router): void {
  router.beforeEach(async (to: RouteLocationNormalized) => {
    const userStore = useUserStore()
    document.title = to.meta?.title ? `${to.meta.title} · 英歌石科学城资源监测平台` : '英歌石科学城综合资源监测可视化平台'

    // 登录页:已登录则回首页
    if (to.path === '/login') {
      return userStore.token ? { path: '/' } : true
    }

    // 未登录统一跳登录页,记录回跳地址
    if (!userStore.token) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    try {
      // 刷新后 Pinia 持久化恢复,但仍需重新注册动态路由
      if (!userStore.userInfo) {
        await userStore.fetchUserAndMenus()
      }
      if (!dynamicAdded) {
        addDynamicRoutes(userStore.menus, router)
        // 动态路由注册完成后重放当前导航,让 to 重新匹配
        return to.fullPath
      }
    } catch {
      userStore.resetAuth()
      resetDynamicRoutes(router)
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    // 页面级权限校验
    const permission = to.meta?.permission as string | undefined
    if (permission && !userStore.hasPerm(permission)) {
      return { path: '/403' }
    }
    return true
  })
}
