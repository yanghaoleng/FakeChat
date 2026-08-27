export const speechProviderIds = ["fish", "doubao"] as const;

export type SpeechProviderId = typeof speechProviderIds[number];

export const defaultSpeechProviderId: SpeechProviderId = "fish";
export const speechProviderStorageKey = "ququ-speech-provider-v1";

export function isSpeechProviderId(value: string | null | undefined): value is SpeechProviderId {
  return speechProviderIds.includes(value as SpeechProviderId);
}

export function readSpeechProviderId(): SpeechProviderId {
  if (typeof window === "undefined") return defaultSpeechProviderId;
  const stored = window.localStorage.getItem(speechProviderStorageKey);
  return isSpeechProviderId(stored) ? stored : defaultSpeechProviderId;
}

export function writeSpeechProviderId(providerId: SpeechProviderId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(speechProviderStorageKey, providerId);
}

export function speechProviderLabel(providerId: SpeechProviderId) {
  return providerId === "doubao" ? "豆包 Seed-TTS 2.0" : "Fish Audio";
}
