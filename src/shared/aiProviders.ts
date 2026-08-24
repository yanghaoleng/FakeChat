export const aiProviderIds = ["zhipu", "doubao", "v4flash"] as const;

export type AiProviderId = typeof aiProviderIds[number];
export type AiModelChoiceId = AiProviderId | "custom";

export type AiProvider = {
  id: AiProviderId;
  label: string;
  shortLabel: string;
  baseUrl: string;
  model: string;
  costNote: string;
};

export const aiProviders: readonly AiProvider[] = [
  {
    id: "zhipu",
    label: "智谱 GLM-4.7-Flash",
    shortLabel: "智谱 GLM-4.7-Flash",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.7-flash",
    costNote: "免费；GLM-4.5-Flash 已下线并自动升级到此版本"
  },
  {
    id: "doubao",
    label: "豆包 Seed-2.0-mini（速度快）",
    shortLabel: "豆包 Seed-2.0-mini（速度快）",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-2-0-mini-260215",
    costNote: "按量计费，适合低延迟、低成本生成"
  },
  {
    id: "v4flash",
    label: "DeepSeek V4 Flash",
    shortLabel: "DeepSeek V4 Flash",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    costNote: "保留原有 DeepSeek V4 Flash 配置"
  }
] as const;

export const selectableAiProviders = aiProviders.filter((provider) => provider.id !== "zhipu");

export const defaultAiProviderId: AiProviderId = "doubao";
export const aiProviderStorageKey = "ququ-ai-provider-v2";
const legacyAiProviderStorageKey = "ququ-ai-provider-v1";

export function isAiProviderId(value: string | null | undefined): value is AiProviderId {
  return aiProviderIds.includes(value as AiProviderId);
}

export function aiProviderForId(providerId: string | null | undefined): AiProvider {
  return aiProviders.find((provider) => provider.id === providerId)
    ?? aiProviders.find((provider) => provider.id === defaultAiProviderId)!;
}

export function readAiProviderId(): AiProviderId {
  if (typeof window === "undefined") return defaultAiProviderId;
  const stored = window.localStorage.getItem(aiProviderStorageKey);
  if (stored === "zhipu") {
    window.localStorage.setItem(aiProviderStorageKey, defaultAiProviderId);
    return defaultAiProviderId;
  }
  if (isAiProviderId(stored)) return stored;

  const legacyStored = window.localStorage.getItem(legacyAiProviderStorageKey);
  if (legacyStored === "doubao" || legacyStored === "v4flash") {
    window.localStorage.setItem(aiProviderStorageKey, legacyStored);
    return legacyStored;
  }
  return defaultAiProviderId;
}

export function writeAiProviderId(providerId: AiProviderId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(aiProviderStorageKey, providerId);
}
