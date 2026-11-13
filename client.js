/**
 * Client half of the motion bundle: one hidden stylesheet, nothing drawn.
 *
 * Why a stylesheet instead of wrapping the panels in a React component:
 * `main` and the rightbar are owned by shipped UI, and a plugin cannot wrap
 * them without shadowing what those packages render. Panel switches, tab
 * switches and dialogs already remount their container elements, so a pure CSS
 * enter-animation keyed off the host's own DOM hooks is enough — and because
 * every rule is an attribute selector (`_mainPanel` suffix, `data-*`,
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
 */

const STYLE_MARKER = 'data-dsh-motion';
const SLOT = 'shell.overlay';
const ENTRY_ID = 'dsh-motion';

const CSS = String.raw`
/* dsh-motion — 页面与面板过渡动画（克制顺滑 150–250ms / ease-out / 4–8px）
   想调快慢或幅度，在自己的用户样式里覆盖下面这几个变量即可
   （:where() 零优先级，任何普通选择器都能盖掉它）。

   所有动画都走独立变换属性 translate / scale，不动 transform，
   因此弹窗居中、拖拽定位这类既有布局不会被顶掉。 */

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

/* 弹窗 / 设置面板 / 平台页。左侧导航抽屉自带轨道动画，排除掉，别两套动画打架。 */
[role="dialog"][aria-modal="true"]:not([data-shortcut-modal="sidebar"]) {
  animation: dsh-motion-settle var(--dsh-motion-duration-slow) var(--dsh-motion-ease) backwards;
}

/* 系统层要求减少动态效果时，整套关掉（不是调慢）。 */
@media (prefers-reduced-motion: reduce) {
  [class*="_mainPanel"] > *,
  [data-sidebar-right-tab],
  [data-dockkit-pane],
  [role="dialog"][aria-modal="true"] {
    animation: none;
  }
}
`;

window.__ModuleLoader__.load({
  id: '@local/dsh-motion',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Carries the stylesheet; renders no box of its own. */
    function MotionStyles() {
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
