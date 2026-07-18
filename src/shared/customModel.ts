import type { DeepSeekCompletionConfig } from "./storyGeneration/contract";

export type CustomModelRegion = "domestic" | "global";

export type CustomModelProvider = {
  id: string;
  region: CustomModelRegion;
  label: string;
  baseUrl: string;
  model: string;
};

export type CustomModelSettings = {
  enabled: boolean;
  providerId: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type CustomModelTestState = "idle" | "testing" | "success" | "error";

export const customModelCookieName = "ququ-custom-model-settings-v1";

export const customModelProviders: CustomModelProvider[] = [
  { id: "deepseek", region: "domestic", label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash" },
  { id: "qwen", region: "domestic", label: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  { id: "zhipu", region: "domestic", label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  { id: "moonshot", region: "domestic", label: "月之暗面", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { id: "doubao", region: "domestic", label: "豆包", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-seed-1-6-flash-250615" },
  { id: "siliconflow", region: "domestic", label: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
  { id: "openai", region: "global", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  { id: "claude-openrouter", region: "global", label: "Claude（OpenRouter）", baseUrl: "https://openrouter.ai/api/v1", model: "anthropic/claude-3.5-haiku" },
  { id: "gemini", region: "global", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  { id: "openrouter", region: "global", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1-mini" },
  { id: "groq", region: "global", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" }
];

export const defaultCustomModelProvider = customModelProviders[0];

export const defaultCustomModelSettings: CustomModelSettings = {
  enabled: false,
  providerId: defaultCustomModelProvider.id,
  apiKey: "",
  baseUrl: defaultCustomModelProvider.baseUrl,
  model: defaultCustomModelProvider.model
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function encodeCookieValue(value: string) {
  return btoa(encodeURIComponent(value));
}

function decodeCookieValue(value: string) {
  return decodeURIComponent(atob(value));
}

export function providerForId(providerId: string) {
  return customModelProviders.find((provider) => provider.id === providerId) || defaultCustomModelProvider;
}

export function normalizeCustomModelSettings(value: Partial<CustomModelSettings> | undefined): CustomModelSettings {
  const provider = providerForId(value?.providerId || defaultCustomModelProvider.id);
  return {
    enabled: Boolean(value?.enabled),
    providerId: provider.id,
    apiKey: (value?.apiKey || "").trim(),
    baseUrl: normalizeBaseUrl(value?.baseUrl || provider.baseUrl),
    model: (value?.model || provider.model).trim()
  };
}

export function readCustomModelSettingsCookie(): CustomModelSettings {
  if (typeof document === "undefined") return defaultCustomModelSettings;
  const prefix = `${customModelCookieName}=`;
  const raw = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return defaultCustomModelSettings;

  try {
    return normalizeCustomModelSettings(JSON.parse(decodeCookieValue(raw)) as Partial<CustomModelSettings>);
  } catch {
    return defaultCustomModelSettings;
  }
}

export function writeCustomModelSettingsCookie(settings: CustomModelSettings) {
  if (typeof document === "undefined") return;
  const normalized = normalizeCustomModelSettings(settings);
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${customModelCookieName}=${encodeCookieValue(JSON.stringify(normalized))}; Path=/; Max-Age=315360000; SameSite=Lax${secure}`;
}

export function customModelToCompletionConfig(settings: CustomModelSettings): DeepSeekCompletionConfig | undefined {
  const normalized = normalizeCustomModelSettings(settings);
  if (!normalized.enabled || !normalized.apiKey || !normalized.baseUrl || !normalized.model) return undefined;
  return {
    apiKey: normalized.apiKey,
    baseUrl: normalized.baseUrl,
    model: normalized.model,
    source: "custom",
    label: providerForId(normalized.providerId).label
  };
}
