import { describe, expect, it } from "vitest";
import {
  embedArchiveInPngBytes,
  extractArchiveFromPngBytes,
  isPng,
  readArchiveFile
} from "../src/shared/storyArchivePng";

const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function fixturePng() {
  const binary = atob(onePixelPngBase64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

describe("PNG story archive", () => {
  it("embeds and extracts UTF-8 archive data from a viewable PNG", () => {
    const archive = {
      version: 1,
      title: "暧昧聊天 🎵",
      project: { messages: [{ id: "music-1", text: "All of me loves all of you" }] }
    };
    const embedded = embedArchiveInPngBytes(fixturePng(), archive);

    expect(isPng(embedded)).toBe(true);
    expect(extractArchiveFromPngBytes(embedded)).toEqual(archive);
  });

  it("replaces the existing chara metadata instead of appending duplicates", () => {
    const first = embedArchiveInPngBytes(fixturePng(), { version: 1, value: "first" });
    const second = embedArchiveInPngBytes(first, { version: 1, value: "second" });

    expect(extractArchiveFromPngBytes(second)).toEqual({ version: 1, value: "second" });
    expect(second.length).toBeLessThan(first.length + 32);
  });

  it("keeps legacy JSON imports readable", async () => {
    const archive = { version: 1, project: { id: "legacy" } };
    await expect(readArchiveFile(new Blob([JSON.stringify(archive)], { type: "application/json" }))).resolves.toEqual(archive);
  });

  it("rejects a PNG with a broken checksum", () => {
    const broken = fixturePng();
    broken[broken.length - 5] ^= 0xff;
    expect(() => extractArchiveFromPngBytes(broken)).toThrow(/校验/);
  });
});
