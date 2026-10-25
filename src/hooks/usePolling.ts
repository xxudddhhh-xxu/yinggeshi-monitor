import { onBeforeUnmount } from 'vue'

export interface UsePollingOptions {
  /** 是否立即执行一次 */
  immediate?: boolean
}

/**
 * 定时轮询:页面隐藏(document.hidden)时自动跳过触发,
 * 组件卸载自动清理,避免后台页签空转与内存泄漏。
 */
export function usePolling(fn: () => unknown, interval = 10000, options: UsePollingOptions = {}) {
  let timer: number | null = null

  function start(): void {
    stop()
    if (options.immediate !== false) fn()
    timer = window.setInterval(() => {
      if (document.hidden) return
      fn()
    }, interval)
  }

  function stop(): void {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  onBeforeUnmount(stop)

  return { start, stop }
}
