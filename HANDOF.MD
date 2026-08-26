# 交接记录

## 2026-08-26 Beta 自定义大语言模型 API

- [x] 只在钉钉 Beta 的顶部“模型”菜单增加“自定义大语言模型”，正式微信版和正式钉钉版不显示入口，也不会将浏览器残留的自定义配置用于生成。
- [x] 复用 Fish Audio 的紧凑表单与就地测试反馈，提供国内外 OpenAI 兼容接口模板、Base URL、模型名、API Key 和“测试并使用”；测试成功后保存为当前生成模型。
- [x] 自定义模型配置经过 Beta surface gate，后端优先代发续写，失败时保留浏览器直连兼容；新增单元测试和 `390×844` Beta Playwright 流程，覆盖模板填充、测试请求、保存恢复与横向溢出。
- [x] 本地通过 TypeScript、30 个测试文件共 183 项、Beta 与正式双版本构建；Beta `390×844` 自定义模型流程通过，正式完整 Playwright 回归 11 项通过、Beta 专用用例按环境跳过 1 项。
- [ ] 完成 Beta 公网页面与接口验收。
- [ ] 同步最新分支后提交推送，并只部署独立 Beta 工程；正式工程保持当前部署。

## 2026-08-25 打赏二维码预载与 Browser E2E 误报诊断

- [x] 确认页面实际使用的微信、支付宝二维码已是压缩 WebP，分别为 `420×420 / 15KB` 与 `500×500 / 24KB`；根目录旧 JPG 未被引用。
- [x] 冷缓存实测两张小图首字节仍需约 `1.3–1.6s`；改为 HTML 解析阶段预载，微信高优先、支付宝低优先，并补齐可见图片宽高、异步解码和 eager 加载。
- [x] macOS 邮件中的通知来自 GitHub `Browser E2E`，不是 Vercel 部署失败；正式站、钉钉入口和健康接口均正常。
- [x] 根因是动画首段由 `setTimeout(0)` 延后挂载，而 E2E 使用不重试的瞬时 `count()` 断言；CI 较快时会先读到 0。断言已改为自动等待式检查，并固定 `reducedMotion: no-preference`，消除时序与环境误报。
- [x] 28 个测试文件共 178 项、Beta 构建、CI 模式定向用例及 10 项完整 Playwright 回归通过；正式/Beta 构建产物的二维码预载路径均按各自 base path 生成。
- [x] 功能提交 `5236b9d` 已推送；正式部署 `dpl_Ycu2Q2R3oD7gPqvfQmgBM7JPR3gB` 已覆盖 `https://ququ.mikeywa.icu/` 与 `/ding/`，GitHub Actions `32843561879` 恢复成功。
- [x] 公网 `390×844` 验收确认打开支持作者前两张二维码已完成预载，微信/支付宝切换时图片均已解码；正式页面和健康接口正常，无控制台错误或失败请求。

## 2026-08-25 Glitch 改为按需单次播放

- [x] 钉钉左上角品牌区和玩家指南头像取消常驻循环，页面加载与日常待机均不创建 glitch 动画。
- [x] 鼠标移入时单次播放 `340ms`，点击时单次播放并在 `82ms` 峰值切换头像；顶栏点击继续同步更新 favicon。
- [x] 减少动态效果时不播放动画，但点击换头像仍可用；微信版固定品牌行为不变。
- [x] TypeScript、28 个测试文件共 178 项和正式双版本构建通过；本地正式产物静置 2.5 秒后品牌区/关于页动画实例均为 0，hover 与点击峰值均为 10 层，结束后恢复为 0。
- [x] 代码提交 `7e80052` 已推送；正式部署 `dpl_Apv7iPiN5TZ5ewnXaiXv6uzEQnin` 已覆盖 `https://ququ.mikeywa.icu/` 与 `/ding/`。
- [x] 公网验收确认两处待机动画实例均为 0，hover/点击时 10 个切片层与本体单次播放，结束后归零；点击后头像/favicon 同步切换，微信入口保持固定绿色气泡，两个入口与健康接口均为 200，无控制台错误或失败请求。

## 2026-08-25 正式钉钉玩家指南与顶栏故障品牌

- [x] 从玩家指南中移除 `02f｜早点走进会议室` 宣传配图；素材文件继续保留用于投稿封面。
- [x] 玩家指南从 Beta 提升到钉钉正式版；正式微信继续使用原通用关于页，正式钉钉不启用 Beta 全局点击音效。
- [x] 钉钉正式版与 Beta 左上角“角色头像 + 蛐蛐模拟器”改为完整点击目标，10 层切片作用于整组；点击切换到下一张角色头像，并同步更新 favicon。
- [x] 微信版继续固定绿色白气泡，顶栏不可点击且不启用 glitch。
- [x] TypeScript、28 个测试文件共 178 项、正式与 Beta 构建均通过；本地正式产物确认钉钉玩家指南无 `figure`、无音效开关，390px 手机端无横向溢出。
- [x] 代码提交 `18997b0` 已推送；正式部署 `dpl_61tDECY7U17EM3FXzubFCjb4DZsD` 已覆盖 `https://ququ.mikeywa.icu/` 与 `/ding/`。
- [x] 公网手机端确认钉钉品牌区 10 层 glitch、头像/favicon 同步切换、玩家指南无配图；微信品牌不可点击且保持绿色气泡，两个入口与健康接口均为 200，无控制台错误或失败请求。

## 2026-08-25 Beta 关于页玩家化改版

- [x] 关于页从投稿/评委介绍改为个人玩家上手指南，删除“钉钉版”标签、卖点卡、序号路径和评委话术。
- [x] 全页统一为“标题 + 正文”两级连续排版，正文最小字号 `15px`；内容依次说明如何开场、观察角色、续写加料、回退故事卡、理解重玩乐趣和掌握导演权。
- [x] 首屏只保留一个可点击角色图标；叫叫、铃铛、猪小弟轮换时，10 层切片撕裂直接作用于图标本体，不再显示姓名标签、操作提示或角色小字。
- [x] 保留 `02f｜早点走进会议室` 压缩 WebP 宣传图与 Beta 点击音效；正式微信和正式钉钉内容不变。
- [x] 本地通过 TypeScript、28 个测试文件共 177 项、Beta 与正式双版本构建；桌面和 `390×844` 手机端确认正文不小于 `15px`、无横向溢出，点击头像可切换且故障峰值 10 层可见。
- [x] 代码提交 `2ea4164` 已推送；Beta 部署 `dpl_CcSg666unKPkwm5srmPwuZGv9QV4` 已覆盖 `https://ququ-fakechat-beta.vercel.app/beta/`，正式工程未部署。
- [x] 公网手机端确认标题/正文、头像切换、10 层切片和 `1536×1024` WebP 宣传图正常；页面、宣传图、健康接口均为 200，无控制台错误、失败请求或横向溢出。

## 2026-08-25 支持作者随机感谢语与字号

- [x] 将原固定咖啡文案替换为杨总选定的 12 条夸赞/感谢文案，每次打开随机展示且不连续重复。
- [x] 简中、繁中、英文、日文保持 12 条同序号文案池；固定保留“永久免费”和需求邀请说明。
- [x] 复用项目已有 `calligraph@1.4.1`，随机句按语义词组使用 `bouncy` 弹性入场；标点和 Emoji 跟随前词，减少动态效果时静态显示。
- [x] 支持作者窗口标题、副标题、正文、支付标签和联系信息字号整体上调；桌面与 `390×844` 手机端无横向溢出，二维码和作者主页可完整滚动触达。
- [x] 新增随机池/标点分组单测，并扩展支持作者桌面与移动端 Playwright 验收。
- [x] 功能提交 `1938d58` 已推送至 `codex/production-sync`；使用隔离的干净工作树分别发布正式项目 `dpl_2gkBr1nJN5yrUzQyuLowNNAAkkS1` 与 Beta 项目 `dpl_HbMTLDxKtmLK4psAZ85XJzSYahLy`，状态均为 Ready。
- [x] 公网验收通过：正式首页、正式 `/ding/`、Beta `/beta/`、两套 `/api/health` 及实际 JS/CSS 资源均返回 `200`；三版 `390×844` 实机尺寸下随机文案可切换、Calligraph 动效生效、字号符合设计值、无横向溢出或页面错误，作者主页可触达。
- [x] 本地 `.vercel/project.json` 仍绑定正式项目 `ququ-fakechat`；并行任务的未提交文件保持原状，未纳入本次发布提交。

## 当前任务

基于现有核心功能新增 JOJO 版包装，同时保留原网红短剧版；JOJO 版用于公司内网娱乐，默认使用公司中转模型生成。

## 已完成

- 确认项目为 Vite + React 静态前端，保留 Fastify 全栈开发入口。
- 发现当前目录不是 git 仓库，无法执行部署前的 `git pull`、`git push`。
- 首次构建失败原因：`node_modules` 不完整，缺少 `.bin/tsc`。
- 重新执行 `npm install --registry=https://registry.npmjs.org/`。
- 修复 `esbuild` 二进制执行权限后，依赖安装成功。
- `npm run build` 已通过，生成独立产物 `dist/jojo` 与 `dist/viral`。
- 当前已切换为 Fastify 全栈内网预览，JOJO 版地址：`http://127.0.0.1:4173/`、`http://10.131.48.68:4173/`。
- HTTP 验证通过：首页、JS、CSS 均返回 `200 OK`。
- 已尝试用内置浏览器打开，但内置浏览器自身出现 `This page crashed`；随后已用系统默认浏览器打开预览地址。

## 注意事项

- 当前本线程预览服务占用 `0.0.0.0:4173`，托管 `dist/jojo`，由 `screen` 会话 `chat-record-drama-preview` 保持。
- 停止当前本线程预览可执行 `screen -S chat-record-drama-preview -X quit`。
- NPM 安装时出现 Node 版本提示：Vitest 声明支持 `^20 || ^22 || >=24`，当前为 Node `23.10.0`；本次构建未受影响。
- 若要远端部署，先把目录初始化或切到 git 仓库，再按项目约定执行拉取、推送、部署。

## 2026-06-12 DeepSeek 修复

- 根因 1：生产静态包中的 `__DEEPSEEK_BROWSER_CONFIG__.apiKey` 被编译成空字符串，页面启动时只能显示“纯前端静态模式”，不会请求 DeepSeek。
- 根因 2：`data/settings.json` 里已保存 DeepSeek 配置，但此前纯静态前端读不到；这份配置只属于 Fastify 后端。
- 根因 3：新增后端代理首次验证时发现接口复用了 `projectSchema`，而首段生成前 `messages=[]`，被 `min(1)` 拦截，导致还没请求 DeepSeek 就兜底。
- 已修复：前端生成链路改为优先调用 `/api/story/continue`，后端代理读取保存配置或环境变量请求 DeepSeek；后端不可用时再浏览器直连，最后才本地续写。
- 已修复：新增启动状态检查 `/api/settings/deepseek`，页面可显示“DeepSeek 后端代理已就绪（已保存）”。
- 已修复：Fastify 生产模式可托管 `dist/`，支持同域页面和 API。
- 已验证：`npm run build` 通过，`npm run test` 通过（5 个测试文件、14 个用例）。
- 已验证：当前 `http://127.0.0.1:4173/` 由全栈预览提供，`/api/settings/deepseek` 返回 `hasApiKey: true`。
- 已验证：点击“生成”后，后端日志显示 DeepSeek `/chat/completions` 返回 `200`，页面显示“DeepSeek 后端已追加 36 条消息”。
- 当前预览服务：`screen` 会话 `chat-record-drama-preview`，Node 进程 PID `64054`，端口 `4173`。

## 2026-06-12 微信顶底图替换

- 来源：Figma 文件“叫叫职场”，节点 `2:2` 下的 `微信顶栏`（`2:4`）和 `微信底部`（`1:255`）。
- 已导出：`public/wechat-ui/topbar.png`（1206x300）和 `public/wechat-ui/bottombar.png`（1206x270）。
- 已调整：`WechatStoryPreview` 改为顶部整图 + 中间叠联系人名 + 聊天区 + 底部整图。
- 已移除旧自绘导航 `.wechat-nav`，避免和 Figma 顶栏重复。
- 已验证：`npm run build` 通过，`npm run test` 通过；内置浏览器中顶栏渲染约 `388x97`，底栏渲染约 `388x87`。

## 2026-06-12 JOJO 版新增

- 已新增 `src/shared/jojoProject.ts`：四个角色为叫叫、铃铛、猪小弟、系统。
- 已设定：叫叫是玩家扮演的勇敢小鸡吉祥物；铃铛聪明冷静会来事；猪小弟憨厚踏实、正直、条件好，是叫叫小跟班。
- 已保留原网红短剧版；最新架构改为独立构建产物，不再通过顶部按钮互相切换。
- 已设定 JOJO 版默认启动，并内置一套公司早会吐槽剧情。
- 已接入 `assets/avatar-jojo` 头像到 `public/avatars/jojo`。
- 已从 Figma“叫叫职场”下载钉钉顶栏和底部到 `public/dingtalk-ui`。
- 已按最新要求替换钉钉顶栏：Figma 节点 `3:14`（钉钉顶部）下载为 `public/dingtalk-ui/topbar-node-3-14.png`，并覆盖运行时 `public/dingtalk-ui/topbar.png`。
- 已实现 JOJO 钉钉手机预览：叫叫作为玩家永远右侧蓝色气泡；铃铛/猪小弟/系统在左侧白色气泡。
- 已同步 Remotion 视频预览：JOJO 版导出视频时也使用叫叫右侧蓝泡、其他人左侧白泡。
- 已按杨总要求替换公司照片素材方向：使用真实办公室局部抓拍、手、背影、运动模糊，不出现真实正脸或卡通角色脸。
- 已生成并接入固定照片：`company-meeting-blur.png`、`company-corridor-blur.png`。
- 已将表情包改为基于 `avatar-jojo` 源头像生成的蓝色职场表情卡，避免 AI 重画角色形状。
- 已让剧情续写自动调用头像、图片、表情素材；界面不提供头像或场景选择器。

## 2026-06-12 公司中转模型配置

- 已把后端默认 OpenAI Chat Completions 兼容地址改为 `https://token.xjjj.co/v1`。
- 已把默认模型改为 `deepseek-v4-flash`。
- 专用 key 已改为从环境变量读取，不在代码中硬编码；后端使用 `DEEPSEEK_API_KEY` 或 `COMPANY_DEEPSEEK_API_KEY`，静态构建使用 `VITE_COMPANY_DEEPSEEK_API_KEY`。
- 旧 `data/settings.json` 默认不再覆盖公司中转；如需恢复旧保存配置，需要设置 `USE_SAVED_DEEPSEEK_SETTINGS=1`。
- 已验证 `/api/settings/deepseek` 返回 `source: "company"`、`baseUrl: "https://token.xjjj.co/v1"`、`model: "deepseek-v4-flash"`。

## 2026-06-12 独立构建与 JOJO 蓝色调整

- 已改为构建期固定版本：`__APP_STORY_PACKAGE__` 注入 `jojo` 或 `viral`，`App({ storyPackage })` 不再在运行时切换版本。
- 已新增构建脚本：`npm run build` 同时输出 `dist/jojo`、`dist/viral`；`preview:lan` 托管 JOJO 版，`preview:lan:viral` 可单独托管网红版。
- 已移除顶部 `JOJO版 / 网红短剧版` 切换按钮，仅保留当前版本标签；导入存档时禁止跨版本导入导致界面变包。
- 已按要求只调整 JOJO 版视觉：板块填充改为蓝色系并贴近边框色，蓝底按钮文字/图标为白色；网红版保持原绿色体系。
- 已验证 JOJO 版：浏览器中无网红版入口，`.surface-card` 为 `rgba(18, 41, 68, 0.96)`，生成按钮为蓝底白字。
- 已验证网红版：临时 4174 预览无 JOJO 入口，面板仍为 `rgba(16, 31, 23, 0.96)`。
- 当前 JOJO 内网预览：`screen` 会话 `chat-record-drama-preview`，Node 进程 PID `1243`，端口 `4173`。

## 当前验证

- `npm run test` 通过：5 个测试文件、15 个用例。
- `npm run build` 通过；产物为 `dist/jojo` 与 `dist/viral`，仅有 Vite 大 chunk 提醒，不影响功能。
- Chrome headless 已截图：`tmp/qa/jojo-topbar-right-self.png`，确认新钉钉顶栏、群名、叫叫右侧蓝泡和其他人左侧白泡。
- 当前内网预览由本线程 Fastify 启动：`http://127.0.0.1:4173/`、`http://10.131.48.68:4173/`。

## 2026-06-12 UI 文案与顶栏图标

- 已将左侧标题从“线性 Prompt”改为“编故事”。
- 已将主按钮改为“生成一段”，并把“重启故事”固定放到该按钮下面。
- 已将右侧“视频预览”改为“视频版”，顶栏“导出当前存档/导入”改为“存档/读档”。
- 已同步占位文案和状态文案，把可见的 Prompt/导入表述改为故事卡片/读档。
- 已在聊天手机右下角新增小刷新按钮，点击后通过 `startMessageReveal(0, messages.length)` 重播当前会话入场。
- 已移除网站顶栏底部分割线，并把存档/读档从分段按钮组改为普通并排按钮。
- 已新增 `public/site-icon.svg` 用作 favicon 和顶栏产品名左侧 logo；后续已更新为白底黑色单色蛐蛐。

## 2026-06-12 群名与重播按钮微调

- 已将 JOJO 默认群名从正式的“叫叫公司日常群”改为“工位蛐蛐小队”。
- 已更新 DeepSeek JOJO 提示词：群名要像同事背后蛐蛐的小群，4-10 字，轻松有梗，不要正式公司群名。
- 已允许 JOJO 续写时采用 DeepSeek 返回的合格短群名；不合格时继续沿用当前群名。
- 已纠正 DeepSeek 提示词里关于叫叫气泡方向的旧描述：叫叫为右侧蓝泡，其他人为左侧白泡。
- 已把聊天重播按钮弱化颜色和透明度；后续已移到页面最底部居中。

## 2026-06-12 浏览器批注调整

- 已移除顶栏“JOJO版”版本标签。
- 已将顶栏产品名改为“蛐蛐模拟器”。
- 已将顶栏背景改为透明，不再额外铺色，和页面背景拉通。
- 已调整 JOJO 版左侧卡片视觉；后续已改为低饱和深蓝毛玻璃和白色高光描边。
- 已移除编故事面板里的 DeepSeek 常驻状态，仅错误时展示提示。
- 已将 JOJO 版编故事输入框背景改为纯黑。
- 已将“视频版”切换改为自动播放：Player 挂载时 `autoPlay`，并通过 `playerRef.play()` 兜底触发。
- 已将右侧切换按钮“聊天界面”改为“界面版”。
- 已新增聊天自动滚屏：新气泡入场后滚动 `.wechat-chat-scroll`，确保最新消息在手机可视区域里。
- 已将右侧预览板块改为透明无边承载区，去掉整体填充背景和边框。
- 已调整“界面版 / 视频版”切换组位置；后续已放回预览内容上方居中。

## 2026-06-12 编故事浮层与响应式

- 已将桌面端“编故事”固定到页面左下角，允许覆盖预览内容；内容变多时从底部向上延展。
- 已将 400px 以下作为手机版阈值；手机版“编故事”默认展开，可收起为星星圆按钮并再次展开。
- 已给预览内容设置最大宽度：界面版沿用当前手机宽度，视频版最大宽度约为界面版 1.5 倍。

## 2026-06-12 预览与移动端收口

- 已将网站图标改为白底黑色单色蛐蛐，并继续用于 favicon 与顶栏 logo。
- 已将“界面版 / 视频版”切换按钮放回预览内容上方居中，选中态只用明暗区分。
- 已将切换动画改为淡入淡出，去掉左右滑动；视频版切入后自动播放。
- 已让右侧预览负极容器保持 100% 占位宽度，减少界面版/视频版切换时的横向偏移。
- 已给预览内容增加桌面鼠标 hover 的轻微 3D 斜切效果，触摸设备和减少动效时关闭。
- 已将 JOJO 聊天区域背景统一为 `#f1f2f3`，让钉钉界面上下更拉通。
- 已将桌面端钉钉手机壳改为接近 iPhone 的窄长比例；400px 以下手机版压缩为 16:9，避免横向溢出并给编故事留空间。
- 已将聊天重播按钮改到聊天信息流末尾，播放完成后显示弱灰色“再来一遍”，不再放在页面底部或手机外侧，避免和编故事面板重叠。
- 已将启动默认剧情改为从空信息流自动逐条播放，播放完成后才出现“再来一遍”。
- 已将编故事面板改成低饱和深蓝毛玻璃，边框只保留白色高光；输入框桌面约 5 行、手机版约 3 行。
- 已将 1080px 以下的手机/平板编故事改为底部居中半弹窗：默认展开，展开态右上角为向下箭头，收起后只保留底部居中的钢笔圆按钮，点击钢笔可重新展开。
- 已给编故事底部弹窗按钮接入 continuity transition：`setStoryPanelOpenWithContinuity` 使用 View Transition API，CSS 使用 `story-panel-toggle`，按钮会从弹窗右上角连续过渡到底部居中。
- 已设置 1080px 以下生成成功后自动收起编故事半弹窗，再开始播放/观看故事。
- 已调整“重启故事”：只清空信息流气泡和故事卡片，保留模拟手机、顶栏、底栏和输入栏框架。
- 已去掉视频操作区底部暗色渐变/深色条，操作按钮区背景保持透明。
- 已调整视频版重启后的空态：仍保留与有内容时一致的 16:9 视频画布和操作区尺寸，占位文案只显示在画布内。
- 已把“生成语音”文案改成“生成语音（开发中）”，并把视频操作区顶部横线去掉、导出按钮右对齐。
- 已验证：`npm run typecheck`、`npm run test`、`npm run build` 均通过；Vite 仅提示大 chunk，不影响功能。
- 已验证移动端指标：354px 宽视口下页面无横向滚动，钉钉预览为 `336x189` 的 16:9，编故事输入框高度为 `96px`。

## 2026-06-12 内网部署确认

- 当前目录不是 git 仓库，无法执行部署前 `git pull` / `git push`。
- 已确认 JOJO 内网服务监听 `*:4173`，由 `screen` 会话 `chat-record-drama-preview` 保持运行。
- 内网访问地址：`http://10.131.48.68:4173/`。
- 已验证 `http://127.0.0.1:4173/api/health` 与 `http://10.131.48.68:4173/api/health` 均返回 `{"ok":true}`。
- 已验证 `/api/settings/deepseek` 返回公司中转：`https://token.xjjj.co/v1`、模型 `deepseek-v4-flash`。

## 2026-06-12 窄屏交互与清空逻辑

- 已将编故事收起按钮改为双状态：展开时显示向下箭头，收起后显示钢笔图标。
- 已给编故事面板展开/收起加入 `max-height`、透明度和位移缩放过渡。
- 已将收起/展开结构扩展到 `1080px` 以下；平板和手机都使用底部居中半弹窗。
- 已取消 `400px` 以下的 16:9 手机预览；现在 400px 以下只让模拟聊天手机本体按宽度轻微等比缩小，其他结构保持和较宽移动端一致。
- 已修复“重启故事”：点击后清空模拟界面中的消息，不再恢复 JOJO 默认剧情。
- 已去掉视频操作条继承出来的深色/黑色底部带，生成语音和导出视频按钮下方保持透明。

## 2026-06-12 /ququ 静态部署准备

- 已新增公共路径解析 `src/shared/publicPath.ts`，头像、钉钉/微信 UI、表情、照片和 Remotion 图片资源会跟随 `import.meta.env.BASE_URL`，支持部署在 `/ququ/` 子路径。
- 已新增 `npm run build:ququ`，输出 `dist/ququ`，并显式启用公司中转浏览器直连配置。
- 已在外网不可达公司 token 中转时增加 Toast：`token服务连不上，请连到叫叫的 Wi-Fi`，再降级本地续写。
- 已把 `dist/ququ` 同步到同级 `📍JUDS/ququ`，并在 `📍JUDS/DEMO/index.html` 首页列表第一项加入“蛐蛐模拟器”，入口为 `/ququ/`。
- 已在 `📍JUDS/vercel.json` 增加 `/ququ` 到 `/ququ/index.html` 的 rewrite。
- 已把 1080px 以下收起态“编故事”按钮父级增大到 `136px`，按钮增大到 `62px`，底部上移，避免阴影和 continuity transition 被视口裁切。
- 已用本地静态服务核验 `/ququ/`：390/360/302px 宽均无横向滚动，钉钉手机保持 `9:19.5` 比例，仅等比缩小；DEMO 首页第一项为“蛐蛐模拟器”。
- 已模拟阻断 `token.xjjj.co`，点击“开始编”后会出现 Toast：`token服务连不上，请连到叫叫的 Wi-Fi`。
- 已按项目约定尝试部署前 `git pull` / `git push`：`📍JUDS` 当前分支没有 tracking 信息，且没有配置 push remote，因此两步均无法完成；未擅自添加 remote，避免影响既有脏工作区。
- 已执行 Vercel 生产部署：`dpl_BNruNFgoKnYT413KgHhGbDXjSCP4`，并显式 alias 到 `https://jojodemos.mikeywa.icu`。
- 已验证公网 `https://jojodemos.mikeywa.icu/ququ/` 返回 `200`，HTML 引用 `/ququ/static/index-EQnrbLJK.js` 与 `/ququ/static/index-C2jw5fkf.css`。
- 已验证公网 JS、CSS、`/ququ/site-icon.svg` 均返回 `200`；`https://jojodemos.mikeywa.icu/DEMO/` 首页列表第一项包含“蛐蛐模拟器”，入口为 `/ququ/`。

## 2026-06-15 GitHub 公开仓库准备

- 项目名统一为“聊天记录短剧模拟器”，`package.json` 包名改为 `chat-record-drama-simulator`。
- 已从 `server/settings.ts` 与 `vite.config.ts` 移除真实 token，改为通过 `.env` 或 CI 环境变量注入。
- 已更新 `.env.example`，新增 `COMPANY_DEEPSEEK_API_KEY`、`VITE_COMPANY_DEEPSEEK_API_KEY` 等配置占位。
- 已加强 `.gitignore`，排除 `.env`、临时目录、渲染视频、录屏、同步冲突文件和系统文件，避免公开仓库误提交敏感或大体积文件。
- GitHub 不保留中文仓库 slug，首次创建被规范成 `-`；随后已重命名为公开仓库 `yanghaoleng/FakeChat`，README 中文项目名仍为“聊天记录短剧模拟器”。
- 已推送 `main` 到 `https://github.com/yanghaoleng/FakeChat`。
- 标题菜单已新增 `Github` 公开仓库入口，默认指向 `https://github.com/yanghaoleng/FakeChat`，也可通过 `VITE_GITHUB_REPO_URL` 覆盖。
- 桌面端“编故事”面板已改为固定像素垂直偏移 `--desktop-story-panel-top-offset: 190px`，不再依赖百分比/视口高度居中；移动端底部半弹窗结构不变。
- 桌面端视频版右侧预览面板已使用 `--desktop-preview-window-top-offset`，在 `--desktop-story-panel-top-offset: 190px` 上补 `12px` 视觉内边距，视频窗口顶部和可见“编故事”卡片保持同高。
- README 已补充微信版截图：`docs/screenshots/fakechat-wechat.png`。

## 2026-08-20 智谱 / 豆包模型切换

- 已在实验室增加 AI 模型选择：默认智谱 `glm-4.7-flash`（免费），可切换豆包 `doubao-seed-2-0-mini-260215`，并用 `localStorage` 记住选择。
- 已确认智谱旧 `GLM-4.5-Flash` 于 2026-01-30 下线并自动迁移到 `GLM-4.7-Flash`，项目使用当前官方模型 ID。
- 已打通服务端与浏览器降级链路：请求携带 `modelProviderId`；服务端分别读取 `ZHIPU_API_KEY`、`DOUBAO_API_KEY`（兼容 `ARK_API_KEY`），实验室自定义模型继续保留。
- 已补充 `.env.example`、模型元数据与单元/端到端测试；密钥只写本地 `.env` 或部署平台服务端环境变量，不进入源码和 Git。
- 已验证 `npm run typecheck`、`npm test`（25 个文件、162 项）、`npm run build:ququ` 与 `npm run test:e2e`（9 项）全部通过；Playwright 首次缺少 Chromium，安装后完整通过。
- 平台进度：智谱与火山方舟“蛐蛐模拟器”Key 均已写入本地 `.env`。火山最小真实请求返回 HTTP 200，响应模型为 `doubao-seed-2-0-mini-260215`；智谱连续两次请求均通过鉴权抵达服务端，但免费 `glm-4.7-flash` 返回 HTTP 429 / 错误码 1305“当前访问量过大”，需在低峰时复测。
- 已部署独立线上 Beta；正式站保持原部署。Beta 工程已配置智谱、豆包和 DeepSeek 三项服务端敏感变量。
- 按最新产品要求，模型选择已从设置主菜单移入实验室；选项为智谱 GLM-4.7-Flash、豆包 Seed-2.0-mini、DeepSeek V4 Flash、自定义模型，只有选到自定义模型才显示配置输入框。
- DeepSeek V4 Flash 已作为 `modelProviderId: "v4flash"` 恢复，继续复用 `DEEPSEEK_*`（兼容 `COMPANY_DEEPSEEK_API_KEY`）配置。
- 智谱与火山方舟两枚 API Key 均命名为“蛐蛐模拟器”，方便分别查看用量；火山已完整连通，智谱密钥有效但免费模型当前拥堵。
- 两家控制台在 Codex 应用内浏览器中对控件读取、截图和页面刷新持续超时，桌面级控制也因应用安全限制不可用；两枚 Key 最终均由用户手动创建/复制后完成本地安全配置。
- 最新验证：类型检查、25 个单元测试文件（162 项）、微信/钉钉组合构建和 9 项 Playwright 回归全部通过，包含自定义表单按需展开与 390px 移动端无横向溢出。

## 2026-08-20 本地全栈预览

- 已重新执行 `npm run build:jojo`，类型检查和生产构建通过；仅保留既有的大包体积提示。
- 全栈预览运行于 `0.0.0.0:4173`，本机地址 `http://127.0.0.1:4173/`，局域网地址 `http://10.131.59.53:4173/`；Node PID `98179`，当前任务运行会话 `83812`。
- `/`、`/api/health`、`/api/project/sample` 与站点图标均返回 200；服务端在两枚本地 `.env` 密钥写入后启动。
- 已在真实本地页面打开“设置 → 实验室”，确认默认智谱，豆包、DeepSeek V4 Flash、自定义模型均可见，自定义输入框默认不渲染。
- 390×844 手机宽度实测 `innerWidth`、页面 `scrollWidth` 与 `body.scrollWidth` 均为 390，无横向溢出；浏览器已恢复默认尺寸并停留在实验室页面供验收。

## 2026-08-20 线上 Beta 与模型下拉优化

- 按 taste 规范将原生模型下拉改为自定义可访问列表框；展开 `180ms`、收起 `160ms`，支持方向键、Home、End、Escape、外部点击和减少动态效果。
- 显示名称固定为“智谱 GLM-4.7-Flash”“豆包 Seed-2.0-mini”“DeepSeek V4 Flash”“自定义模型”，去掉智谱和 V4 后缀括号。
- 本地桌面与 390×844 手机端已确认四项完整可见、菜单不裁切；定向 Playwright 用例验证收起阶段类名与卸载时序。
- 独立 Vercel 工程 `ququ-fakechat-beta` 已发布到 `https://ququ-fakechat-beta.vercel.app/beta/`，部署 ID `dpl_GEbDv89ea4fGjk6BMMw4bfDFYiEE`；正式域名仍指向原部署 `dpl_AeYu1GMD3FRrBXZTReTreKUWWi8j`。
- Beta 页面、静态资源与 `/api/health` 均返回 HTTP 200；线上豆包真实续写返回 HTTP 200、32 条新消息。智谱密钥有效，但免费模型仍返回 HTTP 429 / 错误码 1305“当前访问量过大”。

## 2026-08-24 智谱连通性复测

- 本地使用现有 `ZHIPU_API_KEY` 直连 `glm-4.7-flash`，智谱返回 HTTP 429 / 错误码 1305“该模型当前访问量过大，请您稍后再试”；请求已通过鉴权，不是 Key 无效或模型名错误。
- 线上 Beta `/api/health` 返回 HTTP 200；通过 `/api/story/continue` 选择 `modelProviderId: "zhipu"` 后返回 HTTP 502，内部错误仍是同一条智谱 429/1305，确认页面、Beta 函数与环境变量链路正常，故障点在智谱免费模型容量。
- 未修改代码或模型配置，也未自动切换到会计费的豆包。

## 2026-08-24 Beta 顶部菜单、滚动百分比与三模型复测

- 仅 Beta 版启用 macOS 风格顶部菜单栏；文件、显示、角色、语言、实验室和帮助可直接展开，选中项显示勾选，桌面右侧显示当前模型。正式版保留原设置弹窗。
- 生成与视频导出的百分比数字改为上下滚动切换，数值增加向上、减少向下，并兼容减少动态效果设置。
- 新增 `RollingPercent` 与 `BetaMenuBar`，本地桌面和 390×844 窄屏均无横向溢出；菜单展开、模型勾选、默认智谱和豆包切换已验证。
- 线上豆包真实续写返回 HTTP 200，新增 10 条消息；Safari/Vercel 路由不是豆包故障点。智谱仍为上游 HTTP 429 / 1305 免费模型繁忙。
- 用户提供的 DeepSeek Key 与当前部署 Key 尾号一致，线上真实请求返回 HTTP 401 `invalid`；没有再次写入或重复发布，需换一枚有效 Key。
- Beta 已重新发布到 `https://ququ-fakechat-beta.vercel.app/beta/`，部署 ID `dpl_6xm5PWgExnWC2snhoKRuL4eFYsCh`；页面和 `/api/health` 均为 HTTP 200，正式站未部署。
- 已通过 `npm run typecheck`、`npm test`（25 个文件、162 项）和 `npm run build:beta`；Vite 仅保留既有大包体积提醒。

## 2026-08-24 默认豆包与 DeepSeek 新 Key

- 默认模型已从智谱改为豆包 Seed-2.0-mini；模型选择存储升级为 `ququ-ai-provider-v2`，旧版默认智谱会迁移到豆包，用户主动选择的豆包或 DeepSeek 会保留。
- 新 DeepSeek Key 已通过官方 `/models` 与 `deepseek-v4-flash` 最小请求鉴权，并替换到 Beta 的 Vercel Production 敏感环境变量；明文未进入代码、Git 或前端产物。
- 线上 Beta 不传 `modelProviderId` 时已确认默认走豆包并生成 10 条消息；选择 `v4flash` 时 DeepSeek V4 Flash 也成功生成 10 条消息。
- 同一上下文、严格生成 10 条消息的成本样本：豆包 2498 输入 / 1014 输出 token；DeepSeek 2426 输入 / 951 输出 token，其中 1408 输入命中缓存。费用计算以 2026-08-24 官方价格和当日人民币汇率中间价为准。
- Beta 部署 ID：`dpl_8DkySRE4e2bQv2bQ3vsm3cQGS2wJ`，正式站未部署；完成后已恢复本地 Vercel 正式项目绑定与正式构建配置。
- 验证通过：`npm run typecheck`、`npm test`（25 个文件、163 项）、`npm run build:beta`、定向 Playwright 默认豆包用例及两条线上真实模型请求。

## 2026-08-25 Beta 连接容错与菜单收拢

- 复现“公司来了个关系户。”真实请求：豆包上游返回 HTTP 200，但长 JSON 在数组元素间漏逗号，旧代码因此向浏览器返回 502；并非 API Key、Safari 或 Vercel 连通性故障。
- AI 返回新增 `jsonrepair` 容错和受 54 秒总预算约束的严格返工；同一真实请求已自动修复第 433 行格式错误，成功归一化为 39 条消息。
- 错误 Toast 改为静置常驻；鼠标移动或点击后按最后一次交互延迟 2 秒消失。浏览器回归确认静置 2.6 秒仍在、交互后 1.6 秒仍在、2 秒后消失。
- 百分比数字改用 Calligraph `variant="number"` 逐位纵向滚动；旧手写整段滑动关键帧已删除。
- Beta 顶部“实验室”更名为“模型”，语言选项并入“显示”；“模型”不再打开旧弹窗，只显示三种预置模型、Fish 朗读和单一“自定义 Fish Audio API”输入/测试。
- 390×844 实测模型菜单完整位于视口内且页面无横向滚动；`⌘K` 直接打开顶部模型菜单，不生成实验室弹窗。正式版交互未改。
- 首次公网验收仍遇到一次 54 秒上游超时；已将 JOJO 首段从 48-68 条收紧到 24-36 条，并设置 `max_tokens: 5200`，同时降低单次费用、坏 JSON 概率和 Vercel 超时概率。
- 第二次公网 UI 验收已成功，但日志发现 JOJO 首轮 15 条消息因“真的吗”等网红版禁用词误触发二次返工；已将普通话术低质判定限定在网红版，JOJO 仅在图片文案确实无效时自动返工，避免正常请求重复计费。

## 2026-08-25 随机圆形品牌头像

- 将杨总选中的 6 个叫叫、铃铛、猪小弟夸张表情方案处理为 `512×512` 透明圆形 PNG，保存到 `public/brand-icons/`。
- 新增 `randomBrandIcon.ts`：每次页面加载随机选择一个头像；正式版顶栏和 favicon 共用同一结果，不在同一次渲染中重复随机。
- 正式版产品名左侧显示 `30px` 圆形头像；Beta 遵循 Mac 菜单纯文字约束，不显示品牌或功能图标，移动端隐藏产品名以保证宽度。
- 连续刷新验收确认六个头像均进入随机池；正式版标题头像与 favicon 路径一致，Beta 使用随机 favicon。6 张素材均为 `512×512`、透明角 `alpha=0`、中心 `alpha=255`。
- 验证通过：`npm run typecheck`、`npm test`（26 个文件、168 项）、`npm run build:ququ`、`npm run build:beta`。随机 favicon 与纯文字菜单已随 `955800a` 发布至 Beta；正式版仅完成构建，未发布。

## 2026-08-25 Fish 朗读与 Beta 菜单收口

- 线上运行日志确认豆包请求成功；Fish 朗读连续请求 `/api/fish-tts` 时均返回 500，原因是 Beta 未配置服务端 `FISH_AUDIO_API_KEY`，页面自定义 Key 为空，并非 Safari 自动播放限制。
- Beta 顶部菜单及下拉项移除装饰图标，只保留传统菜单文字、选中勾与加载状态；随机品牌头像继续用于 favicon，不在 Beta 菜单栏展示。
- Beta 部署 `dpl_8jnpnJJrwhTLacwf8fjdNaFvV1VK` 已就绪；公网 `/beta/`、`/api/health` 均为 200，桌面与 390×844 验收无控制台错误、无失败资源、无横向溢出。

## 2026-08-25 Fish Key、模型精简与品牌图标修正

- `FISH_AUDIO_API_KEY` 已作为 Vercel Production 敏感变量配置到独立 Beta 工程，明文不进入源码、Git、文档或长期记忆；部署后真实合成返回 `200 audio/mpeg`、21,732 字节音频。
- 模型菜单移除智谱，豆包继续作为默认值并显示“豆包 Seed-2.0-mini（速度快）”；浏览器中残留的智谱选择会自动迁移到豆包，后端仅保留旧请求兼容。
- Beta 网站标题左侧恢复随机品牌头像，功能菜单项继续保持纯文字；favicon 与标题头像共用同一选择，并加入单次刷新参数缓解 Safari favicon 缓存。
- Beta 部署 `dpl_Bz37rNyqENE5sD22X2pjrwgra8rt` 已就绪；公网确认智谱入口消失、豆包默认勾选、标题头像与 favicon 同图，页面与健康接口均为 200。

## 2026-08-25 Beta 顶部菜单扁平化与全版本发布

- Beta 顶部 macOS 菜单横栏移除独立描边、底色、圆角、背景模糊和投影，直接贴合页面背景；下拉菜单继续保留承载面与轻投影，结构、勾选和展开交互不变。
- 本机与公网均检查计算样式：顶栏 `border-width: 0`、透明背景、`border-radius: 0`、`box-shadow: none`、`backdrop-filter: none`；390px 窄屏页面宽度保持 390px，模型菜单可正常展开。
- Beta 部署 `dpl_3AaryzzVgJPiHomgoh2tKcovP9Bd` 已发布至 `https://ququ-fakechat-beta.vercel.app/beta/`；正式部署 `dpl_B7UA4Hh68g5AAT4yJ6Q87aNDYQXV` 同时覆盖微信版 `https://ququ.mikeywa.icu/` 与钉钉版 `https://ququ.mikeywa.icu/ding/`。
- 三个页面与两套 `/api/health` 均返回 HTTP 200；浏览器无控制台错误、无失败资源、无错误覆盖层，两份 Vercel 部署近 30 分钟错误日志为空。
- 验证通过：`npm run typecheck`、`npm test -- --run`（26 个文件、169 项）、`npm run build:beta`、`npm run build:ququ`。

## 2026-08-25 全版本统一顶部菜单

- Beta 顶部菜单能力已启用到正式微信和正式钉钉：文件、显示、角色、模型、帮助、语言、预览、背景、模型与 Fish 设置均走同一套菜单；`⌘K` 统一打开模型菜单。
- 正式微信原有“多会话（测试版）”开关迁移到顶部“显示”菜单，默认关闭、选中显示勾，生成中禁用；没有因移除旧设置弹窗而丢失入口。
- 三个版本均彻底移除右上角当前模型文字及 `.beta-menu-current-model` 样式，模型选中态只在“模型”菜单内显示。
- 正式 Production 已补齐豆包并更新 DeepSeek 服务端敏感配置，Fish 沿用正式工程既有敏感配置；密钥未进入源码、Git、日志或文档。
- Beta 部署 `dpl_7L6a8Vth5yxExPMDiUbAVBEbNQpP` 已发布至 `https://ququ-fakechat-beta.vercel.app/beta/`；正式部署 `dpl_2tWsshm1GkcLpvJ3A73RWTX8uDfs` 同时覆盖 `https://ququ.mikeywa.icu/` 与 `https://ququ.mikeywa.icu/ding/`。
- 公网确认三版菜单均出现、右上角无模型文字、模型菜单可展开、微信多会话入口存在，390px 无横向溢出；页面、健康接口均为 HTTP 200，浏览器与 Vercel 错误日志为空。
- 正式豆包最小真实续写返回 HTTP 200、10 条消息；正式 Fish Audio 返回 HTTP 200、`audio/mpeg`、16,717 字节。
- 验证通过：本机 26 个文件、170 项测试；干净提交的 Vercel 正式构建 26 个文件、169 项测试，并完成 Beta 与正式组合构建。

## 2026-08-25 微信与钉钉品牌图标拆分

- 微信版不再使用 JOJO 角色头像，改为固定的绿色圆底、白色聊天气泡图标；钉钉正式版与 Beta 继续每次刷新随机使用 6 个叫叫、铃铛、猪小弟头像。
- 新微信图标由内置图像生成能力制作并清理伪透明棋盘边缘，最终圆外为真实透明；页面标题、favicon 与 Apple Touch Icon 使用同一 WebP。
- 原 6 张角色 PNG 已转换为 `512×512` 有透明通道的压缩 WebP，单张约 `22–28KB`；微信气泡 WebP 约 `14KB`。旧 PNG 已从项目素材目录移除，原始生成图仍可从 Codex 生成目录恢复。
- `brandIconUrlForStoryPackage` 按版本分流：`viral` 固定绿色气泡，`jojo` 才进入随机池；Safari favicon 单次刷新参数保留。
- 390×844 浏览器连续刷新验收：微信版始终使用固定气泡；钉钉正式版与 Beta 均正常轮换角色；三版页面头像、favicon 和 Apple Touch Icon 路径一致，页面无横向溢出。
- 验证通过：`npm test`（26 个文件、170 项）、`npm run build:ququ`、`npm run build:beta`；三份构建中均不再包含品牌 PNG。
- 正式部署 `dpl_8hYoBuFQipZAzfqQShoirP9ion9M` 已覆盖微信版 `https://ququ.mikeywa.icu/` 与钉钉版 `https://ququ.mikeywa.icu/ding/`；独立 Beta 部署 `dpl_EhXAekU5TVBSRUVkzcbaKac519wT` 已发布至 `https://ququ-fakechat-beta.vercel.app/beta/`。
- 公网 390×844 多次刷新确认三版页面与 favicon 行为正确、无横向溢出；两套 `/api/health` 均返回 HTTP 200，微信气泡素材返回 `image/webp`、14,570 字节。
- 发布前后均同步并核对 `origin/codex/production-sync`；本次实现基于最新 `6e4995d`，未覆盖同期顶部菜单变更。Beta 发布后已恢复本地正式 Vercel 项目绑定与正式构建配置。

## 2026-08-25 移动端顶部菜单适配

- 修复 `520px` 以下强制隐藏网站标题的旧规则；品牌标题现使用真正的 `h1`，微信固定绿色气泡、钉钉/Beta 随机 JOJO 头像及 favicon 同图逻辑完整保留。
- `760px` 及以下只在右上角显示菜单/关闭按钮，文件、显示、角色、模型、帮助纵向排列；子菜单在所属项下展开，长菜单限制在屏幕内独立滚动。
- 菜单按钮为 `40×40px`，一级菜单触控高度至少 `44px`；整体展开仅使用透明度和上移，不缩放触控区，并支持 Escape、外部点击、键盘焦点和减少动态效果。
- 自动化浏览器回归已从旧设置/实验室弹窗迁移到当前顶部菜单，新增 320/390px 品牌标题、Icon/Favicon 一致性、纵向几何、长菜单滚动与无横向溢出检查。
- 本地验证：`npm run typecheck`、`npm test`（26 个文件、170 项）、`npm run build:beta`、`npm run build:ququ` 与 Playwright 9 项完整回归全部通过。
- 正式部署 `dpl_3EoLMofpK3mCmyxNwx1Lp7RsCqSS` 已覆盖微信版 `https://ququ.mikeywa.icu/` 与钉钉版 `https://ququ.mikeywa.icu/ding/`；独立 Beta 部署 `dpl_HKDzgWUd8HSSrK4enYfz4eFgQNPS` 已发布至 `https://ququ-fakechat-beta.vercel.app/beta/`。
- 公网以 320/390px 验收三版：网站标题与 Icon 均可见，Icon/Favicon 路径一致，一级菜单纵向对齐且均为 `44px`，520px 高度下长菜单可滚动；页面无横向溢出、控制台错误、失败资源，页面和两套 `/api/health` 均为 HTTP 200，部署错误日志为空。

## 2026-08-25 豆包生成时间估算

- 生成百分比继续以原 DeepSeek 预计耗时为基准；选择豆包时，首轮、续写和历史消息增量组成的完整预计耗时统一乘以 `0.64`。
- DeepSeek V4 Flash 与旧模型兼容路径保持原估算，不改变真实请求、超时、消息播放或完成阶段动画。
- 新增纯函数回归，覆盖微信/钉钉首轮、带历史消息续写、豆包 `64%` 与非豆包不缩短；本机 27 个文件、173 项测试，9 项 Playwright 主流程与三份构建全部通过。
- 正式部署 `dpl_9kcPpcAhME8qbts6iUyaFMHYn836` 已覆盖 `https://ququ.mikeywa.icu/` 与 `/ding/`；独立 Beta 部署 `dpl_2FEzw8iKdQY6Vep3VtQy6w4nPNAd` 已覆盖 `https://ququ-fakechat-beta.vercel.app/beta/`。
- 公网三份主脚本均确认包含豆包 `0.64` 系数与 DeepSeek 原基准；三个页面、两套健康接口均为 HTTP 200，真实浏览器无控制台错误和失败资源，两份部署错误日志为空。

## 2026-08-25 钉钉版黑客松投稿封面

- 基于线上钉钉版页面和现有叫叫、铃铛、猪小弟品牌头像，生成 3 张独立 `1536×1024`（`3:2`）封面：财务报销梗、简单需求/离职申请梗、先演一遍/自愿加班梗。
- 每张均保留 PNG 原图和质量 `86` 的压缩 WebP；WebP 分别约 `120KB`、`145KB`、`95KB`，位于 `design/hackathon-covers/`。
- 已按 `360×240` 手机缩略图实际检查：三张主标题、产品名和关键对话均可辨认；推荐 `01` 作为稳妥主封面、`02` 作为更抓大众评委注意力的备选。
- 本任务只新增投稿素材与文档，没有修改应用代码或触发部署。
- 根据反馈继续扩展第二版：移除离职相关内容，将“钉钉版”改为无前置圆点的小标签，并让叫叫进入主视觉和对话头像；新增 `02a–02f` 共 6 张 `1536×1024` 封面。
- 六张内容分别为周报、短会、最终版文件、五分钟前、已读 `99+`、早点走进会议室；PNG 与质量 `86` WebP 均已保存，WebP 约 `125–160KB`。
- 已逐张缩放到 `360×240` 检查，标题、标签与关键对话均可辨认；当前推荐顺序为 `02d`、`02e`、`02c`。未修改应用代码、未提交、未部署。

## 2026-08-25 Beta 黑客松关于页与点击音效

- 测试版钉钉“帮助 → 关于本站”已升级为完整投稿介绍：一句话开场、AI 多角色调度、故事卡续写/回滚、钉钉沉浸感、大众评委记忆点和三步最短体验路径均已落页；正式微信与正式钉钉继续显示原通用内容。
- 关于页新增叫叫、铃铛、猪小弟头像与中英文姓名点击轮换；切换动效按 `animate-text` 结构实现 10 层整块徽章切片、快攻慢衰减和负向回摆，Web Animations API 在页面隐藏、离屏或减少动态效果时停止。
- 接入 `uisfx@0.4.0` cinematic pack：测试版按钮、链接、菜单、故事卡和关闭背景按语义发声，音量 `0.38`，不启用 hover 音；“显示 → 界面音效”和关于页右上角可开关，偏好保存为 `ququ:beta-ui-sfx`。
- `02f｜早点走进会议室` 由 1.5MB PNG 重新压为 `1536×1024`、质量 82 的 WebP，运行时文件约 126KB，路径为 `public/hackathon/ququ-dingtalk-cover-02f.webp`。
- 本地验证通过：27 个测试文件、173 项；`npm run build:beta` 与 `npm run build:ququ`；390×844 页面宽度与 body scrollWidth 同为 390，宣传图自然尺寸 `1536×1024`；故障峰值实测 10 层同时可见且无 filter 色偏；正式钉钉未出现黑客松内容、音效菜单，也未加载 `betaUiSfx` chunk。
- 首次发布 `dpl_2v6A7K13TALyBPxeUs7m1Yc1mwcE` 被根 `vercel.json` 的正式构建命令覆盖，虽然 Ready 但 `/beta/` 为 404；未将其视为成功。临时切换到 `vercel.beta.json` 等价配置后重新发布，正式工程未部署。
- 有效 Beta 部署为 `dpl_3vefEVMkLwAVMffFkgRQBAdYeoWV`，别名 `https://ququ-fakechat-beta.vercel.app/beta/`；页面、宣传图与 `/api/health` 均为 200，宣传图返回 `image/webp`、129,246 字节。
- 公网 390×844 浏览器验收：关于页主张可见、叫叫可切到铃铛、10 层故障切片和徽章位移生效、点击产生音频节点、静音开关可持久化；页面无横向溢出、控制台错误或失败请求，部署近一小时无 error 日志。
- 发布后已恢复本地正式 Vercel 工程绑定 `ququ-fakechat` 与根正式 `vercel.json`，工作区未残留临时发布配置。
