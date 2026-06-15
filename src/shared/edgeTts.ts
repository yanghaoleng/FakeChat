import { getCharacter, isVoiceMessage, messageVoiceText, type ChatMessage, type DramaProject } from "./schema";

const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const edgeTtsEndpoint = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const edgeGecVersion = "1-130.0.2849.68";
const windowsEpochOffsetMs = 11644473600000n;
const fiveMinuteTicks = 3000000000n;

export type VoiceRole = "female" | "male";

export type VoiceSpec = {
  role: VoiceRole;
  voiceName: string;
  label: string;
};

export const fixedVoices: Record<VoiceRole, VoiceSpec> = {
  female: {
    role: "female",
    voiceName: "zh-CN-XiaoxiaoNeural",
    label: "小晓 · 女声"
  },
  male: {
    role: "male",
    voiceName: "zh-CN-YunxiNeural",
    label: "云希 · 男声"
  }
};

export type TtsClip = {
  messageId: string;
  blob: Blob;
  url: string;
  durationMs: number;
};

export type TtsClipMap = Record<string, TtsClip>;

function makeConnectionId() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function generateSecMsGec() {
  const ticks = (BigInt(Date.now()) + windowsEpochOffsetMs) * 10000n;
  const roundedTicks = ticks - (ticks % fiveMinuteTicks);
  return sha256Hex(`${roundedTicks}${trustedClientToken}`);
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function edgeHeaders(headers: Record<string, string>, body: string) {
  return `${Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\r\n")}\r\n\r\n${body}`;
}

function stripBinaryHeader(buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer);
  if (view.length > 2) {
    const headerLength = (view[0] << 8) + view[1];
    const audioOffset = headerLength + 2;
    if (headerLength > 0 && audioOffset < view.length) {
      const header = new TextDecoder().decode(view.slice(2, audioOffset));
      if (header.includes("Path:audio")) return view.slice(audioOffset);
    }
  }

  let headerEnd = -1;
  for (let index = 0; index < view.length - 3; index += 1) {
    if (view[index] === 13 && view[index + 1] === 10 && view[index + 2] === 13 && view[index + 3] === 10) {
      headerEnd = index + 4;
      break;
    }
  }
  return headerEnd === -1 ? view : view.slice(headerEnd);
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

async function getAudioDurationMs(blob: Blob): Promise<number> {
  const audio = new Audio(URL.createObjectURL(blob));
  try {
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
      audio.addEventListener("error", () => reject(new Error("无法读取 Edge TTS 音频时长")), { once: true });
    });
    return Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 1200;
  } finally {
    URL.revokeObjectURL(audio.src);
  }
}

export function voiceForMessage(project: DramaProject, message: ChatMessage): VoiceSpec {
  const character = getCharacter(project, message);
  return character.side === "left" ? fixedVoices.female : fixedVoices.male;
}

export async function synthesizeEdgeTts(text: string, voice: VoiceSpec): Promise<Blob> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error("TTS 文本为空");

  const requestId = makeConnectionId();
  const secMsGec = await generateSecMsGec();
  const params = new URLSearchParams({
    TrustedClientToken: trustedClientToken,
    ConnectionId: makeConnectionId(),
    "Sec-MS-GEC": secMsGec,
    "Sec-MS-GEC-Version": edgeGecVersion
  });
  const socket = new WebSocket(`${edgeTtsEndpoint}?${params.toString()}`);
  socket.binaryType = "arraybuffer";

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new Error("Edge TTS 连接超时"));
    }, 30000);

    socket.addEventListener("open", () => {
      const now = new Date().toISOString();
      socket.send(
        edgeHeaders(
          {
            "X-Timestamp": now,
            "Content-Type": "application/json; charset=utf-8",
            Path: "speech.config"
          },
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: false,
                    wordBoundaryEnabled: false
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                }
              }
            }
          })
        )
      );

      socket.send(
        edgeHeaders(
          {
            "X-RequestId": requestId,
            "X-Timestamp": now,
            "Content-Type": "application/ssml+xml",
            Path: "ssml"
          },
          `<speak version="1.0" xml:lang="zh-CN"><voice name="${voice.voiceName}"><prosody rate="+0%" pitch="+0Hz">${xmlEscape(cleanText)}</prosody></voice></speak>`
        )
      );
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          window.clearTimeout(timeout);
          socket.close();
          resolve(new Blob(chunks, { type: "audio/mpeg" }));
        }
        return;
      }

      const audio = stripBinaryHeader(event.data);
      if (audio.length) chunks.push(toArrayBuffer(audio));
    });

    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Edge TTS 连接失败，可能被浏览器或网络策略拦截"));
    });

    socket.addEventListener("close", () => {
      window.clearTimeout(timeout);
      if (!chunks.length) reject(new Error("Edge TTS 没有返回音频数据"));
    });
  });
}

export async function synthesizeMessageClip(project: DramaProject, message: ChatMessage): Promise<TtsClip | undefined> {
  if (!isVoiceMessage(message)) return undefined;
  const text = messageVoiceText(message);
  if (!text.trim()) return undefined;

  const blob = await synthesizeEdgeTts(text, voiceForMessage(project, message));
  const durationMs = await getAudioDurationMs(blob);
  return {
    messageId: message.id,
    blob,
    url: URL.createObjectURL(blob),
    durationMs
  };
}
