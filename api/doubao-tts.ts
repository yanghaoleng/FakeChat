import type { ServerResponse } from "node:http";
import { readJsonBody, sendJson, type JsonRequest } from "./_http.js";
import { synthesizeDoubaoSpeech } from "../server/doubaoSpeech.js";

export default async function handler(request: JsonRequest, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method Not Allowed" });
  }

  try {
    const result = await synthesizeDoubaoSpeech(await readJsonBody(request));
    response.statusCode = 200;
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Doubao-Model", result.model);
    response.setHeader("X-Doubao-Speaker", result.speaker);
    return response.end(result.audio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Doubao speech request failed";
    return sendJson(response, 502, { error: message });
  }
}
