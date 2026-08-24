import { describe, expect, it } from "vitest";
import { randomBrandIconPath, randomBrandIconPaths } from "../src/shared/randomBrandIcon";

describe("random brand icon", () => {
  it("maps the random range across all six circular mascots", () => {
    expect(randomBrandIconPath(() => 0)).toBe(randomBrandIconPaths[0]);
    expect(randomBrandIconPath(() => 0.5)).toBe(randomBrandIconPaths[3]);
    expect(randomBrandIconPath(() => 1)).toBe(randomBrandIconPaths[5]);
  });

  it("only returns a known project asset", () => {
    for (let index = 0; index < randomBrandIconPaths.length; index += 1) {
      const selected = randomBrandIconPath(() => index / randomBrandIconPaths.length);
      expect(randomBrandIconPaths).toContain(selected);
    }
  });
});
