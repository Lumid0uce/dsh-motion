/**
 * Client half of the motion bundle: one hidden stylesheet, nothing drawn.
 *
 * Why a stylesheet instead of wrapping the panels in a React component:
 * `main` and the rightbar are owned by shipped UI, and a plugin cannot wrap
 * them without shadowing what those packages render. Panel switches, tab
 * switches, dialogs and menus already remount their container elements, so a
 * pure CSS enter-animation keyed off the host's own DOM hooks is enough — and
 * because every rule is an attribute selector (`_mainPanel` suffix, `data-*`,
 * `role`), a future DSH rename degrades into "no animation" instead of a
 * broken page.
 *
 * The `<style>` element is rendered by a React component inside the
 * `shell.overlay` slot: it lives and dies with that slot entry, so unmounting
 * the plugin removes the styles with no manual cleanup and no `document.body`
 * append.
 *
 * Every animation drives the independent transform properties (`translate`,
 * `scale`) instead of `transform`, so an element that the host centres or
 * positions through `transform` keeps its own value and only gains the offset.
 * `animation-fill-mode: backwards` makes sure no property is retained after the
 * run, so an element the host hides later by class is not pinned visible.
 *
 * One behaviour needs JavaScript: the host re-renders a popup trigger's label in
 * place when the value changes, and CSS cannot observe a text change. A
 * MutationObserver scoped to `button[aria-haspopup]` (model switcher, permission
 * presets, every `…` menu) tags the button with `data-dsh-motion-pop`, which
 * fires a short scale bump. Nothing else in the page is observed.
 */

const STYLE_MARKER = 'data-dsh-motion';
const SLOT = 'shell.overlay';
const ENTRY_ID = 'dsh-motion';

/** Popup triggers worth watching: model, effort, permission presets, menus. */
const TRIGGER_SELECTOR = 'button[aria-haspopup]';

const CSS = String.raw`
/* dsh-motion — 页面/面板过渡 + 控件反馈（克制顺滑 130–240ms / ease-out / 3–6px）
   想调快慢或幅度，在自己的用户样式里覆盖下面这几个变量即可
   （:where() 零优先级，任何普通选择器都能盖掉它）。

   所有动画都走独立变换属性 translate / scale，不动 transform，
   因此弹窗居中、拖拽定位、菜单锚定这类既有布局都不会被顶掉。 */

:where(:root) {
  --dsh-motion-duration: 180ms;
  --dsh-motion-duration-slow: 220ms;
  --dsh-motion-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dsh-motion-shift: 6px;
}

/* 淡入 + 轻微上浮。只写 from：结束值就是元素自己的值。 */
@keyframes dsh-motion-rise {
  from {
    opacity: 0;
    translate: 0 var(--dsh-motion-shift);
  }
}

/* 淡入 + 极轻微放大，给浮层用，避免整块平移带来的错位感。 */
@keyframes dsh-motion-settle {
  from {
    opacity: 0;
    scale: 0.985;
  }
}

/* 纯透明度淡入，给遮罩用：遮罩不能缩放也不能位移，否则边缘会露缝。 */
@keyframes dsh-motion-fade {
  from {
    opacity: 0;
  }
}

/* 菜单从触发按钮下方展开：向下落一点点，不遮挡判断。 */
@keyframes dsh-motion-drop {
  from {
    opacity: 0;
    translate: 0 -3px;
    scale: 0.985;
  }
}

/* 值变化脉冲。幅度小到只在余光里察觉。 */
@keyframes dsh-motion-bump {
  0% { scale: 1; }
  40% { scale: 1.06; }
  100% { scale: 1; }
}

/* 一次性呼吸：只播一次、不循环。给审批卡片用。
   不用 color-mix 之类的颜色函数，只把外发光扩散开的同时退成 transparent，
   色值只来自宿主 token + transparent，不会因为颜色语法不支持而整条规则失效。 */
@keyframes dsh-motion-alert {
  0% {
    box-shadow: 0 0 0 0 var(--dsw-alias-state-warn-primary), var(--dsw-shadow-lv2);
  }
  100% {
    box-shadow: 0 0 0 9px transparent, var(--dsw-shadow-lv2);
  }
}

/* ============ 一、页面/面板 ============ */

/* 主面板切换：会话 / 插件 / 设置等顶层面板之间互切时，主面板那格会换一个新
   子元素挂上去（slot 按 entryKey 重新挂载），于是进入动画刚好只在切换时播。 */
[class*="_mainPanel"] > * {
  animation: dsh-motion-rise var(--dsh-motion-duration) var(--dsh-motion-ease) backwards;
}

/* 右侧栏换 tab：tab 标题与 tab 内容重新挂载。 */
[data-sidebar-right-tab],
[data-dockkit-pane] {
  animation: dsh-motion-rise var(--dsh-motion-duration) var(--dsh-motion-ease) backwards;
}

/* 弹窗 / 设置面板 / 平台页。左侧导航抽屉自带轨道动画，排除掉，别两套动画打架。
   （设置那个 800px 面板上带的就是 role=dialog + aria-modal，命中的是面板本身，
   遮罩是它的兄弟节点，所以下面单独给遮罩一条纯淡入 —— 各播各的，面板不会被拖着缩放。） */
[role="dialog"][aria-modal="true"]:not([data-shortcut-modal="sidebar"]) {
  animation: dsh-motion-settle var(--dsh-motion-duration-slow) var(--dsh-motion-ease) backwards;
}

/* 浮层背后的遮罩：宿主直接上屏、没有任何过渡，所以打开设置/任何弹窗时背景都是「啪」一下变暗。 */
[aria-hidden="true"][class*="_mask"] {
  animation: dsh-motion-fade 200ms var(--dsh-motion-ease) backwards;
}

/* ============ 二、设置面板内部 ============ */

/* 左侧分类高亮：宿主是瞬间换底色/文字色，补一段过渡就顺了。 */
[class*="_navCell"] {
  transition: background-color 140ms var(--dsh-motion-ease), color 140ms var(--dsh-motion-ease);
}

/* 右侧内容区：换分类时宿主用 renderSlot('settings.section', …, { only: active })
   把内容重新挂载，所以进入动画刚好只在真正换分类时播。位移比面板那条小一号。 */
[data-shortcut-modal="settings"] [class*="_options"] > * {
  --dsh-motion-shift: 4px;
  animation: dsh-motion-rise 160ms var(--dsh-motion-ease) backwards;
}

/* ============ 三、侧栏与导航行 ============ */

/* 侧栏的会话行、工作区行、文件树行：宿主的悬停/选中底色是硬切的（这几个包的 transition 计数全是 0），
   补一段颜色过渡就够了。只动 color/background-color，不碰尺寸不碰布局。 */
[data-row-key],
[data-files-row] {
  transition: background-color 140ms var(--dsh-motion-ease), color 140ms var(--dsh-motion-ease);
}

/* 文件树展开：新展开的子行才挂载，所以只有新出现的行会淡入。位移只 3px，120ms。 */
[data-files-row] {
  --dsh-motion-shift: 3px;
  animation: dsh-motion-rise 120ms var(--dsh-motion-ease) backwards;
}

/* 目录选择器多列浏览：每深入一层就挂一列新的，新列自己浮上来。 */
[role="list"][class*="_column"] {
  --dsh-motion-shift: 4px;
  animation: dsh-motion-rise 140ms var(--dsh-motion-ease) backwards;
}

/* ============ 四、任务状态面与运行面板 ============ */

/* 审批卡片：等权限确认的那一块。整个 UI 里最该被注意到的卡片，反而一点动效都没，
   所以位移比别处大一号（跟随卡片自己的局部变量，不影响全局）。 */
[data-approval-key] {
  --dsh-motion-shift: 8px;
  animation: dsh-motion-rise 200ms var(--dsh-motion-ease) backwards;
}

/* 上浮落地（200ms）后再补一圈一次性呼吸，把视线拉过来：只用 700ms，播完就干净。 */
[data-approval-key] [class*="_card"] {
  animation: dsh-motion-alert 700ms var(--dsh-motion-ease) 200ms backwards;
}

/* 目标条：目标建立/恢复时这个 dock 才挂上，否则 render null，所以进入动画刚好只在出现时播。 */
[data-goal-bar] {
  animation: dsh-motion-rise var(--dsh-motion-duration) var(--dsh-motion-ease) backwards;
}

/* 计划卡片：一次列出来时逐张错开 40ms，能看出「是一张张列出来的」。
   只给前 6 张写延迟，再多统一 200ms，避免长列表尾部等太久。 */
[data-plan-artifacts] > [data-plan-card] {
  animation: dsh-motion-rise 200ms var(--dsh-motion-ease) backwards;
}
[data-plan-artifacts] > [data-plan-card]:nth-child(2) { animation-delay: 40ms; }
[data-plan-artifacts] > [data-plan-card]:nth-child(3) { animation-delay: 80ms; }
[data-plan-artifacts] > [data-plan-card]:nth-child(4) { animation-delay: 120ms; }
[data-plan-artifacts] > [data-plan-card]:nth-child(5) { animation-delay: 160ms; }
[data-plan-artifacts] > [data-plan-card]:nth-child(6) { animation-delay: 200ms; }
[data-plan-artifacts] > [data-plan-card]:nth-child(n+7) { animation-delay: 200ms; }

/* 工具卡片：每次调用插一张到流里，所以比任务状态更轻（3px / 120ms），
   频繁插入时是“轻轻落位”而不是一卡一顿。 */
[data-action-card] {
  --dsh-motion-shift: 3px;
  animation: dsh-motion-rise 120ms var(--dsh-motion-ease) backwards;
}

/* Agent 团队任务行、工作流运行面板、插件市场卡片：整块出现时上浮。 */
[data-team-task],
[data-workflow-run],
[data-market-entry] {
  animation: dsh-motion-rise 180ms var(--dsh-motion-ease) backwards;
}

/* 市场是网格，一次铺一片，逐张错开 40ms（跟计划卡片一样，第 7 张以后封顶）。 */
[data-market-entry]:nth-child(2) { animation-delay: 40ms; }
[data-market-entry]:nth-child(3) { animation-delay: 80ms; }
[data-market-entry]:nth-child(4) { animation-delay: 120ms; }
[data-market-entry]:nth-child(5) { animation-delay: 160ms; }
[data-market-entry]:nth-child(n+6) { animation-delay: 160ms; }

/* 运行状态文字（进行中/完成/失败）宿主是硬切的，补颜色过渡。 */
[data-status],
[data-run-status],
[data-member-status] {
  transition: color 140ms var(--dsh-motion-ease), background-color 140ms var(--dsh-motion-ease);
}

/* ============ 五、弹出菜单 ============ */

/* 宿主自己的菜单出场只有 40ms 纯透明度（context menu 走 --dsh-menu-enter），
   模型下拉干脆没有入场动画。这里在菜单面板本身上补一层动作，一次覆盖：
   右键菜单、模型选择、权限选择、子菜单。
   data-menu-material 是面板本体，data-menu-backing 是它身后的同形垫片，
   两者必须同步位移，否则垫片会露出来。 */
[data-menu-material],
[data-menu-backing] {
  animation: dsh-motion-drop 150ms var(--dsh-motion-ease) backwards;
}

/* ============ 六、控件反馈 ============ */

/* 按住时的内缩。aria-haspopup 精确圈住「点开菜单」这类按钮：
   模型切换、思考强度、权限档位、各种 … 菜单按钮。
   菜单已经展开（aria-expanded=true）时不缩，免得按钮位置带着锚点抖。 */
button[aria-haspopup] {
  transition: scale 120ms var(--dsh-motion-ease);
}
button[aria-haspopup]:active:not([aria-expanded="true"]) {
  scale: 0.96;
}

/* 菜单项点下去也要有手感。 */
[role="menuitem"],
[role="option"] {
  transition: scale 110ms var(--dsh-motion-ease);
}
[role="menuitem"]:active,
[role="option"]:active {
  scale: 0.985;
}

/* 值真的变了（换模型、换权限档位）才跳一下，由 JS 打属性触发。 */
[data-dsh-motion-pop] {
  animation: dsh-motion-bump 240ms var(--dsh-motion-ease);
}

/* ============ 七、无障碍 ============ */

/* 系统层要求减少动态效果时，整套关掉（不是调慢）。 */
@media (prefers-reduced-motion: reduce) {
  [class*="_mainPanel"] > *,
  [data-sidebar-right-tab],
  [data-dockkit-pane],
  [role="dialog"][aria-modal="true"],
  [aria-hidden="true"][class*="_mask"],
  [data-shortcut-modal="settings"] [class*="_options"] > *,
  [data-approval-key],
  [data-approval-key] [class*="_card"],
  [data-goal-bar],
  [data-plan-artifacts] > [data-plan-card],
  [data-files-row],
  [role="list"][class*="_column"],
  [data-action-card],
  [data-team-task],
  [data-workflow-run],
  [data-market-entry],
  [data-menu-material],
  [data-menu-backing],
  [data-dsh-motion-pop] {
    animation: none;
  }
  button[aria-haspopup],
  [role="menuitem"],
  [role="option"],
  [class*="_navCell"],
  [data-status],
  [data-run-status],
  [data-member-status],
  [data-row-key] {
    transition: none;
    scale: 1;
  }
}
`;

/**
 * Tags popup triggers whose label text changed, so the bump keyframe replays.
 *
 * The host renders the current model / permission label as plain text inside the
 * trigger button and swaps it in place, so the only way to see a change from
 * outside is to watch those nodes. Two watchers keep the cost near zero: a
 * MutationObserver per trigger (fires only when that button's text changes) and
 * a slow rescan that attaches to triggers mounted after the first pass.
 */
function useValueBumps() {
  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const known = new WeakSet();
    const labels = new WeakMap();
    const observers = [];
    const timers = new Set();

    const read = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

    const bump = (el) => {
      el.removeAttribute('data-dsh-motion-pop');
      // Force a reflow so the same animation can restart on a second change.
      void el.offsetWidth;
      el.setAttribute('data-dsh-motion-pop', '');
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        el.removeAttribute('data-dsh-motion-pop');
      }, 320);
      timers.add(timer);
    };

    const attach = () => {
      document.querySelectorAll(TRIGGER_SELECTOR).forEach((el) => {
        if (known.has(el)) return;
        known.add(el);
        labels.set(el, read(el));
        const observer = new MutationObserver(() => {
          const next = read(el);
          if (next === labels.get(el)) return;
          labels.set(el, next);
          // Empty text is the teardown frame, not a value change.
          if (next.length > 0) bump(el);
        });
        observer.observe(el, { childList: true, subtree: true, characterData: true });
        observers.push(observer);
      });
    };

    attach();
    const rescan = window.setInterval(attach, 1500);

    return () => {
      window.clearInterval(rescan);
      timers.forEach((timer) => window.clearTimeout(timer));
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);
}

window.__ModuleLoader__.load({
  id: '@local/dsh-motion',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Carries the stylesheet; renders no box of its own. */
    function MotionStyles() {
      useValueBumps();
      return h('style', {
        [STYLE_MARKER]: '',
        dangerouslySetInnerHTML: { __html: CSS },
      });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject(SLOT, () => ctx.slots.register({
          name: SLOT,
          id: ENTRY_ID,
          order: 500,
        }, MotionStyles));
      },
    };
  },
});
