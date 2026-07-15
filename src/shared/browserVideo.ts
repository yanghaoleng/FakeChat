import { messageVoiceText, type ChatMessage, type DramaProject } from "./schema";
import type { JojoCssMemeCard, JojoCssMemeTone } from "./jojoMemeCards";
import { isJojoProject } from "./jojoProject";
import {
  avatarPresentationForCharacter,
  messagePresentationFor,
  type MessagePresentation
} from "./messagePresentation";
import { resolvePublicAssetPath } from "./publicPath";
import { buildTimeline, getDurationInFrames, getScrollY, type TimelineEntry } from "./timing";
import type { TtsClipMap } from "./edgeTts";

export type VideoExportResult = {
  blob: Blob;
  url: string;
  extension: "mp4" | "webm";
  mimeType: string;
  dispose?: () => void;
};

export type VideoExportProgress = {
  phase: "preparing" | "recording" | "done";
  progress: number;
};

const videoMimeTypes = [
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" as const },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" as const },
  { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" as const },
  { mimeType: "video/webm", extension: "webm" as const }
];
const exportSize = { width: 1280, height: 720 };
const progressUpdateIntervalMs = 200;
const disposedVideoExportResults = new WeakSet<VideoExportResult>();
type VisualSide = "left" | "right";
type ImageCache = {
  avatars: Map<string, HTMLImageElement>;
  media: Map<string, HTMLImageElement>;
  presentations: Map<string, MessagePresentation>;
};

export function disposeVideoExportResult(result: VideoExportResult | null | undefined) {
  if (!result || disposedVideoExportResults.has(result)) return;
  disposedVideoExportResults.add(result);
  if (result.dispose) result.dispose();
  else URL.revokeObjectURL(result.url);
}

function pickMimeType() {
  return videoMimeTypes.find((item) => MediaRecorder.isTypeSupported(item.mimeType)) || videoMimeTypes.at(-1)!;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const char of chars) {
    const next = `${line}${char}`;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

function parseGradientColors(value: string | undefined, fallback: [string, string]): [string, string] {
  const colors = value?.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/gi);
  return [colors?.[0] || fallback[0], colors?.[1] || colors?.[0] || fallback[1]];
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawImageContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.min(width / sourceWidth, height / sourceHeight, 1);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function preloadRenderImages(project: DramaProject) {
  const cache: ImageCache = {
    avatars: new Map(),
    media: new Map(),
    presentations: new Map()
  };

  await Promise.all(project.characters.map(async (character) => {
    const src = resolvePublicAssetPath(avatarPresentationForCharacter(character).source);
    if (!src) return;
    const image = await loadCanvasImage(src);
    if (image) cache.avatars.set(character.id, image);
  }));

  await Promise.all(project.messages.map(async (message) => {
    const presentation = messagePresentationFor(project, message, "canvas");
    cache.presentations.set(message.id, presentation);
    const src = presentation.media.kind === "image" || presentation.media.kind === "meme" || presentation.media.kind === "music"
      ? resolvePublicAssetPath(presentation.media.source)
      : undefined;
    if (!src) return;
    const image = await loadCanvasImage(src);
    if (image) cache.media.set(message.id, image);
  }));

  return cache;
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  project: DramaProject,
  message: ChatMessage,
  presentation: MessagePresentation,
  x: number,
  y: number,
  imageCache: ImageCache
) {
  const avatar = presentation.avatar;
  if (!avatar) return;
  const avatarImage = imageCache.avatars.get(avatar.characterId);
  const background = isJojoProject(project) ? "#eef3f9" : "#ebebeb";
  const radius = isJojoProject(project) ? 18 : 12;
  ctx.save();
  roundRect(ctx, x, y, 112, 112, radius);
  ctx.clip();
  let drewAvatarImage = false;
  if (avatarImage) {
    ctx.fillStyle = background;
    ctx.fillRect(x, y, 112, 112);
    try {
      drawImageCover(ctx, avatarImage, x, y, 112, 112);
      drewAvatarImage = true;
    } catch {
      // Cross-origin images without canvas permission fall back to initials.
    }
  }
  if (!drewAvatarImage) {
    const fallbackColors: [string, string] = message.side === "left" ? ["#f9a8d4", "#64748b"] : ["#0f172a", "#7c2d12"];
    const [startColor, endColor] = parseGradientColors(avatar.gradient, fallbackColors);
    const gradient = ctx.createLinearGradient(x, y, x + 112, y + 112);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, 112, 112);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 48px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(avatar.initial || avatar.name.slice(0, 1), x + 56, y + 57);
  }
  ctx.restore();
}

function drawTextBubble(ctx: CanvasRenderingContext2D, project: DramaProject, message: ChatMessage, visualSide: VisualSide, x: number, y: number, maxWidth: number) {
  ctx.font = "500 62px PingFang SC, Microsoft YaHei, sans-serif";
  const lines = wrapText(ctx, message.text || messageVoiceText(message), maxWidth - 112);
  const width = Math.min(maxWidth, Math.max(260, ...lines.map((line) => ctx.measureText(line).width + 112)));
  const height = Math.max(112, 62 * lines.length * 1.18 + 60);
  const jojoMode = isJojoProject(project);
  const bubbleColor = jojoMode && visualSide === "right" ? "#1677ff" : visualSide === "right" ? "#95ec69" : "#ffffff";
  const textColor = jojoMode && visualSide === "right" ? "#ffffff" : jojoMode ? "#162033" : "#111111";
  ctx.fillStyle = bubbleColor;
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.beginPath();
  if (visualSide === "left") {
    ctx.moveTo(x, y + 42);
    ctx.lineTo(x - 24, y + 60);
    ctx.lineTo(x, y + 78);
  } else {
    ctx.moveTo(x + width, y + 42);
    ctx.lineTo(x + width + 24, y + 60);
    ctx.lineTo(x + width, y + 78);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 56, y + 28 + index * 72);
  });
  return { width, height };
}

function drawTransfer(ctx: CanvasRenderingContext2D, message: ChatMessage, x: number, y: number) {
  ctx.fillStyle = "#f49a37";
  roundRect(ctx, x, y, 700, 228, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x + 92, y + 92, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 52px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("¥", x + 92, y + 94);
  ctx.textAlign = "left";
  ctx.font = "600 54px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText(`¥${(message.amount ?? 88).toFixed(2)}`, x + 170, y + 62);
  ctx.font = "400 34px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText(message.transferNote || message.text || "你发起了一笔转账", x + 170, y + 132);
  return { width: 700, height: 228 };
}

function drawImageCard(
  ctx: CanvasRenderingContext2D,
  message: ChatMessage,
  presentation: MessagePresentation,
  x: number,
  y: number,
  imageCache: ImageCache
) {
  if (presentation.media.kind !== "image") return { width: 700, height: 430 };
  const image = imageCache.media.get(message.id);
  const gradient = ctx.createLinearGradient(x, y, x + 700, y + 430);
  gradient.addColorStop(0, "#7c2d12");
  gradient.addColorStop(0.5, "#eab308");
  gradient.addColorStop(1, "#334155");
  roundRect(ctx, x, y, 700, 430, 10);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, 700, 430);
  let drewImage = false;
  if (image) {
    try {
      drawImageCover(ctx, image, x, y, 700, 430);
      drewImage = true;
    } catch {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x, y, 700, 430);
    }
  }
  if (!drewImage) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x, y, 700, 430);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = "650 44px PingFang SC, Microsoft YaHei, sans-serif";
    wrapText(ctx, presentation.media.description, 610).slice(0, 4).forEach((line, index) => {
      ctx.fillText(line, x + 42, y + 164 + index * 56);
    });
  }
  ctx.restore();
  return { width: 700, height: 430 };
}

const jojoMemeToneColors: Record<JojoCssMemeTone, { top: string; accent: string; ink: string }> = {
  jiaojiao: { top: "#c9f3ff", accent: "#7ddcff", ink: "#13233a" },
  lingdang: { top: "#c9f3ff", accent: "#7ddcff", ink: "#13233a" },
  zhuxiaodi: { top: "#c9f3ff", accent: "#7ddcff", ink: "#13233a" },
  xitong: { top: "#c9f3ff", accent: "#7ddcff", ink: "#13233a" },
  meeting: { top: "#c9f3ff", accent: "#7ddcff", ink: "#13233a" }
};

function drawJojoCssMemeCard(ctx: CanvasRenderingContext2D, card: JojoCssMemeCard, x: number, y: number) {
  const colors = jojoMemeToneColors[card.tone];
  const width = 250;
  const height = 250;
  ctx.save();
  roundRect(ctx, x, y, width, height, 32);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);

  const topGradient = ctx.createLinearGradient(x, y, x + width, y + 106);
  topGradient.addColorStop(0, colors.top);
  topGradient.addColorStop(1, colors.accent);
  ctx.fillStyle = topGradient;
  ctx.fillRect(x, y, width, 104);

  ctx.fillStyle = "#eef6ff";
  ctx.strokeStyle = "#d6e7f8";
  ctx.lineWidth = 3;
  roundRect(ctx, x + 26, y + 150, width - 52, 84, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x + 61, y + 40, 128, 128, 36);
  ctx.fill();
  const markGradient = ctx.createLinearGradient(x + 61, y + 40, x + 189, y + 168);
  markGradient.addColorStop(0, "#f8fdff");
  markGradient.addColorStop(1, "#dcf6ff");
  ctx.fillStyle = markGradient;
  roundRect(ctx, x + 69, y + 48, 112, 112, 30);
  ctx.fill();

  ctx.fillStyle = colors.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 98px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillStyle = "#1a75bc";
  ctx.fillText(card.mark, x + width / 2, y + 104);
  ctx.fillStyle = colors.ink;
  ctx.font = "850 29px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText(card.title, x + width / 2, y + 186);
  ctx.fillStyle = "#60768b";
  ctx.font = "500 23px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText(card.subtitle, x + width / 2, y + 222);
  ctx.restore();
}

function drawMeme(
  ctx: CanvasRenderingContext2D,
  message: ChatMessage,
  presentation: MessagePresentation,
  x: number,
  y: number,
  imageCache: ImageCache
) {
  if (presentation.media.kind !== "meme") return { width: 520, height: 360 };
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, 520, 360, 10);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cssCard = presentation.media.cssCard;
  if (cssCard) {
    drawJojoCssMemeCard(ctx, cssCard, x + 135, y + 48);
    return { width: 520, height: 360 };
  }
  const image = imageCache.media.get(message.id);
  if (image) {
    try {
      drawImageContain(ctx, image, x + 70, y + 34, 380, 240);
    } catch {
      ctx.fillStyle = "#111111";
      ctx.font = "800 62px PingFang SC, Microsoft YaHei, sans-serif";
      ctx.fillText(message.text || "表情", x + 260, y + 180);
    }
    ctx.fillStyle = "#111111";
    ctx.font = "700 34px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.fillText(message.text || "表情", x + 260, y + 308);
  } else {
    ctx.fillStyle = "#111111";
    ctx.font = "800 62px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.fillText(message.text || "表情", x + 260, y + 180);
  }
  return { width: 520, height: 360 };
}

function drawMusic(
  ctx: CanvasRenderingContext2D,
  message: ChatMessage,
  presentation: MessagePresentation,
  x: number,
  y: number,
  imageCache: ImageCache
) {
  if (presentation.media.kind !== "music") return;
  const media = presentation.media;
  const cover = imageCache.media.get(message.id);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, 700, 360, 10);
  ctx.fill();

  if (cover) drawImageCover(ctx, cover, x + 440, y + 28, 230, 230);
  else {
    ctx.fillStyle = "#dedede";
    ctx.fillRect(x + 440, y + 28, 230, 230);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 555, y + 143, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + 544, y + 121);
  ctx.lineTo(x + 582, y + 143);
  ctx.lineTo(x + 544, y + 165);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#111111";
  ctx.font = "650 46px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(media.title.slice(0, 18), x + 38, y + 38);
  ctx.fillStyle = "#707070";
  ctx.font = "31px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(media.artist.slice(0, 22), x + 38, y + 108);
  ctx.fillStyle = "#929292";
  ctx.font = "27px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(media.lyric.slice(0, 27), x + 38, y + 218);

  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 286);
  ctx.lineTo(x + 700, y + 286);
  ctx.stroke();
  ctx.fillStyle = "#e83835";
  ctx.beginPath();
  ctx.arc(x + 52, y + 323, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("♪", x + 44, y + 310);
  ctx.fillStyle = "#999999";
  ctx.font = "25px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("网易云音乐", x + 82, y + 308);
}

function drawGroupSpeakerName(
  ctx: CanvasRenderingContext2D,
  presentation: MessagePresentation,
  visualSide: VisualSide,
  x: number,
  y: number,
  width = 0
) {
  if (!presentation.speakerName) return;
  ctx.fillStyle = "#777777";
  ctx.font = "400 30px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = visualSide === "right" ? "right" : "left";
  ctx.fillText(presentation.speakerName, visualSide === "right" ? x + width : x, y + 4);
}

function drawMessage(ctx: CanvasRenderingContext2D, project: DramaProject, entry: TimelineEntry, y: number, imageCache: ImageCache) {
  const message = entry.message;
  const presentation = imageCache.presentations.get(message.id) ?? messagePresentationFor(project, message, "canvas");
  const opacity = 1;
  ctx.globalAlpha = opacity;

  if (presentation.isSystem) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    roundRect(ctx, 560, y, 400, 70, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "400 30px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message.text, 760, y + 35);
    return;
  }

  const avatarY = y;
  const bubbleY = y + (presentation.speakerName ? 44 : 0);
  const leftAvatarX = 70;
  const rightAvatarX = project.canvas.width - 70 - 112;
  const leftBubbleX = leftAvatarX + 112 + 52;
  const visualSide: VisualSide = presentation.visualSide === "right" ? "right" : "left";

  if (visualSide === "left") {
    drawAvatar(ctx, project, message, presentation, leftAvatarX, avatarY, imageCache);
    drawGroupSpeakerName(ctx, presentation, visualSide, leftBubbleX, y);
    if (message.type === "transfer") drawTransfer(ctx, message, leftBubbleX, bubbleY);
    else if (message.type === "image") drawImageCard(ctx, message, presentation, leftBubbleX, bubbleY, imageCache);
    else if (message.type === "meme") drawMeme(ctx, message, presentation, leftBubbleX, bubbleY, imageCache);
    else if (message.type === "music") drawMusic(ctx, message, presentation, leftBubbleX, bubbleY, imageCache);
    else drawTextBubble(ctx, project, message, visualSide, leftBubbleX, bubbleY, 980);
  } else {
    const maxBubbleWidth = 980;
    const probeX = 0;
    let size = { width: 520, height: 112 };
    if (message.type === "transfer") size = { width: 700, height: 228 };
    else if (message.type === "image") size = { width: 700, height: 430 };
    else if (message.type === "meme") size = { width: 520, height: 360 };
    else if (message.type === "music") size = { width: 700, height: 360 };
    else {
      ctx.font = "500 62px PingFang SC, Microsoft YaHei, sans-serif";
      const lines = wrapText(ctx, message.text || messageVoiceText(message), maxBubbleWidth - 112);
      size = {
        width: Math.min(maxBubbleWidth, Math.max(260, ...lines.map((line) => ctx.measureText(line).width + 112))),
        height: Math.max(112, 62 * lines.length * 1.18 + 60)
      };
    }
    const bubbleX = rightAvatarX - 52 - size.width;
    drawGroupSpeakerName(ctx, presentation, visualSide, bubbleX, y, size.width);
    if (message.type === "transfer") drawTransfer(ctx, message, bubbleX, bubbleY);
    else if (message.type === "image") drawImageCard(ctx, message, presentation, bubbleX, bubbleY, imageCache);
    else if (message.type === "meme") drawMeme(ctx, message, presentation, bubbleX, bubbleY, imageCache);
    else if (message.type === "music") drawMusic(ctx, message, presentation, bubbleX, bubbleY, imageCache);
    else drawTextBubble(ctx, project, message, visualSide, bubbleX || probeX, bubbleY, maxBubbleWidth);
    drawAvatar(ctx, project, message, presentation, rightAvatarX, avatarY, imageCache);
  }

  ctx.globalAlpha = 1;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: DramaProject,
  frame: number,
  imageCache: ImageCache,
  timeline: readonly TimelineEntry[]
) {
  ctx.clearRect(0, 0, project.canvas.width, project.canvas.height);
  const background = isJojoProject(project) ? "#eef3f9" : "#ebebeb";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, project.canvas.width, project.canvas.height);
  const scrollY = getScrollY(project, frame, timeline);
  for (const entry of timeline) {
    if (frame < entry.startFrame - 3) break;
    const y = entry.y - scrollY;
    if (y > project.canvas.height + 100 || y + entry.height < -100) continue;
    drawMessage(ctx, project, entry, y, imageCache);
  }
  const fade = ctx.createLinearGradient(0, project.canvas.height - 120, 0, project.canvas.height);
  fade.addColorStop(0, isJojoProject(project) ? "rgba(238,243,249,0)" : "rgba(235,235,235,0)");
  fade.addColorStop(1, isJojoProject(project) ? "rgba(238,243,249,0.95)" : "rgba(235,235,235,0.95)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, project.canvas.height - 120, project.canvas.width, 120);
}

async function decodeClip(audioContext: AudioContext, clip?: { blob: Blob }) {
  if (!clip) return undefined;
  return audioContext.decodeAudioData(await clip.blob.arrayBuffer());
}

async function resumeAudioContext(audioContext: AudioContext) {
  if (audioContext.state !== "suspended") return;
  let timeoutId: number | undefined;
  try {
    await Promise.race([
      audioContext.resume(),
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, 1200);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function stopAudioNode(node: AudioScheduledSourceNode) {
  try {
    node.stop();
  } catch {
    // The node may already have a scheduled stop; either way cleanup can continue.
  }
}

type ScheduledAudio = {
  source: AudioScheduledSourceNode;
  nodes: AudioNode[];
};

function scheduleSfx(audioContext: AudioContext, destination: AudioNode, type: ChatMessage["sendSfx"], time: number): ScheduledAudio | undefined {
  if (!type || type === "none") return undefined;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.type = type === "transfer" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(type === "meme" ? 520 : type === "image" ? 420 : type === "transfer" ? 660 : 880, time);
  oscillator.frequency.exponentialRampToValueAtTime(type === "transfer" ? 990 : 620, time + 0.12);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(type === "transfer" ? 0.22 : 0.12, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  oscillator.start(time);
  oscillator.stop(time + 0.2);
  return { source: oscillator, nodes: [oscillator, gain] };
}

export async function exportBrowserVideo(
  project: DramaProject,
  clips: TtsClipMap,
  onProgress?: (progress: VideoExportProgress) => void
): Promise<VideoExportResult> {
  const canvas = document.createElement("canvas");
  canvas.width = exportSize.width;
  canvas.height = exportSize.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法创建 Canvas 渲染上下文");
  const scaleX = canvas.width / project.canvas.width;
  const scaleY = canvas.height / project.canvas.height;
  const imageCache = await preloadRenderImages(project);
  const timeline = buildTimeline(project);
  const durationInFrames = getDurationInFrames(project, timeline);
  const decodedClips = new Map<string, AudioBuffer>();
  const chunks: BlobPart[] = [];
  const scheduledSources = new Set<AudioScheduledSourceNode>();
  const connectedAudioNodes = new Set<AudioNode>();
  const mediaTracks = new Set<MediaStreamTrack>();
  let audioContext: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let animationFrameId: number | undefined;
  let recorderStopTimerId: number | undefined;
  let detachRecorderListeners = () => undefined;
  let runtimeDisposed = false;
  let lastProgressUpdateAt = Number.NEGATIVE_INFINITY;

  const notifyProgress = (progress: VideoExportProgress, force = false) => {
    if (!onProgress) return;
    const now = performance.now();
    if (progress.phase === "recording" && !force && now - lastProgressUpdateAt < progressUpdateIntervalMs) return;
    if (progress.phase === "recording") lastProgressUpdateAt = now;
    try {
      onProgress(progress);
    } catch {
      // Progress observers must not interrupt a long-running export.
    }
  };

  const cleanupRuntime = () => {
    if (runtimeDisposed) return;
    runtimeDisposed = true;
    detachRecorderListeners();
    if (animationFrameId !== undefined) window.cancelAnimationFrame(animationFrameId);
    if (recorderStopTimerId !== undefined) window.clearTimeout(recorderStopTimerId);
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // MediaRecorder may already be stopping after an error.
      }
    }
    for (const source of scheduledSources) stopAudioNode(source);
    for (const node of connectedAudioNodes) {
      try {
        node.disconnect();
      } catch {
        // Disconnected nodes are already safe to release.
      }
    }
    for (const track of new Set([...(stream?.getTracks() || []), ...mediaTracks])) {
      try {
        track.stop();
      } catch {
        // A track can already be ended by the recorder or browser.
      }
    }
    if (audioContext && audioContext.state !== "closed") {
      try {
        void audioContext.close().catch(() => undefined);
      } catch {
        // Closing a context twice is harmless for cleanup purposes.
      }
    }
    decodedClips.clear();
    imageCache.avatars.clear();
    imageCache.media.clear();
    imageCache.presentations.clear();
    canvas.width = 0;
    canvas.height = 0;
  };

  notifyProgress({ phase: "preparing", progress: 0 }, true);
  try {
    audioContext = new AudioContext({ sampleRate: 48000 });
    const audioDestination = audioContext.createMediaStreamDestination();
    connectedAudioNodes.add(audioDestination);
    stream = canvas.captureStream(project.fps);
    stream.getTracks().forEach((track) => mediaTracks.add(track));
    audioDestination.stream.getAudioTracks().forEach((track) => {
      mediaTracks.add(track);
      stream?.addTrack(track);
    });

    const silent = audioContext.createOscillator();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0.00001;
    silent.connect(silentGain).connect(audioDestination);
    scheduledSources.add(silent);
    connectedAudioNodes.add(silent);
    connectedAudioNodes.add(silentGain);

    const { mimeType, extension } = pickMimeType();
    recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000
    });

    for (const entry of timeline) {
      const decoded = await decodeClip(audioContext, clips[entry.message.id]);
      if (decoded) decodedClips.set(entry.message.id, decoded);
    }

    await resumeAudioContext(audioContext);
    return await new Promise<VideoExportResult>((resolve, reject) => {
      if (!audioContext || !recorder || !stream) {
        cleanupRuntime();
        reject(new Error("浏览器视频录制初始化失败"));
        return;
      }

      let settled = false;
      const activeAudioContext = audioContext;
      const activeRecorder = recorder;
      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size) chunks.push(event.data);
      };
      const handleError = () => {
        if (settled) return;
        settled = true;
        cleanupRuntime();
        reject(new Error("浏览器视频录制失败"));
      };
      const handleStop = () => {
        if (settled) return;
        settled = true;
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          let urlDisposed = false;
          notifyProgress({ phase: "done", progress: 1 }, true);
          cleanupRuntime();
          resolve({
            blob,
            url,
            extension,
            mimeType,
            dispose: () => {
              if (urlDisposed) return;
              urlDisposed = true;
              URL.revokeObjectURL(url);
            }
          });
        } catch (error) {
          cleanupRuntime();
          reject(error instanceof Error ? error : new Error("浏览器视频结果创建失败"));
        }
      };
      activeRecorder.addEventListener("dataavailable", handleDataAvailable);
      activeRecorder.addEventListener("error", handleError);
      activeRecorder.addEventListener("stop", handleStop);
      detachRecorderListeners = () => {
        activeRecorder.removeEventListener("dataavailable", handleDataAvailable);
        activeRecorder.removeEventListener("error", handleError);
        activeRecorder.removeEventListener("stop", handleStop);
      };

      try {
        const audioStart = activeAudioContext.currentTime + 0.2;
        const startedAt = performance.now() + 200;
        silent.start(audioStart);
        silent.stop(audioStart + durationInFrames / project.fps + 1);

        for (const entry of timeline) {
          const startTime = audioStart + entry.startFrame / project.fps;
          const sfx = scheduleSfx(activeAudioContext, audioDestination, entry.message.sendSfx, startTime);
          if (sfx) {
            scheduledSources.add(sfx.source);
            sfx.nodes.forEach((node) => connectedAudioNodes.add(node));
          }
          const audioBuffer = decodedClips.get(entry.message.id);
          if (audioBuffer) {
            const source = activeAudioContext.createBufferSource();
            const gain = activeAudioContext.createGain();
            source.buffer = audioBuffer;
            gain.gain.value = project.audioMix.ttsVolume;
            source.connect(gain).connect(audioDestination);
            source.start(startTime + 0.12);
            scheduledSources.add(source);
            connectedAudioNodes.add(source);
            connectedAudioNodes.add(gain);
          }
        }

        activeRecorder.start(1000);
        const draw = () => {
          try {
            const elapsedMs = Math.max(0, performance.now() - startedAt);
            const frame = Math.min(durationInFrames - 1, Math.floor((elapsedMs / 1000) * project.fps));
            ctx.save();
            ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            drawFrame(ctx, project, frame, imageCache, timeline);
            ctx.restore();
            notifyProgress({ phase: "recording", progress: frame / durationInFrames });
            if (frame >= durationInFrames - 1) {
              recorderStopTimerId = window.setTimeout(() => {
                try {
                  if (activeRecorder.state !== "inactive") activeRecorder.stop();
                } catch {
                  handleError();
                }
              }, 350);
            } else {
              animationFrameId = window.requestAnimationFrame(draw);
            }
          } catch {
            handleError();
          }
        };
        animationFrameId = window.requestAnimationFrame(draw);
      } catch {
        handleError();
      }
    });
  } catch (error) {
    cleanupRuntime();
    throw error;
  }
}
