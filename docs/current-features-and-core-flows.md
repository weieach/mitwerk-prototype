# MitWerk 当前版本：产品架构、功能、交互与核心流程

记录对象是 `main` 在 2026-10-18 的原型，提交 `547bab8`（changed liver server bg to dark gray）。上一份说明停在 `a0555fa`。这仍是前端演示：对话、任务和里程碑存在浏览器里，没有接通真实模型、同事消息或 Git 写入。

界面里的名称保持英文，和产品上的按钮一致。

## 一、产品架构

### 产品在解决什么

和 AI 一起做设计时，prompt、截图、提交和决定会散落在不同地方。MitWerk 把它们放进一个工作区，围绕四个功能：

| 功能 | 回答的问题 | 标识色 |
| --- | --- | --- |
| Chat | 我刚才让 Mit 做了什么，下一步做什么 | Assemble 绿 |
| Version blocks | 界面是怎么一步步变成现在这样的 | 主题蓝 |
| Idea stream | 哪些版本是关键决定，它们和 Git 怎么对应 | Handoff 粉 |
| Live server | 现在这一版实际跑起来是什么样 | Pulse 橙 |

标识色只用在图标、面板标题和运行时入口上。导航文字和底色保持中性。

### 入口

| 地址 | 内容 |
| --- | --- |
| `/` | 主工作区。默认就打开这里 |
| `/?page=landing` | Splash screen，品牌动画和 Open project |
| `/?view=history` | 早先的独立阅读窗，Gallery 和 Version stream 并排 |
| `/?view=system` | 设计系统参考页，从正在运行的样式表读出所有 token |
| `?type=1` | 打开 Type editor 做排版调整 |
| `?milestone=1` | 没有截图时也显示对话版本卡和邀请，用内置示例图 |

### 工作区结构

```text
顶栏：MitWerk 菜单 | Chat · Version blocks · Idea stream · Live server
┌──────────────┬──────────────────────────────────────────────┐
│ Chat         │ 阅读窗：Version blocks                         │
│ 对话          │   Gallery（3D 相册）                           │
│ To-do 抽屉    │   或 Playback ─┬─ Idea stream（Git 时间线）     │
│ Composer     │                └─ 或画面内运行 Live server / 原型 │
└──────────────┴──────────────────────────────────────────────┘
（可选）Work state simulator 横条，压在面板下方
```

- 顶栏链接按面板从左到右的顺序排列
- Idea stream 不是独立面板，而是 Version blocks 里 Playback 右侧的一列
- Live server 和冻结原型不另开页面，而是替换 Playback 画框里的截图
- 侧边栏默认收起。Todos、Projects、Inbox、Settings 页面还在代码里，但默认表面上没有入口

### 数据层

| 层 | 来源 | 读写 |
| --- | --- | --- |
| 截图与版本身份 | `[frame capture] screenshots/`，已改为 Git LFS 跟踪；部署版本读 Vercel Blob catalog | 只读，由截图脚本写入 |
| Git 历史 | 仓库提交、父子关系和分支 | 只读 |
| 每次 push 的原型 | 该次提交的代码，从 Git 读取 | 只读 |
| 对话、草稿、to-do、项目 | 浏览器 localStorage | 本地读写 |
| Milestone | `mitwerk.idea-stream.milestones.v1` | 只在本次页面加载内有效，刷新清空。内置种子里程碑保留 |
| 模拟进度 | sessionStorage `mitwerk-work-state` | 低于 100% 时在本标签页保留 |
| 主题和排版调整 | localStorage：`mitwerk-theme`、`mitwerk-type-studio` | 本地读写 |

截图里的版本号、prompt 号和 push 号是串起三个视图的共同身份：对话卡片、Playback 帧、Idea stream 站点都用它互相跳转，不依赖显示标签。

### 设计系统

- **主题**：深色默认，跟随 Cursor Dark。面板 `#181818`，外框更深 `#101010`。其他中性色都是 `#e4e4e4` 按固定透明度混出来的。浅色不是白页：面板 `#f5f5f3`，外框 `#ebebe8`，只有输入框、对话内卡片和已发送消息接近白色
- **强调色**：每个主题一套。深色蓝 `#499cff`，浅色蓝 `#2563eb`。绿、黄、粉、橙、紫在深色更亮，在浅色深约 12 个点，统一在 `src/shared/palette.ts`
- **字体**：全部无衬线文字用 Waldenburg（随项目打包为 WOFF2），等宽用系统 SF Mono。最重只用 Medium 500
- **字号**：根字号 16px，屏幕宽度不超过 1512px 时降到 15px。对话区只用三档：11 / 13 / 14px
- **间距**：布局间距统一乘 1.2。页面边距约 8.4px，面板之间的缝 6px
- **形状**：弹出菜单共用一套边线、圆角 8px 和阴影；内嵌元素的圆角等于外层圆角减去内距

完整规则在 `docs/design-system-rules.md`，概览在 `docs/design-system.md`，改样式的入口在 `docs/ui-restyle-guide.md`。

## 二、功能

### MitWerk 菜单

点顶栏标志打开，共四项：

- Light mode / Dark mode
- Type editor / Close type editor
- Work state simulator
- Exit to splash screen

### Splash screen

默认 intro 把一组白色帧抛到画面上，再收成 MitWerk 标志，然后出现 **Open project**。点击或按键可以跳过。Open project 回到主工作区，对话和草稿都还在。`intro=stack`、`multiply`、`flatten`、`unfold` 只作试验。

### Chat

- 默认对话是 “Building an iteration gallery”。用户消息是收紧到最长一行宽度的气泡，Mit 的回复每行约 70 个字符
- 消息时间平时隐藏，悬停或聚焦时淡入
- **版本卡片**：封面、版本和 prompt 号、箭头。点卡片在 Playback 打开那一帧，必要时把日期范围扩到 All time。宽度够时横排，窄时封面在上
- **Composer**：只发送 prompt，可以带附件和选择模型。模型选择只存在本地，不会发给任何模型。发送按钮在可用和不可用之间有过渡
- **Capturing 行**：输入框上方写着 “Capturing [location] with [details]”。location 是可选的截图位置，details 是一行无边框输入
- 发送后大约 0.9 秒出现一条演示回复，写明没有真实 agent 运行、也没有改源文件。等待时可以 Stop

### To-do 抽屉

- 在 composer 上方，默认收起。顶部有拖拽把手，点击或拖动开合
- 标题旁的实心圆点显示未完成数量，为 0 时隐藏
- 未完成的在前，完成的在后，组内从新到旧。完成后只给文字加删除线
- 点文字可以改；编辑时，时间和运行按钮淡出。清空则删除
- 行尾播放按钮把这条 to-do 放进当前草稿，不自动发送
- 最后一行直接新建：输入 `/location ` 变成一枚 location 芯片
- 每条记录创建时所在的版本，并显示在 Idea stream 对应站点旁

### Milestone 邀请

一张还没有 milestone 的版本卡片，在封面加载完、停留大约 3 秒后，变成流动渐变：“You've accomplished a lot! / Ready to mark a new milestone?”。两枚控件从封面后面掉出来：Not yet 先落，圆箭头 0.45 秒后落，互相碰撞后停在卡片右下角。

- 点箭头：邀请立刻收起，卡片回到普通样子，同时在 Playback 里打开 New milestone 表单
- Not yet：只关掉这次邀请
- 保存后，卡片上的按钮变成一个勾，写着 “Milestone added”。再点可以编辑

### Version blocks：Gallery

- 已完成的 prompt 截图变成半透明 3D 块，最新的在最前面。机位从左侧看，仰角大约 19.5°
- 启动时自动选择至少包含 10 个版本的最小日期范围，不够就用 All time。手动选过后保持
- 日期刻度和版本标签只跟当前范围内的块
- 悬停一帧：上方显示 prompt 号和摘要
- 页脚有 location、日期范围和缩放。窄于 620px 时折成两行
- 没有截图、也读不到 catalog 时，显示 “No saved frames found.”

### Version blocks：Playback

- Header 里 Gallery 和 Playback 同时可见。进入 Playback 时选中帧转到正面，时间轴自动滚到播放头
- 回到 Gallery 时，恢复离开前的机位和缩放，不会自动 Fit all
- 画框带一层很淡的大范围阴影。下方留固定高度给版本、日期、prompt、分支和增删行数；prompt 太长时在这块区域里截断，不会把画框顶上去
- 引用文件显示为圆角药丸，可以点开
- 帧操作：New milestone / to-do、Add frame to chat。最新帧显示 Live server，旧的 push 帧显示 Enter prototype
- **时间轴**：
  - 按版本分段，小刻度是 prompt
  - 范围外的连续区域只画一个外框，不能选中
  - 悬停范围外会出现 “Outside range · …”；点它，时间轴滚到第一个范围内的块
  - 内容放不下时，下方出现总览条
  - 播放默认 No loop，也可以选 Loop 或 Ping-pong

### 画面内运行：Live server 与冻结原型

两者都替换 Playback 画框里的截图。周围变成实心深灰底；说明、时间轴和页脚淡出，暂时不能操作。

- 应用按 1440px 宽的桌面视口布局，再等比缩小到画框里，不会被挤成窄屏
- **Live server**：运行当前代码，用独立的空存储，改动不写回工作区。点画框外任意处，或 Exit live server，退出
- **冻结原型**：停在那次 push 的提交。画框右上角有版本标签和前后三角，可以在已保存的 push 之间切换；两端禁用。点画框外不会退出，必须点 Exit prototype
- 运行中可以直接点 Gallery：一边关闭运行，一边转回相册

### Idea stream

- 按时间排成一列的 Git 图，背景是等距点阵。`main` 用主题对比色，其他分支用强调色调色板
- 打开时露出最近三个版本，并展开最新一条已完成的提交
- 连续、同一分支、没有 milestone 的旧版本折成计数圆。展开后，组首有一个只折这一组的 Fold
- 播放时，图跟着当前帧：临时展开那一组、打开提交卡，并滚到那个站点。暂停后恢复你自己的展开状态
- 提交卡可以按 prompt 数跳回 Playback，也可以把引用图加进对话
- 站点形状：
  - 普通版本是圆
  - Milestone 是奖杯
  - 带 to-do 的版本是小一号的方框，全部完成后打勾
- 最新未 push 的版本，在站点旁直接提供 Add / Edit milestone 和 prompt 数
- 页脚：定位当前、上一个 / 下一个 milestone、缩放。宽度变窄时逐级压缩，不换行
- Test visual 仍是另一套可编辑的图，按 `T` 才显示切换，不影响 Commit history

### 标注

Playback 里的 New milestone / to-do 用单选切换类型，标题随之变成 “New to-do” 或 “New milestone”。表单带可选的 “Also commit to [branch]”，和保存按钮放在同一行。这个勾选只弹出 Success，不会真正提交。

### Work state simulator

- 在面板下方打开一条整宽滑杆。最左是空项目，最右是现在（100%）
- 100% 时提示 “Drag to simulate an earlier state of this project”。拖动后显示模拟的日期，最左显示 “Empty project”
- 所有面板共用一个时间截止点：画廊从早期往现在长，Idea stream 回退分支，对话在几段短交换之间切换，晚于截止点的 to-do 和标注隐藏
- 第一次打开会先预热图片，期间滑杆锁住。关掉后状态保留，拖回 100% 才恢复

### Type editor

浮在页面上，不改布局。按共享角色调整文字：字号、字重、行高、字距、颜色、字体、斜体。调整保存在本地，Reset 恢复默认，Copy CSS 导出改过的变量。截图模式会忽略这些调整。

## 三、交互

### 面板

- 顶栏链接分别开关对应面板。打开的链接带中性底色，图标显示功能色
- 每个面板在本次会话第一次出现时，淡入并上移 6px；再次打开不重放
- **Chat 宽度可拖**：
  - 屏幕宽于 1512px 时默认 500px；不超过 1512px 时默认 `min(440px, 35vw)`
  - 最小 320px，最大 760px 或可用宽度的 55%，取较小值
  - 方向键、Home、End 也能调整
  - 拖动时，版本卡片暂时换成灰色占位，松手后淡回
- 屏幕不超过 1512px 且 Chat 可见时，Idea stream 独占阅读窗，和 Live server 互斥。隐藏 Chat 或全屏后恢复多列
- 宽度在 851px 以下切到窄屏布局；600px 以下一次只显示一个面板
- 每个面板标题右侧都有全屏切换

### 3D 相册

- 拖拽环绕，滚轮或捏合缩放
- 单击缩放百分比回到 100%；双击或 Shift+Enter 重置机位；画布上按 Home 也重置
- 平移时，日期标签保持原来的行，不会跳动

### 时间轴

- 左键拖动换帧；悬停是临时预览，移开恢复
- 中键拖动或纵向滚轮左右平移
- 在上一帧 / 下一帧上停留约 0.5 秒，打开跳转菜单

### 菜单和输入

- 所有选择器都用同一套自绘菜单，不打开系统原生下拉。方向键选择，Enter 确定，Escape 关闭并把焦点还给触发按钮
- 键盘焦点是贴边的 1px 描边，不改变布局

### 动效原则

- 普通界面保持安静；Milestone 邀请是唯一“响亮”的时刻（渐变、刚体下落、勾的弹跳）
- 所有动效都尊重系统的减少动态设置：邀请控件直接停在终点，渐变静止，面板不做入场

## 四、核心流程

### 1. 进入项目

从 splash screen 点 Open project，或直接打开 `/`。看到的是 Chat 和 Gallery 并排。

### 2. 回看一轮迭代

1. 在 Gallery 里环绕、缩放、换日期范围
2. 点一帧或 Playback 进入回放
3. 用时间轴、播放和循环看这一段的变化；范围外的提示可以把你带回范围内
4. 点 Gallery 回到原来的机位

### 3. 把画面带回对话

1. 在 Playback 点 Add frame to chat，或在 Idea stream 点一张引用图
2. 它出现在 composer 上方，还没发送
3. 写一句说明后发送，得到演示回复
4. 回复里的版本卡片可以再跳回那一帧

### 4. 记下一个决定

有四条入口，都写进同一份 milestone 笔记：

- 版本卡片上的邀请：点箭头
- 版本卡片上的 Add milestone
- Playback 的 New milestone / to-do，选 Milestone
- Idea stream 里悬停站点，或在最新未 push 的版本上直接添加

保存后，卡片显示 “Milestone added”，Idea stream 出现奖杯，已完成版本可以在页脚前后跳转。刷新页面后，浏览器里新建的 milestone 会被清空。

### 5. 把下一步留成 to-do

1. 在抽屉最后一行写 to-do，需要时用 `/location` 指定位置
2. 它记录当前版本，并出现在 Idea stream 对应站点旁
3. 勾选会同时更新两处
4. 要执行时，点行尾播放按钮放进草稿，再发送

### 6. 对照决定和 Git

1. 打开 Idea stream：最近版本展开，更早的无笔记版本折叠
2. 播放 Playback，图会跟着当前帧走
3. 点开提交卡看说明，用 prompt 数回到那次 push 的画面

### 7. 打开真实界面

- 想看现在：点顶栏 Live server，或最新帧上的 Live server。点画框外任意处退出
- 想看过去：在旧的 push 帧上 Enter prototype，用右上角三角在版本之间切换，点 Exit prototype 退出

### 8. 倒回某个进度

1. 菜单里打开 Work state simulator，向左拖
2. 所有面板一起回到那个时刻
3. 关掉后状态保留，拖回 100% 恢复现在

### 9. 调整视觉

- 菜单里切换 Light mode / Dark mode
- 打开 Type editor 按角色调整文字，用 Copy CSS 把结果交给后续修改
- `/?view=system` 查看当前所有 token

## 这一版明确没做的事

- 没有真实模型请求。模型菜单和发送都是本地演示
- Live server 是当前界面的隔离预览，不是一台已连接的外部服务器
- Milestone 上的 commit 勾选不会写 Git
- 浏览器里新建的 milestone 只在本次页面加载内有效
- Mits 资料和 Library 入口会提示还不可用
- 人类协作不在当前范围。Inbox 里现在只有 Mits
