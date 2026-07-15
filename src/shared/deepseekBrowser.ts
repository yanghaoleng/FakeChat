import type { PromptCard } from "./linearStory.js";
import type { DramaProject } from "./schema.js";
import {
  DEFAULT_DEEPSEEK_MODEL,
  generateDeepSeekStorySegmentWithConfig
} from "./storyGeneration/deepseekCore.js";
import type {
  DeepSeekCompletionConfig,
  DeepSeekSegmentResult
} from "./storyGeneration/contract.js";

declare const __DEEPSEEK_BROWSER_CONFIG__: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultProvider?: BrowserDeepSeekProviderConfig;
};

type BrowserDeepSeekProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

function cleanBaseUrl(value: string) {
  return (value || "https://api.deepseek.com").replace(/\/+$/, "");
}

function cleanProviderConfig(
  value: BrowserDeepSeekProviderConfig | undefined,
  fallback: BrowserDeepSeekProviderConfig,
  source: DeepSeekCompletionConfig["source"],
  label: string
): DeepSeekCompletionConfig {
  return {
    apiKey: (value?.apiKey || fallback.apiKey || "").trim(),
    baseUrl: cleanBaseUrl(value?.baseUrl || fallback.baseUrl || "https://api.deepseek.com"),
    model: (value?.model || fallback.model || DEFAULT_DEEPSEEK_MODEL).trim(),
    source,
    label
  };
}

function getDefaultBrowserDeepSeekConfig() {
  return cleanProviderConfig(
    __DEEPSEEK_BROWSER_CONFIG__.defaultProvider,
    {
      apiKey: __DEEPSEEK_BROWSER_CONFIG__.apiKey,
      baseUrl: __DEEPSEEK_BROWSER_CONFIG__.baseUrl,
      model: __DEEPSEEK_BROWSER_CONFIG__.model
    },
    "default",
    "浏览器公开 Key"
  );
}

export function getBrowserDeepSeekConfig() {
  return getDefaultBrowserDeepSeekConfig();
}

export function hasBrowserDeepSeekKey() {
  return Boolean(getDefaultBrowserDeepSeekConfig().apiKey);
}

export async function resolveBrowserDeepSeekConfig(project?: DramaProject) {
  void project;
  return getDefaultBrowserDeepSeekConfig();
}

export async function getBrowserDeepSeekStatusText(project?: DramaProject) {
  if (!hasBrowserDeepSeekKey()) return "纯前端静态模式已就绪";
  const provider = await resolveBrowserDeepSeekConfig(project);
  return provider.apiKey ? `DeepSeek 前端直连已就绪（${provider.label}）` : "纯前端静态模式已就绪";
}

export async function generateDeepSeekStorySegment({
  project,
  prompt,
  promptCards,
  signal
}: {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
  signal?: AbortSignal;
}): Promise<DeepSeekSegmentResult> {
  const config = await resolveBrowserDeepSeekConfig(project);
  return generateDeepSeekStorySegmentWithConfig({
    project,
    prompt,
    promptCards,
    config,
    logLabel: "deepseek-browser-default",
    signal
  });
}

// Compatibility surface: existing callers can keep importing these from the
// browser module while new server/core code depends on the stable modules.
export {
  buildDeepSeekRequest,
  generateDeepSeekStorySegmentWithConfig,
  viralNamedCharacterStyleInstruction
} from "./storyGeneration/deepseekCore.js";
export type {
  DeepSeekCompletionConfig,
  DeepSeekPromptMessage,
  DeepSeekRequestBody,
  DeepSeekRequestInput,
  DeepSeekSegmentResult,
  GenerateDeepSeekSegmentInput
} from "./storyGeneration/contract.js";
