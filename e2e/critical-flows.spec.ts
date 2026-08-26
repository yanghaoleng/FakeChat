import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { supportAuthorCopy } from "../src/features/settings/supportAuthorCopy";
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

async function openAppMenu(page: Page, label: string) {
  const mobileToggle = page.locator(".beta-menu-mobile-toggle");
  if (await mobileToggle.isVisible() && await mobileToggle.getAttribute("aria-expanded") !== "true") {
    await mobileToggle.click();
  }
  const trigger = page.getByRole("button", { name: label, exact: true });
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
  const menu = page.getByRole("menu", { name: label, exact: true });
  await expect(menu).toBeVisible();
  return menu;
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

    const viewMenu = await openAppMenu(page, "显示");
    await viewMenu.getByRole("menuitemradio", { name: "视频版" }).click();
    await expect(page.locator(".player-frame")).toBeVisible();
    await expect(page.locator('[aria-label="正在加载视频预览"]')).toHaveCount(0);
  });

  test("语言设置跟随浏览器并可切换英文界面", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const viewMenu = await openAppMenu(page, "显示");
    await expect(viewMenu.getByRole("menuitemradio", { name: /跟随浏览器/ })).toHaveAttribute("aria-checked", "true");
    await viewMenu.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(/AI Companion/);

    const helpMenu = await openAppMenu(page, "Help");
    await helpMenu.getByRole("menuitem", { name: "About this site" }).click();
    const aboutSiteDialog = page.getByRole("dialog", { name: "About this site" });
    await expect(aboutSiteDialog).toContainText("AI companionship");
    await expect(aboutSiteDialog).toContainText("Simulated chat creation");
  });

  test("模型菜单默认豆包并保留 DeepSeek V4 Flash", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const modelMenu = await openAppMenu(page, "模型");
    const modelChoices = modelMenu.getByRole("menuitemradio");
    await expect(modelChoices).toHaveText([
      "豆包 Seed-2.0-mini（速度快）",
      "DeepSeek V4 Flash",
      "Fish 朗读"
    ]);
    await expect(modelMenu.getByRole("menuitemradio", { name: "豆包 Seed-2.0-mini（速度快）" })).toHaveAttribute("aria-checked", "true");
    await expect(modelMenu).not.toContainText("智谱");
    await expect(modelMenu).not.toContainText("自定义模型");

    await modelMenu.getByRole("menuitemradio", { name: "DeepSeek V4 Flash" }).click();
    const reopenedModelMenu = await openAppMenu(page, "模型");
    await expect(reopenedModelMenu.getByRole("menuitemradio", { name: "DeepSeek V4 Flash" })).toHaveAttribute("aria-checked", "true");
    await page.reload();
    const persistedModelMenu = await openAppMenu(page, "模型");
    await expect(persistedModelMenu.getByRole("menuitemradio", { name: "DeepSeek V4 Flash" })).toHaveAttribute("aria-checked", "true");
  });

  test("支持作者页面可从帮助菜单打开并按 Escape 关闭", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);

    const helpMenu = await openAppMenu(page, "帮助");
    await helpMenu.getByRole("menuitem", { name: "支持作者" }).click();

    const supportDialog = page.getByRole("dialog", { name: "支持作者" });
    await expect(supportDialog).toBeVisible();
    await expect(supportDialog.getByRole("button", { name: "返回设置", exact: true })).toBeVisible();
    await expect(supportDialog.getByRole("link", { name: "开源链接" })).toBeVisible();
    const praise = supportDialog.locator(".support-author-praise");
    const firstPraise = await praise.getAttribute("aria-label");
    expect(supportAuthorCopy["zh-CN"].praises).toContain(firstPraise);
    await expect(praise.locator(".support-author-praise-motion")).not.toHaveCount(0);
    await expect(praise.locator(".support-author-praise-motion").first()).toBeVisible();
    await expect(praise.locator(".support-author-praise-motion > span")).not.toHaveCount(0);
    const fontSizes = await supportDialog.evaluate((dialog) => ({
      title: getComputedStyle(dialog.querySelector("h2")!).fontSize,
      message: getComputedStyle(dialog.querySelector(".support-author-message")!).fontSize,
      paymentTab: getComputedStyle(dialog.querySelector(".support-author-payment-tab")!).fontSize,
      linkLabel: getComputedStyle(dialog.querySelector(".support-author-copy > span")!).fontSize,
      linkValue: getComputedStyle(dialog.querySelector(".support-author-copy strong")!).fontSize
    }));
    expect(fontSizes).toEqual({ title: "17px", message: "14px", paymentTab: "14px", linkLabel: "11px", linkValue: "14px" });
    const wechatPaymentTab = supportDialog.getByRole("tab", { name: "微信" });
    const alipayPaymentTab = supportDialog.getByRole("tab", { name: "支付宝" });
    await expect(page.locator('link[rel="preload"][as="image"][href$="/donate/wechat-qr.webp"]')).toHaveAttribute("fetchpriority", "high");
    await expect(page.locator('link[rel="preload"][as="image"][href$="/donate/alipay-qr.webp"]')).toHaveAttribute("fetchpriority", "low");
    await expect(wechatPaymentTab).toHaveAttribute("aria-selected", "true");
    const wechatQr = supportDialog.getByRole("img", { name: "微信收款码" });
    await expect(wechatQr).toHaveAttribute("src", /\/donate\/wechat-qr\.webp$/);
    await expect.poll(() => wechatQr.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await alipayPaymentTab.click();
    await expect(alipayPaymentTab).toHaveAttribute("aria-selected", "true");
    const alipayQr = supportDialog.getByRole("img", { name: "支付宝收款码" });
    await expect(alipayQr).toHaveAttribute("src", /\/donate\/alipay-qr\.webp$/);
    await expect.poll(() => alipayQr.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const copyGithubButton = supportDialog.getByRole("button", { name: "复制开源链接" });
    await expect(copyGithubButton).toBeVisible();
    await expect(page.locator(".about-dialog")).toHaveCount(1);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(page.url()).origin });
    await copyGithubButton.click();
    await expect(page.locator(".app-toast")).toHaveText("开源链接已复制");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("github.com/");

    await page.keyboard.press("Escape");
    await expect(supportDialog).toHaveCount(0);

    const reopenedHelpMenu = await openAppMenu(page, "帮助");
    await reopenedHelpMenu.getByRole("menuitem", { name: "支持作者" }).click();
    const secondPraise = await page.locator(".support-author-praise").getAttribute("aria-label");
    expect(supportAuthorCopy["zh-CN"].praises).toContain(secondPraise);
    expect(secondPraise).not.toBe(firstPraise);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".support-author-praise-motion")).toHaveCount(0);
    await expect(page.locator(".support-author-praise")).toContainText(secondPraise!);
  });

  test("关于页底部可叠加打开支持作者弹窗", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const helpMenu = await openAppMenu(page, "帮助");
    await helpMenu.getByRole("menuitem", { name: "关于本站" }).click();

    const siteAboutDialog = page.locator(".about-dialog-site");
    const supportButton = siteAboutDialog.getByRole("button", { name: "支持作者" });
    await expect(siteAboutDialog).toBeVisible();
    await expect(supportButton).toBeVisible();
    await supportButton.click();

    const supportDialog = page.getByRole("dialog", { name: "支持作者" });
    await expect(supportDialog).toBeVisible();
    await expect(siteAboutDialog).toBeVisible();
    await expect(siteAboutDialog).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".about-dialog")).toHaveCount(2);

    await page.keyboard.press("Escape");
    await expect(supportDialog).toHaveCount(0);
    await expect(siteAboutDialog).toBeVisible();
    await expect(siteAboutDialog).not.toHaveAttribute("aria-hidden", "true");
    await expect(supportButton).toBeFocused();
  });

  test("移动端支持作者窗口放大字号后仍可完整滚动", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const helpMenu = await openAppMenu(page, "帮助");
    await helpMenu.getByRole("menuitem", { name: "支持作者" }).click();

    const supportDialog = page.getByRole("dialog", { name: "支持作者" });
    const supportPanel = supportDialog.locator(".support-author-panel");
    await expect(supportDialog).toBeVisible();
    await expect(supportDialog.locator(".support-author-praise")).toBeVisible();
    await expect.poll(() => page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.documentElement.clientWidth
    }))).toEqual({ document: 0, body: 0 });

    const scrollMetrics = await supportPanel.evaluate((panel) => ({
      clientHeight: panel.clientHeight,
      scrollHeight: panel.scrollHeight
    }));
    expect(scrollMetrics.clientHeight).toBeGreaterThan(0);
    expect(scrollMetrics.scrollHeight).toBeGreaterThanOrEqual(scrollMetrics.clientHeight);
    await supportPanel.evaluate((panel) => panel.scrollTo({ top: panel.scrollHeight, behavior: "auto" }));
    await expect(supportDialog.getByRole("link", { name: "mikeywa.icu" })).toBeVisible();
  });

  test("存档封面导出为 800px 宽", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectHealthyAppShell(page);

    const downloadPromise = page.waitForEvent("download");
    const fileMenu = await openAppMenu(page, "文件");
    await fileMenu.getByRole("menuitem", { name: "保存存档" }).click();
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
    const brandIcon = page.locator(".beta-menu-brand-icon");
    const mobileMenuButton = page.getByRole("button", { name: "打开菜单" });
    await expect(brandIcon).toBeVisible();
    await expect(brandIcon).toHaveAttribute("src", /\.webp$/);
    await expect(page.getByRole("heading", { name: "蛐蛐模拟器" })).toBeVisible();
    await expect(mobileMenuButton).toBeVisible();
    await expect(page.locator(".beta-menu-trigger").first()).not.toBeVisible();

    await mobileMenuButton.click();
    const mobileNav = page.locator("#ququ-mobile-menu");
    await expect(mobileNav).toBeVisible();
    const topLevelPositions = await mobileNav.locator(":scope > .beta-menu-root > .beta-menu-trigger").evaluateAll((triggers) => triggers.map((trigger) => {
      const rect = trigger.getBoundingClientRect();
      return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) };
    }));
    expect(topLevelPositions).toHaveLength(5);
    expect(new Set(topLevelPositions.map((position) => position.left)).size).toBe(1);
    expect(new Set(topLevelPositions.map((position) => position.width)).size).toBe(1);
    expect(topLevelPositions.every((position) => position.height >= 44)).toBe(true);
    expect(topLevelPositions.every((position, index) => index === 0 || position.top > topLevelPositions[index - 1]!.top)).toBe(true);

    const modelMenu = await openAppMenu(page, "模型");
    await expect(modelMenu.getByRole("menuitemradio", { name: /豆包 Seed-2\.0-mini/ })).toBeVisible();
    const iconAndFavicon = await page.evaluate(() => ({
      icon: new URL(document.querySelector<HTMLImageElement>(".beta-menu-brand-icon")!.src).pathname,
      favicon: new URL(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!.href).pathname
    }));
    expect(iconAndFavicon.favicon).toBe(iconAndFavicon.icon);
    await expect.poll(horizontalOverflow).toEqual({ document: 0, body: 0 });

    await page.getByRole("button", { name: "显示", exact: true }).click();
    const viewMenu = page.getByRole("menu", { name: "显示", exact: true });
    const japaneseLanguage = viewMenu.getByRole("menuitemradio", { name: "日本語" });
    await page.setViewportSize({ width: 390, height: 520 });
    await expect.poll(() => mobileNav.evaluate((nav) => nav.scrollHeight > nav.clientHeight)).toBe(true);
    await japaneseLanguage.scrollIntoViewIfNeeded();
    await expect(japaneseLanguage).toBeVisible();
    await expect.poll(() => mobileNav.evaluate((nav) => nav.scrollTop > 0)).toBe(true);
    await expect.poll(horizontalOverflow).toEqual({ document: 0, body: 0 });

    await page.getByRole("button", { name: "关闭菜单" }).click();
    await expect(mobileNav).not.toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "开始编", exact: true }).click();
    await expect.poll(() => page.locator("[data-message-id]").count()).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "展开编故事" })).toBeVisible();
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

    const expectMultiSessionState = async (checked: boolean) => {
      const viewMenu = await openAppMenu(page, "显示");
      await expect(viewMenu.getByRole("menuitemradio", { name: "多会话（测试版）" })).toHaveAttribute("aria-checked", String(checked));
      await page.keyboard.press("Escape");
    };
    const toggleMultiSession = async () => {
      const viewMenu = await openAppMenu(page, "显示");
      await viewMenu.getByRole("menuitemradio", { name: "多会话（测试版）" }).click();
    };
    await expectMultiSessionState(false);

    await page.locator('input[type="file"]').setInputFiles({
      name: "legacy-mixed-sessions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacyArchive))
    });

    const sessionRail = page.getByRole("navigation", { name: "切换会话" });
    await expect(sessionRail).toHaveCount(0);

    await toggleMultiSession();
    await expectMultiSessionState(true);

    await expect(sessionRail).toBeVisible();
    await expect(sessionRail.getByRole("button", { name: /切换到林夏/ })).toBeVisible();
    const groupButton = sessionRail.getByRole("button", { name: /切换到合同核对群/ });
    await expect(groupButton.locator(".wechat-group-avatar")).toBeVisible();
    await groupButton.click();
    await expect(page.locator('[aria-label="9:16 微信群聊预览"]')).toBeVisible();
    await expect(page.locator(".wechat-topbar-group-avatar.wechat-group-avatar")).toBeVisible();
    await expect(page.locator(".wechat-speaker-name")).toContainText(["周律师", "王总"]);

    await toggleMultiSession();
    await expectMultiSessionState(false);
    await expect(sessionRail).toHaveCount(0);

    await toggleMultiSession();
    await expectMultiSessionState(true);
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
    const viewMenu = await openAppMenu(page, "显示");
    await expect(viewMenu.getByRole("menuitemradio", { name: "多会话（测试版）" })).toHaveCount(0);
  });
});
