// ========== 平台基础枚举与字典 ==========

/** 园区分区 */
export const REGIONS = [
  { code: 'A', name: 'A区·研发办公楼' },
  { code: 'B', name: 'B区·生产厂房' },
  { code: 'C', name: 'C区·数据中心' },
  { code: 'D', name: 'D区·综合服务区' },
  { code: 'E', name: 'E区·地下管廊' }
] as const

export const REGION_NAMES = REGIONS.map((r) => r.name)

/** 设备类型 */
export const DEVICE_TYPES = [
  '智能电表',
  '智能水表',
  '燃气表',
  '配电柜',
  '空压机',
  '冷水机组',
  '环境监测仪',
  '充电桩',
  '光伏逆变器',
  '换热站'
] as const

/** 设备采集状态 */
export const DEVICE_STATUS: Record<string, { label: string; tag: 'success' | 'info' | 'danger' | 'warning' }> = {
  online: { label: '在线', tag: 'success' },
  fault: { label: '异常', tag: 'danger' },
  offline: { label: '离线', tag: 'info' },
  disabled: { label: '停用', tag: 'warning' }
}

/** 能源类型 */
export const ENERGY_TYPES = ['电', '水', '气'] as const
export const ENERGY_COLORS: Record<string, string> = {
  电: '#f5b73c',
  水: '#3d8eff',
  气: '#25d0ab'
}

/** 设备类型 -> 能源类型 */
export const ENERGY_OF_TYPE: Record<string, '电' | '水' | '气'> = {
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

/** 告警等级 */
export const ALARM_LEVELS: Record<number, { label: string; tag: 'danger' | 'warning' | 'info'; color: string }> = {
  1: { label: '紧急', tag: 'danger', color: '#ff4d5e' },
  2: { label: '重要', tag: 'warning', color: '#ff9f40' },
  3: { label: '一般', tag: 'info', color: '#5b8ff9' }
}

/** 告警处理状态 */
export const ALARM_STATUS: Record<number, { label: string; tag: 'danger' | 'warning' | 'success' }> = {
  0: { label: '未处理', tag: 'danger' },
  1: { label: '已确认', tag: 'warning' },
  2: { label: '已闭环', tag: 'success' }
}

/** 告警类型 */
export const ALARM_TYPES = ['阈值超限', '设备离线', '通讯中断', '数据异常', '环境异常'] as const

/** 操作日志模块 */
export const LOG_MODULES = ['设备管理', '告警中心', '能耗报表', '系统管理', '登录认证'] as const
