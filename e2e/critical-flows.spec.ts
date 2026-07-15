import { expect, test, type Page } from "@playwright/test";
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
    const videoTab = page.getByRole("tab", { name: "视频版" });
    await videoTab.click();

    await expect(videoTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".player-frame")).toBeVisible();
    await expect(page.locator('[aria-label="正在加载视频预览"]')).toHaveCount(0);
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

  test("旧存档可迁移为私聊与群聊混合会话并切换", async ({ page }) => {
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
    await page.locator('input[type="file"]').setInputFiles({
      name: "legacy-mixed-sessions.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacyArchive))
    });

    const sessionRail = page.getByRole("navigation", { name: "切换会话" });
    await expect(sessionRail).toBeVisible();
    const groupButton = sessionRail.getByRole("button", { name: /切换到合同核对群/ });
    await expect(groupButton.locator(".wechat-group-avatar")).toBeVisible();
    await groupButton.click();
    await expect(page.locator('[aria-label="9:16 微信群聊预览"]')).toBeVisible();
    await expect(page.locator(".wechat-topbar-group-avatar.wechat-group-avatar")).toBeVisible();
    await expect(page.locator(".wechat-speaker-name")).toContainText(["周律师", "王总"]);

    await page.setViewportSize({ width: 390, height: 844 });
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
  });
});
