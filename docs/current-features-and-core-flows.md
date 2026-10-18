# MitWerk 当前版本：功能与核心流程

记录对象是 `main` 在 2026-10-17 的原型，提交 `a0555fa`（implemented work state simulator, imported todo design, smaller fixes）。上一份说明停在 `eefeb1f`。这仍是前端演示：对话、任务和里程碑存在本地，没有接通真实模型、同事消息或 Git 写入。

界面里的名称保持英文，和产品上的按钮一致。

## 这个版本在做什么

MitWerk 把一次设计迭代里的四件事放在同一个工作区：

- 和 Mit 的对话，以及从对话里长出来的 to-do
- 每次进度截图组成的 3D Version blocks
- 跟真实 Git 历史对齐的 Idea stream，用来记下设计决定
- 嵌在 Playback 画面里的 Live server，以及按 push 冻结的原型

默认打开的不是落地页，也不是侧边栏。没有保存过主题时使用深色。侧边栏收起。左边是当前对话，右边是 Gallery 状态的 Version blocks，比例大约 39 / 61，中间可以拖。窄于 600px 时一次只显示一个面板，用顶栏切换。

顶栏从左到右是 Chat、Version blocks、Idea stream、Live server。当前打开的面板，只有文字带下划线。链接间距是 6px。

| 控件 | 作用 |
| --- | --- |
| MitWerk 标志 | 品牌菜单：Light mode / Dark mode、Work state simulator、Exit to splash screen |
| Chat | 开关左侧对话 |
| Version blocks | 开关右侧阅读窗。关掉时 Idea stream 一起关掉 |
| Idea stream | 在 Version blocks 里再开一列，并切到 Playback |
| Live server | 打开 Version blocks，选中目录里最新一帧，在 Playback 画面里启动当前应用的隔离预览。这个按钮不会把它关掉 |

## 功能

### 落地页

地址是 `/?page=landing`。菜单里叫 splash screen。默认 intro 把一组白色帧抛到画面上，再收成 MitWerk 标志，然后出现 **Open project**。点击或按键可以跳过动画。Open project 回到干净的主页地址，对话和草稿都还在。

其他 intro 只作试验：`intro=stack`、`multiply`、`flatten`、`unfold`。默认是 impact。

### 对话

默认对话是 “Building an iteration gallery”。用户消息靠右，Mit 的回复是普通段落。输入框和已发送的用户消息用同一块表面色。时间和卡片之间留 8px。

带版本输出的回复是一张卡片：缩略图、版本说明、箭头。点箭头会在 Playback 里打开那一帧，日期范围不够时会扩到 All time。

底部 composer 只发送 prompt。Prompt / To-do 切换已经去掉；以前存成 To-do 模式的草稿也会按 prompt 发送。

- 附件。这一版接受图片、TXT、Markdown、JSON、CSV，单文件小于 10 MB，只在当前会话里排队
- 模型选择。可选 GPT-6 Astra、GPT-6.1 Sol、GPT-6 Luna、Claude Fable 5.1、Gemini 3.8 Flash、Gemini 3.5 Flash-Lite。选择只存在本地，不会发给任何模型
- 发送。空白且没有附件时不可用

To-do 写在抽屉里。抽屉是深色抬起的表面，标题就是 “To-do”。未完成的在前，完成的在后，组内按创建时间从新到旧。没有未完成项时，标题上的数字隐藏。勾选只改变完成状态。点文字可以改，清空后删除。行尾的播放图标把这条 to-do 追加进当前草稿，不自动发送。数量、完成状态和开关都按对话保存。

新的一行和已有任务对齐，开头是一颗不能点的空复选框。占位是 “Add a to-do — type /location to choose where it belongs”。输入 `/location ` 会变成一枚 location 芯片，可以删掉。界面上叫 location；bucket 只是内部名字。自定义 location 只活在这次会话里，刷新就没了，也不会搬走截图。

一条还没有 milestone 的版本卡片，可见大约 3 秒后换成两行字：“You've accomplished a lot!” 和 “Ready to mark a new milestone?”。卡片高度不变。两枚控件从上方落下：左边是圆箭头，右边是倾斜的 Not yet。点箭头会打开 Version blocks，选中对应帧，并在 Playback 里打开 milestone 表单。Not yet 只关掉这次邀请，下面的 Add milestone 还在。减少动态时，两枚控件直接停在终点。

发送之后大约 0.9 秒出现一条演示回复，并写明没有真实 agent 运行、也没有改源文件。正在等待时可以 Stop。

### Version blocks：Gallery

已完成的 prompt 截图变成半透明 3D 块。最新的一帧在最前面，相机从左侧看过去，默认仰角大约 19.5°。默认取景是以前基础尺寸的 80%，但读数仍显示 100%。最新一帧的顶边放在画面高度大约 44% 的位置。只发布已经记完的 prompt；正在进行的 prompt 不会进入画廊。

Header 里 Gallery 和 Playback 同时可见，无衬线字。当前项是实底，另一项变淡。点 Playback 会转到正面，再出现时间轴。

- 拖拽环绕。滚轮和捏合直接改相机缩放，页脚百分比只是读数
- 单击缩放百分比回到 100%。双击，或 Shift+Enter，重置整个机位。画布上的 Home 也重置机位
- 悬停时，画面高度大约 15% 的位置显示这条 prompt 的摘要，最多约 50 个字符
- 日期范围在启动时自动选“至少包含 10 个可见版本”的最小档，不够就用 All time。用户手动选过之后保持该选择。刻度和版本标签只跟当前范围内的块走；范围外的块还在，只是没有标签
- 每天的第一帧有日期刻度，最新一帧也会有一格。平移相机时，已经排好的日期行保持不动
- 页脚还有 location（homescreen、landing，以及这次会话里新建的名字）
- 保存帧的选项写成 `#编号 - v版本 - 本地日期时间`。没有编号的帧省掉前面的编号

这个工作区如果没有本地截图、也读不到已发布的 Blob catalog，Gallery 会显示 “No saved frames found.”

### Version blocks：Playback

点 Header 里的 Gallery 回到相册。Idea stream 开着时，回到 Gallery 会把 Idea stream 关掉。运行中的原型或 Live server 会挡住 Gallery，要先退出。

- 时间轴按版本分段，小刻度是 prompt。左键拖动改变选中帧；悬停是临时预览，移开恢复
- 内容比窗口宽时，时间轴下方出现一条 4px 的总览。白块表示当前能看到的那一段，拖它只移动视口，不改选中帧。全部都能放下时，这条总览隐藏
- 中键拖动，或纵向滚轮，用来左右平移时间轴
- 悬停范围外的块会提示 “Outside range · …”。这些块不能成为播放头
- 播放默认是 No loop，到最后一帧停止。还可以选 Loop 和 Ping-pong。速度、循环和跳到结尾在运输条上，间距随面板宽度变化
- 在上一帧 / 下一帧上停留大约 0.5 秒，会打开跳转菜单，并记住最近用过的跳法
- 帧下方有 New milestone / to-do，以及 Add frame to chat。后者把这一帧放进当前对话的待发送上下文，只在这次会话里保留
- 最新一帧和最新一次 push 上，原来的 Enter prototype 改成 Live server

### 嵌在画面里的运行

Live server 和保存下来的原型都替换 Playback 里那张截图，不另开一页，也不再使用空的 Live server 面板。画面周围的说明、帧操作、运输条和页脚盖上一层大约 34% 的黑，这些控件暂时不能用。退出按钮和运输条对齐，写着 Exit live server 或 Exit prototype。

- 顶栏 Live server，以及最新帧上的 Live server，用的是当前应用代码。预览有自己的空存储，改动不会写回外面的工作区，也不能发出会修改数据的请求
- Enter prototype 打开那次 push 冻结下来的代码，停在当时的提交。没有归档时，失败提示留在同一格里，退出始终可用
- 退出后回到原来的 Playback，焦点也回去

### Idea stream

它不是单独一页。打开后，Version blocks 分成左右两列，共用一个 header：左边 Playback，右边是按时间排成一列的 Git 图。`main` 用当前主题的对比色，其他分支用共享路线色。新分支的颜色从它第一个站点的中心开始，前面那段空隙仍是上一个分支的颜色。

- 打开时露出最近三个版本，并展开最新一条已完成提交
- 连续、同一分支、没有 milestone 的旧版本折成一个计数圆。最近三个版本即使没有 milestone 也保持展开
- 展开的一组在第一个站点左边有 Fold。它只折这一组。页脚不再有全局 Fold
- Playback 正在播放时，图会跟着当前帧：临时展开那一组、打开对应提交卡，并滚到那个站点。暂停或关掉 Playback 后，恢复用户自己展开的组
- 点站点展开原来的提交卡。卡上可以按 prompt 数跳到对应 Playback，或把引用图加进对话。文件改动数和新建分支不在这张卡上
- Milestone 是写在稳定版本身份上的本地笔记。奖杯标记落在站点上。未完成的 WIP 把添加或编辑 milestone 的按钮钉在站点上，to-do 和 prompt 数排在下面
- 页脚有上一个 / 当前 / 下一个 milestone，以及缩放。单击缩放百分比回到 100%，双击 Fit all。网格一直显示
- 当前对话抽屉里的 to-do 会出现在对应版本旁边，时间不重复写版本号。全部完成时，站点是一枚填色的勾选方块

Test visual 仍是另一套可编辑的图，用来做实验，不改 Commit history。按 `T` 才会露出那个切换。独立的 `/?view=history` 仍是早先的阅读窗，Gallery 和 Version stream 在一起。

### 标注

Playback 里的 New milestone / to-do 是单选：To-do 或 Milestone。Milestone 和 Idea stream、对话卡片共用同一份本地笔记。To-do 可以留在画面上，也可以送到任务板或一条对话里去做。关掉、取消、Escape 或保存都会把这层收起，焦点回到 Playback。

对话里的 “Also commit to [branch]” 只会弹出 Success，不会真正提交，也不会记住这个勾选。

### Work state simulator

标志菜单里的 Work state simulator 在面板下方打开一条整宽滑杆，上面的面板被压矮，顶栏高度不变。最左是空项目：没有版本、没有 prompt、对话是欢迎语。最右是现在的工作区，读数 100%。拖动按移动距离改变数值，点一下不会跳。方向键、Home 和 End 可以微调。

第一次打开会先预热一批画廊图片，滑杆在此期间锁住。关掉滑杆不会自动回到 100%。停在 100% 以下的状态留在这次浏览器会话里，刷新后还在。拖回 100% 才恢复当前工作区。

模拟时，Gallery、Playback 和 Idea stream 共用同一个时间截止点。画廊保持 Fit all 和 All time，早先的块停在原处，新的块从远端长出来。对话不是把消息一条条堆上去，而是在几段短交换之间交叉淡入；0% 是空对话，100% 是完整对话。创建时间晚于截止点的 to-do 和标注会藏起来。

### 侧边栏里还在的页面

侧边栏默认收起，顶栏标志现在只开品牌菜单，不再负责把它展开。所以这些页面还在代码里，但默认表面上没有入口。`Ctrl/Cmd+K` 仍可搜索任务和对话。

- Todos：四列看板，To do、In progress、Ready for review、Complete。拖拽或 Alt+左右方向键改状态
- Projects：项目说明、任务、资产和 Mits。归档后从 Active 侧边栏消失，数据还在
- Inbox：只列出和 Mits 的对话，分成 Priority 和 Recent
- Settings：浅色 / 深色，以及只读的姓名。主题和顶栏菜单是同一份状态
- Mits、Library：点了只提示 “This isn't available yet.”

## 核心流程

### 1. 进入项目

落地页动画结束，或直接打开 `/`。看到的是当前对话和 Gallery 并排。标志菜单可以换主题、打开进度模拟，或退回落地页。

### 2. 看一轮迭代

在 Gallery 里环绕、缩放、换日期范围。点 Playback 或点一帧进入回放。用时间轴、总览条、播放和循环看这一段怎么变。再点 Gallery 回到相册。

### 3. 把某一帧带回对话

Playback 里 Add frame to chat，或在 Idea stream 的引用图上点一下。帧或图片进入 composer 上方，还没发送。写一句说明再发送。回复是演示文本。版本卡片的箭头可以再跳回那一帧。

### 4. 记下一个决定

三条路进同一份 milestone 笔记：

- Playback 里选 Milestone
- 版本卡片上的邀请或 Add milestone
- Idea stream 里悬停站点，或在最新未 push 的版本上直接添加

保存后，奖杯和笔记出现在 Idea stream。已完成版本可以用页脚的 Milestone x/y 前后跳。删除是故意留空，刷新不会把种子笔记填回来。

### 5. 把下一步留成 to-do

在抽屉的新行里写下 to-do，需要的话用 `/location` 指定位置。对话输入框不会再切到 To-do 模式。勾选会同时反映在 Idea stream 里同一版本的清单上。要把某条做掉，点行尾的播放图标放进草稿，再发送。演示回复不会改文件。

### 6. 看设计决定和 Git 是否对得上

打开 Idea stream。最近的版本展开，更早的无笔记版本折叠。播放时，图会跟着当前帧走。点开一条提交看说明，并用 prompt 数回到那次 push 的画面。需要看冻结原型时，在对应 push 帧上 Enter prototype。要看当前代码，用顶栏或最新帧上的 Live server。

### 7. 把项目倒回某个进度

打开 Work state simulator，向左拖。画廊从早期版本往现在长，对话在几段短交换之间切换，晚于这个时刻的 to-do 消失。松开后停在该百分比。拖回最右边恢复现在。

## 数据存在哪里

| 内容 | 位置 |
| --- | --- |
| 对话、草稿、composer、项目 | 浏览器 localStorage |
| Milestone 笔记 | `mitwerk.idea-stream.milestones.v1` |
| 主题 | localStorage，默认深色 |
| 模拟进度 | sessionStorage 的 `mitwerk-work-state`。只有低于 100% 才保留 |
| 截图和版本身份 | 本地 `[frame capture] screenshots/`，已发布环境改走 Vercel Blob catalog |
| Git 父子和分支 | 仓库历史，只读 |
| 每次 push 的可运行原型 | 该次归档。在线预览从 Git 读取，不再依赖把整份代码下载进页面 |
| Live server | 当前应用代码，隔离的空存储，不写回宿主 |

成功的 prompt / push 截图会在记录完成之后排队上传到 Blob。失败或被排除的截图不上传。代码改动和归档原型的更新仍然要重新部署。

## 这一版明确没做的事

- 没有真实模型请求。模型菜单和发送都是本地演示
- Live server 是当前界面的隔离预览，不是一台已连接的外部服务器
- Mits 资料和 Library 入口会提示还不可用
- Milestone 上的 commit 勾选不会写 Git
- 人类协作不在当前范围。Inbox 里现在只有 Mits
