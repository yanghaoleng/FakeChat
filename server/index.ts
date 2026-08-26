import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { sampleProject } from "../src/shared/sampleProject";
import { parseProject } from "../src/shared/schema";
import { ASSET_DIR, AUDIO_DIR, AVATAR_DIR, RENDER_DIR, ROOT_DIR, SFX_DIR, ensureRuntimeDirs } from "./paths";
import { continueStoryWithDeepSeek, generateScript } from "./deepseek";
import { testCustomModelConnection } from "./customModelTest";
import { searchMemes } from "./memes";
import { renderProject } from "./render";
import { ensureSfxLibrary } from "./sfx";
import { clearDeepSeekApiKey, getDeepSeekSettingsView, updateDeepSeekSettings } from "./settings";
import { synthesizeProject } from "./tts";

const app = Fastify({ logger: true });
const port = Number(process.env.API_PORT || 8787);
const host = process.env.HOST || process.env.API_HOST || "127.0.0.1";
const distDir = process.env.DIST_DIR ? path.resolve(ROOT_DIR, process.env.DIST_DIR) : path.join(ROOT_DIR, "dist");

await ensureRuntimeDirs();
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 30 * 1024 * 1024 } });
await app.register(fastifyStatic, { root: AUDIO_DIR, prefix: "/audio/", decorateReply: false });
await app.register(fastifyStatic, { root: SFX_DIR, prefix: "/sfx/", decorateReply: false });
await app.register(fastifyStatic, { root: ASSET_DIR, prefix: "/assets/", decorateReply: false });
await app.register(fastifyStatic, { root: AVATAR_DIR, prefix: "/avatars/", decorateReply: false });
await app.register(fastifyStatic, { root: RENDER_DIR, prefix: "/renders/", decorateReply: false });

app.get("/api/health", async () => ({ ok: true }));

app.get("/api/settings/deepseek", async () => getDeepSeekSettingsView());

app.post("/api/settings/deepseek", async (request, reply) => {
  try {
    return await updateDeepSeekSettings(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid DeepSeek settings";
    return reply.code(400).send({ error: message });
  }
});

app.delete("/api/settings/deepseek/api-key", async () => clearDeepSeekApiKey());

app.post("/api/settings/deepseek/test", async (request, reply) => {
  try {
    return await testCustomModelConnection(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom model connection test failed";
    return reply.code(502).send({ error: message });
  }
});

app.get("/api/project/sample", async () => ({
  project: {
    ...sampleProject,
    sfx: { ...sampleProject.sfx, ...(await ensureSfxLibrary()) }
  }
}));

app.post("/api/script/generate", async (request) => generateScript(request.body));

app.post("/api/story/continue", async (request, reply) => {
  try {
    return await continueStoryWithDeepSeek(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek story continuation failed";
    return reply.code(502).send({ error: message });
  }
});

app.get("/api/memes/search", async (request) => {
  const query = (request.query as { q?: string }).q || "破防";
  return { query, items: await searchMemes(query) };
});

app.post("/api/tts/batch", async (request) => {
  const project = parseProject(request.body);
  const sfx = await ensureSfxLibrary();
  return { project: await synthesizeProject({ ...project, sfx: { ...project.sfx, ...sfx } }) };
});

app.post("/api/render", async (request) => renderProject(request.body));

if (process.env.SERVE_DIST === "1" || process.env.NODE_ENV === "production") {
  await app.register(fastifyStatic, { root: distDir, prefix: "/", decorateReply: false });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "API route not found" });
    }
    return reply.type("text/html").send(await readFile(path.join(distDir, "index.html"), "utf8"));
  });
}

app.listen({ host, port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
