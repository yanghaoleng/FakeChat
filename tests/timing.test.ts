import { describe, expect, it } from "vitest";
import { sampleProject } from "../src/shared/sampleProject";
import { buildTimeline, getActiveEntry, getDurationInFrames, getScrollY, messageRevealDelayMs } from "../src/shared/timing";

describe("chat timeline", () => {
  it("builds strictly increasing message starts", () => {
    const timeline = buildTimeline(sampleProject);
    for (let index = 1; index < timeline.length; index += 1) {
      expect(timeline[index].startMs).toBeGreaterThan(timeline[index - 1].startMs);
    }
  });

  it("creates a render duration long enough for the last message", () => {
    const timeline = buildTimeline(sampleProject);
    const duration = getDurationInFrames(sampleProject);
    expect(duration).toBeGreaterThan(timeline.at(-1)!.endFrame);
  });

  it("keeps scroll position non-negative", () => {
    expect(getScrollY(sampleProject, 0)).toBeGreaterThanOrEqual(0);
    expect(getScrollY(sampleProject, 900)).toBeGreaterThanOrEqual(0);
  });

  it("reuses a precomputed timeline for duration, active entry, and scrolling", () => {
    const timeline = buildTimeline(sampleProject);
    const projectWithoutMessages = { ...sampleProject, messages: [] };
    const target = timeline[Math.min(3, timeline.length - 1)];

    expect(getDurationInFrames(projectWithoutMessages, timeline)).toBeGreaterThan(timeline.at(-1)!.endFrame);
    expect(getActiveEntry(projectWithoutMessages, target.startFrame, timeline)?.message.id).toBe(target.message.id);
    expect(getScrollY(projectWithoutMessages, target.startFrame, timeline)).toBeGreaterThanOrEqual(0);
  });

  it("finds the latest active entry at timeline boundaries", () => {
    const timeline = buildTimeline(sampleProject);
    const targetIndex = Math.min(2, timeline.length - 1);
    const target = timeline[targetIndex];

    expect(getActiveEntry(sampleProject, target.startFrame - 1, timeline)?.message.id)
      .toBe(timeline[Math.max(0, targetIndex - 1)].message.id);
    expect(getActiveEntry(sampleProject, target.startFrame, timeline)?.message.id).toBe(target.message.id);
    expect(getActiveEntry(sampleProject, Number.MAX_SAFE_INTEGER, timeline)?.message.id).toBe(timeline.at(-1)?.message.id);
  });

  it("paces short and long chat messages between 1.5 and 3 seconds", () => {
    const baseMessage = sampleProject.messages.find((message) => message.type === "text")!;
    const shortDelay = messageRevealDelayMs({ ...baseMessage, text: "嗯" });
    const longDelay = messageRevealDelayMs({ ...baseMessage, text: "这是一条字数明显更多的消息，需要给对方留出更自然的输入时间。" });

    expect(shortDelay).toBeGreaterThanOrEqual(1500);
    expect(longDelay).toBeLessThanOrEqual(3000);
    expect(longDelay).toBeGreaterThan(shortDelay);
  });

  it("gives visual messages enough time to feel intentionally sent", () => {
    const baseMessage = sampleProject.messages[0];
    expect(messageRevealDelayMs({ ...baseMessage, type: "music", text: "Yellow" })).toBeGreaterThanOrEqual(1900);
  });

  it("reserves speaker-label space only for presentable group messages", () => {
    const directEntry = buildTimeline({ ...sampleProject, messages: [sampleProject.messages[0]] })[0];
    const groupEntry = buildTimeline({ ...sampleProject, chatMode: "group", messages: [sampleProject.messages[0]] })[0];
    const systemMessage = {
      ...sampleProject.messages[0],
      id: "system-height",
      side: "center" as const,
      type: "system" as const
    };
    const directSystemEntry = buildTimeline({ ...sampleProject, messages: [systemMessage] })[0];
    const groupSystemEntry = buildTimeline({ ...sampleProject, chatMode: "group", messages: [systemMessage] })[0];

    expect(groupEntry.height - directEntry.height).toBe(44);
    expect(groupSystemEntry.height).toBe(directSystemEntry.height);
  });
});
