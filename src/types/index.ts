// ========== 全局领域类型定义 ==========

/** 通用分页返回 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** 设备测点 */
export interface DevicePoint {
  id: number
  name: string
  unit: string
  value: number
  lower: number
  upper: number
  /** 是否越限 */
  over: boolean
  updateTime: string
}

export type DeviceStatusType = 'online' | 'offline' | 'fault' | 'disabled'
export type EnergyType = '电' | '水' | '气'

/** 设备台账 */
export interface Device {
  id: number
  code: string
  name: string
  region: string
  type: string
  position: string
  commAddress: string
  protocol: string
  status: DeviceStatusType
  energyType: EnergyType
  /** 今日能耗 */
  todayEnergy: number
  /** 本月累计 */
  monthEnergy: number
  installDate: string
  lastCollectTime: string
  /** 30天在线率 */
  onlineRate: number
}

/** 维保记录 */
export interface Maintenance {
  id: number
  deviceId: number
  type: string
  content: string
  person: string
  date: string
  result: string
}

export type AlarmLevel = 1 | 2 | 3
export type AlarmHandleStatus = 0 | 1 | 2

/** 告警记录 */
export interface AlarmRecord {
  id: number
  time: string
  region: string
  deviceId: number
  deviceName: string
  type: string
  level: AlarmLevel
  content: string
  status: AlarmHandleStatus
  confirmBy?: string
  confirmTime?: string
  closedBy?: string
  closedTime?: string
  dispatchTo?: string
  dispatchTime?: string
  handleNote?: string
}

export type RoleKey = 'admin' | 'operator' | 'viewer'

/** 用户信息 */
export interface UserInfo {
  id: number
  username: string
  name: string
  role: RoleKey
  roleName: string
  phone: string
  email: string
  status: 0 | 1
  createTime: string
  password?: string
}

/** 动态菜单节点 */
export interface MenuItem {
  id: number
  parentId: number
  name: string
  path: string
  /** 相对 views 的组件路径,如 device/index;目录节点为空 */
  component?: string
  icon?: string
  permission?: string
  /** 是否在菜单中隐藏(仍注册路由) */
  hidden?: boolean
  /** 外链路由(新窗口打开),如可视化大屏 */
  isLink?: boolean
  sort: number
  children?: MenuItem[]
}

/** 操作日志 */
export interface OpLog {
  id: number
  time: string
  operator: string
  module: string
  action: string
  detail: string
  ip: string
}

/** 能耗趋势序列 */
export interface TrendSeries {
  times: string[]
  series: Record<'电' | '水' | '气', number[]>
  /** 阈值(电,kWh),超限点在大屏标红 */
  threshold: number
}

/** 大屏总览聚合数据 */
export interface ScreenOverview {
  deviceTotal: number
  online: number
  offline: number
  fault: number
  onlineRate: number
  todayEnergy: number
  yesterdayEnergy: number
  todayAlarm: number
  pendingAlarm: number
  trend: TrendSeries
  pie: { name: string; value: number }[]
  regionEnergy: { region: string; 电: number; 水: number; 气: number }[]
  /** 地图点位 */
  points: { deviceId: number; region: string; name: string; status: DeviceStatusType; x: number; y: number }[]
  latestAlarms: AlarmRecord[]
}
