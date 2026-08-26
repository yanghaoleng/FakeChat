import { describe, expect, it } from "vitest";
import { gainForNormalizedVoice } from "../src/shared/audioLoudness";

describe("audio loudness normalization", () => {
  it("raises quiet voice clips within a safe limit", () => {
    expect(gainForNormalizedVoice({ activeRms: 0.04, peak: 0.18 })).toBeGreaterThan(1);
    expect(gainForNormalizedVoice({ activeRms: 0.04, peak: 0.18 })).toBeLessThanOrEqual(2.35);
  });

  it("reduces very loud voice clips", () => {
    expect(gainForNormalizedVoice({ activeRms: 0.32, peak: 0.82 })).toBeLessThan(1);
  });

  it("respects peak headroom before clipping", () => {
    expect(gainForNormalizedVoice({ activeRms: 0.04, peak: 0.9 })).toBeCloseTo(0.92 / 0.9, 4);
  });

  it("leaves silent or invalid clips unchanged", () => {
    expect(gainForNormalizedVoice({ activeRms: 0, peak: 0 })).toBe(1);
    expect(gainForNormalizedVoice({ activeRms: Number.NaN, peak: 0 })).toBe(1);
  });
});
