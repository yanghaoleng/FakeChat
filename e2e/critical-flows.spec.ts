import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { sampleProject } from "../src/shared/sampleProject";

const errorOverlaySelector = [
  ".vite-error-overlay",
  "#webpack-dev-server-client-overlay",
  "[data-nextjs-dialog]"
].join(",");

async function expectHealthyAppShell(page: Page) {
  await expect(page).toHaveTitle("蛐蛐模拟器");
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
    await expect(settingsDialog.getByRole("combobox")).toHaveCount(3);
    const previewSelect = settingsDialog.getByRole("combobox", { name: "预览模式" });
    await previewSelect.selectOption("video");

    await expect(previewSelect).toHaveValue("video");
    await expect(page.locator(".player-frame")).toBeVisible();
    await expect(page.locator('[aria-label="正在加载视频预览"]')).toHaveCount(0);
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
    const multiSessionSwitch = settingsDialog.getByRole("switch", { name: "多会话（测试版）" });
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "false");
    await settingsDialog.getByRole("button", { name: "关闭设置" }).click();
    await expect(settingsDialog).toHaveCount(0);

    await page.locator('input[type="file"]').setInputFiles({
      name: "legacy-mixed-sessions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacyArchive))
    });

    const sessionRail = page.getByRole("navigation", { name: "切换会话" });
    await expect(sessionRail).toHaveCount(0);

    await page.getByRole("button", { name: "打开设置" }).click();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "true");
    await settingsDialog.getByRole("button", { name: "关闭设置" }).click();
    await expect(settingsDialog).toHaveCount(0);

    await expect(sessionRail).toBeVisible();
    await expect(sessionRail.getByRole("button", { name: /切换到林夏/ })).toBeVisible();
    const groupButton = sessionRail.getByRole("button", { name: /切换到合同核对群/ });
    await expect(groupButton.locator(".wechat-group-avatar")).toBeVisible();
    await groupButton.click();
    await expect(page.locator('[aria-label="9:16 微信群聊预览"]')).toBeVisible();
    await expect(page.locator(".wechat-topbar-group-avatar.wechat-group-avatar")).toBeVisible();
    await expect(page.locator(".wechat-speaker-name")).toContainText(["周律师", "王总"]);

    await page.getByRole("button", { name: "打开设置" }).click();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "false");
    await settingsDialog.getByRole("button", { name: "关闭设置" }).click();
    await expect(settingsDialog).toHaveCount(0);
    await expect(sessionRail).toHaveCount(0);

    await page.getByRole("button", { name: "打开设置" }).click();
    await multiSessionSwitch.click();
    await expect(multiSessionSwitch).toHaveAttribute("aria-checked", "true");
    await settingsDialog.getByRole("button", { name: "关闭设置" }).click();
    await expect(settingsDialog).toHaveCount(0);
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
