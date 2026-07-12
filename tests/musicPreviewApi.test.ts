import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import musicPreviewHandler from "../api/music/preview.js";

function mockRequest(method: string, url: string, range?: string) {
  return {
    method,
    url,
    headers: range ? { range } : {}
  } as IncomingMessage;
}

function mockResponse() {
  const headers = new Map<string, string>();
  let body: unknown;
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | number) {
      headers.set(name.toLowerCase(), String(value));
      return this;
    },
    end(value?: unknown) {
      body = value;
      return this;
    }
  } as unknown as ServerResponse;

  return { response, headers, body: () => body };
}

afterEach(() => vi.unstubAllGlobals());

describe("music preview API", () => {
  it("proxies byte ranges with a browser-compatible MIME type", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(
      new Uint8Array([1, 2, 3]),
      {
        status: 206,
        headers: {
          "accept-ranges": "bytes",
          "content-length": "3",
          "content-range": "bytes 0-2/100"
        }
      }
    ));
    vi.stubGlobal("fetch", fetchMock);
    const result = mockResponse();

    await musicPreviewHandler(
      mockRequest("GET", "/api/music/preview?id=17177324", "bytes=0-2"),
      result.response
    );

    expect(result.response.statusCode).toBe(206);
    expect(result.headers.get("content-type")).toBe("audio/mp4");
    expect(result.headers.get("content-range")).toBe("bytes 0-2/100");
    expect(result.body()).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Range: "bytes=0-2" });
  });

  it("rejects unknown track ids without contacting the upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = mockResponse();

    await musicPreviewHandler(mockRequest("GET", "/api/music/preview?id=unknown"), result.response);

    expect(result.response.statusCode).toBe(404);
    expect(result.headers.get("content-type")).toContain("application/json");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
