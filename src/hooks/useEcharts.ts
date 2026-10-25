import { onBeforeUnmount, ref, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'

export interface UseEchartsOptions {
  /** 主题(大屏可用自定义配色) */
  theme?: string | object
}

/**
 * ECharts 生命周期钩子:初始化 / 按需重绘 / ResizeObserver 自适应 / 卸载销毁。
 * 统一收口防止实例泄漏(图表页频繁切换的常见内存问题)。
 *
 * 用法(模板中必须用字符串 ref,不能用 :ref 动态绑定——
 * :ref 表达式会经模板代理自动解包成 ref 的 .value(null),导致元素永远绑不上):
 *   const { elRef, render } = useEcharts(() => option)   // elRef 命名任意
 *   <div ref="elRef" class="chart" />
 *   watch(data, () => render())
 */
export function useEcharts(getOption: () => echarts.EChartsOption, options: UseEchartsOptions = {}) {
  const elRef: Ref<any> = ref(null)
  const chart = shallowRef<echarts.ECharts | null>(null)
  let observer: ResizeObserver | null = null

  function render(): void {
    if (!elRef.value) return
    if (!chart.value) {
      chart.value = echarts.init(elRef.value, options.theme, { renderer: 'canvas' })
      observer = new ResizeObserver(() => chart.value?.resize())
      observer.observe(elRef.value)
    }
    // notMerge: 整体替换,避免旧 series 残留
    chart.value.setOption(getOption(), true)
  }

  function resize(): void {
    chart.value?.resize()
  }

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    chart.value?.dispose()
    chart.value = null
  })

  return { elRef, chart, render, resize }
}
