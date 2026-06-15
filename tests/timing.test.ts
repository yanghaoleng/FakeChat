import { describe, expect, it } from "vitest";
import { sampleProject } from "../src/shared/sampleProject";
import { buildTimeline, getDurationInFrames, getScrollY } from "../src/shared/timing";

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
});
