import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error The production analytics service is dependency-free JavaScript.
import { createAnalyticsStore } from "../server/analytics-store.mjs";

const dirs: string[] = [];

async function store() {
  const dataDir = await mkdtemp(path.join(tmpdir(), "ququ-analytics-"));
  dirs.push(dataDir);
  return { dataDir, store: createAnalyticsStore({ dataDir, accessCode: "997118", sessionSecret: "test-secret" }) };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("analytics store", () => {
  it("records only hashed anonymous identifiers and aggregates the funnel", async () => {
    const { dataDir, store: analytics } = await store();
    for (const event of ["app_opened", "story_generation_started", "story_generation_succeeded", "archive_exported"]) {
      await analytics.record({ event, channel: "viral", visitorId: "visitor-12345678", sessionId: "session-12345678" });
    }

    const raw = await readFile(path.join(dataDir, "events.jsonl"), "utf8");
    expect(raw).not.toContain("visitor-12345678");
    expect(raw).not.toContain("session-12345678");

    const summary = await analytics.summary({ days: 7, channel: "all" });
    expect(summary.totals.visitors).toBe(1);
    expect(summary.totals.story_generation_succeeded).toBe(1);
    expect(summary.rates.generationSuccess).toBe(1);
    expect(summary.rates.creatorToExport).toBe(1);
    expect(summary.funnel.map((step: { value: number }) => step.value)).toEqual([1, 1, 1]);
  });

  it("requires the numeric access code and verifies signed sessions", async () => {
    const { store: analytics } = await store();
    expect(analytics.authenticate("000000").ok).toBe(false);
    const result = analytics.authenticate("997118");
    expect(result.ok).toBe(true);
    expect(analytics.verifyToken(result.token)).toBe(true);
    expect(analytics.verifyToken(`${result.token}x`)).toBe(false);
  });

  it("rejects unsupported events and identifiers", async () => {
    const { store: analytics } = await store();
    await expect(analytics.record({ event: "prompt_captured", channel: "viral", visitorId: "visitor-12345678", sessionId: "session-12345678" })).rejects.toThrow("Invalid analytics event");
  });
});
