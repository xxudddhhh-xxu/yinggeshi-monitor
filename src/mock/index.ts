import dayjs from 'dayjs'
import type { AxiosRequestConfig } from 'axios'
import type { AlarmRecord, Device, PageResult, RoleKey, ScreenOverview, UserInfo } from '@/types'
import {
  alarms,
  devices,
  energyAbnormal,
  energyPie,
  energySaving,
  energyYoY,
  ensureLiveAlarms,
  getPoints,
  maintenancesOf,
  menusOfRole,
  opLogs,
  pushLog,
  regionEnergy,
  buildTrend,
  touchDevices,
  users,
  ROLE_PERMISSIONS
} from './data'

/**
 * 本地 Mock 数据层:按 method + url 正则匹配处理器,
 * 统一返回 { code, data, message } 结构,模拟真实后端时序与错误。
 */

export interface MockContext {
  query: Record<string, any>
  body: any
  params: Record<string, string>
}

interface MockHandler {
  method: 'get' | 'post'
  pattern: RegExp
  handler: (ctx: MockContext) => unknown
}

const ok = <T>(data: T) => data
/** 构造业务错误对象(调用处 throw,便于 TS 控制流收窄) */
const fail = (message: string, code = 500) => ({ code, message })

/** 通用分页 */
function paginate<T>(list: T[], page = 1, pageSize = 20): PageResult<T> {
  return { list: list.slice((page - 1) * pageSize, page * pageSize), total: list.length }
}

function inRange(time: string, range?: string[] | null): boolean {
  if (!range || range.length !== 2) return true
  return time >= `${range[0]} 00:00:00` && time <= `${range[1]} 23:59:59`
}

/** 从 token 解析当前用户 */
function userOfToken(token?: string): (UserInfo & { password: string }) | undefined {
  const username = token?.split('-')[1]
  return users.find((u) => u.username === username)
}

// ========== 地图点位(区域 -> 园区平面坐标) ==========
const REGION_RECT: Record<string, { x: number; y: number; w: number; h: number }> = {
  'A区·研发办公楼': { x: 60, y: 70, w: 300, h: 200 },
  'B区·生产厂房': { x: 430, y: 60, w: 330, h: 160 },
  'C区·数据中心': { x: 430, y: 280, w: 330, h: 170 },
  'D区·综合服务区': { x: 820, y: 70, w: 280, h: 380 },
  'E区·地下管廊': { x: 60, y: 330, w: 300, h: 180 }
}

function mapPoints() {
  const counter: Record<string, number> = {}
  const perRegion: Record<string, number> = {}
  devices.forEach((d) => (perRegion[d.region] = (perRegion[d.region] ?? 0) + 1))
  return devices.map((d) => {
    const rect = REGION_RECT[d.region]
    const idx = counter[d.region] ?? 0
    counter[d.region] = idx + 1
    const cols = Math.ceil(Math.sqrt(perRegion[d.region] * (rect.w / rect.h)))
    const rows = Math.ceil(perRegion[d.region] / cols)
    const col = idx % cols
    const row = Math.floor(idx / cols)
    return {
      deviceId: d.id,
      region: d.region,
      name: d.name,
      status: d.status,
      x: rect.x + ((col + 1) * rect.w) / (cols + 1),
      y: rect.y + ((row + 1) * rect.h) / (rows + 1)
    }
  })
}

// ========== 处理器注册表 ==========
const handlers: MockHandler[] = [
  // ---------- 登录认证 ----------
  {
    method: 'post',
    pattern: /^\/auth\/login$/,
    handler: ({ body }) => {
      const user = users.find((u) => u.username === body.username)
      if (!user || user.password !== body.password) throw fail('用户名或密码错误')
      if (user.status === 0) throw fail('该账号已被停用,请联系管理员')
      pushLog(user.name, '登录认证', '用户登录', `${user.name}(${user.username}) 登录平台`)
      return ok({ token: `mock-${user.username}-${Date.now()}` })
    }
  },
  {
    method: 'get',
    pattern: /^\/auth\/userinfo$/,
    handler: ({ query }) => {
      const user = userOfToken(query.token)
      if (!user) throw fail('登录已失效,请重新登录')
      const { password: _pwd, ...info } = user
      return ok(info)
    }
  },
  {
    method: 'get',
    pattern: /^\/auth\/menus$/,
    handler: ({ query }) => {
      const user = userOfToken(query.token)
      if (!user) throw fail('登录已失效,请重新登录')
      return ok({ menus: menusOfRole(user.role), permissions: ROLE_PERMISSIONS[user.role as RoleKey] })
    }
  },
  {
    method: 'post',
    pattern: /^\/auth\/password$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      if (!user) throw fail('登录已失效,请重新登录')
      if (user.password !== body.oldPassword) throw fail('原密码不正确')
      if (body.newPassword.length < 6) throw fail('新密码长度不能少于 6 位')
      user.password = body.newPassword
      pushLog(user.name, '系统管理', '修改密码', `${user.name} 修改了登录密码`)
      return ok(true)
    }
  },

  // ---------- 大屏总览(轮询) ----------
  {
    method: 'get',
    pattern: /^\/screen\/overview$/,
    handler: ({ query }) => {
      touchDevices()
      ensureLiveAlarms()
      const online = devices.filter((d) => d.status === 'online').length
      const fault = devices.filter((d) => d.status === 'fault').length
      const offline = devices.filter((d) => d.status === 'offline').length
      const todayEnergy = Math.round(devices.reduce((s, d) => s + (d.energyType === '电' ? d.todayEnergy : 0), 0))
      const overview: ScreenOverview = {
        deviceTotal: devices.length,
        online,
        offline: offline + fault,
        fault,
        onlineRate: Number(((online / devices.length) * 100).toFixed(1)),
        todayEnergy,
        yesterdayEnergy: Math.round(todayEnergy * (0.92 + Math.random() * 0.1)),
        todayAlarm: alarms.filter((a) => dayjs(a.time).isSame(dayjs(), 'day')).length,
        pendingAlarm: alarms.filter((a) => a.status === 0).length,
        trend: buildTrend(),
        pie: energyPie(),
        regionEnergy: regionEnergy(),
        points: mapPoints(),
        latestAlarms: alarms.slice(0, Number(query.limit) || 12)
      }
      return ok(overview)
    }
  },

  // ---------- 设备台账 ----------
  {
    method: 'get',
    pattern: /^\/device\/page$/,
    handler: ({ query }) => {
      touchDevices()
      let list: Device[] = [...devices]
      if (query.region) list = list.filter((d) => d.region === query.region)
      if (query.type) list = list.filter((d) => d.type === query.type)
      if (query.status) list = list.filter((d) => d.status === query.status)
      if (query.keyword) {
        const kw = String(query.keyword).trim()
        list = list.filter((d) => d.code.includes(kw) || d.name.includes(kw) || d.position.includes(kw))
      }
      if (query.installRange?.length === 2) {
        list = list.filter((d) => d.installDate >= query.installRange[0] && d.installDate <= query.installRange[1])
      }
      if (query.sortField === 'todayEnergy') {
        list.sort((a, b) => (query.sortOrder === 'desc' ? b.todayEnergy - a.todayEnergy : a.todayEnergy - b.todayEnergy))
      } else if (query.sortField === 'code') {
        list.sort((a, b) => (query.sortOrder === 'desc' ? b.code.localeCompare(a.code) : a.code.localeCompare(b.code)))
      }
      return ok(paginate(list, Number(query.page) || 1, Number(query.pageSize) || 20))
    }
  },
  {
    method: 'get',
    pattern: /^\/device\/detail$/,
    handler: ({ query }) => {
      const device = devices.find((d) => d.id === Number(query.id))
      if (!device) throw fail('设备不存在')
      return ok(device)
    }
  },
  {
    method: 'get',
    pattern: /^\/device\/points$/,
    handler: ({ query }) => ok(getPoints(Number(query.id)))
  },
  {
    method: 'get',
    pattern: /^\/device\/history$/,
    handler: ({ query }) => {
      const id = Number(query.id)
      const device = devices.find((d) => d.id === id)
      const range = String(query.range || 'day')
      const count = range === 'day' ? 24 : range === 'week' ? 7 : 30
      const times: string[] = []
      const values: number[] = []
      const base = device?.todayEnergy ?? 100
      for (let i = count - 1; i >= 0; i--) {
        const t = range === 'day' ? dayjs().subtract(i, 'hour') : dayjs().subtract(i, 'day')
        times.push(range === 'day' ? t.format('HH:00') : t.format('MM-DD'))
        values.push(Math.round(base * (0.55 + Math.random() * 0.7) * (range === 'day' ? 0.08 : 1)))
      }
      return ok({ times, values })
    }
  },
  {
    method: 'get',
    pattern: /^\/device\/maintenances$/,
    handler: ({ query }) => ok(maintenancesOf(Number(query.id)))
  },
  {
    method: 'post',
    pattern: /^\/device\/save$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      if (body.id) {
        const idx = devices.findIndex((d) => d.id === body.id)
        if (idx < 0) throw fail('设备不存在')
        devices[idx] = { ...devices[idx], ...body }
        pushLog(user?.name ?? '-', '设备管理', '编辑设备', `编辑设备 ${body.code}(${body.name})`)
      } else {
        const maxId = Math.max(...devices.map((d) => d.id))
        devices.unshift({
          ...body,
          id: maxId + 1,
          todayEnergy: 0,
          monthEnergy: 0,
          installDate: dayjs().format('YYYY-MM-DD'),
          lastCollectTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          onlineRate: 100
        } as Device)
        pushLog(user?.name ?? '-', '设备管理', '新增设备', `新增设备 ${body.code}(${body.name})`)
      }
      return ok(true)
    }
  },
  {
    method: 'post',
    pattern: /^\/device\/toggle$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      const device = devices.find((d) => d.id === Number(body.id))
      if (!device) throw fail('设备不存在')
      device.status = body.status
      pushLog(user?.name ?? '-', '设备管理', body.status === 'disabled' ? '停用设备' : '启用设备', `${body.status === 'disabled' ? '停用' : '启用'}设备 ${device.code}(${device.name})`)
      return ok(true)
    }
  },

  // ---------- 告警 ----------
  {
    method: 'get',
    pattern: /^\/alarm\/page$/,
    handler: ({ query }) => {
      ensureLiveAlarms()
      let list: AlarmRecord[] = [...alarms]
      if (query.level) list = list.filter((a) => a.level === Number(query.level))
      if (query.status !== undefined && query.status !== '' && query.status !== null) {
        list = list.filter((a) => a.status === Number(query.status))
      }
      if (query.region) list = list.filter((a) => a.region === query.region)
      if (query.type) list = list.filter((a) => a.type === query.type)
      if (query.keyword) {
        const kw = String(query.keyword).trim()
        list = list.filter((a) => a.deviceName.includes(kw) || a.content.includes(kw))
      }
      if (query.timeRange?.length === 2) list = list.filter((a) => inRange(a.time, query.timeRange))
      return ok(paginate(list, Number(query.page) || 1, Number(query.pageSize) || 20))
    }
  },
  {
    method: 'get',
    pattern: /^\/alarm\/stats$/,
    handler: ({ query }) => {
      const days = Number(query.days) || 7
      const dayKeys = Array.from({ length: days }, (_, i) => dayjs().subtract(days - 1 - i, 'day').format('MM-DD'))
      const trend = {
        days: dayKeys,
        level1: dayKeys.map((k) => alarms.filter((a) => dayjs(a.time).format('MM-DD') === k && a.level === 1).length),
        level2: dayKeys.map((k) => alarms.filter((a) => dayjs(a.time).format('MM-DD') === k && a.level === 2).length),
        level3: dayKeys.map((k) => alarms.filter((a) => dayjs(a.time).format('MM-DD') === k && a.level === 3).length)
      }
      const countByDevice = new Map<string, number>()
      alarms.forEach((a) => countByDevice.set(a.deviceName, (countByDevice.get(a.deviceName) ?? 0) + 1))
      const top = [...countByDevice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      const typePie = ['阈值超限', '设备离线', '通讯中断', '数据异常', '环境异常'].map((t) => ({
        name: t,
        value: alarms.filter((a) => a.type === t).length
      }))
      const closed = alarms.filter((a) => a.status === 2).length
      return ok({
        cards: {
          today: alarms.filter((a) => dayjs(a.time).isSame(dayjs(), 'day')).length,
          pending: alarms.filter((a) => a.status === 0).length,
          urgent: alarms.filter((a) => a.level === 1 && a.status !== 2).length,
          closedRate: Number(((closed / alarms.length) * 100).toFixed(1))
        },
        trend,
        top: { names: top.map((t) => t[0]), values: top.map((t) => t[1]) },
        typePie
      })
    }
  },
  {
    method: 'post',
    pattern: /^\/alarm\/confirm$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      const ids: number[] = body.ids ?? []
      ids.forEach((id) => {
        const alarm = alarms.find((a) => a.id === id)
        if (alarm && alarm.status === 0) {
          alarm.status = 1
          alarm.confirmBy = user?.name ?? '-'
          alarm.confirmTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
      })
      pushLog(user?.name ?? '-', '告警中心', '告警确认', `确认告警 ${ids.length} 条`)
      return ok(true)
    }
  },
  {
    method: 'post',
    pattern: /^\/alarm\/close$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      const ids: number[] = body.ids ?? []
      ids.forEach((id) => {
        const alarm = alarms.find((a) => a.id === id)
        if (alarm && alarm.status < 2) {
          alarm.status = 2
          if (!alarm.confirmBy) {
            alarm.confirmBy = user?.name ?? '-'
            alarm.confirmTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
          }
          alarm.closedBy = user?.name ?? '-'
          alarm.closedTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
          if (body.note) alarm.handleNote = body.note
        }
      })
      pushLog(user?.name ?? '-', '告警中心', '告警闭环', `闭环告警 ${ids.length} 条`)
      return ok(true)
    }
  },
  {
    method: 'post',
    pattern: /^\/alarm\/dispatch$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      const alarm = alarms.find((a) => a.id === Number(body.id))
      if (!alarm) throw fail('告警不存在')
      alarm.dispatchTo = body.assignee
      alarm.dispatchTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      alarm.handleNote = body.note
      pushLog(user?.name ?? '-', '告警中心', '转运维派单', `告警 ${alarm.deviceName} 派单至 ${body.assignee}`)
      return ok(true)
    }
  },

  // ---------- 能耗 ----------
  {
    method: 'get',
    pattern: /^\/energy\/pie$/,
    handler: () => ok(energyPie())
  },
  {
    method: 'get',
    pattern: /^\/energy\/region$/,
    handler: () => ok(regionEnergy())
  },
  {
    method: 'get',
    pattern: /^\/energy\/yoy$/,
    handler: () => ok(energyYoY())
  },
  {
    method: 'get',
    pattern: /^\/energy\/device-rank$/,
    handler: ({ query }) => {
      const limit = Number(query.limit) || 10
      return ok(
        [...devices]
          .sort((a, b) => b.monthEnergy - a.monthEnergy)
          .slice(0, limit)
          .map((d) => ({ name: d.name, region: d.region, type: d.type, value: d.monthEnergy, status: d.status }))
      )
    }
  },
  {
    method: 'get',
    pattern: /^\/energy\/abnormal$/,
    handler: () => ok(energyAbnormal())
  },
  {
    method: 'get',
    pattern: /^\/energy\/saving$/,
    handler: () => ok(energySaving())
  },
  {
    method: 'post',
    pattern: /^\/energy\/report$/,
    handler: ({ body }) => {
      const regions = body.regions?.length ? body.regions : undefined
      const scope = regions ? regionEnergy().filter((r) => regions.some((n: string) => r.region === n.split('·')[1])) : regionEnergy()
      const todayEnergy = devices.reduce((s, d) => s + (d.energyType === '电' ? d.todayEnergy : 0), 0)
      if (body.reportType === 'device') {
        return ok({
          title: `设备能耗明细报表(${body.period === 'day' ? '按日' : body.period === 'month' ? '按月' : '按年'})`,
          headers: ['设备编号', '设备名称', '所属区域', '设备类型', '能源类型', '今日能耗', '本月累计', '环比(%)', '状态'],
          rows: devices
            .filter((d) => !regions || regions.includes(d.region))
            .slice(0, 50)
            .map((d) => [
              d.code,
              d.name,
              d.region,
              d.type,
              d.energyType,
              d.todayEnergy,
              d.monthEnergy,
              (Math.random() * 20 - 8).toFixed(1),
              { online: '在线', offline: '离线', fault: '异常', disabled: '停用' }[d.status]
            ])
        })
      }
      if (body.reportType === 'alarm') {
        return ok({
          title: '告警记录报表',
          headers: ['告警时间', '所属区域', '设备名称', '告警类型', '告警等级', '告警内容', '处理状态'],
          rows: alarms
            .filter((a) => (!regions || regions.includes(a.region)) && inRange(a.time, body.dateRange))
            .slice(0, 50)
            .map((a) => [
              a.time,
              a.region,
              a.deviceName,
              a.type,
              { 1: '紧急', 2: '重要', 3: '一般' }[a.level],
              a.content,
              { 0: '未处理', 1: '已确认', 2: '已闭环' }[a.status]
            ])
        })
      }
      // 默认:区域能耗汇总
      return ok({
        title: `区域能耗汇总报表(${body.period === 'day' ? '按日' : body.period === 'month' ? '按月' : '按年'})`,
        headers: ['区域', '电(kWh)', '水(m³)', '气(m³)', '合计折标煤(t)', '环比(%)'],
        rows: scope.map((r) => [
          r.region,
          r.电,
          r.水,
          r.气,
          ((r.电 * 0.1229 + r.水 * 0.0857 + r.气 * 0.1229) / 1000).toFixed(2),
          (Math.random() * 16 - 6).toFixed(1)
        ]),
        summary: `园区今日总用电 ${Math.round(todayEnergy).toLocaleString()} kWh,共 ${devices.length} 台计量设备`
      })
    }
  },

  // ---------- 系统 ----------
  {
    method: 'get',
    pattern: /^\/system\/users$/,
    handler: () => ok(users.map(({ password: _p, ...u }) => u))
  },
  {
    method: 'post',
    pattern: /^\/system\/user\/save$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      if (body.id) {
        const idx = users.findIndex((u) => u.id === body.id)
        if (idx >= 0) users[idx] = { ...users[idx], ...body, password: body.password || users[idx].password }
      } else {
        if (users.some((u) => u.username === body.username)) throw fail('登录账号已存在')
        users.push({ ...body, id: Math.max(...users.map((u) => u.id)) + 1, createTime: dayjs().format('YYYY-MM-DD HH:mm:ss') })
      }
      pushLog(user?.name ?? '-', '系统管理', '保存用户', `保存用户 ${body.name}(${body.username})`)
      return ok(true)
    }
  },
  {
    method: 'post',
    pattern: /^\/system\/user\/reset$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      const target = users.find((u) => u.id === Number(body.id))
      if (!target) throw fail('用户不存在')
      target.password = '123456'
      pushLog(user?.name ?? '-', '系统管理', '重置密码', `重置用户 ${target.name} 的密码`)
      return ok(true)
    }
  },
  {
    method: 'get',
    pattern: /^\/system\/logs$/,
    handler: ({ query }) => {
      let list = [...opLogs]
      if (query.module) list = list.filter((l) => l.module === query.module)
      if (query.keyword) {
        const kw = String(query.keyword).trim()
        list = list.filter((l) => l.operator.includes(kw) || l.detail.includes(kw) || l.action.includes(kw))
      }
      if (query.timeRange?.length === 2) list = list.filter((l) => inRange(l.time, query.timeRange))
      return ok(paginate(list, Number(query.page) || 1, Number(query.pageSize) || 20))
    }
  },
  {
    method: 'post',
    pattern: /^\/system\/log$/,
    handler: ({ body, query }) => {
      const user = userOfToken(query.token)
      pushLog(user?.name ?? body.operator ?? '系统', body.module ?? '系统管理', body.action ?? '操作', body.detail ?? '')
      return ok(true)
    }
  }
]

/** 解析 url 查询参数 */
function parseQuery(url: string): Record<string, string> {
  const qs = url.split('?')[1] ?? ''
  const result: Record<string, string> = {}
  qs.split('&').filter(Boolean).forEach((pair) => {
    const [k, v] = pair.split('=')
    result[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
  })
  return result
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 模拟请求入口:匹配则走本地数据,统一延迟 150~450ms,
 * 处理器抛出的 { code, message } 作为业务错误返回。
 */
export async function mockRequest<T>(config: AxiosRequestConfig): Promise<{ code: number; data: T; message: string }> {
  const method = (config.method || 'get').toLowerCase()
  const url = String(config.url || '')
  const path = url.split('?')[0]
  const handler = handlers.find((h) => h.method === method && h.pattern.test(path))
  if (!handler) {
    return { code: 404, data: null as T, message: `Mock 未注册接口: ${method.toUpperCase()} ${path}` }
  }
  const match = path.match(handler.pattern)!
  const query = { ...parseQuery(url), ...(config.params as object) }
  if (typeof query.token !== 'string' && config.headers) {
    const auth = (config.headers as Record<string, string>).Authorization || (config.headers as Record<string, string>).authorization
    if (auth) query.token = auth.replace('Bearer ', '')
  }
  await delay(150 + Math.random() * 300)
  try {
    const data = handler.handler({ query, body: config.data, params: match.groups ?? {} }) as T
    return { code: 0, data, message: 'ok' }
  } catch (error: any) {
    return { code: error?.code ?? 500, data: null as T, message: error?.message ?? '服务异常,请稍后重试' }
  }
}

/** 是否命中 Mock 接口(未命中时走真实请求) */
export function hasMock(method: string, url: string): boolean {
  const m = method.toLowerCase()
  const path = String(url || '').split('?')[0]
  return handlers.some((h) => h.method === m && h.pattern.test(path))
}
