#!/usr/bin/env python3
"""Tiny VoxCPM-compatible worker stub.

This is intentionally model-free. Replace synthesize_wav_bytes() with VoxCPM
inference and keep the HTTP contract stable:

POST /synthesize
{
  "text": "...",
  "voice_description": "...",
  "emotion": "...",
  "format": "wav",
  "sample_rate": 48000
}

Response: {"audio_base64": "..."}
"""

from __future__ import annotations

import base64
import io
import json
import math
import wave
from http.server import BaseHTTPRequestHandler, HTTPServer


def synthesize_wav_bytes(text: str, sample_rate: int = 48000) -> bytes:
    seconds = max(0.8, min(5.0, len(text) * 0.13))
    frames = int(seconds * sample_rate)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for index in range(frames):
            envelope = max(0.0, 1.0 - index / frames)
            sample = int(2600 * envelope * math.sin(2 * math.pi * 430 * index / sample_rate))
            wav.writeframesraw(sample.to_bytes(2, byteorder="little", signed=True))
    return buffer.getvalue()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/synthesize":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length) or b"{}")
        wav_bytes = synthesize_wav_bytes(payload.get("text", ""), int(payload.get("sample_rate", 48000)))
        response = json.dumps({"audio_base64": base64.b64encode(wav_bytes).decode("ascii")}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    print("VoxCPM worker stub listening on http://127.0.0.1:8765")
    server.serve_forever()
