import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { registerDirectives } from './directives'
import 'element-plus/dist/index.css'
import '@/styles/index.scss'

const app = createApp(App)
const pinia = createPinia()
// 用户菜单/权限标识持久化,刷新后无需重新拉取
pinia.use(piniaPluginPersistedstate)

// 全局注册 Element Plus 图标,侧边菜单通过字符串名动态渲染
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
registerDirectives(app)

app.mount('#app')
