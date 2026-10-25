import type { App, Directive } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 按钮级权限指令:v-permission="'device:add'"
 * 无权限时直接移除元素,避免仅靠 disabled 造成的安全错觉
 */
const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const required = Array.isArray(binding.value) ? binding.value : [binding.value]
    const allowed = required.every((code) => userStore.hasPerm(code))
    if (!allowed) {
      el.parentNode?.removeChild(el)
    }
  }
}

export function registerDirectives(app: App): void {
  app.directive('permission', permissionDirective)
}
