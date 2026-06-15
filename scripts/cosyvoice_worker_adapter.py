#!/usr/bin/env python3
"""VoxCPM-compatible adapter for the local CosyVoice_for_MacOs API."""

from __future__ import annotations

import base64
import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer


COSYVOICE_API_URL = os.environ.get("COSYVOICE_API_URL", "http://127.0.0.1:9880").rstrip("/")
HOST = os.environ.get("COSYVOICE_ADAPTER_HOST", "127.0.0.1")
PORT = int(os.environ.get("COSYVOICE_ADAPTER_PORT", "8765"))
FEMALE_SPEAKER = os.environ.get("COSYVOICE_FEMALE_SPEAKER", "步非烟")
MALE_SPEAKER = os.environ.get("COSYVOICE_MALE_SPEAKER", "jok老师")


def speaker_for(payload: dict) -> str:
    voice_preset = str(payload.get("voice_preset") or "")
    voice_description = str(payload.get("voice_description") or "")
    voice_id = str(payload.get("voice_id") or "")
    joined = f"{voice_preset} {voice_description} {voice_id}"
    if "female" in voice_preset or "女" in joined or "girl" in joined:
        return FEMALE_SPEAKER
    return MALE_SPEAKER


def synthesize(payload: dict) -> bytes:
    text = str(payload.get("text") or "").strip()
    if not text:
        raise ValueError("text is required")
    speaker = speaker_for(payload)
    query = urllib.parse.urlencode({"text": text, "speaker": speaker})
    request = urllib.request.Request(f"{COSYVOICE_API_URL}/?{query}", method="GET")
    with urllib.request.urlopen(request, timeout=180) as response:
        content_type = response.headers.get("Content-Type", "")
        audio = response.read()
    if "audio" not in content_type:
        raise RuntimeError(f"CosyVoice returned non-audio response: {content_type}")
    return audio


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/synthesize":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            audio = synthesize(payload)
            body = json.dumps({"audio_base64": base64.b64encode(audio).decode("ascii")}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"CosyVoice adapter listening on http://{HOST}:{PORT}")
    print(f"Forwarding to {COSYVOICE_API_URL}, female={FEMALE_SPEAKER}, male={MALE_SPEAKER}")
    server.serve_forever()
