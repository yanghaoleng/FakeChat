import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";

const EVENT_NAMES = new Set([
  "app_opened",
  "story_generation_started",
  "story_generation_succeeded",
  "story_generation_failed",
  "preview_opened",
  "archive_exported",
  "voice_generation_succeeded",
  "video_exported"
]);
const CHANNELS = new Set(["viral", "jojo"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function cleanId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : null;
}

function dayKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAnalyticsStore({ dataDir, accessCode, sessionSecret }) {
  const eventsPath = path.join(dataDir, "events.jsonl");
  const secret = sessionSecret || randomBytes(32).toString("hex");
  const code = accessCode || "997118";
  const failures = new Map();

  async function record(input) {
    const event = typeof input?.event === "string" ? input.event : "";
    const visitorId = cleanId(input?.visitorId);
    const sessionId = cleanId(input?.sessionId);
    const channel = CHANNELS.has(input?.channel) ? input.channel : null;
    if (!EVENT_NAMES.has(event) || !visitorId || !sessionId || !channel) {
      throw new Error("Invalid analytics event");
    }
    await mkdir(dataDir, { recursive: true });
    const row = {
      at: new Date().toISOString(),
      event,
      visitorId: createHash("sha256").update(visitorId).digest("hex").slice(0, 20),
      sessionId: createHash("sha256").update(sessionId).digest("hex").slice(0, 20),
      channel
    };
    await appendFile(eventsPath, `${JSON.stringify(row)}\n`, { encoding: "utf8", mode: 0o600 });
    return { ok: true };
  }

  async function rows() {
    let text = "";
    try {
      text = await readFile(eventsPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (Buffer.byteLength(text) > MAX_FILE_BYTES) text = text.slice(-MAX_FILE_BYTES);
    return text.split("\n").flatMap((line) => {
      try {
        const row = JSON.parse(line);
        return row?.at && EVENT_NAMES.has(row.event) ? [row] : [];
      } catch {
        return [];
      }
    });
  }

  function issueToken() {
    const expires = Date.now() + 8 * 60 * 60 * 1000;
    const payload = String(expires);
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    return { token: `${payload}.${signature}`, expires };
  }

  function verifyToken(token) {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature || Number(payload) < Date.now()) return false;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    return safeEqual(signature, expected);
  }

  function authenticate(candidate, key = "shared") {
    const now = Date.now();
    const state = failures.get(key) || { count: 0, lockedUntil: 0 };
    if (state.lockedUntil > now) return { ok: false, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) };
    if (!safeEqual(candidate || "", code)) {
      state.count += 1;
      state.lockedUntil = state.count >= 5 ? now + 30_000 : 0;
      if (state.lockedUntil) state.count = 0;
      failures.set(key, state);
      return { ok: false, retryAfter: state.lockedUntil ? 30 : 0 };
    }
    failures.delete(key);
    return { ok: true, ...issueToken() };
  }

  function aggregateRows(sourceRows, safeDays) {
    const dailyMap = new Map();
    const totals = Object.fromEntries([...EVENT_NAMES].map((name) => [name, 0]));
    const visitors = new Set();
    const sessions = new Set();
    for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.now() - offset * 86400000);
      dailyMap.set(dayKey(date), { date: dayKey(date), visitors: new Set(), sessions: new Set(), events: 0, successes: 0, failures: 0 });
    }
    for (const row of sourceRows) {
      totals[row.event] += 1;
      visitors.add(row.visitorId);
      sessions.add(row.sessionId);
      const daily = dailyMap.get(dayKey(new Date(row.at)));
      if (!daily) continue;
      daily.visitors.add(row.visitorId);
      daily.sessions.add(row.sessionId);
      daily.events += 1;
      if (row.event === "story_generation_succeeded") daily.successes += 1;
      if (row.event === "story_generation_failed") daily.failures += 1;
    }
    const successfulVisitors = new Set(sourceRows.filter((row) => row.event === "story_generation_succeeded").map((row) => row.visitorId));
    const exportVisitors = new Set(sourceRows.filter((row) => row.event === "archive_exported" || row.event === "video_exported").map((row) => row.visitorId));
    const starts = totals.story_generation_started;
    return {
      totals: { visitors: visitors.size, sessions: sessions.size, events: sourceRows.length, ...totals },
      rates: {
        generationSuccess: starts ? totals.story_generation_succeeded / starts : null,
        visitorToCreation: visitors.size ? successfulVisitors.size / visitors.size : null,
        creatorToExport: successfulVisitors.size ? exportVisitors.size / successfulVisitors.size : null
      },
      daily: [...dailyMap.values()].map((item) => ({ ...item, visitors: item.visitors.size, sessions: item.sessions.size })),
      funnel: [
        { key: "visit", label: "访问", value: visitors.size },
        { key: "create", label: "完成一次创作", value: successfulVisitors.size },
        { key: "export", label: "完成导出", value: exportVisitors.size }
      ]
    };
  }

  async function summary({ days = 30, channel = "all" } = {}) {
    const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    const cutoff = Date.now() - safeDays * 86400000;
    const periodRows = (await rows()).filter((row) => Date.parse(row.at) >= cutoff);
    const allRows = periodRows.filter((row) => channel === "all" || row.channel === channel);
    const aggregate = aggregateRows(allRows, safeDays);
    const breakdown = Object.fromEntries(["viral", "jojo"].map((name) => [name, aggregateRows(periodRows.filter((row) => row.channel === name), safeDays)]));
    const lastEvent = allRows.at(-1)?.at || null;
    return {
      period: { days: safeDays, channel, timezone: "Asia/Shanghai", from: new Date(cutoff).toISOString(), to: new Date().toISOString() },
      freshness: lastEvent,
      ...aggregate,
      breakdown,
      channels: ["viral", "jojo"].map((name) => {
        const subset = periodRows.filter((row) => row.channel === name);
        return { name, visitors: new Set(subset.map((row) => row.visitorId)).size, events: subset.length };
      }),
      contract: {
        source: "QUQU 同域匿名事件",
        identity: "浏览器生成的匿名标识，不与真实身份关联",
        exclusions: ["不记录 IP", "不记录原始 User-Agent", "不记录聊天内容、Prompt 或存档"],
        knownLimits: ["仅包含新埋点上线后的事件", "清理浏览器存储后会被计为新访客", "客户端阻止请求时可能漏记"]
      }
    };
  }

  return { record, authenticate, verifyToken, summary };
}

export function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").flatMap((part) => {
    const index = part.indexOf("=");
    return index > 0 ? [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]] : [];
  }));
}
