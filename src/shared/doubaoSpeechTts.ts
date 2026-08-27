import { getCharacter, type ChatMessage, type DramaProject } from "./schema";
import { getAudioDurationMs, type TtsClip } from "./edgeTts";
import { fishReadableText, fishVoiceHintFor, type FishVoiceHint } from "./fishAudioTts";

const doubaoTtsEndpoint = "/api/doubao-tts";
export const doubaoSpeechModel = "seed-tts-2.0";

export async function synthesizeDoubaoAudio(text: string, apiKey: string, voice: FishVoiceHint, signal?: AbortSignal): Promise<Blob> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error("豆包语音文本为空");
  if (!apiKey.trim()) throw new Error("请先填写豆包语音 API Key");

  const response = await fetch(doubaoTtsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cleanText, apiKey: apiKey.trim(), voice }),
    signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`豆包语音返回 ${response.status}${detail ? `：${detail.slice(0, 180)}` : ""}`);
  }

  return response.blob();
}

export async function synthesizeDoubaoMessageClip(project: DramaProject, message: ChatMessage, apiKey: string, signal?: AbortSignal): Promise<TtsClip | undefined> {
  const text = fishReadableText(message);
  if (!text) return undefined;
  const blob = await synthesizeDoubaoAudio(text, apiKey, fishVoiceHintFor(getCharacter(project, message)), signal);
  const durationMs = await getAudioDurationMs(blob);
  return {
    messageId: message.id,
    blob,
    url: URL.createObjectURL(blob),
    durationMs,
    source: "doubao"
  };
}
