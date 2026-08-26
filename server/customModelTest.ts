import { z } from "zod";

const customModelTestSchema = z.object({
  apiKey: z.string().trim().min(1, "API key 不能为空"),
  baseUrl: z.string().trim().url("Base URL 必须是有效 URL"),
  model: z.string().trim().min(1, "模型名不能为空")
});

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

async function readErrorSnippet(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return "";
  return text.replace(/\s+/g, " ").slice(0, 180);
}

export async function testCustomModelConnection(body: unknown) {
  const request = customModelTestSchema.parse(body);
  const baseUrl = normalizeBaseUrl(request.baseUrl);
  const headers = {
    Authorization: `Bearer ${request.apiKey}`,
    "Content-Type": "application/json"
  };

  const chatResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model,
      temperature: 0,
      max_tokens: 4,
      messages: [{ role: "user", content: "ping" }]
    }),
    signal: AbortSignal.timeout(18000)
  }).catch((error: unknown) => error);

  if (chatResponse instanceof Response && chatResponse.ok) {
    return { ok: true, method: "chat", message: "模型已测试连通" };
  }

  const modelsResponse = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(12000)
  }).catch((error: unknown) => error);

  if (chatResponse instanceof Response) {
    const snippet = await readErrorSnippet(chatResponse);
    if (modelsResponse instanceof Response && modelsResponse.ok) {
      throw new Error(`接口可访问，但当前模型测试失败：${chatResponse.status}${snippet ? ` ${snippet}` : ""}`);
    }
    throw new Error(`连通检测失败：${chatResponse.status}${snippet ? ` ${snippet}` : ""}`);
  }

  if (modelsResponse instanceof Response) {
    const snippet = await readErrorSnippet(modelsResponse);
    throw new Error(`连通检测失败：${modelsResponse.status}${snippet ? ` ${snippet}` : ""}`);
  }

  const error = chatResponse instanceof Error ? chatResponse : modelsResponse;
  throw new Error(error instanceof Error ? error.message : "连通检测失败");
}
