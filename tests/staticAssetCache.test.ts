import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { sampleProject } from "../src/shared/sampleProject";
import {
  buildStaticVisualAssetPaths,
  cacheStaticVisualAssetUrls,
  projectCriticalAssetPaths
} from "../src/shared/staticAssetCache";

describe("static visual asset cache manifest", () => {
  it("warms only the current product UI", () => {
    const viralPaths = buildStaticVisualAssetPaths({ storyPackage: "viral" });
    const jojoPaths = buildStaticVisualAssetPaths({ storyPackage: "jojo" });

    expect(viralPaths).toEqual([
      "/wechat-ui/topbar.webp",
      "/wechat-ui/bottombar.webp",
      "/favicon-viral.svg"
    ]);
    expect(viralPaths.some((assetPath) => assetPath.includes("dingtalk-ui"))).toBe(false);

    expect(jojoPaths).toEqual([
      "/dingtalk-ui/topbar.webp",
      "/dingtalk-ui/inputbar.webp",
      "/favicon-jojo.svg"
    ]);
    expect(jojoPaths.some((assetPath) => assetPath.includes("wechat-ui"))).toBe(false);
  });

  it("includes current project avatars and referenced media but not the whole catalog", () => {
    const paths = projectCriticalAssetPaths(sampleProject);

    expect(paths).toContain("/avatars/boy-soft-selfie.webp");
    expect(paths).toContain("/avatars/girl-sweater-soft.webp");
    expect(paths).toContain("/memes/qface/20.webp");
    expect(paths).toContain("/viral-assets/photos/phone-chat-blur.webp");
    expect(paths).not.toContain("/memes/qface/21.webp");
    expect(paths.length).toBeLessThan(sampleProject.assets.length);
  });

  it("only contains local public assets that exist in the repo", () => {
    const assetPaths = buildStaticVisualAssetPaths({ storyPackage: "viral", project: sampleProject });

    for (const assetPath of assetPaths) {
      expect(assetPath.startsWith("/")).toBe(true);
      expect(assetPath.includes("github.com")).toBe(false);
      expect(existsSync(path.join(process.cwd(), "public", assetPath.slice(1)))).toBe(true);
    }
  });
});

describe("static visual asset cache fallback", () => {
  it("does not duplicate the batch through HTTP when the worker succeeds", async () => {
    const cacheWithWorker = vi.fn(async () => true);
    const warmHttpCache = vi.fn(async () => undefined);
    const urls = ["/wechat-ui/topbar.webp"];

    await cacheStaticVisualAssetUrls(urls, cacheWithWorker, warmHttpCache);

    expect(cacheWithWorker).toHaveBeenCalledWith(urls);
    expect(warmHttpCache).not.toHaveBeenCalled();
  });

  it("falls back to the normal HTTP cache when the worker fails", async () => {
    const cacheWithWorker = vi.fn(async () => false);
    const warmHttpCache = vi.fn(async () => undefined);
    const urls = ["/dingtalk-ui/topbar.webp"];

    await cacheStaticVisualAssetUrls(urls, cacheWithWorker, warmHttpCache);

    expect(cacheWithWorker).toHaveBeenCalledWith(urls);
    expect(warmHttpCache).toHaveBeenCalledWith(urls);
  });
});
