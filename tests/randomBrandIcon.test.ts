import { describe, expect, it } from "vitest";
import {
  brandIconUrlForStoryPackage,
  faviconUrlForBrandIcon,
  randomBrandIconPath,
  randomBrandIconPaths,
  viralBrandIconPath
} from "../src/shared/randomBrandIcon";

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

  it("adds a per-load refresh token for Safari favicon caching", () => {
    expect(faviconUrlForBrandIcon("/beta/brand-icons/ququ.png", 36))
      .toBe("/beta/brand-icons/ququ.png?refresh=10");
  });

  it("keeps the WeChat edition fixed while JOJO remains random", () => {
    expect(brandIconUrlForStoryPackage("viral", () => 0.8)).toBe(viralBrandIconPath);
    expect(brandIconUrlForStoryPackage("jojo", () => 0)).toBe(randomBrandIconPaths[0]);
    expect(brandIconUrlForStoryPackage("jojo", () => 0.999)).toBe(randomBrandIconPaths[5]);
  });
});
