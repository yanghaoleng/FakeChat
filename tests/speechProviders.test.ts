import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultSpeechProviderId,
  readSpeechProviderId,
  speechProviderLabel,
  speechProviderStorageKey,
  writeSpeechProviderId
} from "../src/shared/speechProviders";

afterEach(() => vi.unstubAllGlobals());

describe("speech providers", () => {
  it("defaults to Fish and persists a Doubao selection", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value)
      }
    });

    expect(readSpeechProviderId()).toBe(defaultSpeechProviderId);
    writeSpeechProviderId("doubao");
    expect(values.get(speechProviderStorageKey)).toBe("doubao");
    expect(readSpeechProviderId()).toBe("doubao");
    expect(speechProviderLabel("doubao")).toBe("豆包 Seed-TTS 2.0");
  });

  it("ignores an unknown stored provider", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "unknown",
        setItem: vi.fn()
      }
    });
    expect(readSpeechProviderId()).toBe("fish");
  });
});
