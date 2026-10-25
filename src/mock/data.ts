import dayjs from 'dayjs'
import type {
  AlarmRecord,
  Device,
  DevicePoint,
  Maintenance,
  MenuItem,
  OpLog,
  RoleKey,
  UserInfo
} from '@/types'

// ========== 可复现随机数(保证刷新后图表数据稳定) ==========
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20241024)
const random = () => rand()
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)]
const randInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min
const round = (v: number, d = 1) => Number(v.toFixed(d))

// ========== 区域与设备生成 ==========
interface RegionPlan {
  code: string
  name: string
  /** [设备类型, 数量] */
  types: [string, number][]
  position: (i: number) => string
  /** 小时用电基数 */
  power: number
}

const REGION_PLANS: RegionPlan[] = [
  {
    code: 'A',
    name: 'A区·研发办公楼',
    types: [['智能电表', 4], ['智能水表', 3], ['环境监测仪', 3], ['充电桩', 2]],
    position: (i) => `A${(i % 3) + 1}栋${randInt(1, 8)}层${String(randInt(1, 20)).padStart(2, '0')}室`,
    power: 620
  },
  {
    code: 'B',
    name: 'B区·生产厂房',
    types: [['智能电表', 4], ['智能水表', 2], ['燃气表', 3], ['空压机', 2], ['配电柜', 3]],
    position: (i) => `B${(i % 2) + 1}车间${pick(['东侧', '西侧', '中段', '南侧'])}`,
    power: 1450
  },
  {
    code: 'C',
    name: 'C区·数据中心',
    types: [['配电柜', 3], ['智能电表', 3], ['冷水机组', 3], ['环境监测仪', 2], ['光伏逆变器', 2]],
    position: (i) => `C1机房${pick(['冷通道', '热通道', '电力电池室', '列间'])}${randInt(1, 12)}`,
    power: 2380
  },
  {
    code: 'D',
    name: 'D区·综合服务区',
    types: [['智能电表', 3], ['智能水表', 2], ['燃气表', 2], ['换热站', 2], ['充电桩', 2]],
    position: (i) => `D${(i % 2) + 1}楼${pick(['餐厅', '会议中心', '展厅', '后勤区'])}`,
    power: 480
  },
  {
    code: 'E',
    name: 'E区·地下管廊',
    types: [['智能电表', 2], ['智能水表', 2], ['环境监测仪', 3], ['配电柜', 2]],
    position: (i) => `E区${randInt(1, 6)}号井${pick(['东侧', '西侧'])}廊道`,
    power: 260
  }
]

const ENERGY_OF_TYPE: Record<string, '电' | '水' | '气'> = {
  智能电表: '电',
  智能水表: '水',
  燃气表: '气',
  配电柜: '电',
  空压机: '电',
  冷水机组: '电',
  环境监测仪: '电',
  充电桩: '电',
  光伏逆变器: '电',
  换热站: '气'
}

/** 各设备类型的今日能耗量级 */
const ENERGY_SCALE: Record<string, number> = {
  智能电表: 320,
  智能水表: 55,
  燃气表: 120,
  配电柜: 5600,
  空压机: 1250,
  冷水机组: 3100,
  环境监测仪: 12,
  充电桩: 210,
  光伏逆变器: 860,
  换热站: 640
}

let deviceId = 1000
let pointId = 5000

/** 测点模板:[名称, 单位, 下限, 上限, 基准值] */
const POINT_TEMPLATES: Record<string, [string, string, number, number, number][]> = {
  智能电表: [
    ['电压', 'V', 198, 236, 220],
    ['电流', 'A', 0, 80, 42],
    ['有功功率', 'kW', 0, 60, 28],
    ['功率因数', '', 0.85, 1, 0.96],
    ['正向有功电能', 'kWh', 0, 999999, 12680]
  ],
  智能水表: [
    ['瞬时流量', 'm³/h', 0, 25, 8.6],
    ['净累计流量', 'm³', 0, 999999, 3580],
    ['供水压力', 'kPa', 200, 450, 310]
  ],
  燃气表: [
    ['标况流量', 'm³/h', 0, 40, 15.2],
    ['工况流量', 'm³/h', 0, 45, 17],
    ['累计用气量', 'm³', 0, 999999, 8420]
  ],
  配电柜: [
    ['A相电压', 'V', 198, 236, 221],
    ['B相电压', 'V', 198, 236, 219],
    ['C相电压', 'V', 198, 236, 222],
    ['线电流', 'A', 0, 320, 156],
    ['有功功率', 'kW', 0, 260, 128]
  ],
  空压机: [
    ['排气压力', 'MPa', 0.4, 1.0, 0.72],
    ['排气温度', '℃', 30, 95, 68],
    ['电机电流', 'A', 0, 200, 96],
    ['累计运行时长', 'h', 0, 999999, 12360]
  ],
  冷水机组: [
    ['冷冻水进水温度', '℃', 7, 15, 12.1],
    ['冷冻水出水温度', '℃', 5, 12, 7.4],
    ['冷却水进水温度', '℃', 24, 40, 31.5],
    ['压缩机电流', 'A', 0, 400, 218],
    ['能效比COP', '', 3.5, 6.5, 5.1]
  ],
  环境监测仪: [
    ['温度', '℃', 16, 30, 23.5],
    ['湿度', '%RH', 30, 75, 55],
    ['PM2.5', 'μg/m³', 0, 75, 28],
    ['CO₂浓度', 'ppm', 350, 1200, 620],
    ['噪声', 'dB', 30, 70, 48]
  ],
  充电桩: [
    ['输出电压', 'V', 200, 750, 420],
    ['输出电流', 'A', 0, 120, 62],
    ['累计充电量', 'kWh', 0, 999999, 5890]
  ],
  光伏逆变器: [
    ['直流输入功率', 'kW', 0, 120, 68],
    ['交流输出功率', 'kW', 0, 115, 64],
    ['今日发电量', 'kWh', 0, 900, 460],
    ['转换效率', '%', 90, 99, 96.4]
  ],
  换热站: [
    ['一次侧供水温度', '℃', 40, 95, 72],
    ['二次侧供水温度', '℃', 35, 60, 46],
    ['供回水压差', 'kPa', 20, 120, 58],
    ['瞬时热负荷', 'kW', 0, 900, 420]
  ]
}

function buildDevices(): Device[] {
  const devices: Device[] = []
  REGION_PLANS.forEach((plan) => {
    plan.types.forEach(([type, count]) => {
      for (let i = 1; i <= count; i++) {
        const no = String(devices.length + 1).padStart(3, '0')
        const statusRoll = random()
        // 91% 在线 / 4% 离线 / 4% 异常 / 1% 停用
        const status = (statusRoll > 0.95
          ? 'disabled'
          : statusRoll > 0.91
            ? 'fault'
            : statusRoll > 0.87
              ? 'offline'
              : 'online') as Device['status']
        const scale = ENERGY_SCALE[type]
        devices.push({
          id: ++deviceId,
          code: `YSRC-${plan.code}-${no}`,
          name: `${plan.name.split('·')[1].slice(0, 4)}${type}${i}`,
          region: plan.name,
          type,
          position: plan.position(i),
          commAddress: `${pick(['Modbus-485', 'LoRaWAN', 'NB-IoT', 'MQTT'])}:${plan.code}${String(randInt(1, 255)).padStart(3, '0')}`,
          protocol: pick(['Modbus-RTU', 'Modbus-TCP', 'DL/T645', 'LoRaWAN', 'MQTT']),
          status,
          energyType: ENERGY_OF_TYPE[type],
          todayEnergy: round(scale * (0.6 + random() * 0.8), 1),
          monthEnergy: round(scale * 30 * (0.7 + random() * 0.5), 0),
          installDate: dayjs().subtract(randInt(90, 1000), 'day').format('YYYY-MM-DD'),
          lastCollectTime: dayjs().subtract(randInt(1, 40), 'second').format('YYYY-MM-DD HH:mm:ss'),
          onlineRate: round(status === 'online' ? 96 + random() * 4 : 70 + random() * 25, 1)
        })
      }
    })
  })
  return devices
}

export const devices: Device[] = buildDevices()

/** 模拟采集心跳:每次访问让在线设备的采集时间与今日能耗往前走 */
export function touchDevices(): void {
  const now = dayjs()
  devices.forEach((d) => {
    if (d.status === 'online') {
      d.lastCollectTime = now.subtract(randInt(1, 30), 'second').format('YYYY-MM-DD HH:mm:ss')
      d.todayEnergy = round(d.todayEnergy + random() * 0.6, 1)
    }
  })
}

export function getPoints(deviceIdArg: number): DevicePoint[] {
  const device = devices.find((d) => d.id === deviceIdArg)
  const templates = POINT_TEMPLATES[device?.type ?? '智能电表'] ?? []
  return templates.map(([name, unit, lower, upper, base], idx) => {
    // 8% 概率越限,制造"异常/超限"场景
    const over = random() < 0.08 && device?.status === 'online'
    const value = over
      ? round(upper * (1 + random() * 0.12), 2)
      : round(lower + (upper - lower) * (0.25 + random() * 0.5), 2)
    return {
      id: ++pointId,
      name,
      unit,
      value,
      lower,
      upper,
      over: over || value > upper || value < lower,
      updateTime: dayjs().subtract(randInt(1, 60), 'second').format('YYYY-MM-DD HH:mm:ss')
    }
  })
}

// ========== 告警生成 ==========
let alarmId = 10000
const ALARM_CONTENT: Record<string, (d: Device) => string> = {
  阈值超限: (d) => `${d.name} 采集值越过设定阈值,请及时核查`,
  设备离线: (d) => `${d.name} 超过5分钟未上报数据,疑似离线`,
  通讯中断: (d) => `${d.name} 通讯链路中断(${d.commAddress.split(':')[0]}),正在重连`,
  数据异常: (d) => `${d.name} 上报数据突变,波动超过 30%`,
  环境异常: (d) => `${d.name} 所在位置环境参数超出舒适区间`
}

function createAlarm(device: Device, minutesAgo: number): AlarmRecord {
  const type = pick(['阈值超限', '设备离线', '通讯中断', '数据异常', '环境异常'])
  const levelRoll = random()
  const level = (levelRoll < 0.16 ? 1 : levelRoll < 0.5 ? 2 : 3) as AlarmRecord['level']
  const time = dayjs().subtract(minutesAgo, 'minute')
  const closedRoll = random()
  const status = (minutesAgo > 600 ? (closedRoll < 0.85 ? 2 : 1) : closedRoll < 0.3 ? 2 : closedRoll < 0.6 ? 1 : 0) as AlarmRecord['status']
  const record: AlarmRecord = {
    id: ++alarmId,
    time: time.format('YYYY-MM-DD HH:mm:ss'),
    region: device.region,
    deviceId: device.id,
    deviceName: device.name,
    type,
    level,
    content: ALARM_CONTENT[type](device),
    status
  }
  if (status >= 1) {
    record.confirmBy = pick(['李运维', '赵巡检'])
    record.confirmTime = time.add(randInt(2, 30), 'minute').format('YYYY-MM-DD HH:mm:ss')
  }
  if (status === 2) {
    record.closedBy = pick(['李运维', '赵巡检', '周班长'])
    record.closedTime = time.add(randInt(31, 240), 'minute').format('YYYY-MM-DD HH:mm:ss')
    record.handleNote = pick(['现场复位正常', '更换备件后恢复', '参数重新整定', '链路恢复,数据正常'])
  }
  return record
}

/** 初始化近 7 天告警池 */
export const alarms: AlarmRecord[] = Array.from({ length: 240 }, () =>
  createAlarm(pick(devices), randInt(5, 7 * 24 * 60))
).sort((a, b) => (a.time < b.time ? 1 : -1))

let lastAlarmGenAt = Date.now()
/** 模拟实时告警:访问告警/大屏接口时按时间差追加新告警 */
export function ensureLiveAlarms(): void {
  const elapsed = Date.now() - lastAlarmGenAt
  if (elapsed < 15000) return
  lastAlarmGenAt = Date.now()
  const count = Math.min(3, Math.floor(elapsed / 15000))
  for (let i = 0; i < count; i++) {
    const record = createAlarm(pick(devices), 0)
    record.time = dayjs().format('YYYY-MM-DD HH:mm:ss')
    record.status = 0
    alarms.unshift(record)
  }
}

// ========== 能耗数据 ==========
/** 24h 能耗趋势:办公+生产+数据中心叠加曲线 + 噪声 */
export function buildTrend(): { times: string[]; series: Record<'电' | '水' | '气', number[]>; threshold: number } {
  const times: string[] = []
  const power: number[] = []
  const water: number[] = []
  const gas: number[] = []
  const nowHour = dayjs().hour()
  for (let h = 0; h < 24; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    // 园区小时用电:夜间低谷、白天双峰(10点/15点)
    const officeShape = Math.max(0, Math.sin(((h - 6) / 14) * Math.PI)) * 0.55 + 0.06
    const base = 2600 + officeShape * 5200 + (h >= 13 && h <= 16 ? 900 : 0)
    const curtail = h <= nowHour ? 1 : 0.55
    power.push(Math.round((base + random() * 420) * curtail))
    water.push(Math.round((base / 30 + random() * 35) * curtail))
    gas.push(Math.round((base / 22 + random() * 28) * curtail))
  }
  return { times, series: { 电: power, 水: water, 气: gas }, threshold: 8400 }
}

/** 能源占比(按本月累计) */
export function energyPie(): { name: string; value: number }[] {
  const sum: Record<string, number> = { 电: 0, 水: 0, 气: 0 }
  devices.forEach((d) => {
    sum[d.energyType] += d.monthEnergy
  })
  return (['电', '水', '气'] as const).map((k) => ({ name: k, value: Math.round(sum[k]) }))
}

/** 区域能耗对比 */
export function regionEnergy(): { region: string; 电: number; 水: number; 气: number }[] {
  return REGION_PLANS.map((plan) => {
    const row = { region: plan.name.split('·')[1], 电: 0, 水: 0, 气: 0 }
    devices
      .filter((d) => d.region === plan.name)
      .forEach((d) => {
        row[d.energyType] += d.todayEnergy
      })
    ;(Object.keys(row) as (keyof typeof row)[]).forEach((k) => {
      if (k !== 'region') row[k] = Math.round(row[k])
    })
    return row
  })
}

/** 同比:近 12 个月本月 vs 上年同月 */
export function energyYoY(): { months: string[]; thisYear: number[]; lastYear: number[]; mom: number[] } {
  const months: string[] = []
  const thisYear: number[] = []
  const lastYear: number[] = []
  const mom: number[] = []
  for (let i = 11; i >= 0; i--) {
    const m = dayjs().subtract(i, 'month')
    months.push(m.format('YY/M'))
    const seasonal = 1 + Math.sin((m.month() / 12) * Math.PI * 2) * 0.12
    const cur = Math.round((620000 + random() * 90000) * seasonal)
    const prev = Math.round((586000 + random() * 90000) * seasonal)
    thisYear.push(cur)
    lastYear.push(prev)
    mom.push(i === 11 ? round(((cur - prev) / prev) * 100, 1) : round(-6 + random() * 14, 1))
  }
  return { months, thisYear, lastYear, mom }
}

/** 用能异常(取自越限测点场景) */
export function energyAbnormal() {
  return Array.from({ length: 8 }, () => {
    const d = pick(devices)
    const tpl = pick(POINT_TEMPLATES[d.type])
    const [name, unit, , upper] = tpl
    const value = round(upper * (1.05 + random() * 0.15), 1)
    return {
      time: dayjs().subtract(randInt(5, 300), 'minute').format('MM-DD HH:mm'),
      device: d.name,
      region: d.region,
      point: name,
      unit,
      value,
      threshold: upper
    }
  })
}

/** 节能指标 */
export function energySaving() {
  const monthPlan = 462000
  const monthActual = 418600
  const yearPlan = 5540000
  const yearActual = 4968000
  return {
    monthPlan,
    monthActual,
    monthSavingRate: round(((monthPlan - monthActual) / monthPlan) * 100, 1),
    yearPlan,
    yearActual,
    yearSavingRate: round(((yearPlan - yearActual) / yearPlan) * 100, 1),
    pvToday: 4860,
    carbonReduce: 1286,
    tips: ['C区数据中心冷机群控策略已优化,预计月节电 2.3%', 'B区空压机建议错峰运行,避开 15:00-17:00 尖峰电价', 'A区办公照明存在夜间长明,建议接入人感控制']
  }
}

// ========== 维保记录 ==========
export function maintenancesOf(deviceIdArg: number): Maintenance[] {
  const d = devices.find((x) => x.id === deviceIdArg)
  const types = ['例行巡检', '故障维修', '计量校准', '软件升级', '备件更换']
  return Array.from({ length: randInt(3, 5) }, (_, i) => ({
    id: deviceIdArg * 10 + i,
    deviceId: deviceIdArg,
    type: pick(types),
    content: `${pick(['接线端子紧固', '传感器除尘标定', '通讯模块重启', '继电器校验', '过滤器更换'])},设备运行${pick(['正常', '恢复正常'])}`,
    person: pick(['李运维', '赵巡检', '周班长', '钱工']),
    date: dayjs().subtract(randInt(10, 400), 'day').format('YYYY-MM-DD'),
    result: pick(['合格', '正常', '已恢复'])
  })).sort((a, b) => (a.date < b.date ? 1 : -1))
}

// ========== 用户与角色 ==========
export const users: (UserInfo & { password: string })[] = [
  { id: 1, username: 'admin', name: '张工', role: 'admin', roleName: '系统管理员', phone: '13801230001', email: 'zhang@ysrc.com', status: 1, createTime: '2024-03-01 09:20:00', password: '123456' },
  { id: 2, username: 'operator', name: '李运维', role: 'operator', roleName: '运维工程师', phone: '13801230002', email: 'li@ysrc.com', status: 1, createTime: '2024-04-12 10:00:00', password: '123456' },
  { id: 3, username: 'viewer', name: '王访客', role: 'viewer', roleName: '只读访客', phone: '13801230003', email: 'wang@ysrc.com', status: 1, createTime: '2024-06-20 15:30:00', password: '123456' },
  { id: 4, username: 'zhao', name: '赵巡检', role: 'operator', roleName: '运维工程师', phone: '13801230004', email: 'zhao@ysrc.com', status: 1, createTime: '2024-08-05 08:40:00', password: '123456' },
  { id: 5, username: 'qian', name: '钱实习', role: 'viewer', roleName: '只读访客', phone: '13801230005', email: 'qian@ysrc.com', status: 0, createTime: '2025-01-15 14:10:00', password: '123456' }
]

// ========== 菜单与按钮权限 ==========
/** 全量菜单(扁平,id/parentId 组成树),由角色过滤后下发 */
const ALL_MENUS: Omit<MenuItem, 'children'>[] = [
  { id: 1, parentId: 0, name: '园区总览', path: '/dashboard', component: 'dashboard/index', icon: 'Odometer', permission: 'dashboard:view', sort: 1 },
  { id: 2, parentId: 0, name: '可视化大屏', path: '/screen', icon: 'Monitor', permission: 'screen:view', isLink: true, sort: 2 },
  { id: 10, parentId: 0, name: '设备管理', path: '/device', icon: 'Cpu', sort: 3 },
  { id: 11, parentId: 10, name: '设备台账', path: '/device/list', component: 'device/index', icon: 'List', permission: 'device:list', sort: 1 },
  { id: 20, parentId: 0, name: '告警中心', path: '/alarm', icon: 'Bell', sort: 4 },
  { id: 21, parentId: 20, name: '告警列表', path: '/alarm/list', component: 'alarm/index', icon: 'AlarmClock', permission: 'alarm:list', sort: 1 },
  { id: 22, parentId: 20, name: '告警统计', path: '/alarm/stats', component: 'alarm/statistics', icon: 'DataAnalysis', permission: 'alarm:stats', sort: 2 },
  { id: 30, parentId: 0, name: '能耗管理', path: '/energy', icon: 'Histogram', sort: 5 },
  { id: 31, parentId: 30, name: '能耗统计', path: '/energy/statistics', component: 'energy/statistics', icon: 'TrendCharts', permission: 'energy:stats', sort: 1 },
  { id: 32, parentId: 30, name: '报表中心', path: '/energy/report', component: 'energy/report', icon: 'Document', permission: 'energy:report', sort: 2 },
  { id: 40, parentId: 0, name: '系统管理', path: '/system', icon: 'Setting', sort: 6 },
  { id: 41, parentId: 40, name: '用户管理', path: '/system/user', component: 'system/user', icon: 'User', permission: 'system:user', sort: 1 },
  { id: 42, parentId: 40, name: '操作日志', path: '/system/log', component: 'system/log', icon: 'Notebook', permission: 'system:log', sort: 2 },
  { id: 90, parentId: 0, name: '个人中心', path: '/profile', component: 'profile/index', icon: 'Avatar', hidden: true, sort: 99 }
]

/** 各角色可见菜单 id */
const ROLE_MENUS: Record<RoleKey, number[]> = {
  admin: [1, 2, 10, 11, 20, 21, 22, 30, 31, 32, 40, 41, 42, 90],
  operator: [1, 2, 10, 11, 20, 21, 22, 30, 31, 32, 90],
  viewer: [1, 2, 10, 11, 20, 21, 30, 31, 90]
}

/** 各角色按钮/页面权限标识 */
export const ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  admin: ['*'],
  operator: [
    'dashboard:view', 'screen:view',
    'device:list', 'device:detail', 'device:export',
    'alarm:list', 'alarm:stats', 'alarm:confirm', 'alarm:close', 'alarm:dispatch', 'alarm:export',
    'energy:stats', 'energy:report', 'energy:export'
  ],
  viewer: ['dashboard:view', 'screen:view', 'device:list', 'device:detail', 'alarm:list', 'energy:stats']
}

/** 按角色构建菜单树 */
export function menusOfRole(role: RoleKey): MenuItem[] {
  const allowIds = new Set(ROLE_MENUS[role])
  const visible = ALL_MENUS.filter((m) => allowIds.has(m.id))
  // 是否为目录:全量菜单中存在挂靠其下的子节点
  const isDir = (id: number): boolean => ALL_MENUS.some((m) => m.parentId === id)
  // 目录若没有任何可见子节点则剔除
  const buildTree = (parentId: number): MenuItem[] =>
    visible
      .filter((m) => m.parentId === parentId)
      .map((m) => ({ ...m, children: buildTree(m.id) }))
      .filter((m) => !isDir(m.id) || (m.children && m.children.length > 0))
      .sort((a, b) => a.sort - b.sort)
  return buildTree(0)
}

// ========== 操作日志 ==========
let logId = 1
export const opLogs: OpLog[] = [
  { id: ++logId, time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'), operator: '李运维', module: '告警中心', action: '告警确认', detail: '确认告警 AL-10231(C区·数据中心 配电柜2)', ip: '192.168.3.21' },
  { id: ++logId, time: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'), operator: '张工', module: '设备管理', action: '新增设备', detail: '新增设备 YSRC-C-034(冷水机组)', ip: '192.168.1.8' },
  { id: ++logId, time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), operator: '张工', module: '能耗报表', action: '数据导出', detail: '导出【区域能耗月报】共 5 条', ip: '192.168.1.8' },
  { id: ++logId, time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), operator: '赵巡检', module: '告警中心', action: '转运维派单', detail: '派单至 李运维(B区·生产厂房 空压机1)', ip: '192.168.3.34' }
]

export function pushLog(operator: string, module: string, action: string, detail: string): void {
  opLogs.unshift({
    id: ++logId,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator,
    module,
    action,
    detail,
    ip: `192.168.${randInt(1, 5)}.${randInt(2, 250)}`
  })
}
