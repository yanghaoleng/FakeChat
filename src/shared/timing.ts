import type { ChatMessage, DramaProject } from "./schema";
import { speakerNameForMessage } from "./messagePresentation";

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
    const speakerNameHeight = speakerNameForMessage(project, message, "canvas") ? 44 : 0;
    const height = estimateMessageHeight(message) + speakerNameHeight;
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

export function getDurationInFrames(project: DramaProject, timeline: readonly TimelineEntry[] = buildTimeline(project)): number {
  const last = timeline[timeline.length - 1];
  const endMs = last ? last.endMs + 1600 : 30000;
  return Math.max(120, Math.ceil((endMs / 1000) * (project.fps || 30)));
}

export function getActiveEntry(
  project: DramaProject,
  frame: number,
  timeline: readonly TimelineEntry[] = buildTimeline(project)
): TimelineEntry | undefined {
  if (!timeline.length) return undefined;
  if (frame < timeline[0].startFrame) return timeline[0];

  let low = 0;
  let high = timeline.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (timeline[middle].startFrame <= frame) low = middle + 1;
    else high = middle - 1;
  }
  return timeline[Math.max(0, high)];
}

export function getScrollY(
  project: DramaProject,
  frame: number,
  timeline: readonly TimelineEntry[] = buildTimeline(project)
): number {
  const active = getActiveEntry(project, frame, timeline);
  if (!active) return 0;

  const viewportFocusY = project.canvas.height * 0.62;
  const rawTarget = active.y + active.height * 0.58 - viewportFocusY;
  const maxContentY = Math.max(0, (timeline.at(-1)?.y ?? 0) + (timeline.at(-1)?.height ?? 0) - project.canvas.height + 180);
  return Math.min(Math.max(0, rawTarget), maxContentY);
}
