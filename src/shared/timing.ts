import type { ChatMessage, DramaProject } from "./schema";

export interface TimelineEntry {
  message: ChatMessage;
  index: number;
  startMs: number;
  endMs: number;
  startFrame: number;
  endFrame: number;
  y: number;
  height: number;
}

export function estimateSpeechMs(message: ChatMessage): number {
  if (message.durationMs) return message.durationMs;
  const text = message.ttsText || message.text || "";
  const base = message.type === "image" || message.type === "meme" ? 1300 : 550;
  const perChar = /[a-zA-Z]/.test(text) ? 72 : 155;
  return Math.min(8000, Math.max(base, text.length * perChar + 360));
}

export function messageRevealDelayMs(message: ChatMessage): number {
  const text = (message.text || message.ttsText || "").trim();
  const meaningfulCharacters = Array.from(text.replace(/\s+/g, "")).length;
  const mediaFloor = message.type === "image" || message.type === "meme" || message.type === "music" ? 1900 : 1500;
  return Math.round(Math.min(3000, Math.max(mediaFloor, 1500 + meaningfulCharacters * 50)));
}

export function estimateMessageHeight(message: ChatMessage): number {
  if (message.type === "image") return 500;
  if (message.type === "meme") return 500;
  if (message.type === "music") return 430;
  if (message.type === "transfer") return 260;
  if (message.type === "system") return 82;
  const text = message.text || "";
  const lines = Math.max(1, Math.ceil(text.length / 13));
  return 86 + lines * 62;
}

export function messageDurationMs(message: ChatMessage): number {
  return Math.max(message.holdMs, estimateSpeechMs(message)) + message.pauseMs;
}

export function buildTimeline(project: DramaProject): TimelineEntry[] {
  const fps = project.fps || 30;
  let cursorMs = 520;
  let cursorY = 116;

  return project.messages.map((message, index) => {
    const height = estimateMessageHeight(message);
    const startMs = cursorMs;
    const endMs = startMs + messageDurationMs(message);
    const entry: TimelineEntry = {
      message,
      index,
      startMs,
      endMs,
      startFrame: Math.round((startMs / 1000) * fps),
      endFrame: Math.round((endMs / 1000) * fps),
      y: cursorY,
      height
    };

    cursorMs = endMs;
    cursorY += height + 40;
    return entry;
  });
}

export function getDurationInFrames(project: DramaProject): number {
  const timeline = buildTimeline(project);
  const last = timeline[timeline.length - 1];
  const endMs = last ? last.endMs + 1600 : 30000;
  return Math.max(120, Math.ceil((endMs / 1000) * (project.fps || 30)));
}

export function getActiveEntry(project: DramaProject, frame: number): TimelineEntry | undefined {
  const timeline = buildTimeline(project);
  return [...timeline].reverse().find((entry) => frame >= entry.startFrame) ?? timeline[0];
}

export function getScrollY(project: DramaProject, frame: number): number {
  const timeline = buildTimeline(project);
  const active = getActiveEntry(project, frame);
  if (!active) return 0;

  const viewportFocusY = project.canvas.height * 0.62;
  const rawTarget = active.y + active.height * 0.58 - viewportFocusY;
  const maxContentY = Math.max(0, (timeline.at(-1)?.y ?? 0) + (timeline.at(-1)?.height ?? 0) - project.canvas.height + 180);
  return Math.min(Math.max(0, rawTarget), maxContentY);
}
