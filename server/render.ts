import path from "node:path";
import { randomUUID } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { parseProject, type DramaProject } from "../src/shared/schema";
import { getDurationInFrames } from "../src/shared/timing";
import { ROOT_DIR, RENDER_DIR, publicOrigin, publicUrl } from "./paths";
import { ensureSfxLibrary } from "./sfx";
import { synthesizeProject } from "./tts";

let cachedServeUrl: string | undefined;

async function getServeUrl() {
  if (cachedServeUrl) return cachedServeUrl;
  cachedServeUrl = await bundle({
    entryPoint: path.join(ROOT_DIR, "src/remotion/index.ts")
  });
  return cachedServeUrl;
}

function normalizePublicPath(value: string | undefined): string | undefined {
  if (!value?.startsWith("/")) return value;
  return `${publicOrigin()}${value}`;
}

function normalizeRenderProject(project: DramaProject): DramaProject {
  return {
    ...project,
    characters: project.characters.map((character) => ({
      ...character,
      avatarUrl: normalizePublicPath(character.avatarUrl)
    })),
    messages: project.messages.map((message) => ({
      ...message,
      imageUrl: normalizePublicPath(message.imageUrl)
    }))
  };
}

export async function renderProject(input: unknown): Promise<{ project: DramaProject; outputPath: string; outputUrl: string; durationInFrames: number }> {
  const parsed = normalizeRenderProject(parseProject(input));
  const withSfx = { ...parsed, sfx: { ...(parsed.sfx || {}), ...(await ensureSfxLibrary()) } };
  const project = await synthesizeProject(withSfx);
  const serveUrl = await getServeUrl();
  const inputProps = { project };
  const composition = await selectComposition({
    serveUrl,
    id: "ChatDrama",
    inputProps
  });

  const fileName = `${project.title.replace(/[^\u4e00-\u9fa5\w-]+/g, "-").slice(0, 36) || "chat-drama"}-${randomUUID().slice(0, 8)}.mp4`;
  const outputPath = path.join(RENDER_DIR, fileName);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: {
      ignoreCertificateErrors: true
    }
  });

  return {
    project,
    outputPath,
    outputUrl: publicUrl("renders", fileName),
    durationInFrames: getDurationInFrames(project)
  };
}
