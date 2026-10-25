import http from './request'
import type { ScreenOverview } from '@/types'

/** 大屏总览聚合数据(轮询接口) */
export function getScreenOverview(limit = 12): Promise<ScreenOverview> {
  return http.get('/screen/overview', { limit })
}
