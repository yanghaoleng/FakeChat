import "dotenv/config";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getCharacter, isVoiceMessage, messageVoiceText, type Character, type ChatMessage, type DramaProject } from "../src/shared/schema";
import { AUDIO_DIR, publicUrl } from "./paths";

const execFileAsync = promisify(execFile);

interface VoiceProfile {
  preset: "young_real_female" | "young_male";
  workerDescription: string;
}

const VOICE_PROFILES: Record<VoiceProfile["preset"], VoiceProfile> = {
  young_real_female: {
    preset: "young_real_female",
    workerDescription:
      "固定使用同一个非常年轻的真实女生声音，18到22岁，普通话自然，音色清亮但不尖，有轻微气声和真人呼吸感，情绪细腻，像微信语音，不要播音腔，不要机器人腔。"
  },
  young_male: {
    preset: "young_male",
    workerDescription:
      "固定使用同一个特别青年音的真实男生声音，20岁出头，普通话自然，音色干净偏低一点，语气松弛有少年感，像微信语音，不要播音腔，不要机器人腔。"
  }
};

export function resolveVoiceProfile(character: Character): VoiceProfile {
  if (character.voicePreset && VOICE_PROFILES[character.voicePreset]) {
    return VOICE_PROFILES[character.voicePreset];
  }

  if (/女|女生|少女|漂亮|委屈|冷感|脆弱/.test(character.voiceDescription) || character.side === "left") {
    return VOICE_PROFILES.young_real_female;
  }

  return VOICE_PROFILES.young_male;
}

function getVoxCpmWorkerUrl(): string {
  const workerUrl = process.env.VOXCPM_WORKER_URL?.trim().replace(/\/$/, "");
  if (!workerUrl) {
    throw new Error("未配置 VOXCPM_WORKER_URL。语音现在只使用 VoxCPM worker，不再回退到 macOS say 或占位 TTS。");
  }

  const parsed = new URL(workerUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("VOXCPM_WORKER_URL 必须以 http:// 或 https:// 开头。");
  }
  return workerUrl;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function audioKey(message: ChatMessage, character: Character, profile: VoiceProfile, workerUrl: string) {
  const hash = createHash("sha1");
  hash.update(
    JSON.stringify({
      text: messageVoiceText(message),
      emotion: message.emotion,
      characterVoiceId: character.voiceId,
      characterVoiceDescription: character.voiceDescription,
      preset: profile.preset,
      workerDescription: profile.workerDescription,
      workerUrl,
      audioEngine: "voxcpm-worker-only",
      cacheVersion: 4
    })
  );
  return hash.digest("hex").slice(0, 18);
}

async function probeDurationMs(filePath: string): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath]);
    const seconds = Number(stdout.trim());
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
  } catch {
    return undefined;
  }
}

async function callVoxCpmWorker(workerUrl: string, outFile: string, message: ChatMessage, character: Character, profile: VoiceProfile): Promise<void> {
  const voiceDescription = `${profile.workerDescription} 角色补充：${character.voiceDescription} 当前情绪：${message.emotion}。`;

  const response = await fetch(`${workerUrl}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: messageVoiceText(message),
      voice_description: voiceDescription,
      voice_preset: profile.preset,
      voice_id: character.voiceId,
      emotion: message.emotion,
      format: "wav",
      sample_rate: 48000
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    throw new Error(`VoxCPM worker 返回 ${response.status}：${await response.text().catch(() => "")}`);
  }
  const payload = (await response.json()) as { audio_base64?: string; audioUrl?: string; path?: string };

  if (payload.audio_base64) {
    await writeFile(outFile, Buffer.from(payload.audio_base64, "base64"));
    return;
  }

  if (payload.audioUrl) {
    const audioResponse = await fetch(payload.audioUrl, { signal: AbortSignal.timeout(60000) });
    if (!audioResponse.ok) {
      throw new Error(`VoxCPM worker 提供的 audioUrl 下载失败：${audioResponse.status}`);
    }
    await writeFile(outFile, Buffer.from(await audioResponse.arrayBuffer()));
    return;
  }

  if (payload.path && (await exists(payload.path))) {
    await copyFile(payload.path, outFile);
    return;
  }

  throw new Error("VoxCPM worker 响应里没有 audio_base64、audioUrl 或有效本地 path。");
}

export async function synthesizeProject(project: DramaProject): Promise<DramaProject> {
  await mkdir(AUDIO_DIR, { recursive: true });
  const workerUrl = getVoxCpmWorkerUrl();
  const messages: ChatMessage[] = [];

  for (const message of project.messages) {
    if (!isVoiceMessage(message) || !messageVoiceText(message).trim()) {
      messages.push(message);
      continue;
    }

    const character = getCharacter(project, message);
    const profile = resolveVoiceProfile(character);
    const key = audioKey(message, character, profile, workerUrl);
    const fileName = `${key}.wav`;
    const outFile = path.join(AUDIO_DIR, fileName);

    if (!(await exists(outFile))) {
      await callVoxCpmWorker(workerUrl, outFile, message, character, profile);
    }

    const durationMs = await probeDurationMs(outFile);
    messages.push({
      ...message,
      audioPath: outFile,
      audioUrl: publicUrl("audio", fileName),
      durationMs: durationMs ?? message.durationMs
    });
  }

  return { ...project, messages };
}
