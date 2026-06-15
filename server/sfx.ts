import { access } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SFX_DIR, publicUrl } from "./paths";

const execFileAsync = promisify(execFile);

const exists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

async function makeTone(fileName: string, frequency: number, duration: number, volumeDb: number) {
  const out = path.join(SFX_DIR, fileName);
  if (await exists(out)) return;

  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${frequency}:duration=${duration}`,
    "-af",
    `volume=${volumeDb}dB,afade=t=out:st=${Math.max(0.01, duration - 0.035)}:d=0.035`,
    "-ar",
    "44100",
    "-ac",
    "2",
    out
  ]);
}

async function makeAmbient() {
  const out = path.join(SFX_DIR, "ambient.wav");
  if (await exists(out)) return;

  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=pink:amplitude=0.018:duration=180",
    "-af",
    "highpass=f=120,lowpass=f=4200,volume=-28dB",
    "-ar",
    "44100",
    "-ac",
    "2",
    out
  ]);
}

export async function ensureSfxLibrary() {
  await makeTone("send.wav", 1080, 0.075, -14);
  await makeTone("image.wav", 740, 0.12, -13);
  await makeTone("transfer.wav", 1320, 0.18, -12);
  await makeTone("meme.wav", 520, 0.16, -12);
  await makeAmbient();

  return {
    send: publicUrl("sfx", "send.wav"),
    image: publicUrl("sfx", "image.wav"),
    transfer: publicUrl("sfx", "transfer.wav"),
    meme: publicUrl("sfx", "meme.wav"),
    ambient: publicUrl("sfx", "ambient.wav")
  };
}
