import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const AVATAR_DIR = path.join(PUBLIC_DIR, "avatars");
export const AUDIO_DIR = path.join(DATA_DIR, "audio");
export const SFX_DIR = path.join(DATA_DIR, "sfx");
export const ASSET_DIR = path.join(DATA_DIR, "assets");
export const RENDER_DIR = path.join(ROOT_DIR, "renders");
export const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

export async function ensureRuntimeDirs() {
  await Promise.all([
    mkdir(AVATAR_DIR, { recursive: true }),
    mkdir(AUDIO_DIR, { recursive: true }),
    mkdir(SFX_DIR, { recursive: true }),
    mkdir(ASSET_DIR, { recursive: true }),
    mkdir(RENDER_DIR, { recursive: true })
  ]);
}

export function publicOrigin(): string {
  return process.env.PUBLIC_API_ORIGIN || `http://127.0.0.1:${process.env.API_PORT || 8787}`;
}

export function publicUrl(prefix: "audio" | "sfx" | "assets" | "avatars" | "renders", filename: string): string {
  return `${publicOrigin()}/${prefix}/${encodeURIComponent(filename)}`;
}
