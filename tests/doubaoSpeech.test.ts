import { afterEach, describe, expect, it, vi } from "vitest";
import {
  doubaoMaleSpeaker,
  doubaoSpeechEndpoint,
  doubaoSpeechModel,
  parseDoubaoSpeechEvents,
  synthesizeDoubaoSpeech
} from "../server/doubaoSpeech";

afterEach(() => vi.unstubAllGlobals());

describe("Doubao Seed-TTS 2.0", () => {
  it("combines base64 audio chunks from the official SSE response", () => {
    const payload = [
      "data: {\"code\":20000000}",
      `data: ${JSON.stringify({ code: 0, data: Buffer.from("first").toString("base64") })}`,
      `data: ${JSON.stringify({ code: 0, data: Buffer.from("second").toString("base64") })}`,
      "data: [DONE]"
    ].join("\n\n");

    expect(parseDoubaoSpeechEvents(payload).toString()).toBe("firstsecond");
  });

  it("sends a user API key to the Seed-TTS 2.0 SSE endpoint", async () => {
    const audio = Buffer.from("mp3-audio");
    const fetchMock = vi.fn(async () => new Response(
      `data: ${JSON.stringify({ code: 20000000, data: audio.toString("base64") })}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    ));
    vi.stubGlobal("fetch", fetchMock);

    const result = await synthesizeDoubaoSpeech({
      text: "你好",
      apiKey: "user-speech-key",
      voice: { side: "right", avatarGender: "boy" }
    });

    expect(result.audio.equals(audio)).toBe(true);
    expect(result.model).toBe(doubaoSpeechModel);
    expect(result.speaker).toBe(doubaoMaleSpeaker);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(doubaoSpeechEndpoint);
    expect(new Headers(init.headers).get("X-Api-Key")).toBe("user-speech-key");
    expect(new Headers(init.headers).get("X-Api-Resource-Id")).toBe("seed-tts-2.0");
    expect(JSON.parse(String(init.body))).toMatchObject({
      req_params: {
        text: "你好",
        speaker: doubaoMaleSpeaker,
        audio_params: { format: "mp3" }
      }
    });
  });

  it("surfaces upstream event errors and empty responses", () => {
    expect(() => parseDoubaoSpeechEvents('data: {"code":55000000,"message":"denied"}'))
      .toThrow("豆包语音返回 55000000：denied");
    expect(() => parseDoubaoSpeechEvents("data: [DONE]"))
      .toThrow("豆包语音没有返回音频");
  });
});
