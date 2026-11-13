# dsh-motion

给 DeepSeek Harness（DSH）的**页面/面板切换**和**切换类控件**加上克制的过渡动画。纯样式表插件（外加一个几十行的文字变化观察器），不改任何宿主代码。

## 动了哪些地方

| 场景 | 效果 | 时长 |
| --- | --- | --- |
| 主面板切换（会话 ↔ 插件 ↔ 设置…） | 淡入 + 上浮 6px | 180ms |
| 右侧栏换 tab | 淡入 + 上浮 6px | 180ms |
| 弹窗 / 设置面板 / 平台页出现 | 淡入 + 放大 0.985 → 1 | 220ms |
| 弹窗 / 设置背后的遮罩层 | 淡入（不缩放、不位移） | 200ms |
| 设置面板里换分类 | 内容淡入 + 上浮 4px；左侧分类高亮渐变 | 160ms / 140ms |
| 审批卡片（等权限确认）出现 | 淡入 + 上浮 8px，落地后一圈一次性外发光（只播一次，不循环） | 200ms + 700ms |
| 目标条出现 | 淡入 + 上浮 6px | 180ms |
| 计划卡片列出 | 逐张淡入 + 上浮，每张错开 40ms | 200ms |
| 左侧栏的会话行 / 工作区行 / 文件树行（悬停、选中） | 底色与文字色渐变（宿主原本是硬切） | 140ms |
| 文件树展开新目录 | 新出现的行淡入 + 上浮 3px | 120ms |
| 目录选择器多列浏览（进入下一层） | 新一列淡入 + 上浮 4px | 140ms |
| 工具卡片插入聊天流 | 淡入 + 上浮 3px（比别处更轻，调用频繁时也不吵） | 120ms |
| Agent 团队任务行 / 工作流运行面板出现 | 淡入 + 上浮 6px | 180ms |
| Agent 团队任务展开 | 箭头旋转渐变；展开出来的详情块淡入 + 上浮 2px | 160ms / 140ms |
| 插件市场卡片铺开 | 逐张淡入 + 上浮，每张错开 40ms | 180ms |
| 运行状态文字变化（进行中 → 完成/失败） | 颜色渐变 | 140ms |
| Tab 切换（设置里的插件页等） | 文字色渐变；选中那条 2px 下划线从中间撑开 | 140ms / 180ms |
| Tooltip 出现 | 淡入 + 从锚点那一侧推出来 2px（方向跟 `data-side` 走） | 150ms |
| 输入字段聚焦（带图标的小输入框等） | 边框色渐变到主色（宿主原本硬切） | 140ms |
| 右侧栏标签的关闭按钮（悬停 / 聚焦时露出） | 透明度渐变 | 120ms |
| 弹出菜单出现（右键菜单、模型选择、权限选择、子菜单） | 淡入 + 下落 3px + 放大 0.985 → 1 | 150ms |
| 切换类按钮按住（模型、思考强度、权限档位、各种 … 菜单） | 缩到 0.96，松开回弹 | 120ms |
| 菜单项按住 | 缩到 0.985 | 110ms |
| 切换类按钮的值真的变了（换模型 / 换权限档位） | 轻微脉冲 1 → 1.06 → 1 | 240ms |

- 统一 ease-out、位移 3–6px：目标是让「换了一屏」「值换了」被眼睛接住，不是表演。
- 左侧导航抽屉自带轨道动画，**排除**，避免两套动画打架。
- 同一面板内换会话**不触发**动画（面板根节点没重挂），所以不会每切一次会话就闪一下。
- 宿主自己的菜单只有 40ms 纯淡入、模型下拉没有入场动画，这里补在菜单面板本身上。
- 「值变了」靠 `MutationObserver` 监听按钮里的文字：只认真的换成一个非空值，关闭菜单时的清空不算。
- 系统开了「减少动态效果」（`prefers-reduced-motion: reduce`）时整套关闭，不是调慢。

## 为什么不会顶掉布局

动画只驱动 `translate` / `scale` 这两个独立变换属性，不碰 `transform`。弹窗靠 `transform` 居中、靠 `transform` 拖拽定位、菜单靠锚点定位，都不受影响。

按钮按住也走 `scale`，不会把下拉锚点带得乱抖；菜单已展开（`aria-expanded="true"`）时按住不缩。

另用 `animation-fill-mode: backwards`：动画结束后不保留任何属性，之后被宿主用 class 隐藏的元素不会被动画的空状态钉住。

## 安装

```bash
# 在 DSH 里用 plugin_manager 安装本地目录
plugin_manager install_bundle target=<此仓库的绝对路径>
```

装完刷新页面生效；替换已安装版本需要重启。

## 想自己调

在自己的用户样式里覆盖这几个变量（`:where()` 零优先级，任何普通选择器都能盖掉）：

```css
:root {
  --dsh-motion-duration: 180ms;       /* 面板 / tab */
  --dsh-motion-duration-slow: 220ms;  /* 弹窗 */
  --dsh-motion-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dsh-motion-shift: 6px;            /* 上浮距离 */
}
```

想临时全关：把 `--dsh-motion-shift` 设成 `0px`，两个 duration 设成 `1ms`。

## 稳定性

选择器只依赖宿主已经公开的结构特征：

- `_mainPanel` 类名后缀（CSS Module 编译产物，前缀哈希会变，后缀稳定）
- `data-sidebar-right-tab` / `data-dockkit-pane`
- `role="dialog"` + `aria-modal="true"`（设置那个 800px 面板上带的就是它，所以命中的是面板而不是遮罩）
- `data-menu-material` / `data-menu-backing`
- `button[aria-haspopup]` / `role="menuitem"` / `role="option"`
- `data-approval-key` / `data-goal-bar` / `data-plan-artifacts` + `data-plan-card`
- `data-row-key`（侧栏会话行 / 工作区行）/ `data-files-row` / `[role="list"]` + `_column` 类名后缀
- `data-action-card` / `data-team-task` / `data-workflow-run` / `data-market-entry` / `data-status` / `data-run-status`
- `data-expanded`（团队任务展开态）/ `data-team-task-details` / `_chevron` 类名后缀
- `role="tab"` + `aria-selected`（选中态那条 `::after` 下划线是宿主自己画的，这里只让它撑开）
- `role="tooltip"` + `data-side`（宿主的气泡只淡入，这里补 2px 方向位移）
- `_wrap_`（输入字段外壳）/ `_tabClose_`（右侧栏标签关闭按钮）类名后缀

哪一天宿主改名了，表现是「这块动画消失」，页面照常工作，不会白屏也不会报错。
观察器匹配不到按钮时也只是不动。

## 结构

```
client.js          # Client 半边：往 shell.overlay 槽里注册一个隐藏的 <style> + 值变化观察器
index.js           # Host 半边：空的，纯样式插件不需要任何 Host 逻辑
cordis.patch.yml   # bundle patch：insert 一行
locale/{en,zh}.json
docs/DETAIL.md     # 插件详情页文案（首行是预览图）
docs/ANIMATION-BACKLOG.md  # 动画候选清单与心跳调研协议
docs/preview.svg
icon.svg
```
