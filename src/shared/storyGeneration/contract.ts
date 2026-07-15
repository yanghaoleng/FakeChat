import type { PromptCard } from "../linearStory.js";
import type { Character, ChatMessage, ChatSession, DramaProject, MemeAsset } from "../schema.js";

/**
 * Stable contracts shared by browser, server and tests. Keep transport-specific
 * configuration out of this module so callers do not depend on a runtime.
 */
export type DeepSeekCompletionConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  source?: "default" | "server";
  label?: string;
};

export type DeepSeekSegmentResult = {
  card: PromptCard;
  messages: ChatMessage[];
  project: DramaProject;
  suggestedPrompt?: string;
  provider?: {
    source?: DeepSeekCompletionConfig["source"];
    label?: string;
    baseUrl: string;
    model: string;
  };
};

/**
 * The compact response contract requested from the model. Existing contacts
 * and sessions are omitted unless their topology changes; messages always
 * contain only the newly generated segment.
 *
 * `senderId` is the canonical name used in the AI boundary. `roleId` remains
 * accepted by the normalizer so archived mocks and older providers keep
 * working while the persisted schema migrates.
 */
export type GeneratedStoryDeltaMessage = Omit<ChatMessage, "id" | "senderId" | "roleId"> & {
  id?: string;
  senderId?: string;
  roleId?: string;
};

export type GeneratedStoryTopologyDelta = {
  title?: string;
  chatMode?: DramaProject["chatMode"];
  /** Complete roster after the topology change. Omit when unchanged. */
  characters?: Character[];
  /** Complete session list after the topology change. Omit when unchanged. */
  chatSessions?: ChatSession[];
};

export type GeneratedStoryDelta = {
  schemaVersion?: 1;
  newMessages: GeneratedStoryDeltaMessage[];
  topologyChanges?: GeneratedStoryTopologyDelta;
  /** Assets introduced by this segment only. */
  newAssets?: MemeAsset[];
  suggestedPrompt?: string;
};

export type NormalizedGeneratedStoryOutput = {
  format: "delta" | "full-project";
  project: DramaProject;
  suggestedPrompt?: string;
};

export type DeepSeekPromptMessage = {
  role: "system" | "user";
  content: string;
};

export type DeepSeekRequestBody = {
  model: string;
  temperature: number;
  response_format: { type: "json_object" };
  messages: DeepSeekPromptMessage[];
};

export type DeepSeekRequestInput = {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
  model: string;
  repairAttempt?: number;
};

export type GenerateDeepSeekSegmentInput = {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
  config: DeepSeekCompletionConfig;
  logLabel?: string;
  signal?: AbortSignal;
};
