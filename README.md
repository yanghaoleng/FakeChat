# 蛐蛐模拟器

一个用 React 构建的聊天记录短剧创作工具：选择预制剧情或输入下一段故事，让 AI 继续生成私聊、群聊和角色之间的对话，再预览语音、视频并导出可继续编辑的存档。微信版还提供默认关闭的多会话测试功能，可在设置中按需开启。

项目包含两套共用数据、生成和渲染能力的界面：

- **微信版**：短剧创作主版本，支持私聊、群聊、群头像和发言人姓名；在设置中开启“多会话（测试版）”后，可让多个私聊与群聊并行推进并显示未读消息。
- **钉钉版**：JOJO 公司群聊包装，保留独立的角色、素材和界面风格。

在线入口：

- 微信版：<https://ququ.mikeywa.icu/>
- 钉钉版：<https://ququ.mikeywa.icu/ding/>
- 线上 Beta：<https://ququ-fakechat-beta.vercel.app/beta/>

公开仓库：[yanghaoleng/FakeChat](https://github.com/yanghaoleng/FakeChat)

钉钉版黑客松投稿封面位于 `design/hackathon-covers/`：除首轮 3 个 `1536×1024` 方向外，另有基于高冲击蓝黄方案扩展的 `02a–02f` 六张安全职场梗封面；每张同时保留 PNG 原图和压缩 WebP。

## 微信版截图

西游记六人群聊预制本“取经项目总群”：

![微信西游群聊：取经项目总群](docs/screenshots/fakechat-wechat.webp)

## 主要功能

- 使用预制本快速开场，或输入 Prompt 让所选 AI 模型按现有角色关系继续剧情。
- 模型设置可选择豆包 Seed-2.0-mini（速度快）、DeepSeek V4 Flash 或自定义模型；默认使用豆包并记住本机选择，旧版智谱选择会迁移到豆包，只有选择自定义模型时才显示接口输入框。豆包生成进度的预计时间按 DeepSeek 原基准的 `64%` 计算。
- 微信版设置菜单提供“多会话（测试版）”开关，默认关闭；开启后，AI 才会按剧情新增角色和会话，让几条故事线并行推进。
- 多会话开启时，桌面端在微信窗口右侧显示会话头像轨与未读数量；移动端通过返回按钮和消息列表切换会话。
- 群聊使用组合头像并显示群成员姓名；每条消息通过 `sessionId` 和 `senderId` 归属到真实会话与角色。
- 内置 16 个微信预制本，包括六人西游群聊、九人 GTA 群聊、经典名著、影视和互联网人物剧情。
- 每次生成都会形成一张故事卡；删除、重新编辑或回到任意故事卡时，会同时恢复当时的角色和会话拓扑。
- 支持 `text`、`image`、`meme`、`music`、`transfer`、`system` 消息。
- 支持 Edge TTS 语音、Remotion 视频预览和浏览器端视频导出。
- 存档导出为带封面的 PNG，聊天项目 JSON 内嵌在图片中；也可以读取旧版 PNG 或 JSON 存档继续创作。
- 微信版固定使用绿色圆底、白色气泡品牌图标；钉钉正式版与 Beta 共用 6 个 JOJO 圆形头像并在每次刷新时随机选择。三版的 favicon 与页面产品名左侧均保持同图，品牌素材统一为压缩 WebP。

## 快速启动

安装依赖并复制本地配置：

```bash
npm install --registry=https://registry.npmjs.org/
cp .env.example .env
```

启动微信版前端：

```bash
STORY_PACKAGE=viral npm run dev
```

打开 <http://127.0.0.1:5173/>。预制本的第一段使用本地缓存，不需要模型；继续编写新剧情需要配置至少一个 AI 模型。

同时启动前端与 Fastify API：

```bash
STORY_PACKAGE=viral npm run dev:fullstack
```

`npm run dev` 和 `npm run dev:fullstack` 不带 `STORY_PACKAGE` 时默认启动钉钉/JOJO 版。

## 构建与本地预览

分别构建两套独立产物：

```bash
npm run build
```

输出目录：

- `dist/viral`：微信版
- `dist/jojo`：钉钉版

生成与线上路由一致的组合包：

```bash
npm run build:ququ
```

组合包输出到 `dist/ququ`：微信版位于 `/`，钉钉版位于 `/ding/`。本地预览这套组合包可运行：

```bash
npm run preview:e2e
```

地址为 <http://127.0.0.1:4193/> 和 <http://127.0.0.1:4193/ding/>。

也可以单独启动带后端 API 的生产预览：

```bash
npm run preview:viral  # http://127.0.0.1:4174/
npm run preview:jojo   # http://127.0.0.1:4173/
```

## AI 模型配置

推荐把私有密钥放在服务端：

```dotenv
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL=glm-4.7-flash

DOUBAO_API_KEY=
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-seed-2-0-mini-260215
```

豆包使用火山方舟模型 ID `doubao-seed-2-0-mini-260215`。本地全栈模式通过 `/api/story/continue` 代理请求，部署环境同样从服务端环境变量读取密钥；火山方舟还兼容 `ARK_API_KEY` 别名。智谱后端配置仅为旧存档兼容保留，不再出现在模型选择中。

模型失败时会原样提示服务商错误，不会静默切换到另一家模型产生额外费用。

纯静态部署也可以配置对应的 `VITE_ZHIPU_*` 或 `VITE_DOUBAO_*` 变量让浏览器直连，但所有 `VITE_*` 值都会写进前端 bundle，只适合明确允许公开的临时凭据；生产密钥必须留在服务端。

旧存档中的自定义 OpenAI 兼容模型配置仍保留兼容读取，但统一顶部菜单不再提供自定义 AI 模型入口；“模型”菜单只提供豆包、DeepSeek、Fish 朗读和单一 Fish Audio API 输入/测试。DeepSeek V4 Flash 继续读取既有 `DEEPSEEK_*` 环境变量。

`npm run build:beta` 生成以 `/beta/` 为基路径的钉钉版产物。独立 Vercel 工程 `ququ-fakechat-beta` 只在服务端保存模型与 Fish Audio 的敏感密钥，不会把密钥写进浏览器产物，也不会覆盖正式站。

钉钉正式版与 Beta 的“帮助 → 关于本站”是面向个人玩家的上手指南：按“输入具体场景、观察角色接戏、续写加料、故事卡回退、理解重玩乐趣、保留导演权”的顺序，只以标题和正文两级连续排版，不嵌入宣传配图。首屏角色图标与左上角“图标 + 产品名”品牌区均使用 10 层完整副本切片撕裂；两处点击都可轮换角色头像，顶栏切换时 favicon 同步更新，减少动态效果时自动回退为静态。只有 Beta 按需加载 `uisfx` 的 `cinematic` 音色，并可通过“显示 → 界面音效”或关于页右上角关闭；正式微信继续显示通用关于页和固定绿色气泡，正式钉钉不启用全局音效。

Beta、正式微信和正式钉钉统一使用贴合页面的 macOS 风格顶部菜单栏，横栏本身不使用独立描边、底色、圆角、模糊或投影：文件、显示、角色、模型和帮助中的常用选项可直接展开选择，当前项显示勾选；语言选择并入“显示”，“模型”内直接选择豆包或 DeepSeek，并提供 Fish 朗读和单一“自定义 Fish Audio API”输入/测试，不再打开实验室弹窗。`760px` 及以下保留左侧品牌 Icon 和网站标题，五组菜单折叠到右上角菜单按钮，点开后纵向排列并允许长菜单独立滚动。所有版本均不在右上角重复显示当前模型文字。生成与导出的百分比使用 Calligraph 逐位上下滚动。

“帮助 → 支持作者”保留永久免费与需求邀请说明，中间从 12 条夸赞、感谢和轻松祝福中随机展示一句，连续打开不重复；简中、繁中、英文和日文使用同一序号池。随机句使用 Calligraph 弹性词组入场，中文标点和 Emoji 跟随前词，减少动态效果时直接静态显示；标题、说明、支付方式和联系信息字号整体上调，窄屏仍可在窗口内部完整滚动。

模型不可用时会保留现有项目并显示明确错误，不会用固定套路伪造一次成功续写。模型返回轻微损坏或截断的 JSON 时会先修复再归一化；Beta 错误 Toast 在用户没有操作时持续显示，鼠标移动或点击停止两秒后消失。Edge TTS 在浏览器端连接微软语音服务，网络策略拦截 WebSocket 时会在界面和控制台中报错。

为控制豆包成本和 Vercel 函数时延，JOJO Beta 首段限制为 24-36 条消息、最多 5,200 输出 token；后续段为 20-32 条、最多 4,800 输出 token。网红正式版的首段节奏不随 Beta 调整。

## 多会话与数据格式

多会话目前是微信版的测试功能，默认关闭。需要使用时，打开顶部“显示”菜单，启用“多会话（测试版）”；之后提交的新 Prompt 才会允许 AI 新建其他私聊或群聊。关闭开关只隐藏多会话入口并阻止后续新增会话，不会删除存档中已有的角色、消息和会话数据；再次开启即可继续切换。

项目在读取边界统一迁移为 Schema v2：

- `schemaVersion: 2`：当前项目版本。
- `selfCharacterId`：用户扮演的角色。
- `chatSessions[].kind`：`direct` 或 `group`。
- `chatSessions[].participantIds`：会话成员。
- `messages[].sessionId`：消息所属会话。
- `messages[].senderId`：消息发送者；`roleId` 仅保留为旧格式兼容字段。

`src/shared/schema.ts` 的 `parseProject()` 会把 v1、无版本以及旧 `chatMode` 项目线性迁移为规范 v2 数据。一个项目因此可以同时保留多条私聊和群聊，而不必把整个剧情强制转换成单一聊天模式。

## AI 续写机制

所选 AI 模型只返回本轮 `GeneratedStoryDelta`，包含新增消息、必要的角色/会话拓扑变化和新增素材，不再重复传回完整项目。

发送给模型的历史也有明确上限：

- 最近 8 张故事卡摘要。
- 每个会话最多 12 条消息。
- 全项目最多 40 条消息。
- 最终用户上下文最多 24,000 字符。

多会话关闭时，模型只推进当前聊天，不会创建新的会话拓扑；开启后，较安静的会话仍会保留至少一条最近消息，避免活跃会话把并行故事线挤出上下文。服务端与浏览器模式共用同一套 Prompt、响应归一化和旧版完整项目响应兼容逻辑。

## 存档与故事回滚

当前 StoryArchive v2 为每张故事卡保存：

- 本段新增消息 ID。
- 生成前的角色、标题与会话拓扑。
- 生成后的角色、标题与会话拓扑。

因此删除或重新编辑某张故事卡时，可以精确恢复到对应时间点，而不是只截断消息数组。PNG 存档会把完整 JSON 写入 PNG `tEXt` 元数据，同时仍兼容旧版 JSON 和 v1 存档。

“重新开始”会随机载入另一套符合当前角色视角的预制剧情；不会复原刚刚删除的聊天记录。

## 代码结构

```text
src/
  App.tsx                              应用状态与故事编排
  components/UiPrimitives.tsx          轻量 UI 基础组件
  features/chat-preview/               微信聊天与多会话交互
  features/settings/                   设置和关于弹窗
  features/video/                      懒加载视频预览
  remotion/                            视频画面组件
  shared/chatSessions.ts               会话索引、未读与投影
  shared/multiSession.ts               AI 多会话生成约束与归并
  shared/messagePresentation.ts        界面、Canvas、Remotion 共用消息呈现
  shared/schema.ts                     Schema v2 与旧数据迁移
  shared/storySegments.ts              故事卡拓扑快照与回滚
  shared/aiProviders.ts                智谱/豆包元数据、默认值与本地选择
  shared/storyGeneration/              AI 契约、Prompt、上下文与响应归一化
server/                                 Fastify 本地全栈 API
  aiProviders.ts                       服务端模型环境变量与路由配置
api/                                    Vercel Functions
e2e/                                    Playwright 关键流程
```

前端基于 Vite、React 19、Tailwind CSS、`@heroui/styles` 和自定义 UI primitives；视频使用 Remotion。视频预览、浏览器导出和 AI 客户端均按需加载，避免进入聊天页时下载整套媒体工具链。

## API

`npm run dev:fullstack` 默认在 `8787` 端口启动 Fastify：

- `GET /api/health`：健康检查。
- `GET/POST /api/settings/deepseek`：读取或更新本地 DeepSeek 配置；读取接口不返回明文密钥。
- `POST /api/story/continue`：按请求中的 `modelProviderId`（`zhipu`、`doubao` 或 `v4flash`，默认 `doubao`）生成下一段增量剧情。
- `GET /api/project/sample`：示例项目。
- `POST /api/script/generate`：从 Brief 生成剧情项目。
- `GET /api/memes/search`：搜索表情素材。
- `POST /api/tts/batch`：批量生成语音。
- `POST /api/render`：服务端渲染视频。

## 验证

```bash
npm run typecheck
npm test
npm run verify       # 单元测试 + 微信/钉钉组合构建
npm run verify:e2e   # Playwright 关键用户流程
```

持续集成分别运行单元/构建检查与 Playwright 浏览器回归，覆盖微信直聊、移动端布局、多会话测试开关、旧存档迁移、私聊/群聊切换、弹窗逐级返回以及钉钉路由。

## 素材与使用边界

- JOJO 图片素材使用真实办公室局部、手、背影和运动模糊，避免真实正脸。
- 表情包候选记录 `QFace`、`ChineseBQB`、`SOOGIF`、`sorrypy` 等来源及风险。
- 腾讯官方表情资源仅供学习交流；第三方素材没有明确授权时，不应直接用于商业发布。
