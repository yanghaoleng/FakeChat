import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../_http.js";
import { musicTracks } from "../../src/shared/musicLibrary.js";

const forwardedHeaders = ["accept-ranges", "content-length", "content-range", "etag", "last-modified"];

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  const requestUrl = new URL(request.url || "/api/music/preview", "https://ququ.mikeywa.icu");
  const track = musicTracks.find((item) => item.id === requestUrl.searchParams.get("id"));
  if (!track) return sendJson(response, 404, { error: "Music preview not found" });

  try {
    const headers: Record<string, string> = { Accept: "audio/mp4,audio/*;q=0.9,*/*;q=0.5" };
    if (request.headers.range) headers.Range = request.headers.range;
    const upstream = await fetch(track.previewUrl, {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(15000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      return sendJson(response, 502, { error: `Music preview upstream failed: ${upstream.status}` });
    }

    response.statusCode = upstream.status;
    response.setHeader("Content-Type", "audio/mp4");
    response.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000");
    response.setHeader("CDN-Cache-Control", "public, max-age=604800");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("X-Content-Type-Options", "nosniff");
    for (const header of forwardedHeaders) {
      const value = upstream.headers.get(header);
      if (value) response.setHeader(header, value);
    }

    if (request.method === "HEAD") return response.end();
    const body = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Length", String(body.length));
    return response.end(body);
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Music preview upstream timed out"
      : "Music preview unavailable";
    return sendJson(response, 504, { error: message });
  }
}
