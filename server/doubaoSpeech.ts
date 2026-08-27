import { randomUUID } from "node:crypto";
import { z } from "zod";

export const doubaoSpeechEndpoint = "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse";
export const doubaoSpeechModel = "seed-tts-2.0";
export const doubaoFemaleSpeaker = "zh_female_vv_uranus_bigtts";
export const doubaoMaleSpeaker = "zh_male_m191_uranus_bigtts";

const doubaoSpeechRequestSchema = z.object({
  text: z.string().trim().min(1, "TTS text is required").max(1000, "TTS text is too long"),
  apiKey: z.string().trim().min(1, "请先填写豆包语音 API Key"),
  voice: z.object({
    side: z.enum(["left", "right"]).optional(),
    avatarGender: z.enum(["girl", "boy", "unknown"]).optional(),
    voicePreset: z.string().optional(),
    voiceDescription: z.string().optional()
  }).optional()
});

type DoubaoSpeechEvent = {
  code?: number;
  message?: string;
  data?: string;
};

function selectSpeaker(voice: z.infer<typeof doubaoSpeechRequestSchema>["voice"]) {
  if (voice?.avatarGender === "boy" || voice?.voicePreset === "young_male" || voice?.side === "right") {
    return doubaoMaleSpeaker;
  }
  return doubaoFemaleSpeaker;
}

export function parseDoubaoSpeechEvents(payload: string) {
  const chunks: Buffer[] = [];
  for (const line of payload.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;

    let event: DoubaoSpeechEvent;
    try {
      event = JSON.parse(raw) as DoubaoSpeechEvent;
    } catch {
      continue;
    }

    const code = event.code ?? 0;
    if (code !== 0 && code !== 20000000) {
      throw new Error(`豆包语音返回 ${code}${event.message ? `：${event.message}` : ""}`);
    }
    if (event.data) chunks.push(Buffer.from(event.data, "base64"));
  }

  if (!chunks.length) throw new Error("豆包语音没有返回音频");
  return Buffer.concat(chunks);
}

export async function synthesizeDoubaoSpeech(body: unknown) {
  const request = doubaoSpeechRequestSchema.parse(body);
  const speaker = selectSpeaker(request.voice);
  const upstream = await fetch(doubaoSpeechEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": request.apiKey,
      "X-Api-Resource-Id": doubaoSpeechModel,
      "X-Api-Request-Id": randomUUID()
    },
    body: JSON.stringify({
      user: { uid: "ququ-beta" },
      req_params: {
        text: request.text,
        speaker,
        sample_rate: 24000,
        audio_params: {
          format: "mp3",
          speech_rate: 0,
          loudness_rate: 0,
          bit_rate: 64000
        },
        additions: JSON.stringify({
          disable_markdown_filter: false,
          enable_latex_tn: false,
          aigc_watermark: true
        })
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`豆包语音返回 ${upstream.status}${detail ? `：${detail.replace(/\s+/g, " ").slice(0, 220)}` : ""}`);
  }

  return {
    audio: parseDoubaoSpeechEvents(await upstream.text()),
    model: doubaoSpeechModel,
    speaker
  };
}
