import type { IncomingMessage, ServerResponse } from "node:http";

export type JsonRequest = IncomingMessage & {
  body?: unknown;
};

export function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export async function readJsonBody(request: JsonRequest): Promise<unknown> {
  if (request.body !== undefined) return request.body;

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
