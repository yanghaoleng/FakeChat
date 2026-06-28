import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../_http";
import { getDeepSeekSettingsView } from "../../server/settings";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  return sendJson(response, 200, await getDeepSeekSettingsView());
}
