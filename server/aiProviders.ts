import {
  aiProviderForId,
  defaultAiProviderId,
  type AiProviderId
} from "../src/shared/aiProviders.js";
import type { DeepSeekCompletionConfig } from "../src/shared/storyGeneration/contract.js";

function cleanOptional(value: string | undefined) {
  const next = value?.trim();
  return next || undefined;
}

function cleanBaseUrl(value: string | undefined, fallback: string) {
  return (cleanOptional(value) || fallback).replace(/\/+$/, "");
}

export type ManagedAiRuntimeConfig = DeepSeekCompletionConfig & {
  providerId: AiProviderId;
};

export function getManagedAiConfig(providerId: AiProviderId = defaultAiProviderId): ManagedAiRuntimeConfig {
  const provider = aiProviderForId(providerId);

  if (provider.id === "doubao") {
    return {
      providerId: provider.id,
      apiKey: cleanOptional(process.env.DOUBAO_API_KEY) || cleanOptional(process.env.ARK_API_KEY) || "",
      baseUrl: cleanBaseUrl(process.env.DOUBAO_BASE_URL || process.env.ARK_BASE_URL, provider.baseUrl),
      model: cleanOptional(process.env.DOUBAO_MODEL) || cleanOptional(process.env.ARK_MODEL) || provider.model,
      source: "server",
      label: provider.shortLabel
    };
  }

  if (provider.id === "v4flash") {
    return {
      providerId: provider.id,
      apiKey: cleanOptional(process.env.DEEPSEEK_API_KEY) || cleanOptional(process.env.COMPANY_DEEPSEEK_API_KEY) || "",
      baseUrl: cleanBaseUrl(process.env.DEEPSEEK_BASE_URL, provider.baseUrl),
      model: cleanOptional(process.env.DEEPSEEK_MODEL) || provider.model,
      source: "server",
      label: provider.shortLabel
    };
  }

  return {
    providerId: provider.id,
    apiKey: cleanOptional(process.env.ZHIPU_API_KEY) || "",
    baseUrl: cleanBaseUrl(process.env.ZHIPU_BASE_URL, provider.baseUrl),
    model: cleanOptional(process.env.ZHIPU_MODEL) || provider.model,
    source: "server",
    label: provider.shortLabel
  };
}
