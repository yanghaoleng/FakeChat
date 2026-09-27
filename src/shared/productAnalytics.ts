import type { StoryPackage } from "./linearStory";

export type ProductEvent =
  | "app_opened"
  | "story_generation_started"
  | "story_generation_succeeded"
  | "story_generation_failed"
  | "preview_opened"
  | "archive_exported"
  | "voice_generation_succeeded"
  | "video_exported";

const visitorKey = "ququ_analytics_visitor_v1";
const sessionKey = "ququ_analytics_session_v1";

function id(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

export function analyticsOrigin() {
  const configured = import.meta.env.VITE_ANALYTICS_API_ORIGIN as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  return window.location.hostname === "ququ.mikeywa.icu" ? "https://mikeywa.site/ququ-api" : "/api/analytics";
}

export function trackProductEvent(event: ProductEvent, channel: StoryPackage) {
  if (event === "app_opened") {
    const openedKey = `ququ_analytics_opened_${channel}`;
    if (window.sessionStorage.getItem(openedKey)) return;
    window.sessionStorage.setItem(openedKey, "1");
  }
  const payload = JSON.stringify({
    event,
    channel,
    visitorId: id(window.localStorage, visitorKey),
    sessionId: id(window.sessionStorage, sessionKey)
  });
  const url = `${analyticsOrigin()}/events`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
}
