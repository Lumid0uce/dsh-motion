# 动画候选清单与调研协议

这份文件是「心跳调研」的工作台：每轮把网上看到的做法记进来，判一个「能落地 / 不能落地 / 已否决」，
能落地的就实现、commit（**不 push**，push 必须先问用户）。

## 一、判定标准（DSH 插件能做什么）

dsh-motion 是一个**纯样式插件**：往 `shell.overlay` 槽里塞一个 `<style>`，再加一个小观察器。
它拿不到 React 树、不能改宿主组件、不能给元素挂 ref。由此推出三条硬约束：

1. **只能用 CSS 能表达的东西**：`@keyframes`、`transition`、独立变换属性（`translate`/`scale`/`rotate`）、
   `--dsh-*` 主题变量。**不碰** `transform`（弹窗居中/拖拽、菜单锚点定位都靠它）。
2. **只能选宿主已经写在 DOM 上的稳定特征**：`data-*` 属性、`role`、`aria-*`、CSS Module 类名后缀
   （`mP3x-q_mainPanel` → `[class*="_mainPanel"]`）。选择器落空的表现只能是「动画没了」，不能是报错。
3. **JS 侧只能做观察类的事**：`MutationObserver` 看属性/文字变化、打临时标记、定时重扫。不能驱动布局。

所以任何「需要知道元素尺寸/滚动位置才能算」的动画（比如 FLIP 重排、共享元素转场）基本pass 掉，
除非宿主自己提供钩子。

## 二、外部来源调研（首轮，2026-11-14）

| 来源 | 是什么 | 对 dsh-motion 的价值 |
| --- | --- | --- |
| transitions.dev | 一堆可以直接抄的 CSS transition 小抄（按压、菜单、tab、tooltip、toast…），带 easing 推荐 | **高**。和本插件定位完全一致，是后续轮次的主要抄写来源 |
| easings.net | easing 曲线速查（ease-out-quad/cubic/quint、spring 近似曲线） | **中**。当前用的 `cubic-bezier(0.22,0.61,0.36,1)` 就属于这一类，可换更「收尾快」的曲线 |
| Material 3 motion spec | 官方时长/曲线体系：emphasized 曲线、short/medium/long 档（100–400ms） | **中**。给了「什么场景该多长」的依据，避免下次拍脑袋定 180ms |
| Open Props（easings 部分） | 一组预设缓动变量 | **低**（等于 easings.net 的变量化版本，可直接抄数值） |
| animate.css / animista | 大而全的预设 keyframes（bounce/flip/zoom…） | **低**。风格花，产品 UI 里显得吵；只有个别（fadeInUp、pulse）可借鉴 |
| anime.js / motion(framer-motion) / GSAP / auto-animate | JS 驱动动画库 | **不能落地**。要接管元素生命周期或 React 树，插件拿不到；学习其曲线与时长可以 |
| View Transitions API（`document.startViewTransition`） | 浏览器级跨视图过渡，能免费拿到「共享元素转场」 | **暂不落地**。要宿主把渲染包进 transition 回调，插件调不动；若宿主将来接入，可复用同一套 CSS |
| Radix UI 的 `data-state="open/closed"` 动画模式 | 用属性表达开合状态，纯 CSS 消费 | **高（思路）**。本插件已经在用等价手法（`aria-expanded`、`data-menu-phase`），继续沿这条路找钩子 |
| Magic UI / Aceternity（React 动效组件库） | 花哨的入场/发光/spotlight 效果 | **低**。重心是装饰，和「克制顺滑」冲突；默认不做 |

## 三、已验证可加的地方（含落地状态）

| 位置 | 宿主钩子 | 状态 |
| --- | --- | --- |
| 主面板切换 | `[class*="_mainPanel"] > *` | 0.1.0 已做 |
| 右侧栏换 tab | `[data-sidebar-right-tab]` / `[data-dockkit-pane]` | 0.1.0 已做 |
| 弹窗 / 设置 / 平台页 | `[role="dialog"][aria-modal="true"]` | 0.1.0 已做 |
| 设置遮罩、分类高亮、内容区 | `[aria-hidden][class*="_mask"]`、`[class*="_navCell"]`、`[class*="_options"] > *` | 0.2.1 已做 |
| 弹出菜单（含模型/权限选择） | `[data-menu-material]` / `[data-menu-backing]` | 0.2.0 已做 |
| 切换类按钮按压、值变化脉冲 | `button[aria-haspopup]`、`[role=menuitem]` / `[role=option]` | 0.2.0 已做 |
| 审批卡片、目标条、计划卡片 | `[data-approval-key]`、`[data-goal-bar]`、`[data-plan-artifacts] > [data-plan-card]` | 0.3.0 / 0.3.1 已做 |
| 侧栏会话行/工作区行/文件树行 | `[data-row-key]`、`[data-files-row]` | 0.4.0 已做 |
| 目录选择器多列浏览 | `[role="list"]` + `_column` 后缀 | 0.4.0 已做 |
| 工具卡片 | `[data-action-card]` | 0.5.0 已做 |
| Agent 团队任务行 / 工作流运行面板 / 插件市场卡片 | `[data-team-task]`、`[data-workflow-run]`、`[data-market-entry]` | 0.5.0 已做 |
| 运行状态文字（进行中/完成/失败） | `[data-status]`、`[data-run-status]`、`[data-member-status]` | 0.5.0 已做（颜色过渡） |
| 团队任务展开（箭头旋转 + 详情块入场） | `[data-team-task]` + `[data-expanded]` + `[data-team-task-details]` + `_chevron` 后缀 | 0.6.0 已做 |
| Tab 切换（文字色 + 下划线撑开） | `[role="tab"][aria-selected="true"]::after` | 0.6.0 已做 |
| 右侧栏 dockkit 标签底色切换 | `div[role="tab"][data-dockkit-tab]`（`data-dockkit-tab` / `-quiet` / `-pane` 都在 frontend bundle 里渲染） | 0.6.5 已做（底色并入 `[role="tab"]` 的 140ms 过渡） |
| Tooltip 出现（淡入 + 2px 方向位移） | `[role="tooltip"][data-side]`（primitives 的 `_bubble_*` 气泡，`role="tooltip"` + `data-side`/`data-portal`/`data-pinned`） | 0.6.1 已做。宿主 `@keyframes _tooltip-in` 只写了 `opacity:0`，纯淡入；位移用 `translate` 叠加，气泡定位靠的是 `transform` |
| 输入字段聚焦时的边框过渡 | `[class*="_wrap_"]`（frontend CSS 的 `_wrap_14sgc_1:focus-within{border-color:…}`，宿主硬切） | 0.6.2 已做（只补 transition，不动颜色） |
| 提问卡片入场 | `div[data-question-key]`（`QuestionComposer` 的 frame）+ `div[data-option-row]` | 0.6.3 已做（卡片 200ms 上浮 8px，选项错开 30ms）；宿主自身只有滚动驱动的裁剪 keyframes，没有入场动画 |
| 插件市场详情页入场 | `div[data-market-detail]`（`DiscoverSection.detail`） | 0.6.4 已做（列表↔详情是硬换的，补 4px 落位）；市场包自带的动画只有骨架屏 `m2i3Fa_dsh-market-skeleton` |
| 右侧栏标签的关闭按钮淡入 | `[class*="_tabClose_"]`（`_tabClose_123xe_420`，宿主 hover/focus 直接 opacity 0→1） | 0.6.2 已做 |

## 四、待验证的候选（下一轮从这里挑）

| 候选 | 需要的钩子 | 预判 |
| --- | --- | --- |
| 输入框聚焦时的外发光过渡 | composer 的编辑器根是 Lexical `contenteditable`（钩子只有 `data-composer-chip` / `-command` / `-quote` / `-text-ref` / `-chip-selected`），聚焦外框不在这些包里 | **只做了通用字段外壳**（0.6.2，`_wrap_` 后缀）；composer 本体没有稳定钩子，外发光需要新增视觉，暂不做 |
| toast/通知出现与消失 | 未在 `@deepseek-ai` 下找到独立包，可能在 primitives 内联 | 待查（`role="status"` 在 30 多个包里都有，但那多是行内状态区，不是浮层 toast，硬选会把静态区块也带上动画） |
| tooltip 出现（淡入 + 2px 位移） | primitives 内联在 `dsh-web-frontend/dist/assets/index-*.js`（`role:"tooltip"` + `data-side`），CSS 在 `index-*.css` 的 `_bubble_gm1ra_*` | **0.6.1 已做**（见第三节） |
| tab 指示条滑动 | `role="tablist"` + `[data-active]`（settings-plugins 有 `data-active`） | **部分落地**：指示条是宿主自己画的 `::after`（`left:0;right:0` 绝对定位），不能跨 tab 滑动，只能让选中那条从中间撑开 → 0.6.0 已做 |
| 侧栏拖拽调宽时的把手高亮 | `data-dragging`（AppFrame 的 `.mP3x-q_handle` 上有，8px 宽、`cursor:col-resize`） | **暂缓**：把手没有底色，要动只能自己画一条 2px 线，属于新增视觉而非动画，等用户明确要再说 |
| 折叠/展开容器的高度动画 | 需要 `calc-size`/`interpolate-size`（Chrome 129+ 支持 `interpolate-size: allow-keywords`） | 值得试：`data-expanded`（agent-team 有）。0.6.0 先只做了展开内容的淡入上浮，没动高度 |
| 列表删除时的退出动画 | 宿主卸载即消失，无钩子 | **否决**（除非宿主配合） |
| 流式文本逐字淡入 | 每字都要包元素 | **否决**（性能与实现都不合适） |
| 侧栏新出现的会话行淡入 | `[data-row-key]`（虚拟化树） | **否决**：展开工作区 / 首次渲染时整片行同时挂上，会是「一片瀑布」而不是「新增一行」，观感比现在差 |
| 侧栏会话上的日程小标记入场 | `[data-session-schedule-task]` / `[data-session-schedule-mark]` | **否决**：只是侧栏行内 12px 的内联小标记，一晃就是噪音 |

## 五、心跳调研协议（每 20 分钟一轮）

1. **抓**：`pwsh` 里用 `Invoke-RestMethod` 打 GitHub API（字段过滤，别把整页 JSON 灌进上下文），
   关键词轮换：`css transitions ui`、`micro interactions css`、`view transitions`、`motion design system`、
   `tailwind animation`、`skeleton shimmer`、`hover effect css`。每轮最多 3 个请求（未登录 60 次/小时限额）。
2. **筛**：只留「纯 CSS 能抄的做法」，JS 库一律记为「不能落地」。
3. **验**：要落地的东西，先在本机 ASAR 构建产物里确认钩子真实存在（`ELECTRON_RUN_AS_NODE=1` + fs 脚本），
   不能靠猜类名。注意 `lib/client.js` 是**单行压缩产物**，按行 grep 没用，要 `indexOf` 取上下文切片再看。
4. **落**：实现 → 同步 `package.json` 版本 / `README.md` / `docs/DETAIL.md` → `node --check client.js` →
   本地 `git commit`（**不 push**，push 前必须问用户）。
5. **记**：新来源写进第二节，新钩子写进第三节/第四节，否决理由写清楚，避免下一轮重复挖。
6. **报**：正文只回一行结论（加了什么 / 否决了什么），不刷屏。
