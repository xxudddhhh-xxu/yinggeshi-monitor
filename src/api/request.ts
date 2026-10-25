import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken } from '@/utils/auth'
import { hasMock, mockRequest } from '@/mock'

/** 后端统一响应结构 */
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/** 业务错误(token 过期时跳转登录) */
export class ApiError extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.code = code
  }
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
})

// ---- 请求拦截:携带 token ----
service.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ---- 响应拦截:剥壳 + 统一错误提示 ----
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new ApiError(res.message, res.code))
    }
    return response
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '网络异常,请稍后重试'
    ElMessage.error(message)
    return Promise.reject(new ApiError(message, error.response?.status ?? -1))
  }
)

// ---- 重复请求自动取消:同一 method+url+params 的进行中请求只保留最后一次 ----
const pending = new Map<string, AbortController>()

function requestKey(config: AxiosRequestConfig): string {
  return [config.method, config.url, JSON.stringify(config.params ?? null), JSON.stringify(config.data ?? null)].join('&')
}

function abortRepeat(key: string): void {
  const controller = pending.get(key)
  if (controller) controller.abort()
  const next = new AbortController()
  pending.set(key, next)
  return void next
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  // Mock 模式:命中已注册的本地接口则不走网络
  if (USE_MOCK && hasMock(config.method ?? 'get', config.url ?? '')) {
    const headers = { Authorization: `Bearer ${getToken() ?? ''}` }
    const res = await mockRequest<T>({ ...config, headers })
    if (res.code !== 0) {
      ElMessage.error(res.message)
      throw new ApiError(res.message, res.code)
    }
    return res.data
  }

  // 真实请求:取消重复请求(表格轮询/快速切换筛选时防竞态)
  const key = requestKey(config)
  abortRepeat(key)
  const controller = pending.get(key)!
  try {
    const response = await service.request<ApiResponse<T>>({ ...config, signal: controller.signal })
    return response.data.data
  } catch (error: unknown) {
    if (axios.isCancel(error)) {
      // 被新请求取代,静默返回空承诺,避免无意义的报错提示
      return new Promise<T>(() => {})
    }
    throw error
  } finally {
    if (pending.get(key) === controller) pending.delete(key)
  }
}

export default {
  get<T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'get', url, params })
  },
  post<T>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'post', url, data })
  }
}
