const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const archiveKeyword = "chara";
const maximumArchiveChunkBytes = 16 * 1024 * 1024;
const crcTable = buildCrcTable();
const archiveDesignSize = 300;
const archiveDesignFooterHeight = 100;
const archiveDesignImageHeight = archiveDesignSize + archiveDesignFooterHeight;

export const archiveCoverSize = 800;
export const archiveFooterHeight = Math.round(archiveCoverSize / 3);
export const archiveImageHeight = archiveCoverSize + archiveFooterHeight;
export const archiveFooterTitle = "蛐蛐模拟器存档文件";
export const archiveFooterUrl = "ququ.mikeywa.icu";

export function archiveSquareCrop(sourceWidth: number, sourceHeight: number) {
  const size = Math.max(1, Math.min(sourceWidth, sourceHeight));
  const x = Math.max(0, (sourceWidth - size) / 2);
  const preferredCenterY = sourceHeight * 0.58;
  const y = Math.max(0, Math.min(sourceHeight - size, preferredCenterY - (size / 2)));
  return { size, x, y };
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32(bytes: Uint8Array, offset: number) {
  return (((bytes[offset] << 24) >>> 0)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function ascii(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return value;
}

function concatBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += ascii(bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("PNG 存档中的元数据已损坏");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function makeChunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, chunk.length - 4, crc32(concatBytes([typeBytes, data])));
  return chunk;
}

type ParsedChunk = {
  type: string;
  data: Uint8Array;
  raw: Uint8Array;
};

function parseChunks(bytes: Uint8Array) {
  if (!isPng(bytes)) throw new Error("这不是有效的 PNG 文件");
  const chunks: ParsedChunk[] = [];
  let offset = pngSignature.length;
  let sawEnd = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error("PNG 文件已截断");
    const length = uint32(bytes, offset);
    const chunkEnd = offset + 12 + length;
    if (length > maximumArchiveChunkBytes * 8 || chunkEnd > bytes.length) throw new Error("PNG 分块长度异常");
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const storedCrc = uint32(bytes, offset + 8 + length);
    const expectedCrc = crc32(concatBytes([typeBytes, data]));
    if (storedCrc !== expectedCrc) throw new Error("PNG 文件校验失败");
    const type = ascii(typeBytes);
    chunks.push({ type, data, raw: bytes.slice(offset, chunkEnd) });
    offset = chunkEnd;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }

  if (!sawEnd) throw new Error("PNG 文件缺少结尾分块");
  return chunks;
}

function textChunkKeyword(data: Uint8Array) {
  const separator = data.indexOf(0);
  return separator < 0 ? "" : ascii(data.subarray(0, separator));
}

export function isPng(bytes: Uint8Array) {
  return bytes.length >= pngSignature.length && pngSignature.every((byte, index) => bytes[index] === byte);
}

export function embedArchiveInPngBytes(pngBytes: Uint8Array, archive: unknown) {
  const chunks = parseChunks(pngBytes);
  const jsonBytes = new TextEncoder().encode(JSON.stringify(archive));
  const payload = new TextEncoder().encode(`${archiveKeyword}\0${bytesToBase64(jsonBytes)}`);
  if (payload.length > maximumArchiveChunkBytes) throw new Error("存档内容过大，无法写入 PNG");
  const metadataChunk = makeChunk("tEXt", payload);
  const output: Uint8Array[] = [pngSignature];

  for (const chunk of chunks) {
    if (chunk.type === "tEXt" && textChunkKeyword(chunk.data) === archiveKeyword) continue;
    if (chunk.type === "IEND") output.push(metadataChunk);
    output.push(chunk.raw);
  }

  return concatBytes(output);
}

export function extractArchiveFromPngBytes(pngBytes: Uint8Array): unknown {
  const chunks = parseChunks(pngBytes);
  const metadata = chunks.find((chunk) => chunk.type === "tEXt" && textChunkKeyword(chunk.data) === archiveKeyword);
  if (!metadata) throw new Error("这张 PNG 里没有可读取的聊天存档");
  const separator = metadata.data.indexOf(0);
  const encoded = ascii(metadata.data.subarray(separator + 1));
  const decoded = new TextDecoder().decode(base64ToBytes(encoded));
  try {
    return JSON.parse(decoded) as unknown;
  } catch {
    throw new Error("PNG 存档中的 JSON 已损坏");
  }
}

export async function readArchiveFile(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPng(bytes)) return extractArchiveFromPngBytes(bytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error("请选择由本应用导出的 PNG 或旧版 JSON 存档");
  }
}

type ArchiveCoverCharacter = {
  name: string;
  side: "left" | "right";
  avatarUrl?: string;
  avatarInitial: string;
};

type ArchiveCoverProject = {
  title?: string;
  chatMode?: "direct" | "group";
  stylePreset: string;
  characters: ArchiveCoverCharacter[];
  messages: Array<{ type?: string }>;
};

type ArchiveCover = {
  exportedAt?: string;
  promptCards: unknown[];
  project: ArchiveCoverProject;
};

function getArchiveCover(archive: unknown): ArchiveCover {
  if (!archive || typeof archive !== "object") throw new Error("存档内容无效，无法生成封面");
  const candidateArchive = archive as { exportedAt?: unknown; promptCards?: unknown; project?: unknown };
  const project = candidateArchive.project;
  if (!project || typeof project !== "object") throw new Error("存档缺少聊天项目");
  const candidate = project as Partial<ArchiveCoverProject>;
  if (!Array.isArray(candidate.characters) || candidate.characters.length < 2) {
    throw new Error("存档缺少聊天角色");
  }
  return {
    exportedAt: typeof candidateArchive.exportedAt === "string" ? candidateArchive.exportedAt : undefined,
    promptCards: Array.isArray(candidateArchive.promptCards) ? candidateArchive.promptCards : [],
    project: {
      title: typeof candidate.title === "string" ? candidate.title : undefined,
      chatMode: candidate.chatMode === "group" ? "group" : "direct",
      stylePreset: typeof candidate.stylePreset === "string" ? candidate.stylePreset : "kuaishou-horizontal-chat",
      characters: candidate.characters,
      messages: Array.isArray(candidate.messages) ? candidate.messages : []
    }
  };
}

export function archiveParticipantTitle(characters: Array<{ name: string }>) {
  const names = characters.map((character) => character.name.trim()).filter(Boolean);
  if (names.length <= 2) return `${names.join("、") || "聊天对象"}的聊天`;
  return `${names.slice(0, 2).join("、")}等 ${names.length} 人的聊天`;
}

export function archiveMediaCount(messages: Array<{ type?: string }>) {
  return messages.filter((message) => ![undefined, "text", "system"].includes(message.type)).length;
}

export function formatArchiveUpdatedAt(value: string | undefined) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}时`;
}

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function loadArchiveAvatar(url: string | undefined) {
  if (!url) return Promise.resolve<HTMLImageElement | null>(null);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(null), 2600);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    image.src = new URL(url, document.baseURI).href;
  });
}

function drawArchiveAvatar(
  context: CanvasRenderingContext2D,
  character: ArchiveCoverCharacter,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  accent: string
) {
  const size = 52;
  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  if (image) {
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, x, y, size, size);
  } else {
    const fallback = context.createLinearGradient(x, y, x + size, y + size);
    fallback.addColorStop(0, accent);
    fallback.addColorStop(1, "#172331");
    context.fillStyle = fallback;
    context.fillRect(x, y, size, size);
    context.fillStyle = "rgba(255,255,255,0.94)";
    context.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(character.avatarInitial.slice(0, 2), x + size / 2, y + size / 2 + 1);
  }
  context.restore();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2 - 0.5, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 1;
  context.stroke();
}

function fitArchiveName(context: CanvasRenderingContext2D, name: string, maximumWidth: number) {
  const trimmed = name.trim() || "聊天对象";
  if (context.measureText(trimmed).width <= maximumWidth) return trimmed;
  let value = trimmed;
  while (value.length > 1 && context.measureText(`${value}…`).width > maximumWidth) value = value.slice(0, -1);
  return `${value}…`;
}

async function renderArchiveCover(archive: unknown) {
  const cover = getArchiveCover(archive);
  const { project } = cover;
  const isDingTalk = project.stylePreset === "jojo-company-chat";
  const accent = isDingTalk ? "#1677ff" : "#07c160";
  const coverCharacters = project.characters;
  const avatars = await Promise.all(coverCharacters.map((character) => loadArchiveAvatar(character.avatarUrl)));

  const canvas = document.createElement("canvas");
  canvas.width = archiveCoverSize;
  canvas.height = archiveImageHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成存档图片");
  context.scale(archiveCoverSize / archiveDesignSize, archiveImageHeight / archiveDesignImageHeight);

  const background = context.createLinearGradient(0, 0, 0, archiveDesignSize);
  background.addColorStop(0, "#111922");
  background.addColorStop(0.56, "#0b141c");
  background.addColorStop(1, "#071016");
  context.fillStyle = background;
  context.fillRect(0, 0, archiveDesignSize, archiveDesignSize);

  for (let index = 0; index < 110; index += 1) {
    const x = (index * 47) % archiveDesignSize;
    const y = (index * 83) % archiveDesignSize;
    context.fillStyle = `rgba(255,255,255,${0.008 + (index % 3) * 0.004})`;
    context.fillRect(x, y, 1, 1);
  }

  const avatarStep = coverCharacters.length > 1 ? Math.min(37, 208 / (coverCharacters.length - 1)) : 0;
  const avatarRowWidth = 52 + (coverCharacters.length - 1) * avatarStep;
  const avatarStartX = (archiveDesignSize - avatarRowWidth) / 2;
  coverCharacters.forEach((character, index) => {
    drawArchiveAvatar(context, character, avatars[index], avatarStartX + index * avatarStep, 28, accent);
  });

  context.fillStyle = "rgba(255,255,255,0.96)";
  context.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(fitArchiveName(context, archiveParticipantTitle(project.characters), 256), archiveDesignSize / 2, 106);
  context.fillStyle = "rgba(190,202,211,0.76)";
  context.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(fitArchiveName(context, project.title || (project.chatMode === "group" ? "群聊存档" : "私聊存档"), 230), archiveDesignSize / 2, 128);

  const chips = [
    project.chatMode === "group" ? "群聊" : "私聊",
    `${cover.promptCards.length} 个章节`,
    `${archiveMediaCount(project.messages)} 个媒体`
  ];
  context.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const chipWidths = chips.map((chip) => Math.ceil(context.measureText(chip).width) + 18);
  const chipGap = 6;
  let chipX = (archiveDesignSize - chipWidths.reduce((sum, width) => sum + width, 0) - chipGap * (chips.length - 1)) / 2;
  chips.forEach((chip, index) => {
    roundedRectPath(context, chipX, 146, chipWidths[index], 25, 12.5);
    context.fillStyle = "rgba(255,255,255,0.06)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.09)";
    context.stroke();
    context.fillStyle = "rgba(220,226,231,0.82)";
    context.fillText(chip, chipX + chipWidths[index] / 2, 159);
    chipX += chipWidths[index] + chipGap;
  });

  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(20, 188, 260, 1);
  context.fillStyle = accent;
  context.font = '750 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(String(project.messages.length), 132, 222);
  context.fillStyle = "rgba(207,216,223,0.74)";
  context.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = "left";
  context.fillText("条聊天记录", 168, 226);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(20, 251, 260, 1);

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = '650 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(`${project.characters.length} 人参与`, 85, 271);
  context.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(formatArchiveUpdatedAt(cover.exportedAt), 215, 271);
  context.fillStyle = "rgba(171,184,193,0.72)";
  context.font = '400 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText("聊天人数", 85, 287);
  context.fillText("最后更新", 215, 287);

  const vignette = context.createRadialGradient(150, 145, 76, 150, 145, 214);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.68, "rgba(0,0,0,0.05)");
  vignette.addColorStop(1, "rgba(0,0,0,0.48)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, archiveDesignSize, archiveDesignSize);

  context.fillStyle = "#030506";
  context.fillRect(0, archiveDesignSize, archiveDesignSize, archiveDesignFooterHeight);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(0, archiveDesignSize, archiveDesignSize, 1);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.font = '650 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(archiveFooterTitle, archiveDesignSize / 2, archiveDesignSize + 38);
  context.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillStyle = "#b8bdc2";
  context.fillText(archiveFooterUrl, archiveDesignSize / 2, archiveDesignSize + 68);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("存档 PNG 生成失败"));
    }, "image/png");
  });
}

export async function createStoryArchivePng(archive: unknown) {
  const cover = await renderArchiveCover(archive);
  const embedded = embedArchiveInPngBytes(new Uint8Array(await cover.arrayBuffer()), archive);
  return new Blob([embedded], { type: "image/png" });
}
