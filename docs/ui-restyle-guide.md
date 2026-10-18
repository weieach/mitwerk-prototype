# UI 改版指南

从 dark mode 开始改整套界面时，用这份文档找入口。规则本身仍写在 `docs/design-system-rules.md`：凡是变成全站规则的决定，记在那里，并用共享 token 实现。不要为某一张截图或某一个节点写死颜色。

本地应用只在 `http://localhost:5173`。

## 现在的主题怎么切换

全站只有一个主题状态，`light` 或 `dark`。

- 没存过偏好时默认 **dark**。已选过的值在 `localStorage` 键 `mitwerk-theme`。
- 启动时 `src/main.tsx` 调用 `applyTheme(savedTheme())`，把 `data-theme` 写到 `<html>`。
- 工作台根节点 `.mw-app` 上还有一份相同的 `data-theme`（`src/features/workbench/Workbench.tsx`）。落地页同样如此。
- 三处开关写的是同一份状态：侧栏搜索旁边的月亮/太阳、导航收起后顶栏的同一按钮、Settings → Appearance。Logo 菜单里也有 Switch to light/dark mode。

截图参数可以临时覆盖：`?screenshot=1&theme=dark` 或 `theme=light`。进度截图默认不带这个参数时仍走已保存的主题；显式 `c dark mode` 只对那一帧强制暗色。

画布（WebGL / SVG）不会自动读 CSS 变量。它们用 `resolveColor('var(--ink)')` 取当前计算值，并用 `observeTheme` 在主题切换时重绘。见 `src/shared/theme.ts`。

## 改风格时按这个顺序动文件

样式表的加载顺序决定谁覆盖谁：

1. `src/features/workbench/workbench.css`（经 `App.tsx`）
2. `src/index.css`
3. `src/control-tokens.css`
4. `src/features/workbench/workbench-system.css`
5. `src/features/workbench/workspace-layout.css`（最后，同选择器时它赢）

同名文件带 ` 2` 的（例如 `LandingPage 2.tsx`）不是当前入口，不要改它们。

### 1. 语义色：dark mode 的第一站

`src/index.css` 的 `:root` 是浅色，`:root[data-theme=dark]` 是暗色。界面大面积的字、底、线、悬停都从这里来。改暗色风格，先只改下面这一组。

| Token | 浅色 | 暗色 | 用来做什么 |
| --- | --- | --- | --- |
| `--ink` | `#111` | `#fafafa` | 正文、图标 |
| `--muted` | `#737373` | `#a3a3a8` | 次要文字 |
| `--faint` | `#9a9a9a` | `#737378` | 更弱的文字、占位 |
| `--line` | `#e6e6e6` | `#36373b` | 分割线、浅边 |
| `--line-strong` | `#cfcfcf` | `#4f5056` | 更清楚的边 |
| `--accent` | `#111` | `#fafafa` | 选中、强调（中性，不是蓝） |
| `--paper` / `--canvas-bg` | `#fff` | `#191a1b` | 面板、卡片、画布底 |
| `--fill` | `#f4f4f4` | `#27272a` | 控件、芯片底 |
| `--sidebar` | `#fafafa` | `#202123` | 侧栏 |
| `--fill-hover` | `#ececec` | `#39393e` | 悬停 |
| `--contrast` | `#000` | `#fff` | 当前分支、站点、版本号 |
| `--on-pale` | `#111` | 未覆盖，仍是 `#111` | 浅色书签上的字。暗色里故意保持深色字 |
| `--token-area` | `#e5e5e5` | `#3a3a3f` | Token 用量的面积 |
| `--timeline-push-hover` | `#c4c4c4` | `#65676c` | 时间轴 push 悬停 |
| `--grid-line` | `#b0b0b0` | `#65676c` | 网格 |
| `--shadow-color` | `rgb(0 0 0 / 6%)` | `rgb(0 0 0 / 40%)` | 菜单阴影 |
| `--gallery-capture-opacity` | `.72` | `.94` | 相册里截图的静止透明度。截图本身不染色 |

`--workspace-background` 不在这张表里。浅色它等于 `--line`，暗色在 `workspace-layout.css` 里被写成 `#000`。面板之间的缝是这条颜色。

### 2. 尺寸、圆角、字号：先别为了配色去改

`src/control-tokens.css` 管密度，不管品牌色。改风格细节时第二批再动。

- 圆角：`--surface-radius` 6px，`--control-radius` 4px，面板 `--workspace-radius` 16px（在 layout 文件），composer `--composer-radius` 10px。
- 控件高度：`--base-control-height`，大约 26–32px。
- 正文字号：`--body-font-size` 12px。卡片标题 `--card-title-size` 17px / 700。
- 行内边距：`--row-padding-inline`。
- 动效：侧栏 220ms，抽屉开 440–520ms，关 300–380ms。`prefers-reduced-motion` 会关掉过渡。

字体是 Neurial Grotesk，`src/index.css` 顶部的 `@font-face`，文件在 `src/fonts/neurial-grotesk-*.otf`（Light 300、Regular 400、Medium 500、Bold 700、ExtraBold 800，各有 italic）。`--sans` 指向它。代码字体 `--font-code` 用系统等宽，不在仓库里。

### 3. 工作台把语义色映射成 `--mw-*`

`workbench-system.css` 里 `.mw-app` 把侧栏、聊天、设置、待办接到第 1 层：

- `--mw-ink` → `--ink`
- `--mw-muted` → `--muted`
- `--mw-page` → `--paper`
- `--mw-panel` → `--fill`
- `--mw-line` / `--mw-line-strong` / `--mw-hover` / `--mw-accent` 同样桥接
- 暗色额外把 `--mw-selection` 指到 `--mw-hover`，待办列 `--todo-column` 指到 `--fill`

`workbench.css` 第一行仍写着一套浅色 hex（`#191a1b`、`#fff`、`#fafafa`…）。后面的桥接会盖掉其中的表面色。改暗色时不要改那一行，改了也不会出现在界面上。

那一行里**没有**被桥接、因此仍然生效的是分支色和品牌蓝：

| Token | 值 | 角色 |
| --- | --- | --- |
| `--mw-dock` | `#7a9ef7` | Docked |
| `--mw-route` | `#ffc629` | Route |
| `--mw-assemble` | `#00a66a` | Assemble |
| `--mw-handoff` | `#ea66b7` | Hand-off |
| `--mw-pulse` | `#ed6a2c` | Pulsed |
| `--mw-misregister` | `#9a85f0` | Misregister |
| `--mw-blue` | 浅色 `#1d4ab9`，暗色 `#7a9ef7` | Werk Blue。暗色覆盖在 `workbench.css` 的 `.mw-app[data-theme=dark]` |
| `--mw-sky` | 浅色 `#e4ecff`，暗色 `#26334e` | Mit Sky，同上 |

项目色、状态点、Mit 角色标签用的就是这组。规则要求两套主题共用，不随 dark mode 翻转。

### 4. 当前界面真正在用的第二套暗色

`workspace-layout.css` 在语义色之后又写了一组 composer / 面板色，而且文件里出现了两次。后出现的那组才是活的。

暗色里现在生效的是文件后部的 `:root[data-theme=dark]`（大约 511 行）：

- `--composer-drawer-surface` `#21201f`
- `--composer-drawer-hover` `#292827`
- `--composer-selected` `#454442`
- `--composer-placeholder` `#8b8d93`
- `--composer-mode-track` `#383735`
- `--composer-border` `rgb(255 255 255 / 16%)`
- `--composer-surface` 回到 `--user-message-fill`（也就是 `--line`）

同文件前面大约 153 行还有一组更浅的暗色（`#7e7e7e`、`#c4c4c7`，表面用 `--faint`）。它会被后面的块盖住。改 composer 时只改后面那组，或先删掉前面那组，避免改错地方。

浅色 composer 抽屉是暖灰：`#e7e7e4` / `#dfdfdc` / `#ebebe8`。暗色是另一组暖黑，并不是把第 1 层 `#191a1b` 直接变深。

面板壳的尺寸也在这个文件：缝 `--workspace-gutter` 6px，圆角 16px，标题行 44px，页脚 52px。标题下的分割线 `--panel-heading-divider` 现在写死 `#000`，暗色里会变成一条黑线贴在深底上。

### 5. 相册和版本图：有的跟主题，有的是写死的 hex

`src/features/iteration-gallery/tokens.ts` 里跟主题走的例子：`var(--paper)`、`var(--fill)`、`var(--ink)`、`var(--token-area)`、`var(--timeline-push-hover)`。

不跟主题、改暗色时要单独决定的：

- `annotations.mainColor` `#cdcdcd`
- `theater.addedColor` `#1f8a4c`、`theater.removedColor` `#d12b2b`
- `fullscreen.scrim` `rgba(0, 0, 0, .8)`（全屏遮罩两套主题都是黑，这是既定规则）

`src/features/version-tree/tokens.ts`：

- 跟主题：`stationFill`、`stationOpenFill`、`activeBranchColor`、`versionLabelColor`、`revertedTitleColor` 使用 `var(--contrast)` / `var(--paper)` / `var(--faint)`。
- 不跟主题：分支色 `routes` 六色、`routeStripeColor` `#ffffff`、`levelConnectorColor` 和 `revertedRouteColor` `#b9bdba`、`milestoneBorderColor` `#000`。
- 合并分支用 `palerAccent`，按 0.45 混向白色。暗色里这条会偏白，改暗色对比时要看一眼 Idea stream。

相册截图平面在有贴图时用白色材质，不吃主题色。空白平面才用 `--paper`。这是规则，改风格时保持。

## 分支色先保持不动

同一套六色出现在三处，改一处要一起改：

- `treeTheme.routes`（版本图、Idea stream）
- `workbench.css` 的 `--mw-dock` 等到 `--mw-misregister`
- 里程碑邀请的渐变，从这套色来，不再另写 hex

当前分支 / `main` 用 `--contrast`（浅色黑、暗色白），不用这六色。同一行上的分支不重复用色。

## 资产

运行时真正用到的：

| 文件 | 用在哪 | 主题处理 |
| --- | --- | --- |
| `src/assets/mitwerk-logo.png` | 侧栏品牌 | 暗色用 CSS `filter: invert(1)`。换 logo 时要同时看浅色和暗色，滤镜会把任何彩色一起反相 |
| `src/assets/mitwerk-symbol.svg` | 顶栏 Logo 菜单 | 默认当浅色图形；浅色主题才 `invert(1)` |
| `src/assets/logo-shape.svg`、`logo-shape-part.svg` | 落地页开场几何 | 落地页舞台是黑底白框，和界面主题分开 |
| `src/fonts/neurial-grotesk-*.otf` | 全站字体 | 换字体改 `index.css` 的 `@font-face` 和 `--sans` |
| `@phosphor-icons/web` | 界面图标 | 经 `src/components/PhosphorIcon.tsx` 和 `src/components/Icon.tsx`。颜色继承所在控件，不单独上色 |

`visual_ref/` 和 `docs/qa/` 里的 PNG 是对照和验收图，不进界面。仓库里没有 `Brand/mitwerk-light-dark-design-system.html`；规则里点名的那份品牌色（Werk Blue `#1D4AB9`、Mit Sky `#E4ECFF`、Workshop Text `#191A1B`、Panel White `#FAFAFA`、Steel `#65676C`、Rail `#E7E7E7`）已经落在 `--mw-blue`、`--mw-sky` 和早期表面色里。Figma 只作参照，组件以代码 token 为准。

## 改 dark mode 时会漏掉的颜色

这些不读第 1 层。换暗色调色板时逐项决定：留下，或改成 `var(--…)`.

1. Composer 抽屉的暗色 hex（上一节第 4 层）。这是聊天底部现在的实际颜色。
2. `--workspace-background: #000` 和 `--panel-heading-divider: #000`。
3. 捕获芯片 `--capture-chip-surface: #fff`、`--capture-chip-ink: #36373b`。两套主题都是白底深字。规则里浅色书签保持深色字，芯片目前走同一路线。
4. 时间轴总览 `--timeline-overview-track: #000`、`--timeline-overview-thumb: #fff`（`control-tokens.css`）。
5. 里程碑控件白字、白边（同文件靠后的 `--milestone-control-ink` 等）。邀请卡是分支色压在黑色上、白字。
6. 版本图写死的 `#000` / `#fff` / `#b9bdba`（上一节第 5 层）。
7. 播放里的 diff 色。CSS 用了 `--line-added` 和 `--line-removed`，仓库里没有定义它们。实际颜色来自 gallery token 的 `#1f8a4c` / `#d12b2b`，只在部分表面上。
8. 退出嵌入原型的按钮写死在 `gallery.css`：字 `#fff`，底 `#191a1b`，边 `#65676c`。它浮在深色遮罩上，不跟主题。
9. 工作状态滑杆的字是白色加 `mix-blend-mode: difference`，故意在黑白填充上反色。
10. 落地页 `--landing-stage-background: #000`、帧 `#fff`。它是独立舞台。
11. XR 导出 `src/features/iteration-gallery/xr-export.ts` 的 `colors` 是一套浅色 hex，不读主题。

`--green` 和 `--wash` 在 `index.css` 里被引用，也没有定义。改到分割线悬停或版本面板切换时会露出这个空值。

## 建议的动手顺序

每一条都只改共享 token 或一处共享样式。做完一条，用浅色和暗色各看一遍再进下一条。

1. 定一张暗色角色表，只包含第 1 层那 16 个 token。先改 `src/index.css` 的 `:root[data-theme=dark]`，不要在组件里加新的暗色 hex。
2. 看缝和标题线：`--workspace-background`、`--panel-heading-divider`。决定它们是跟随 `--paper` / `--line`，还是继续比面板更深。
3. 把 composer 收到同一张表。删掉或停用 `workspace-layout.css` 里前面那组被盖住的暗色，只保留一组。抽屉、选中、占位、模式轨道都从第 1 层用 `color-mix` 推出来，避免再维护一套 hex。
4. 走查下面的漏色清单。能用现有 token 表达的，改成 `var(--ink)`、`var(--paper)`、`var(--line)`。遮罩、白字书签、截图不染色，这三项保持。
5. 补上 `--line-added` 和 `--line-removed`，让版本图和 theater 的增删行用同一对颜色。暗色如果对比不够，只改这两个 token。
6. 最后才动分支六色、Werk Blue / Mit Sky、字体和圆角。分支色要同时改 `treeTheme.routes` 和 `--mw-*`。圆角从 `--surface-radius`、`--control-radius`、`--workspace-radius` 三个开始。
7. Logo 如果换成彩色或深色 SVG，去掉 `filter: invert(1)`，为浅色和暗色各放一个资源，或改成用 `currentColor` 的 SVG。
8. 新的全站决定写进 `docs/design-system-rules.md`。这份指南只负责找入口，不代替规则记录。

## 改完看这些画面

主题按钮和 Settings 必须一起变。然后按这个顺序看，浅色和暗色都走一遍：

1. 默认首页：侧栏收起，Chat 和 Version blocks 并排。看缝、面板圆角、标题线、composer 抽屉。
2. 打开侧栏：logo、导航选中、项目色点。
3. Playback：时间轴、注释胶囊、版本标签、退出嵌入按钮。
4. Idea stream：当前分支应是 `--contrast`，其他分支保持六色。
5. Todos、Settings 的 Appearance。
6. 落地页：舞台仍是深色，Open project 回到工作台。

浏览器里切换主题即可，不必为了看效果改 `localStorage`。进度截图要暗色时，在请求里写 `c dark mode`。
