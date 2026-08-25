# 前端元素映射

| 俗称 | 所属区域 | 代码变量/组件 | 样式类 |
| --- | --- | --- | --- |
| 顶栏 | 全局 | `header` | `.topbar` |
| 产品名 / 网站标题 | 顶栏 | `copy.brandName` | `.beta-menu-brand-text`；使用 `h1`，移动端不隐藏 |
| 品牌头像 / 网站小 logo / 左上角换头像 | 正式顶栏、Beta 网站标题、favicon | `GlitchBrandMark`、`GlitchBadgeEngine.trigger`、`nextBrandIconUrl`、`applyBrandFavicon`，WebP 素材位于 `/brand-icons/` | 微信版固定绿色白气泡；钉钉正式版与 Beta 默认静止，hover 单次 glitch，点击单次 glitch 并循环换头像；页面头像与 favicon 同图 |
| 关于菜单项 | 标题下拉菜单 | `aboutDialogView`、`VITE_GITHUB_REPO_URL`、`VITE_FEEDBACK_WECHAT_ID`、`VITE_ALIPAY_QR_CODE_URL` | `.title-menu-item`、`.about-dialog` |
| 玩家指南 / 黑客松关于页 / 产品介绍页 | 钉钉正式版与 Beta“帮助 → 关于本站” | `SiteAboutDialog`、`jojoPlayerGuide`、`showUiSoundControl` | `.about-dialog-site-beta`、`.site-about-content-beta`、`.beta-about-player-section`；仅标题和正文两级，不含宣传配图；微信正式版走原通用内容 |
| 支持作者窗口 / 打赏窗口 / 随机感谢语 | “帮助 → 支持作者” | `AboutDialog`、`supportAuthorCopy`、`supportPraiseIndex`、`nextSupportPraiseIndex`、Calligraph `variant="text"` | `.about-dialog-support`、`.support-author-message`、`.support-author-praise`；12 条随机且不连续重复，按词组入场 |
| 角色图标 / 故障头像 / 点击换角色 | 玩家指南首屏 | `BetaAboutIdentity`、`GlitchBadgeEngine.trigger`、`ACTIVE_GLITCH` | `.beta-about-icon-button`、`.beta-about-icon-stack`；默认静止，hover/点击单次播放；只有图标，无姓名标签和提示小字，点击轮换叫叫、铃铛、猪小弟 |
| 界面音效 / 点击音效 / 静音 | 测试版钉钉全局与“显示”菜单 | `installBetaUiSfx`、`uiSoundEnabled`、`toggleBetaUiSound` | `uisfx` cinematic；`localStorage: ququ:beta-ui-sfx`；`data-uisfx` 可覆盖默认语义 |
| 早点走进会议室 / 02f 宣传图 | 黑客松投稿素材，不再嵌入关于页 | `public/hackathon/ququ-dingtalk-cover-02f.webp` | `1536×1024`、`3:2`、质量 82 WebP，约 `126KB` |
| 构建版本 | 应用入口 | `__APP_STORY_PACKAGE__`、`App({ storyPackage })` | `.app-shell-jojo` 仅 JOJO 版存在 |
| 独立产物 | 构建脚本 | `STORY_PACKAGE=jojo|viral` | `dist/jojo`、`dist/viral` |
| `/ququ` 部署产物 | 构建脚本 | `npm run build:ququ`、`VITE_BASE_PATH=/ququ/` | `dist/ququ` |
| 线上 Beta | 独立 Vercel 工程 | `npm run build:beta`、`VITE_BASE_PATH=/beta/` | `ququ-fakechat-beta.vercel.app/beta/` |
| 顶部菜单 / Mac 菜单栏 | Beta、正式微信、正式钉钉顶栏 | `BetaMenuBar`、`appMenuEnabled` | `.beta-macos-menubar` 为透明横栏；`.beta-menu-popover` 保留菜单承载面；显示菜单含语言，模型菜单不打开弹窗 |
| 手机右上角菜单 / 汉堡菜单 | `760px` 及以下顶栏 | `mobileMenuOpen`、`openMenu`、`closingMenu` | `.beta-menu-mobile-toggle`、`.beta-menu-nav[data-mobile-open="true"]`；一级菜单纵向排列，子菜单原位展开，面板可内部滚动 |
| 当前模型标签 | 全版本顶栏右侧 | 已移除；模型选中态仅保留在“模型”菜单内 | 不再渲染 `.beta-menu-current-model` |
| 多会话开关 | 正式微信版顶部“显示”菜单 | `allowMultiSession`、`toggleMultiSessionMode` | `.beta-menu-item`；选中显示勾，生成中禁用 |
| 自定义 Fish Audio API | Beta 模型菜单 | `fishApiKey`、`testFishApiKey` | `.beta-menu-inline-form`；仅一个密钥输入框和测试按钮 |
| 百分比滚动数字 / 加载数字 / 预计时间 | 生成进度、导出进度 | `RollingPercent`、`estimatedGenerationMs`、`doubaoGenerationEstimateScale = 0.64`、Calligraph `variant="number"` | `.rolling-percent`、`.rolling-percent-digits`；豆包按 DeepSeek 基准的 `64%` 推进 |
| JOJO 内网预览 | 部署/预览 | `npm run preview:lan` | `HOST=0.0.0.0 API_PORT=4173 DIST_DIR=dist/jojo` |
| 存档按钮 | 顶栏 | `exportJson` | `.ghost-top-actions` |
| 读档按钮 | 顶栏 | `importInputRef`、`importJson` | `.ghost-top-actions` |
| 错误状态提示 | 编故事 | `status === "error"`、`statusText` | `.deepseek-status-error` |
| 免费模型拥堵提示 | 编故事 / 实验室 | 服务端原样返回模型错误、用户手动 `selectAiModel` | 不自动切换到可能计费的豆包 |
| 模型 / 可选模型 | 模型设置 | `aiProviderId`、`selectAiModel`、`selectableAiProviders` | `.settings-model-select-trigger`、`.settings-model-select-menu`；智谱不再展示 |
| 智谱 / 旧兼容模型 | AI 后端 | `modelProviderId: "zhipu"`、`glm-4.7-flash` | `ZHIPU_API_KEY`；仅保留旧请求兼容，不在模型菜单出现 |
| 豆包 / 默认模型 / Seed mini / 速度快 | AI 模型 | `modelProviderId: "doubao"`、`doubao-seed-2-0-mini-260215` | `DOUBAO_API_KEY` 或 `ARK_API_KEY`；显示“豆包 Seed-2.0-mini（速度快）” |
| DeepSeek V4 Flash / V4 | AI 模型 | `modelProviderId: "v4flash"`、`deepseek-v4-flash` | `DEEPSEEK_API_KEY`，兼容 `COMPANY_DEEPSEEK_API_KEY` |
| 自定义模型输入框 | 实验室 AI 模型 | `customModelPanelOpen`、`CustomModelSettings` | 仅当模型选择值为 `custom` 时渲染 `.settings-model-panel` 内输入项 |
| Toast / AI 连接失败提示 | Beta 状态反馈 | `toastMessage`、`showToast` | `.app-toast`；Beta 静置常驻，鼠标移动或点击后延迟 2 秒消失 |
| 左侧面板 | 主工作区 | `ScrollShadow` | `.left-panel.panel-scroll` |
| 桌面编故事垂直位置 | 主工作区 | CSS 变量 | `--desktop-story-panel-top-offset: 190px` |
| 桌面视频窗口垂直位置 | 视频预览 | CSS 变量 | `.right-panel:has(.video-preview-stack)` 使用 `--desktop-preview-window-top-offset` |
| 编故事底部弹窗按钮 | 1080px 以下适配 | `storyPanelOpen`、`setStoryPanelOpenWithContinuity`、`ChevronDown`、`PenLine` | `.story-panel-status`、`.story-panel-open`、`story-panel-toggle` |
| 编故事输入框 | 编故事 | `draftPrompt` | `.hero-textarea.prompt-textarea` |
| 开始编按钮 | 编故事 | `continueStory` | HeroUI `Button` |
| 重启故事按钮 | 编故事 | `clearLine`，清空 `project.messages` 和故事卡片，保留手机框架 | `.prompt-reset-button` |
| 生成状态 | 编故事 | `status`、`statusText`、`generateBackendStorySegment` | 正常不常驻显示，错误时用 `.deepseek-status-error` |
| 故事卡片列表 | 编故事历史 | `promptCards` | `.prompt-card-list` |
| 单张故事卡片 | 编故事历史 | `PromptCard` | `.prompt-card`、`.prompt-card-index` |
| 右侧预览面板 | 预览区 | `previewMode` | `.right-panel.panel-scroll` |
| 右侧透明承载区 | 预览区 | `Card.preview-wrap` | `.preview-wrap`、`.preview-content-stage` |
| 界面版按钮 | 预览区切换 | `changePreviewMode("wechat")` | `.preview-mode-controls`、`.preview-tab` |
| 视频版按钮 | 预览区切换 | `changePreviewMode("video")`、`playerRef.play()` | `.preview-mode-controls`、`.preview-tab` |
| 微信手机预览 | 微信预览 | `WechatStoryPreview` | `.wechat-preview-shell`、`.wechat-phone` |
| 预览最大宽度 | 预览区 | CSS 变量 | `--chat-preview-width`、`--video-preview-width` |
| 聊天自动滚屏 | 微信/钉钉预览 | `visibleMessageCount`、`.scrollTo()` | `.wechat-chat-scroll` |
| 聊天重播按钮 | 聊天信息流末尾 | `replayConversation`、`startMessageReveal`，播放完显示“再来一遍” | `.chat-replay-row`、`.chat-replay-button` |
| JOJO 群聊名 | 钉钉顶栏 | `project.title`、`nextProjectTitle` | `.dingtalk-topbar-title` |
| 微信顶栏整图 | 微信预览 | `/wechat-ui/topbar.webp` | `.wechat-topbar`、`.wechat-topbar-img` |
| 微信顶栏名字 | 微信预览 | `peer?.name || project.title` | `.wechat-topbar-title` |
| 微信底部整图 | 微信预览 | `/wechat-ui/bottombar.webp` | `.wechat-bottombar-img` |
| 聊天气泡 | 微信预览 | `WechatMessageContent` | `.wechat-bubble` |
| 钉钉手机预览 | JOJO 预览 | `isJojoProject(project)` | `.dingtalk-phone`；1080px 以下配合底部半弹窗，400px 以下只等比缩小手机本体 |
| 钉钉顶栏整图 | JOJO 预览 | `/dingtalk-ui/topbar.webp`，Figma `3:14` | `.dingtalk-topbar-img` |
| 钉钉底部整图 | JOJO 预览 | `/dingtalk-ui/inputbar.webp` | `.dingtalk-inputbar-img` |
| 叫叫右侧蓝色气泡 | JOJO 预览 | `visualSideFor`、`roleId === "jiaojiao"` | `.dingtalk-row-self.wechat-row-right .wechat-bubble` |
| 其他人左侧白色气泡 | JOJO 预览 | `visualSideFor` | `.dingtalk-row-other.wechat-row-left .wechat-bubble` |
| 说话人名字 | JOJO 预览 | `getCharacter(project, message).name` | `.wechat-speaker-name` |
| 转账卡片 | 微信预览 | `message.type === "transfer"` | `.wechat-transfer` |
| 图片卡片 | 微信预览 | `message.type === "image"` | `.wechat-image-card` |
| 表情卡片 | 微信预览 | `message.type === "meme"` | `.wechat-meme-card` |
| 视频播放器 | 视频预览 | `Player`、`ChatDrama` | `.player-frame` |
| 视频空态占位 | 视频预览 | `renderPreviewPane("video")` 无消息分支 | `.video-empty-frame`、`.video-empty-state` |
| 生成语音按钮 | 视频预览 | `generateVoice` | `.video-action-strip` |
| 导出视频按钮 | 视频预览 | `exportVideo` | `.video-action-strip` |
| 视频进度条 | 视频导出 | `videoProgress` | `.video-progress` |
| 下载视频链接 | 视频导出 | `videoResult` | `.download-link` |

## 数据与素材映射

| 俗称 | 所属区域 | 代码变量/组件 | 路径/说明 |
| --- | --- | --- | --- |
| JOJO 默认项目 | 数据预设 | `jojoProject` | `src/shared/jojoProject.ts` |
| JOJO 固定素材池 | 数据预设 | `jojoCompanyAssets` | `src/shared/jojoProject.ts` |
| 叫叫头像 | JOJO 头像 | `roleId: "jiaojiao"` | `/avatars/jojo/jiaojiao.webp` |
| 铃铛头像 | JOJO 头像 | `roleId: "lingdang"` | `/avatars/jojo/lingdang.webp` |
| 猪小弟头像 | JOJO 头像 | `roleId: "zhuxiaodi"` | `/avatars/jojo/zhuxiaodi.webp` |
| 系统头像 | JOJO 头像 | `roleId: "xitong"` | `/avatars/jojo/xitong.webp` |
| 会议局部照片 | JOJO 图片 | `assetId: "jojo-photo-meeting-blur"` | `/jojo-assets/photos/company-meeting-blur.webp` |
| 电梯背影照片 | JOJO 图片 | `assetId: "jojo-photo-corridor-blur"` | `/jojo-assets/photos/company-corridor-blur.webp` |
| JOJO 表情卡 | JOJO 表情 | `assetId: "jojo-meme-*"` | `/jojo-assets/memes/*.webp` |
| 公司中转配置 | 后端模型 | `getDeepSeekConfig` | `server/settings.ts` |
| 官方模型配置 | 后端模型 | `getManagedAiConfig` | `server/aiProviders.ts`；智谱/豆包密钥只从服务端环境变量读取 |
| 模型选择记忆 | 浏览器本地设置 | `aiProviderStorageKey` | `localStorage: ququ-ai-provider-v2`；旧版智谱默认值迁移为新默认豆包 |
| 静态部署公司中转 | 构建注入 | `VITE_INCLUDE_COMPANY_TOKEN=1`、`VITE_COMPANY_DEEPSEEK_API_KEY` | `vite.config.ts` 仅从环境变量读取 token |
| 后端公司中转 token | 后端模型 | `COMPANY_DEEPSEEK_API_KEY`、`DEEPSEEK_API_KEY` | `server/settings.ts`，不再硬编码真实 key |
| 微信版 README 截图 | GitHub 文档 | README 图片引用 | `docs/screenshots/fakechat-wechat.webp` |
| 黑客松封面 / 投稿封面 / 作品封面 | 钉钉版投稿素材 | 首轮 3 个方向及蓝黄版 `02a–02f` 六个安全职场梗变体 | `design/hackathon-covers/hackathon-cover-*`；PNG 原图与压缩 WebP 成对保存 |
