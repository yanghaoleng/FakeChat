import { describe, expect, it } from "vitest";
import {
  customModelConfigForSurface,
  normalizeCustomModelSettings
} from "../src/shared/customModel";

describe("custom model surface gating", () => {
  const enabledSettings = normalizeCustomModelSettings({
    enabled: true,
    providerId: "qwen",
    apiKey: "  beta-test-key  ",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
    model: " qwen-plus "
  });

  it("keeps provider presets normalized for the compact Beta form", () => {
    expect(enabledSettings).toEqual({
      enabled: true,
      providerId: "qwen",
      apiKey: "beta-test-key",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus"
    });
  });

  it("only exposes the custom completion config on an allowed surface", () => {
    expect(customModelConfigForSurface(enabledSettings, false)).toBeUndefined();
    expect(customModelConfigForSurface(enabledSettings, true)).toMatchObject({
      apiKey: "beta-test-key",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      source: "custom",
      label: "通义千问"
    });
  });

  it("does not activate an incomplete custom model", () => {
    const incomplete = normalizeCustomModelSettings({
      enabled: true,
      providerId: "deepseek",
      apiKey: ""
    });
    expect(customModelConfigForSurface(incomplete, true)).toBeUndefined();
  });
});
