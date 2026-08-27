import { expect, test } from "@playwright/test";

const betaBaseUrl = process.env.PLAYWRIGHT_BETA_BASE_URL;

test.describe("Beta 自定义大语言模型", () => {
  test.skip(!betaBaseUrl, "仅在 Beta 构建验收时运行");

  test("可填写、测试、保存并保持为当前模型", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let testRequest: Record<string, unknown> | undefined;
    await page.route("**/api/settings/deepseek/test", async (route) => {
      testRequest = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, method: "chat", message: "模型已测试连通" })
      });
    });

    await page.goto(betaBaseUrl!);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "打开菜单" }).click();
    await page.getByRole("button", { name: "模型", exact: true }).click();

    const modelMenu = page.getByRole("menu", { name: "模型", exact: true });
    await expect(modelMenu.getByRole("menuitemradio")).toHaveText([
      "豆包 Seed-2.0-mini（速度快）",
      "DeepSeek V4 Flash",
      "自定义大语言模型",
      "Fish 朗读",
      "豆包 Seed-TTS 2.0 朗读"
    ]);
    await expect(modelMenu.getByText("豆包语音 API（本标签页保存）")).toBeVisible();
    await modelMenu.getByRole("menuitemradio", { name: "自定义大语言模型" }).click();
    await expect(modelMenu.getByText("自定义大语言模型 API", { exact: true })).toBeVisible();

    await modelMenu.getByLabel("接口模板").selectOption("qwen");
    await expect(modelMenu.getByLabel("Base URL")).toHaveValue("https://dashscope.aliyuncs.com/compatible-mode/v1");
    await expect(modelMenu.getByLabel("模型名")).toHaveValue("qwen-plus");
    await modelMenu.getByLabel("API Key").fill("beta-test-key");
    await modelMenu.getByRole("button", { name: "测试并使用" }).click();

    await expect(modelMenu.getByRole("status")).toHaveText("模型已测试连通，已保存");
    expect(testRequest).toEqual({
      apiKey: "beta-test-key",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus"
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.reload();
    await page.getByRole("button", { name: "打开菜单" }).click();
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await expect(page.getByRole("menuitemradio", { name: "自定义大语言模型" })).toHaveAttribute("aria-checked", "true");
  });
});
