import { describe, expect, it } from "vitest";
import { doubaoGenerationEstimateScale, estimatedGenerationMs } from "../src/shared/generationEstimate";

describe("AI generation time estimate", () => {
  it("keeps DeepSeek as the original estimate baseline", () => {
    expect(estimatedGenerationMs(0, "jojo", "v4flash")).toBe(46000);
    expect(estimatedGenerationMs(0, "viral", "v4flash")).toBe(52000);
    expect(estimatedGenerationMs(10, "viral", "v4flash")).toBe(41400);
  });

  it("uses 64 percent of the DeepSeek estimate for Doubao", () => {
    expect(doubaoGenerationEstimateScale).toBe(0.64);
    expect(estimatedGenerationMs(0, "jojo", "doubao")).toBe(29440);
    expect(estimatedGenerationMs(0, "viral", "doubao")).toBe(33280);
    expect(estimatedGenerationMs(10, "viral", "doubao")).toBe(26496);
  });

  it("does not shorten legacy provider estimates", () => {
    expect(estimatedGenerationMs(10, "jojo", "zhipu")).toBe(35400);
  });
});
