import { afterEach, describe, expect, it, vi } from "vitest";
import { searchMemes } from "../server/memes";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("meme search", () => {
  it("returns QFace candidates and public source cards with provenance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            emojiId: "0",
            describe: "/震惊",
            associateWords: ["破防"],
            assets: [{ type: 0, path: "assets/qq_emoji/0/png/0.png" }]
          }
        ]
      }))
    );

    const items = await searchMemes("破防");
    expect(items.some((item) => item.sourceName === "QFace" && item.remoteUrl)).toBe(true);
    expect(items.some((item) => item.sourceName === "ChineseBQB")).toBe(true);
    expect(items.every((item) => item.sourceUrl !== undefined)).toBe(true);
  });
});
