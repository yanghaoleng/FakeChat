const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const archiveKeyword = "chara";
const maximumArchiveChunkBytes = 16 * 1024 * 1024;
const crcTable = buildCrcTable();

export const archiveCoverSize = 300;
export const archiveFooterHeight = archiveCoverSize / 3;
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
  stylePreset: string;
  characters: ArchiveCoverCharacter[];
};

type ArchiveBubble = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  colored: boolean;
  tail: "left" | "right";
};

const archiveBubbleCloud: ArchiveBubble[] = [
  { x: 58, y: 116, width: 78, height: 29, rotation: -4, colored: false, tail: "left" },
  { x: 142, y: 111, width: 72, height: 28, rotation: 3, colored: true, tail: "right" },
  { x: 82, y: 137, width: 106, height: 36, rotation: 2, colored: true, tail: "right" },
  { x: 183, y: 139, width: 67, height: 29, rotation: -5, colored: false, tail: "left" },
  { x: 39, y: 155, width: 78, height: 30, rotation: -2, colored: true, tail: "right" },
  { x: 112, y: 160, width: 96, height: 38, rotation: -3, colored: false, tail: "left" },
  { x: 204, y: 171, width: 61, height: 27, rotation: 5, colored: true, tail: "right" },
  { x: 58, y: 187, width: 86, height: 33, rotation: 4, colored: false, tail: "left" },
  { x: 137, y: 191, width: 111, height: 39, rotation: 2, colored: true, tail: "right" },
  { x: 31, y: 217, width: 66, height: 27, rotation: -6, colored: true, tail: "right" },
  { x: 87, y: 219, width: 91, height: 34, rotation: -2, colored: false, tail: "left" },
  { x: 174, y: 228, width: 78, height: 30, rotation: 5, colored: false, tail: "left" },
  { x: 66, y: 248, width: 75, height: 28, rotation: 4, colored: true, tail: "right" },
  { x: 133, y: 252, width: 103, height: 35, rotation: -4, colored: true, tail: "right" },
  { x: 224, y: 248, width: 49, height: 24, rotation: 6, colored: false, tail: "left" },
  { x: 24, y: 128, width: 42, height: 22, rotation: 5, colored: true, tail: "right" },
  { x: 236, y: 122, width: 39, height: 21, rotation: -5, colored: false, tail: "left" },
  { x: 17, y: 263, width: 43, height: 22, rotation: -3, colored: false, tail: "left" }
];

function getArchiveCoverProject(archive: unknown): ArchiveCoverProject {
  if (!archive || typeof archive !== "object") throw new Error("存档内容无效，无法生成封面");
  const project = (archive as { project?: unknown }).project;
  if (!project || typeof project !== "object") throw new Error("存档缺少聊天项目");
  const candidate = project as Partial<ArchiveCoverProject>;
  if (!Array.isArray(candidate.characters) || candidate.characters.length < 2) {
    throw new Error("存档缺少聊天角色");
  }
  return {
    stylePreset: typeof candidate.stylePreset === "string" ? candidate.stylePreset : "kuaishou-horizontal-chat",
    characters: candidate.characters
  };
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
  const size = 48;
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

function drawArchiveBubble(context: CanvasRenderingContext2D, bubble: ArchiveBubble, accent: string) {
  context.save();
  context.translate(bubble.x + bubble.width / 2, bubble.y + bubble.height / 2);
  context.rotate((bubble.rotation * Math.PI) / 180);
  context.shadowColor = "rgba(0,0,0,0.28)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  const fill = bubble.colored ? accent : "#f3f5f7";
  context.fillStyle = fill;
  roundedRectPath(context, -bubble.width / 2, -bubble.height / 2, bubble.width, bubble.height, 9);
  context.fill();
  context.shadowColor = "transparent";
  context.beginPath();
  const tailX = bubble.tail === "left" ? -bubble.width / 2 + 12 : bubble.width / 2 - 12;
  context.moveTo(tailX - (bubble.tail === "left" ? 5 : 0), bubble.height / 2 - 2);
  context.lineTo(tailX + (bubble.tail === "left" ? -2 : 7), bubble.height / 2 + 8);
  context.lineTo(tailX + (bubble.tail === "left" ? 8 : -5), bubble.height / 2 - 1);
  context.closePath();
  context.fill();
  context.restore();
}

function fitArchiveName(context: CanvasRenderingContext2D, name: string, maximumWidth: number) {
  const trimmed = name.trim() || "聊天对象";
  if (context.measureText(trimmed).width <= maximumWidth) return trimmed;
  let value = trimmed;
  while (value.length > 1 && context.measureText(`${value}…`).width > maximumWidth) value = value.slice(0, -1);
  return `${value}…`;
}

async function renderArchiveCover(archive: unknown) {
  const project = getArchiveCoverProject(archive);
  const leftCharacter = project.characters.find((character) => character.side === "left") ?? project.characters[0];
  const rightCharacter = project.characters.find((character) => character.side === "right") ?? project.characters[1];
  const isDingTalk = project.stylePreset === "jojo-company-chat";
  const accent = isDingTalk ? "#1677ff" : "#07c160";
  const [leftAvatar, rightAvatar] = await Promise.all([
    loadArchiveAvatar(leftCharacter.avatarUrl),
    loadArchiveAvatar(rightCharacter.avatarUrl)
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = archiveCoverSize;
  canvas.height = archiveImageHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成存档图片");

  const background = context.createLinearGradient(0, 0, 0, archiveCoverSize);
  background.addColorStop(0, "#111922");
  background.addColorStop(0.56, "#0b141c");
  background.addColorStop(1, "#071016");
  context.fillStyle = background;
  context.fillRect(0, 0, archiveCoverSize, archiveCoverSize);

  for (let index = 0; index < 110; index += 1) {
    const x = (index * 47) % archiveCoverSize;
    const y = (index * 83) % archiveCoverSize;
    context.fillStyle = `rgba(255,255,255,${0.008 + (index % 3) * 0.004})`;
    context.fillRect(x, y, 1, 1);
  }

  drawArchiveAvatar(context, leftCharacter, leftAvatar, 20, 18, accent);
  drawArchiveAvatar(context, rightCharacter, rightAvatar, 232, 18, accent);

  roundedRectPath(context, 84, 24, 132, 42, 11);
  context.fillStyle = "rgba(3,8,13,0.78)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(fitArchiveName(context, leftCharacter.name, 104), archiveCoverSize / 2, 45);

  archiveBubbleCloud.forEach((bubble) => drawArchiveBubble(context, bubble, accent));

  const vignette = context.createRadialGradient(150, 145, 76, 150, 145, 214);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.68, "rgba(0,0,0,0.05)");
  vignette.addColorStop(1, "rgba(0,0,0,0.48)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, archiveCoverSize, archiveCoverSize);

  context.fillStyle = "#030506";
  context.fillRect(0, archiveCoverSize, archiveCoverSize, archiveFooterHeight);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(0, archiveCoverSize, archiveCoverSize, 1);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.font = '650 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(archiveFooterTitle, archiveCoverSize / 2, archiveCoverSize + 38);
  context.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillStyle = "#b8bdc2";
  context.fillText(archiveFooterUrl, archiveCoverSize / 2, archiveCoverSize + 68);

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
