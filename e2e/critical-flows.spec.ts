import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { sampleProject } from "../src/shared/sampleProject";

const errorOverlaySelector = [
  ".vite-error-overlay",
  "#webpack-dev-server-client-overlay",
  "[data-nextjs-dialog]"
].join(",");

async function expectHealthyAppShell(page: Page) {
  await expect(page).toHaveTitle(/蛐蛐模拟器/);
  await expect(page.getByRole("heading", { name: "蛐蛐模拟器" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator(errorOverlaySelector)).toHaveCount(0);
}

test.describe("关键用户流程", () => {
  let browserErrors: string[];

  test.beforeEach(async ({ page }) => {
    browserErrors = [];
    await page.route("**/_vercel/insights/script.js", (route) => route.fulfill({
      contentType: "application/javascript",
      body: ""
    }));
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
  });

  test.afterEach(() => {
    expect(browserErrors, `浏览器不应出现未捕获错误:\n${browserErrors.join("\n")}`).toEqual([]);
  });

  test("微信直聊预设可启动并切换到视频页", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);
    const directChat = page.locator('[aria-label="9:16 微信聊天预览"]');
    if (!await directChat.count()) {
      await page.getByRole("button", { name: "切换一套预制存档" }).click();
    }
    await expect(directChat).toBeVisible();

    await page.getByRole("button", { name: "开始编", exact: true }).click();

    await expect(page.getByRole("region", { name: "故事卡" })).toBeVisible();
    await expect(page.getByRole("button", { name: /定位到第 1 张故事卡/ })).toBeVisible();

    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    await settingsDialog.getByRole("button", { name: "实验室" }).click();
    const labDialog = page.getByRole("dialog", { name: "实验室" });
    await expect(labDialog.getByRole("combobox")).toHaveCount(3);
    const previewSelect = labDialog.getByRole("combobox", { name: "预览模式" });
    await previewSelect.selectOption("video");

    await expect(previewSelect).toHaveValue("video");
    await expect(page.locator(".player-frame")).toBeVisible();
    await expect(page.locator('[aria-label="正在加载视频预览"]')).toHaveCount(0);
  });

  test("语言设置跟随浏览器并可切换英文界面", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    const languageSelect = settingsDialog.getByRole("combobox", { name: "选择界面和对话语言" });
    await expect(languageSelect).toHaveValue("auto");
    await expect(languageSelect.locator("option").first()).toContainText("简体中文");

    await languageSelect.selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(/AI Companion/);
    await expect(page.getByRole("dialog", { name: "Settings" })).toContainText("About this site");

    await page.getByRole("button", { name: "About this site" }).click();
    const aboutSiteDialog = page.getByRole("dialog", { name: "About this site" });
    await expect(aboutSiteDialog).toContainText("AI companionship");
    await expect(aboutSiteDialog).toContainText("Simulated chat creation");
  });

  test("实验室模型默认豆包，保留 V4 Flash，并按需展开自定义输入", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    await expect(settingsDialog.getByRole("combobox", { name: "选择续写使用的 AI 模型" })).toHaveCount(0);
    await settingsDialog.getByRole("button", { name: "实验室" }).click();
    const labDialog = page.getByRole("dialog", { name: "实验室" });
    const modelSelect = labDialog.getByRole("combobox", { name: "选择续写使用的 AI 模型" });

    await expect(modelSelect).toHaveText("豆包 Seed-2.0-mini");
    await modelSelect.click();
    const modelListbox = labDialog.getByRole("listbox", { name: "选择续写使用的 AI 模型" });
    await expect(modelListbox.getByRole("option")).toHaveText([
      "智谱 GLM-4.7-Flash",
      "豆包 Seed-2.0-mini",
      "DeepSeek V4 Flash",
      "自定义模型"
    ]);
    await modelSelect.click();
    await expect(modelListbox).toHaveClass(/settings-model-select-menu-closing/);
    await expect(modelListbox).toHaveCount(0);
    await expect(labDialog.getByRole("textbox", { name: "自定义模型 Base URL" })).toHaveCount(0);

    await modelSelect.click();
    await modelListbox.getByRole("option", { name: "自定义模型" }).click();
    await expect(labDialog.getByRole("textbox", { name: "自定义模型 Base URL" })).toBeVisible();
    await expect(labDialog.getByRole("textbox", { name: "自定义模型名" })).toBeVisible();
    await expect(labDialog.getByLabel("自定义模型 API Key")).toBeVisible();

    await modelSelect.click();
    await labDialog.getByRole("option", { name: "豆包 Seed-2.0-mini" }).click();
    await expect(modelSelect).toHaveText("豆包 Seed-2.0-mini");
    await expect(labDialog.getByRole("textbox", { name: "自定义模型 Base URL" })).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "打开设置" }).click();
    await page.getByRole("dialog", { name: "设置" }).getByRole("button", { name: "实验室" }).click();
    await expect(page.getByRole("dialog", { name: "实验室" }).getByRole("combobox", { name: "选择续写使用的 AI 模型" })).toHaveText("豆包 Seed-2.0-mini");
  });

  test("支持作者页面与设置菜单按 Escape 逐级返回", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);

    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsSection = page.locator("#settings-dialog");
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    await expect(settingsDialog).toBeVisible();
    await settingsDialog.locator("[data-settings-about]").click();

    const supportDialog = page.getByRole("dialog", { name: "支持作者" });
    await expect(settingsSection).toBeVisible();
    await expect(settingsSection).toHaveAttribute("aria-hidden", "true");
    await expect(settingsSection).toHaveAttribute("inert", "");
    await expect(settingsSection).not.toHaveAttribute("aria-modal", "true");
    await expect(settingsDialog).toHaveCount(0);
    await expect(supportDialog).toBeVisible();
    await expect(supportDialog.getByRole("button", { name: "返回设置", exact: true })).toBeVisible();
    await expect(supportDialog.getByRole("link", { name: "开源链接" })).toBeVisible();
    await expect(supportDialog).toContainText("如果它给你带来了乐趣");
    const wechatPaymentTab = supportDialog.getByRole("tab", { name: "微信" });
    const alipayPaymentTab = supportDialog.getByRole("tab", { name: "支付宝" });
    await expect(wechatPaymentTab).toHaveAttribute("aria-selected", "true");
    await expect(supportDialog.getByRole("img", { name: "微信收款码" })).toHaveAttribute("src", /\/donate\/wechat-qr\.webp$/);
    await alipayPaymentTab.click();
    await expect(alipayPaymentTab).toHaveAttribute("aria-selected", "true");
    await expect(supportDialog.getByRole("img", { name: "支付宝收款码" })).toHaveAttribute("src", /\/donate\/alipay-qr\.webp$/);
    const copyGithubButton = supportDialog.getByRole("button", { name: "复制开源链接" });
    await expect(copyGithubButton).toBeVisible();
    await expect(page.locator(".about-dialog")).toHaveCount(1);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(page.url()).origin });
    await copyGithubButton.click();
    await expect(page.locator(".app-toast")).toHaveText("开源链接已复制");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("github.com/");

    await page.keyboard.press("Escape");
    await expect(supportDialog).toHaveCount(0);
    await expect(settingsDialog).toBeVisible();
    await expect(settingsSection).not.toHaveAttribute("aria-hidden", "true");
    await expect(settingsSection).not.toHaveAttribute("inert", "");
    await expect(settingsSection).toHaveAttribute("aria-modal", "true");
    await expect(settingsDialog.getByRole("button", { name: /^支持作者/ })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(settingsDialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "打开设置" })).toBeFocused();
  });

  test("存档封面导出为 800px 宽", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);

    await page.getByRole("button", { name: "打开设置" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("dialog", { name: "设置" }).getByRole("button", { name: /存档/ }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const png = await readFile(path!);
    expect(png.readUInt32BE(16)).toBe(800);
    expect(png.readUInt32BE(20)).toBe(1067);
  });

  test("移动端初始页与预设展开后均无横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);

    const horizontalOverflow = () => page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.documentElement.clientWidth
    }));

    await expect.poll(horizontalOverflow).toEqual({ document: 0, body: 0 });
    await page.getByRole("button", { name: "开始编", exact: true }).click();
    await expect.poll(() => page.locator("[data-message-id]").count()).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "展开编故事" })).toBeVisible();
    await expect.poll(horizontalOverflow).toEqual({ document: 0, body: 0 });
    await page.getByRole("button", { name: "打开设置" }).click();
    await page.getByRole("dialog", { name: "设置" }).getByRole("button", { name: "实验室" }).click();
    await expect(page.getByRole("dialog", { name: "实验室" }).getByRole("combobox", { name: "选择续写使用的 AI 模型" })).toBeVisible();
    await expect.poll(horizontalOverflow).toEqual({ document: 0, body: 0 });
  });

  test("当前会话可自定义标题昵称与本地头像并在刷新后恢复", async ({ page }) => {
    const localArchive = {
      version: 1,
      exportedAt: "2026-08-03T00:00:00.000Z",
      promptCards: [],
      project: sampleProject
    };
    const loadLocalArchive = () => page.locator('input[type="file"]').first().setInputFiles({
      name: "local-customization-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(localArchive))
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);
    await loadLocalArchive();

    const titleButton = page.getByRole("button", { name: "自定义会话标题" });
    await titleButton.hover();
    await expect(titleButton.locator(".wechat-edit-pencil")).toHaveCSS("opacity", "0.78");
    await titleButton.click();
    const titleDialog = page.getByRole("dialog", { name: "自定义会话标题" });
    await titleDialog.getByRole("textbox", { name: "会话标题" }).fill("只保存在本机的会话");
    await titleDialog.getByRole("button", { name: "保存" }).click();
    await expect(titleButton).toContainText("只保存在本机的会话");

    await expect.poll(() => page.locator(".wechat-avatar-edit-target").count()).toBeGreaterThan(0);
    const avatarButton = page.locator(".wechat-avatar-edit-target").first();
    await avatarButton.click();
    const avatarDialog = page.getByRole("dialog", { name: "自定义头像" });
    await avatarDialog.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
    });
    await expect(avatarDialog.locator(".chat-profile-avatar-preview img")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await avatarDialog.getByRole("button", { name: "保存" }).click();
    await expect(avatarButton.locator("img")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.includes("ququ-conversation-customization-v1")))).toBe(true);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await loadLocalArchive();
    await expect(page.getByRole("button", { name: "自定义会话标题" })).toContainText("只保存在本机的会话");
    await expect.poll(() => page.locator(".wechat-avatar-edit-target img[src^='data:image/jpeg;base64,']").count()).toBeGreaterThan(0);

    await page.goto("/ding/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "开始编", exact: true }).click();
    await expect.poll(() => page.locator(".wechat-speaker-name-edit-target").count()).toBeGreaterThan(0);
    const nicknameButton = page.locator(".wechat-speaker-name-edit-target").first();
    await nicknameButton.click();
    const nicknameDialog = page.getByRole("dialog", { name: "自定义昵称" });
    await nicknameDialog.getByRole("textbox", { name: "昵称" }).fill("本会话昵称");
    await nicknameDialog.getByRole("button", { name: "保存" }).click();
    await expect(nicknameButton).toContainText("本会话昵称");
  });

  test("微信多会话测试开关默认关闭并在反复切换后保留存档数据", async ({ page }) => {
    const lawyer = {
      ...sampleProject.characters[1],
      id: "lawyer",
      name: "周律师",
      avatarInitial: "周"
    };
    const boss = {
      ...sampleProject.characters[1],
      id: "boss",
      name: "王总",
      avatarInitial: "王"
    };
    const legacyArchive = {
      version: 1,
      exportedAt: "2026-07-15T12:00:00.000Z",
      promptCards: [],
      project: {
        ...sampleProject,
        title: "合同调查",
        chatMode: "direct",
        characters: [...sampleProject.characters, lawyer, boss],
        chatSessions: [
          { id: "chat-direct", title: "林夏", participantIds: ["boy", "girl"] },
          { id: "chat-group", title: "合同核对群", participantIds: ["boy", "girl", "lawyer", "boss"] }
        ],
        messages: [
          { ...sampleProject.messages[0], id: "direct-message", sessionId: "chat-direct" },
          { ...sampleProject.messages[1], id: "group-lawyer", roleId: "lawyer", sessionId: "chat-group", text: "第七条被替换过" },
          { ...sampleProject.messages[1], id: "group-boss", roleId: "boss", sessionId: "chat-group", text: "把原文件发群里" }
        ]
      }
    };

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);
    await expect(page.getByRole("navigation", { name: "切换会话" })).toHaveCount(0);

    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    const labDialog = page.getByRole("dialog", { name: "实验室" });
    const openLabDialog = async () => {
      await settingsDialog.getByRole("button", { name: "实验室" }).click();
      await expect(labDialog).toBeVisible();
    };
    const closeLabAndSettings = async () => {
      await labDialog.getByRole("button", { name: "返回设置" }).click();
      await expect(settingsDialog).toBeVisible();
      await settingsDialog.getByRole("button", { name: "关闭设置" }).click();
      await expect(settingsDialog).toHaveCount(0);
    };
    await openLabDialog();
    const multiSessionSwitch = labDialog.getByRole("switch", { name: "多会话" });
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "false");
    await closeLabAndSettings();

    await page.locator('input[type="file"]').setInputFiles({
      name: "legacy-mixed-sessions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacyArchive))
    });

    const sessionRail = page.getByRole("navigation", { name: "切换会话" });
    await expect(sessionRail).toHaveCount(0);

    await page.getByRole("button", { name: "打开设置" }).click();
    await openLabDialog();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "true");
    await closeLabAndSettings();

    await expect(sessionRail).toBeVisible();
    await expect(sessionRail.getByRole("button", { name: /切换到林夏/ })).toBeVisible();
    const groupButton = sessionRail.getByRole("button", { name: /切换到合同核对群/ });
    await expect(groupButton.locator(".wechat-group-avatar")).toBeVisible();
    await groupButton.click();
    await expect(page.locator('[aria-label="9:16 微信群聊预览"]')).toBeVisible();
    await expect(page.locator(".wechat-topbar-group-avatar.wechat-group-avatar")).toBeVisible();
    await expect(page.locator(".wechat-speaker-name")).toContainText(["周律师", "王总"]);

    await page.getByRole("button", { name: "打开设置" }).click();
    await openLabDialog();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "false");
    await closeLabAndSettings();
    await expect(sessionRail).toHaveCount(0);

    await page.getByRole("button", { name: "打开设置" }).click();
    await openLabDialog();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "true");
    await closeLabAndSettings();
    await expect(sessionRail.getByRole("button", { name: /切换到林夏/ })).toBeVisible();
    const restoredGroupButton = sessionRail.getByRole("button", { name: /切换到合同核对群/ });
    await expect(restoredGroupButton).toBeVisible();
    await restoredGroupButton.click();
    await expect(page.locator(".wechat-speaker-name")).toContainText(["周律师", "王总"]);

    await page.setViewportSize({ width: 390, height: 844 });
    const storyPanelBackdrop = page.locator(".story-panel-backdrop");
    if (await storyPanelBackdrop.isVisible()) {
      await storyPanelBackdrop.click();
    }
    await page.getByRole("button", { name: /返回消息列表/ }).click();
    const messageList = page.getByRole("navigation", { name: "消息列表" });
    await expect(messageList.getByRole("button", { name: /打开林夏/ })).toBeVisible();
    await expect(messageList.getByRole("button", { name: /打开合同核对群/ })).toBeVisible();
  });

  test("钉钉版路由可打开", async ({ page }) => {
    await page.goto("/ding/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);
    await expect(page).toHaveURL(/\/ding\/$/);
    await expect(page.locator('[aria-label="钉钉手机版聊天预览"]')).toBeVisible();
    await page.getByRole("button", { name: "打开设置" }).click();
    const settingsDialog = page.getByRole("dialog", { name: "设置" });
    await expect(settingsDialog).toBeVisible();
    await expect(settingsDialog.getByRole("switch", { name: "多会话（测试版）" })).toHaveCount(0);
  });
});
