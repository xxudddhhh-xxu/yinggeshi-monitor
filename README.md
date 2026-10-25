# 英歌石科学城综合资源监测可视化平台

面向园区运维管理人员的能源资源监测 B 端后台 + 可视化大屏。汇聚园区各类能源设备采集数据,实现区域能耗监测、设备状态监控、异常告警推送、用能趋势分析与多维度统计报表可视化。

> 技术栈:Vue 3 · TypeScript · Vite · Pinia · Vue Router · Element Plus · ECharts · Axios · SheetJS(xlsx)

## 快速开始

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务 http://localhost:5173
npm run build   # 生产构建
```

项目内置完整 Mock 数据层(`VITE_USE_MOCK=true`),无需后端即可运行;接入真实后端时将 `.env.*` 中 `VITE_USE_MOCK` 改为 `false`,请求自动走 `/api` 代理(见 `vite.config.ts`)。

### 演示账号(密码均为 `123456`)

| 账号       | 角色       | 权限范围                                       |
| ---------- | ---------- | ---------------------------------------------- |
| `admin`    | 系统管理员 | 全部菜单与按钮权限(通配符 `*`)                |
| `operator` | 运维工程师 | 总览/大屏/设备(只读+导出)/告警(全操作)/能耗报表 |
| `viewer`   | 只读访客   | 总览/大屏/设备查看/告警查看/能耗统计            |

## 功能模块

### 一、可视化大屏(`/screen`,独立全屏页)

- 园区平面图点位标记:按分区布局,在线绿/离线灰/异常红闪,悬浮显示、点击跳设备详情
- 指标总览:设备总数、在线率、离线/异常、今日总用电、待处理告警
- 分项能耗:电/水/气占比环图、24h 能耗趋势(用电越阈值自动标红 + 阈值线)、区域能耗对比堆叠柱
- 设备在线率仪表盘、异常设备红色脉冲标记
- 实时告警走马灯:垂直无缝滚动、等级配色、新告警 NEW 徽标、悬停暂停
- 15s 定时轮询(倒计时环展示,页签隐藏自动暂停),支持手动刷新与一键全屏
- **1920×1080 设计稿等比缩放适配**:`scale = min(宽比, 高比)` + 居中画布,兼容拼接屏/投影/任意分辨率

### 二、设备管理(设备台账)

- 台账列表:编号/名称/区域/类型/安装位置/通讯地址/采集状态/今日能耗/在线率
- 多条件筛选:分区、类型、在线状态、关键词、安装时间范围
- 表格自定义:列显隐配置、服务端排序、分页、导出 Excel
- 展开子表格查看该设备测点明细(实时值/量程/超限标红)
- 设备详情:实时采集参数(10s 轮询)、历史曲线(日/周/月)、设备档案、维保记录时间线
- 设备新增/编辑/停用启用,按钮权限受控(`v-permission`)

### 三、告警中心

- 列表:时间/区域/设备/类型/等级(紧急·重要·一般)/内容/处理状态(未处理·已确认·已闭环)
- 组合筛选 + 5 分钟内新告警「新」标识,30s 静默自动刷新
- 操作:详情抽屉(含处理时间线)、确认、闭环、转运维派单,支持批量确认/闭环
- 统计:卡片指标、按等级堆叠趋势(7/30 天)、高频告警设备 TOP5、类型占比
- 导出告警记录;顶栏铃铛 12s 轮询未处理数角标

### 四、能耗统计 & 报表

- 按区域/按设备双维度统计,设备用能 TOP10 排行
- 同比/环比:近 12 个月本年 vs 上年柱状 + 环比增长率折线(双 Y 轴)
- 用能异常(越限)实时统计、节能指标(月/年计划完成度、光伏发电、碳减排、节能建议)
- 报表中心:自定义报表类型(区域汇总/设备明细/告警记录)+ 粒度 + 时间范围 + 区域,生成 → 预览 → 导出 Excel

### 五、权限与系统

- 登录 token 校验、路由守卫拦截、重定向回跳
- 后端(角色)下发菜单树 → 前端动态渲染侧边菜单,`router.addRoute` 动态注册,无硬编码菜单
- 页面级权限(路由 meta)+ 按钮级权限(`v-permission` 指令),403 无权限兜底页
- Pinia + persistedstate 持久化用户/菜单/权限标识,刷新免重新拉取
- 个人中心(信息查看/修改密码)、用户管理、操作日志(导出/编辑/告警处理等关键操作自动留痕)

### 六、公共能力

- `useTable`:搜索/重置/分页/多选统一封装
- `useEcharts`:初始化/重绘/ResizeObserver 自适应/卸载销毁,防内存泄漏
- `usePolling`:定时轮询,页签隐藏跳过、卸载自动清理
- axios 封装:token 注入、统一错误提示、重复请求自动取消(AbortController)
- 通用组件:SearchForm、StatusTag、AlarmLevelTag、ColumnSetting、EmptyBox

## 目录结构

```
src/
├── api/            # 接口模块(request.ts 为统一请求封装)
├── components/     # 公共业务组件
├── constants/      # 枚举字典(区域/设备/告警/能源)
├── directives/     # v-permission 按钮权限指令
├── hooks/          # useTable / useEcharts / usePolling
├── layout/         # 后台布局(侧边动态菜单 + 导航 + 告警铃铛)
├── mock/           # 本地 Mock 数据层(data 数据工厂 + index 路由匹配)
├── router/         # 静态路由 + 动态注册守卫
├── stores/         # Pinia(user 持久化菜单权限 / app)
├── styles/         # 全局样式 + 大屏主题
├── types/          # 领域类型定义
├── utils/          # auth / format / export(Excel)
└── views/          # 页面(login/dashboard/screen/device/alarm/energy/system/profile/error)
```

## 接入真实后端

1. `.env.development` 将 `VITE_USE_MOCK=false`
2. `vite.config.ts` 修改 `/api` 代理指向后端地址
3. 后端按 `src/mock/index.ts` 中的接口路径与返回结构 `{ code: 0, data, message }` 对齐即可

## 免费部署

项目自带 Mock 数据层,构建产物为纯静态站点,无需后端服务器,以下方案全部免费。

### 方案一(推荐):Cloudflare Pages + 自有域名

1. 代码推送到 GitHub / GitLab 仓库
2. Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git,选择仓库
3. 构建配置:
   - Framework preset: `Vue` / `None` 均可
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 部署完成后得到 `xxx.pages.dev` 测试地址;Custom domains 里添加自有域名(域名 DNS 已在 Cloudflare,自动签发 HTTPS 证书,零配置)
5. SPA 路由已通过 `public/_redirects`(`/* /index.html 200`)处理,深链刷新不 404

之后每次 `git push` 自动构建发布。不想连 Git 也可以本地直传:`npx wrangler pages deploy dist --project-name=yinggeshi-monitor`。

### 方案二(备用):GitHub Pages

已内置 `.github/workflows/deploy.yml`,推送到 GitHub `main` 分支即自动发布到 `https://<用户名>.github.io/<仓库名>/`;
若仓库就是 `<用户名>.github.io`,把工作流里的 `VITE_BASE` 改为 `/`。

### 关于子路径

`vite.config.ts` 的 `base` 读取环境变量 `VITE_BASE`(默认 `/`)。Cloudflare Pages / Vercel / Netlify 等根路径部署无需设置;仅 GitHub Pages 项目站点这类子路径部署需要(工作流已自动注入)。

### 后续演进:Supabase 做真实后端

演示阶段无需后端;需要真实数据时可用 Supabase 免费档(Postgres + Auth + Edge Functions):

1. 在 Supabase 建 `users/devices/alarms/...` 表,数据结构对齐 `src/types/index.ts`
2. 登录、设备、告警等接口改写为 Supabase Edge Functions,返回结构对齐 `{ code: 0, data, message }`
3. 前端 `.env.production` 置 `VITE_USE_MOCK=false`,`VITE_API_BASE_URL` 指向 Supabase Functions 地址

