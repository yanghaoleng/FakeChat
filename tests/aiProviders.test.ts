import { afterEach, describe, expect, it } from "vitest";
import {
  aiProviderForId,
  aiProviders,
  defaultAiProviderId,
  readAiProviderId
} from "../src/shared/aiProviders";
import { getManagedAiConfig } from "../server/aiProviders";

const originalEnv = {
  ZHIPU_API_KEY: process.env.ZHIPU_API_KEY,
  DOUBAO_API_KEY: process.env.DOUBAO_API_KEY,
  ARK_API_KEY: process.env.ARK_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  COMPANY_DEEPSEEK_API_KEY: process.env.COMPANY_DEEPSEEK_API_KEY
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("managed AI providers", () => {
  it("defaults to the current free Zhipu Flash model", () => {
    expect(defaultAiProviderId).toBe("zhipu");
    expect(readAiProviderId()).toBe("zhipu");
    expect(aiProviderForId("unknown")).toMatchObject({
      id: "zhipu",
      model: "glm-4.7-flash"
    });
  });

  it("keeps the requested providers and the original V4 Flash choice", () => {
    expect(aiProviders.map((provider) => provider.id)).toEqual(["zhipu", "doubao", "v4flash"]);
    expect(aiProviderForId("doubao").model).toBe("doubao-seed-2-0-mini-260215");
    expect(aiProviderForId("v4flash").model).toBe("deepseek-v4-flash");
  });

  it("reads each provider key from its own server environment variable", () => {
    process.env.ZHIPU_API_KEY = "zhipu-test-key";
    process.env.DOUBAO_API_KEY = "doubao-test-key";
    process.env.DEEPSEEK_API_KEY = "v4-flash-test-key";

    expect(getManagedAiConfig("zhipu")).toMatchObject({
      providerId: "zhipu",
      apiKey: "zhipu-test-key",
      model: "glm-4.7-flash"
    });
    expect(getManagedAiConfig("doubao")).toMatchObject({
      providerId: "doubao",
      apiKey: "doubao-test-key",
      model: "doubao-seed-2-0-mini-260215"
    });
    expect(getManagedAiConfig("v4flash")).toMatchObject({
      providerId: "v4flash",
      apiKey: "v4-flash-test-key",
      model: "deepseek-v4-flash"
    });
  });
});
