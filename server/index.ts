import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { sampleProject } from "../src/shared/sampleProject";
import { parseProject } from "../src/shared/schema";
import { ASSET_DIR, AUDIO_DIR, AVATAR_DIR, DATA_DIR, RENDER_DIR, ROOT_DIR, SFX_DIR, ensureRuntimeDirs } from "./paths";
import { continueStoryWithDeepSeek, generateScript } from "./deepseek";
import { searchMemes } from "./memes";
import { renderProject } from "./render";
import { ensureSfxLibrary } from "./sfx";
import { clearDeepSeekApiKey, getDeepSeekSettingsView, updateDeepSeekSettings } from "./settings";
import { synthesizeProject } from "./tts";
// Shared with the dependency-free Tencent Cloud analytics service.
// @ts-expect-error JavaScript module intentionally has no declaration file.
import { createAnalyticsStore } from "./analytics-store.mjs";

const app = Fastify({
  logger: {
    serializers: {
      req(request) {
        return { method: request.method, url: request.url };
      }
    }
  }
});
const port = Number(process.env.API_PORT || 8787);
const host = process.env.HOST || process.env.API_HOST || "127.0.0.1";
const distDir = process.env.DIST_DIR ? path.resolve(ROOT_DIR, process.env.DIST_DIR) : path.join(ROOT_DIR, "dist");

await ensureRuntimeDirs();
const analyticsStore = createAnalyticsStore({
  dataDir: path.join(DATA_DIR, "analytics"),
  accessCode: process.env.DASHBOARD_ACCESS_CODE,
  sessionSecret: process.env.DASHBOARD_SESSION_SECRET
});
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 30 * 1024 * 1024 } });
await app.register(fastifyStatic, { root: AUDIO_DIR, prefix: "/audio/", decorateReply: false });
await app.register(fastifyStatic, { root: SFX_DIR, prefix: "/sfx/", decorateReply: false });
await app.register(fastifyStatic, { root: ASSET_DIR, prefix: "/assets/", decorateReply: false });
await app.register(fastifyStatic, { root: AVATAR_DIR, prefix: "/avatars/", decorateReply: false });
await app.register(fastifyStatic, { root: RENDER_DIR, prefix: "/renders/", decorateReply: false });

app.get("/api/health", async () => ({ ok: true }));

app.post("/api/analytics/events", async (request, reply) => {
  try {
    return reply.code(202).send(await analyticsStore.record(request.body));
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid analytics event" });
  }
});

app.post("/api/analytics/auth", async (request, reply) => {
  const result = analyticsStore.authenticate((request.body as { code?: string } | undefined)?.code);
  if (!result.ok) return reply.code(401).send({ error: result.retryAfter ? `请 ${result.retryAfter} 秒后再试` : "访问码不正确" });
  return { ok: true, token: result.token, expires: result.expires };
});

app.get("/api/analytics/summary", async (request, reply) => {
  const authorization = request.headers.authorization || "";
  if (!analyticsStore.verifyToken(authorization.replace(/^Bearer\s+/i, ""))) return reply.code(401).send({ error: "Unauthorized" });
  const query = request.query as { days?: string; channel?: string };
  return analyticsStore.summary({ days: query.days, channel: query.channel });
});

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
