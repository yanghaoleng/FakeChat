import { afterEach, describe, expect, it, vi } from "vitest";
import { testCustomModelConnection } from "../server/customModelTest";

describe("custom model connection test", () => {
  afterEach(() => vi.restoreAllMocks());

  it("tests the configured model with a minimal chat completion", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "pong" } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(testCustomModelConnection({
      apiKey: "test-key",
      baseUrl: "https://example.test/v1/",
      model: "example-model"
    })).resolves.toEqual({ ok: true, method: "chat", message: "模型已测试连通" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json"
      }
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      model: "example-model",
      max_tokens: 4
    });
  });

  it("does not accept a reachable API when the selected model fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("model_not_found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    await expect(testCustomModelConnection({
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "missing-model"
    })).rejects.toThrow("接口可访问，但当前模型测试失败：404 model_not_found");
  });
});
