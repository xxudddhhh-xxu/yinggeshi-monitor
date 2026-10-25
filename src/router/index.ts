import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupRouterGuard } from './guard'

/**
 * 静态路由:仅登录页、后台布局壳、大屏与兜底页。
 * 业务页面全部由后端菜单动态 addRoute 注册,无硬编码业务菜单。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        // 隐藏页:设备详情(菜单不展示,但受页面权限控制)
        path: '/device/detail/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/device/detail.vue'),
        meta: { title: '设备详情', permission: 'device:detail', activeMenu: '/device/list' }
      }
    ]
  },
  {
    path: '/screen',
    name: 'Screen',
    component: () => import('@/views/screen/index.vue'),
    meta: { title: '能源可视化大屏', permission: 'screen:view' }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限访问' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

setupRouterGuard(router)

export default router
