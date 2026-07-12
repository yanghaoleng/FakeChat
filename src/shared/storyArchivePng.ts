const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const archiveKeyword = "chara";
const maximumArchiveChunkBytes = 16 * 1024 * 1024;
const transparentImagePlaceholder = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const crcTable = buildCrcTable();

export const archiveCoverSize = 1024;

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

function waitForFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function waitForCaptureAssets(element: HTMLElement) {
  await document.fonts?.ready;
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth) return;
    try {
      await Promise.race([
        image.decode(),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1600))
      ]);
    } catch {
      // html-to-image will replace an unavailable remote image with the placeholder.
    }
  }));
  await waitForFrame();
  await waitForFrame();
}

function makeCurrentViewportClone(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  const host = document.createElement("div");
  clone.classList.add("archive-capture-target");
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "relative",
    top: "0",
    left: "0",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    transform: "none",
    pointerEvents: "none"
  });

  const sourceScroll = element.querySelector<HTMLElement>(".wechat-chat-scroll");
  const cloneScroll = clone.querySelector<HTMLElement>(".wechat-chat-scroll");
  const cloneContent = clone.querySelector<HTMLElement>(".wechat-chat-content");
  if (sourceScroll && cloneScroll && cloneContent) {
    const maximumScroll = Math.max(0, sourceScroll.scrollHeight - sourceScroll.clientHeight);
    const currentScroll = Math.max(0, Math.min(sourceScroll.scrollTop, maximumScroll));
    cloneScroll.style.overflow = "hidden";
    cloneScroll.scrollTop = 0;
    cloneContent.style.transform = `translateY(-${currentScroll}px)`;
    cloneContent.style.animation = "none";
    cloneContent.style.transition = "none";
  }

  Object.assign(host.style, {
    position: "fixed",
    top: "0",
    left: "-20000px",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: "hidden",
    pointerEvents: "none"
  });
  host.appendChild(clone);
  document.body.appendChild(host);
  return {
    element: clone,
    remove: () => host.remove()
  };
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("存档截图无法解码"));
    };
    image.src = url;
  });
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

async function applyArchiveLensFilter(blob: Blob) {
  const image = await loadImage(blob);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("当前浏览器无法生成存档图片");
  sourceContext.drawImage(image, 0, 0);

  const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = archiveCoverSize;
  outputCanvas.height = archiveCoverSize;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("当前浏览器无法生成存档图片");
  const output = outputContext.createImageData(archiveCoverSize, archiveCoverSize);
  const crop = archiveSquareCrop(sourceCanvas.width, sourceCanvas.height);
  const outputCenter = (archiveCoverSize - 1) / 2;

  function sample(normalizedX: number, normalizedY: number, channel: number) {
    const sourceX = Math.max(0, Math.min(
      sourceCanvas.width - 1,
      Math.round(crop.x + ((normalizedX + 1) / 2) * (crop.size - 1))
    ));
    const sourceY = Math.max(0, Math.min(
      sourceCanvas.height - 1,
      Math.round(crop.y + ((normalizedY + 1) / 2) * (crop.size - 1))
    ));
    return source.data[((sourceY * sourceCanvas.width) + sourceX) * 4 + channel];
  }

  for (let y = 0; y < archiveCoverSize; y += 1) {
    const normalizedY = (y - outputCenter) / outputCenter;
    for (let x = 0; x < archiveCoverSize; x += 1) {
      const normalizedX = (x - outputCenter) / outputCenter;
      const radiusSquared = normalizedX * normalizedX + normalizedY * normalizedY;
      const radius = Math.sqrt(radiusSquared);
      const lensScale = 1 + (0.26 * radiusSquared) + (0.05 * radiusSquared * radiusSquared);
      const lensX = normalizedX / lensScale;
      const lensY = normalizedY / lensScale;
      const chromaticOffset = 0.012 * Math.min(1.5, radiusSquared);
      const red = sample(lensX * (1 + chromaticOffset), lensY * (1 + chromaticOffset), 0);
      const green = sample(lensX, lensY, 1);
      const blue = sample(lensX * (1 - chromaticOffset), lensY * (1 - chromaticOffset), 2);
      const alpha = sample(lensX, lensY, 3);
      const vignetteProgress = Math.max(0, Math.min(1, (radius - 0.5) / 0.92));
      const vignette = 1 - (0.68 * Math.pow(vignetteProgress, 1.65));
      const centerLift = 1 + (0.055 * Math.max(0, 1 - radiusSquared));
      const grain = ((((x * 17) + (y * 31)) % 23) - 11) * 0.28;
      const outputIndex = ((y * archiveCoverSize) + x) * 4;
      output.data[outputIndex] = clampChannel((((red - 128) * 1.055) + 128) * vignette * centerLift + grain);
      output.data[outputIndex + 1] = clampChannel((((green - 128) * 1.04) + 130) * vignette * centerLift + grain);
      output.data[outputIndex + 2] = clampChannel((((blue - 128) * 1.045) + 134) * vignette * centerLift + grain);
      output.data[outputIndex + 3] = alpha;
    }
  }

  outputContext.putImageData(output, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((filteredBlob) => {
      if (filteredBlob) resolve(filteredBlob);
      else reject(new Error("存档 PNG 生成失败"));
    }, "image/png");
  });
}

export async function createStoryArchivePng(element: HTMLElement, archive: unknown) {
  const { toBlob } = await import("html-to-image");
  const capture = makeCurrentViewportClone(element);
  const fetchController = new AbortController();
  const fetchTimeout = window.setTimeout(() => fetchController.abort(), 5000);
  try {
    await waitForCaptureAssets(capture.element);
    const screenshot = await toBlob(capture.element, {
      backgroundColor: "#ededed",
      cacheBust: false,
      fetchRequestInit: { cache: "force-cache", signal: fetchController.signal },
      imagePlaceholder: transparentImagePlaceholder,
      pixelRatio: 2,
      skipFonts: true,
      skipAutoScale: true
    });
    if (!screenshot) throw new Error("当前界面暂时无法生成存档截图");
    const filtered = await applyArchiveLensFilter(screenshot);
    const embedded = embedArchiveInPngBytes(new Uint8Array(await filtered.arrayBuffer()), archive);
    return new Blob([embedded], { type: "image/png" });
  } finally {
    window.clearTimeout(fetchTimeout);
    capture.remove();
  }
}
