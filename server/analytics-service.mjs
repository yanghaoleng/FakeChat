import { createServer } from "node:http";
import path from "node:path";
import { createAnalyticsStore, parseCookies } from "./analytics-store.mjs";

const port = Number(process.env.ANALYTICS_PORT || 8792);
const allowedOrigins = new Set((process.env.ANALYTICS_ALLOWED_ORIGINS || "https://ququ.mikeywa.icu,http://127.0.0.1:5173,http://127.0.0.1:4193").split(","));
const store = createAnalyticsStore({
  dataDir: path.resolve(process.env.ANALYTICS_DATA_DIR || "./data/analytics"),
  accessCode: process.env.DASHBOARD_ACCESS_CODE,
  sessionSecret: process.env.DASHBOARD_SESSION_SECRET
});

function json(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(body));
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

createServer(async (request, response) => {
  const origin = request.headers.origin || "";
  const cors = allowedOrigins.has(origin) ? { "access-control-allow-origin": origin, vary: "Origin", "access-control-allow-credentials": "true" } : {};
  if (request.method === "OPTIONS") {
    response.writeHead(204, { ...cors, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization, content-type" });
    return response.end();
  }
  if (origin && !allowedOrigins.has(origin)) return json(response, 403, { error: "Origin not allowed" });
  const url = new URL(request.url || "/", "http://127.0.0.1");
  try {
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true, service: "ququ-analytics" }, cors);
    if (request.method === "POST" && url.pathname === "/events") return json(response, 202, await store.record(await body(request)), cors);
    if (request.method === "POST" && url.pathname === "/auth") {
      const result = store.authenticate((await body(request)).code);
      if (!result.ok) return json(response, 401, { error: result.retryAfter ? `请 ${result.retryAfter} 秒后再试` : "访问码不正确", retryAfter: result.retryAfter }, cors);
      return json(response, 200, { ok: true, token: result.token, expires: result.expires }, {
        ...cors,
        "set-cookie": `ququ_data_session=${encodeURIComponent(result.token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=28800`
      });
    }
    if (request.method === "POST" && url.pathname === "/logout") {
      return json(response, 200, { ok: true }, { ...cors, "set-cookie": "ququ_data_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0" });
    }
    if (request.method === "GET" && url.pathname === "/summary") {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, "") || parseCookies(request.headers.cookie).ququ_data_session;
      if (!store.verifyToken(token)) return json(response, 401, { error: "Unauthorized" }, cors);
      return json(response, 200, await store.summary({ days: url.searchParams.get("days"), channel: url.searchParams.get("channel") }), cors);
    }
    return json(response, 404, { error: "Not found" }, cors);
  } catch (error) {
    return json(response, 400, { error: error instanceof Error ? error.message : "Request failed" }, cors);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`QUQU analytics listening on 127.0.0.1:${port}`);
});
