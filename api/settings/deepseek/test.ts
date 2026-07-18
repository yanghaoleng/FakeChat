import type { ServerResponse } from "node:http";
import { readJsonBody, sendJson, type JsonRequest } from "../../_http.js";
import { testCustomModelConnection } from "../../../server/customModelTest.js";

export default async function handler(request: JsonRequest, response: ServerResponse) {
  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await testCustomModelConnection(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom model connection test failed";
    return sendJson(response, 502, { error: message });
  }
}
