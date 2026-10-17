# MitWerk 当前版本：功能与核心流程

记录对象是 `main` 在 2026-10-17 的原型，提交 `eefeb1f`（Automatically publish successful captures to Vercel Blob）。这是前端演示：对话、任务和里程碑都存在本地，没有接通真实的模型、同事消息或 Git 写入。

界面里的名称保持英文，和产品上的按钮一致。

## 这个版本在做什么

MitWerk 把一次设计迭代里的三件事放在同一个工作区：

- 和 Mit 的对话，以及从对话里长出来的 to-do
- 每次进度截图组成的 3D Version blocks
- 跟真实 Git 历史对齐的 Idea stream，用来记下设计决定

默认打开的不是落地页，也不是侧边栏。没有保存过主题时使用深色。侧边栏收起。左边是当前对话，右边是 Gallery 状态的 Version blocks，比例大约 39 / 61，中间可以拖。窄于 600px 时一次只显示一个面板，用顶栏切换。

顶栏从左到右是：

| 控件 | 作用 |
| --- | --- |
| MitWerk 标志 | 打开品牌菜单：切换浅色 / 深色，或 Exit to landing screen |
| Live server | 打开一个空面板。文案是还没有连接 live server |
| Version blocks | 开关右侧阅读窗。关掉时 Idea stream 一起关掉 |
| Idea stream | 在 Version blocks 里再开一列，并切到 Playback |
| Chat | 开关左侧对话 |

当前打开的面板，只有文字带下划线。

## 功能

### 落地页

地址是 `/?page=landing`。默认 intro 把一组白色帧抛到画面上，再收成 MitWerk 标志，然后出现 **Open project**。点击或按键可以跳过动画。Open project 回到干净的主页地址，对话和草稿都还在。

其他 intro 只作试验：`intro=stack`、`multiply`、`flatten`、`unfold`。默认是 impact。

### 对话

默认对话是 “Building an iteration gallery”。用户消息靠右，Mit 的回复是普通段落。带版本输出的回复是一张卡片：缩略图、版本说明、箭头。点箭头会在 Playback 里打开那一帧，日期范围不够时会扩到 All time。

底部是这一条对话自己的 composer：

- 附件。这一版接受图片、TXT、Markdown、JSON、CSV，单文件小于 10 MB，只在当前会话里排队
- 模型选择。可选 GPT-6 Astra、GPT-6.1 Sol、GPT-6 Luna、Claude Fable 5.1、Gemini 3.8 Flash、Gemini 3.5 Flash-Lite。选择只存在本地，不会发给任何模型
- Prompt / To-do 切换。Prompt 发送演示回复；To-do 把文字存进抽屉，不发送
- 发送。Prompt 模式下空白且没有附件时不可用

To-do drawer 跟在 composer 上面。未完成的在前，完成的在后，组内按创建时间从新到旧。勾选只改变完成状态。点文字可以改，清空后删除。另一侧的加号把这条 to-do 追加进当前草稿并切回 Prompt，不自动发送。数量、完成状态和开关都按对话保存。

一条还没有 milestone 的版本卡片，可见大约 3 秒后会变成邀请：“Ready to mark a new milestone?”。点它会打开 Version blocks，选中对应帧，并在 Playback 里打开 milestone 表单。Not yet 只是这次关掉邀请，下面的 Add milestone 还在。

发送之后大约 0.9 秒出现一条演示回复，并写明没有真实 agent 运行、也没有改源文件。正在等待时可以 Stop。

### Version blocks：Gallery

已完成的 prompt 截图变成半透明 3D 块。最新的一帧在最前面，相机从左侧看过去，默认仰角大约 19.5°。只发布已经记完的 prompt；正在进行的 prompt 不会进入画廊。

- 拖拽环绕。滚轮和捏合直接改相机缩放，页脚百分比只是读数
- 单击缩放百分比回到 100%。双击，或 Shift+Enter，重置整个机位。画布上的 Home 也重置机位
- 悬停时，画面高度大约 12% 的位置显示这条 prompt 的摘要，最多约 50 个字符
- 日期范围在启动时自动选“至少包含 10 个可见版本”的最小档，不够就用 All time。用户手动选过之后保持该选择
- 页脚还有界面桶（homescreen、landing，以及这次会话里新建的桶）。新建桶只存在内存里，刷新就没了，也不会搬走截图
- 点一帧进入 Playback，相机会转到正面，再出现时间轴

这个工作区如果没有本地截图、也读不到已发布的 Blob catalog，Gallery 会显示 “No saved frames found.”

### Version blocks：Playback

Header 里的模式标签或标题 pill 可以回到 Gallery。Idea stream 开着时，回到 Gallery 会把 Idea stream 关掉。

- 时间轴按版本分段，小刻度是 prompt。左键拖动改变选中帧；悬停是临时预览，移开恢复
- 中键拖动，或纵向滚轮，用来左右平移时间轴
- 播放默认是 No loop，到最后一帧停止。还可以选 Loop 和 Ping-pong。速度和循环在运输条上
- 帧下方有 New milestone / to-do，以及 Add frame to chat。后者把这一帧放进当前对话的待发送上下文，只在这次会话里保留
- 选中范围外的块变淡，不能成为播放头
- Push 帧可以 Enter prototype，打开那次 push 冻结下来的原型。没有归档时给出缺失反馈

### Idea stream

它不是单独一页。打开后，Version blocks 分成左右两列，共用一个 header：左边 Playback，右边是按时间排成一列的 Git 图。`main` 用当前主题的对比色，其他分支用共享路线色。

- 打开时露出最近三个版本，并展开最新一条已完成提交
- 连续、同一分支、没有 milestone 的旧版本折成一个计数圆。最近三个版本即使没有 milestone 也保持展开
- 点站点展开原来的提交卡。卡上可以按 prompt 数跳到对应 Playback，或把引用图加进对话。文件改动数和新建分支不在这张卡上
- Milestone 是写在稳定版本身份上的本地笔记。奖杯标记落在站点上。未完成的 WIP 可以先写草稿，等这个版本真正提交后再进入 “Milestone x/y” 导航
- 页脚有上一个 / 当前 / 下一个 milestone、网格（始终显示）、折叠，以及缩放。单击缩放百分比回到 100%，双击 Fit all
- 当前对话抽屉里的 to-do 会出现在对应版本旁边。全部完成时，站点显示为勾选

Test visual 仍是另一套可编辑的图，用来做实验，不改 Commit history。按 `T` 才会露出那个切换。独立的 `/?view=history` 仍是早先的阅读窗，Gallery 和 Version stream 在一起。

### 标注

Playback 里的 New milestone / to-do 是单选：To-do 或 Milestone。Milestone 和 Idea stream、对话卡片共用同一份本地笔记。To-do 可以留在画面上，也可以送到任务板或一条对话里去做。关掉、取消、Escape 或保存都会把这层收起，焦点回到 Playback。

对话里的 “Also commit to [branch]” 只会弹出 Success，不会真正提交，也不会记住这个勾选。

### 侧边栏里还在的页面

侧边栏默认收起，顶栏标志现在只开品牌菜单，不再负责把它展开。所以这些页面还在代码里，但默认表面上没有入口。`Ctrl/Cmd+K` 仍可搜索任务和对话。

- Todos：四列看板，To do、In progress、Ready for review、Complete。拖拽或 Alt+左右方向键改状态
- Projects：项目说明、任务、资产和 Mits。归档后从 Active 侧边栏消失，数据还在
- Inbox：只列出和 Mits 的对话，分成 Priority 和 Recent
- Settings：浅色 / 深色，以及只读的姓名。主题和顶栏菜单是同一份状态
- Mits、Library：点了只提示 “This isn't available yet.”

## 核心流程

### 1. 进入项目

落地页动画结束，或直接打开 `/`。看到的是当前对话和 Gallery 并排。标志菜单可以换主题，或退回落地页。

### 2. 看一轮迭代

在 Gallery 里环绕、缩放、换日期范围。点一帧进入 Playback。用时间轴、播放和循环看这一段怎么变。标题 pill 回到 Gallery。

### 3. 把某一帧带回对话

Playback 里 Add frame to chat，或在 Idea stream 的引用图上点一下。帧或图片进入 composer 上方，还没发送。写一句说明，用 Prompt 发送。回复是演示文本。版本卡片的箭头可以再跳回那一帧。

### 4. 记下一个决定

三条路进同一份 milestone 笔记：

- Playback 里选 Milestone
- 版本卡片上的邀请或 Add milestone
- Idea stream 里悬停站点，或在最新未 push 的版本上直接添加

保存后，奖杯和笔记出现在 Idea stream。已完成版本可以用页脚的 Milestone x/y 前后跳。删除是故意留空，刷新不会把种子笔记填回来。

### 5. 把下一步留成 to-do

Composer 切到 To-do 并发送，文字进抽屉，对话不变。勾选会同时反映在 Idea stream 里同一版本的清单上。要把某条做掉，点加号放进草稿，切回 Prompt，再发送。演示回复不会改文件。

### 6. 看设计决定和 Git 是否对得上

打开 Idea stream。最近的版本展开，更早的无笔记版本折叠。点开一条提交看说明，并用 prompt 数回到那次 push 的画面。需要看冻结原型时，在 Playback 的 push 帧上 Enter prototype。

## 数据存在哪里

| 内容 | 位置 |
| --- | --- |
| 对话、草稿、composer、项目 | 浏览器 localStorage |
| Milestone 笔记 | `mitwerk.idea-stream.milestones.v1` |
| 主题 | localStorage，默认深色 |
| 截图和版本身份 | 本地 `[frame capture] screenshots/`，已发布环境改走 Vercel Blob catalog |
| Git 父子和分支 | 仓库历史，只读 |
| 每次 push 的可运行原型 | 该次归档。在线预览从 Git 读取，不再依赖把整份代码下载进页面 |

成功的 prompt / push 截图会在记录完成之后排队上传到 Blob。失败或被排除的截图不上传。代码改动和归档原型的更新仍然要重新部署。

## 这一版明确没做的事

- 没有真实模型请求。模型菜单和发送都是本地演示
- Live server 没有连接目标
- Mits 资料和 Library 入口会提示还不可用
- Milestone 上的 commit 勾选不会写 Git
- 人类协作不在当前范围。Inbox 里现在只有 Mits
