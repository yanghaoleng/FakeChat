import { describe, expect, it } from "vitest";
import { sampleProject } from "../src/shared/sampleProject";
import { buildTimeline, getDurationInFrames, getScrollY, messageRevealDelayMs } from "../src/shared/timing";

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
});
