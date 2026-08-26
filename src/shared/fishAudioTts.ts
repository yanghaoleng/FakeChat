import { getCharacter, messageVoiceText, type Character, type ChatMessage, type DramaProject } from "./schema";
import { getAudioDurationMs, type TtsClip } from "./edgeTts";

const fishTtsEndpoint = "/api/fish-tts";
export const fishAudioModel = "s2.1-pro-free";

export function fishReadableText(message: ChatMessage): string {
  if (message.type === "system" || message.type === "image" || message.type === "meme" || message.type === "music") return "";
  return messageVoiceText(message).trim();
}

export type FishVoiceHint = {
  characterId: string;
  name: string;
  side: Character["side"];
  avatarGender?: Character["avatarGender"];
  voicePreset?: Character["voicePreset"];
  voiceDescription: string;
};

export function fishVoiceHintFor(character: Character): FishVoiceHint {
  return {
    characterId: character.id,
    name: character.name,
    side: character.side,
    avatarGender: character.avatarGender,
    voicePreset: character.voicePreset,
    voiceDescription: character.voiceDescription
  };
}

export async function synthesizeFishAudio(text: string, apiKey: string, voice: FishVoiceHint, signal?: AbortSignal): Promise<Blob> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error("Fish Audio 文本为空");

  const response = await fetch(fishTtsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: cleanText,
      apiKey: apiKey.trim() || undefined,
      voice
    }),
    signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Fish Audio 返回 ${response.status}${detail ? `：${detail.slice(0, 180)}` : ""}`);
  }

  return response.blob();
}

export async function synthesizeFishMessageClip(project: DramaProject, message: ChatMessage, apiKey: string, signal?: AbortSignal): Promise<TtsClip | undefined> {
  const text = fishReadableText(message);
  if (!text.trim()) return undefined;

  const blob = await synthesizeFishAudio(text, apiKey, fishVoiceHintFor(getCharacter(project, message)), signal);
  const durationMs = await getAudioDurationMs(blob);
  return {
    messageId: message.id,
    blob,
    url: URL.createObjectURL(blob),
    durationMs,
    source: "fish"
  };
}
