import { sampleProject } from "./sampleProject.js";
import { isGenericImageCopy } from "./imageNarrative.js";
import { localMemeAssets, normalizeMemeMessage } from "./memeLibrary.js";
import { hydrateMusicMessage, injectRomanticMusicMessage } from "./musicLibrary.js";
import { isGroupChatPrompt } from "./storyIdentity.js";
import {
  messageTypes,
  parseProject,
  type Character,
  type ChatMessage,
  type ChatSession,
  type DramaProject,
  type ScriptGenerateRequest
} from "./schema.js";

const maxGeneratedMessages = 72;

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

function customizeFallback(request: ScriptGenerateRequest): DramaProject {
  return {
    ...sampleProject,
    id: makeId("fallback"),
    title: request.brief.slice(0, 20) || sampleProject.title,
    brief: request.brief,
    messages: sampleProject.messages.map((message) => ({ ...message }))
  };
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.values(value);
  return [];
}

function namedObjectValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  return Object.entries(value).map(([id, item]) => (
    isRecord(item) && !stringValue(item.id) ? { ...item, id } : item
  ));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function validMediaUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\/[^\s]*$/.test(value)) return value;
  return validUrl(value);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(numberValue(value, fallback))));
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function normalizeMessageType(value: unknown, text: string): ChatMessage["type"] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (messageTypes.includes(normalized as ChatMessage["type"])) return normalized as ChatMessage["type"];
    if (["转账", "红包", "付款"].includes(normalized)) return "transfer";
    if (["图片", "照片"].includes(normalized)) return "image";
    if (["表情", "表情包", "gif"].includes(normalized)) return "meme";
    if (["音乐", "歌曲", "网易云音乐", "网易云"].includes(normalized)) return "music";
    if (["系统", "旁白"].includes(normalized)) return "system";
  }

  if (/转账|红包|付款|¥|￥/.test(text)) return "transfer";
  if (/照片|图片|合照|截图/.test(text)) return "image";
  if (/表情包|表情|破防|狗头/.test(text)) return "meme";
  if (/分享(?:一首|歌曲|音乐)|网易云音乐|网易云歌曲/.test(text)) return "music";
  return "text";
}

function sideFromSpeaker(value: string | undefined): ChatMessage["side"] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (/^(right|boy|male|man|user|player|me)$/.test(normalized) || /男主|男生|男方|玩家|用户|我方/.test(value)) return "right";
  if (/^(left|girl|female|woman|assistant|npc)$/.test(normalized) || /女主|女生|女方|对方/.test(value)) return "left";
  if (/叫叫|jiaojiao/.test(value)) return "right";
  if (/NPC|npc|新同事|新领导|甲方|乙方|其他部门|外包|财务|法务|园区/.test(value)) return "right";
  if (/铃铛|lingdang|猪小弟|zhuxiaodi|系统|xitong/.test(value)) return "left";
  return undefined;
}

function splitSpeakerPrefix(text: string): { side?: ChatMessage["side"]; text: string } {
  const match = text.match(/^(男主|男生|玩家|用户|我|女主|女生|对方|叫叫|NPC|铃铛|猪小弟|系统)\s*[：:]\s*(.+)$/i);
  if (!match) return { text };
  const side = sideFromSpeaker(match[1]);
  return { side, text: match[2].trim() || text };
}

function normalizeSide(record: Record<string, unknown>, text: string, type: ChatMessage["type"], index: number): ChatMessage["side"] {
  if (type === "system") return "center";
  const prefix = splitSpeakerPrefix(text).side;
  const speakerSide =
    prefix ||
    sideFromSpeaker(stringValue(record.speaker)) ||
    sideFromSpeaker(stringValue(record.sender)) ||
    sideFromSpeaker(stringValue(record.from)) ||
    sideFromSpeaker(stringValue(record.role)) ||
    sideFromSpeaker(stringValue(record.roleId)) ||
    sideFromSpeaker(stringValue(record.characterId)) ||
    sideFromSpeaker(stringValue(record.character)) ||
    sideFromSpeaker(stringValue(record.name)) ||
    sideFromSpeaker(stringValue(record.side));

  return speakerSide || enumValue(record.side, ["left", "right"] as const, index % 2 === 0 ? "right" : "left");
}

function amountFromText(text: string): number | undefined {
  const direct = text.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/) || text.match(/(\d+(?:\.\d{1,2})?)\s*(元|块|块钱|rmb|RMB)/);
  if (direct) return Number(direct[1]);
  return undefined;
}

function contextualTransferAmount(text: string) {
  const corpus = text.replace(/\s+/g, "");
  if (/奶茶|咖啡|打车|车费|小费/.test(corpus)) return 38;
  if (/红包|道歉|补偿/.test(corpus)) return 88;
  if (/定金|预约|陪聊|服务/.test(corpus)) return 520;
  if (/账单|差额|尾款|订单/.test(corpus)) return 368;
  if (/房租|押金|租金/.test(corpus)) return 1800;
  if (/医院|医药|检查|急诊/.test(corpus)) return 300;
  const candidates = [52, 66, 88, 99, 188, 288, 368, 520, 888];
  const seed = [...corpus].reduce((total, char) => total + char.charCodeAt(0), 23);
  return candidates[seed % candidates.length];
}

function normalizeTransferMessage(message: ChatMessage, context: string): ChatMessage {
  if (message.type !== "transfer") return message;
  const amount = message.amount || amountFromText(`${message.text} ${message.transferNote || ""}`) || contextualTransferAmount(`${message.text} ${message.transferNote || ""} ${context}`);
  return {
    ...message,
    amount,
    transferNote: message.transferNote || message.text || "转账给你"
  };
}

function normalizeProjectSource(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  for (const key of ["project", "dramaProject", "result", "data"]) {
    if (isRecord(value[key])) return value[key];
  }
  return value;
}

function normalizeAsset(value: unknown, index: number): DramaProject["assets"][number] | undefined {
  if (!isRecord(value)) return undefined;
  const kind = enumValue(value.kind, ["avatar", "image", "meme", "sound"] as const, index === 0 ? "image" : "meme");
  const rawUrl = stringValue(value.remoteUrl) || stringValue(value.url) || stringValue(value.src);
  const remoteUrl = validUrl(rawUrl);
  const localPath = stringValue(value.localPath) || (/^\/[^\s]*$/.test(rawUrl || "") ? rawUrl : undefined);

  return {
    id: stringValue(value.id) || `asset-${index + 1}`,
    kind,
    title: stringValue(value.title) || stringValue(value.name) || `${kind}-${index + 1}`,
    sourceName: stringValue(value.sourceName) || stringValue(value.source) || "DeepSeek",
    sourceUrl: validUrl(stringValue(value.sourceUrl)) || "",
    licenseNote: stringValue(value.licenseNote) || "AI 生成脚本引用素材，请在正式商用前替换为授权素材。",
    localPath,
    remoteUrl,
    tags: objectValues(value.tags).map((tag) => String(tag)).filter(Boolean),
    riskLevel: enumValue(value.riskLevel, ["safe", "unknown_or_restricted", "restricted"] as const, "unknown_or_restricted")
  };
}

function normalizeCharacter(value: unknown, index: number, fallback: Character): Character {
  const record = isRecord(value) ? value : {};
  const side = enumValue(record.side, ["left", "right"] as const, fallback.side);
  const name = stringValue(record.name) || fallback.name || `角色${index + 1}`;

  return {
    ...fallback,
    id: stringValue(record.id) || fallback.id || `role-${index + 1}`,
    name,
    side,
    avatarGender: enumValue(record.avatarGender, ["boy", "girl"] as const, fallback.avatarGender || (side === "right" ? "boy" : "girl")),
    avatarUrl: stringValue(record.avatarUrl) || fallback.avatarUrl,
    avatarInitial: (stringValue(record.avatarInitial) || stringValue(record.initial) || name.slice(-1) || fallback.avatarInitial).slice(0, 2),
    avatarGradient: stringValue(record.avatarGradient) || fallback.avatarGradient,
    voiceId: stringValue(record.voiceId) || fallback.voiceId || `deepseek-role-${index + 1}`,
    voicePreset: enumValue(record.voicePreset, ["young_real_female", "young_male"] as const, fallback.voicePreset || (side === "right" ? "young_male" : "young_real_female")),
    voiceDescription: stringValue(record.voiceDescription) || fallback.voiceDescription || (side === "right" ? "自然的年轻男声" : "自然的年轻女声")
  };
}

function normalizeCharacters(value: unknown, fallback: DramaProject): Character[] {
  const rawCharacters = namedObjectValues(value).slice(0, 6);
  if (!rawCharacters.length) return fallback.characters.map((character) => ({ ...character }));

  const characters: Character[] = [];
  const knownIds = new Set<string>();
  rawCharacters.forEach((rawCharacter, index) => {
    const record = isRecord(rawCharacter) ? rawCharacter : {};
    const rawId = stringValue(record.id);
    const rawSide = enumValue(record.side, ["left", "right"] as const, index === 0 ? "right" : "left");
    const base = fallback.characters.find((character) => character.id === rawId)
      ?? fallback.characters.find((character) => character.side === rawSide)
      ?? fallback.characters[index % fallback.characters.length];
    const character = normalizeCharacter(rawCharacter, index, base);
    if (knownIds.has(character.id)) return;
    knownIds.add(character.id);
    characters.push(character);
  });

  for (const fallbackCharacter of fallback.characters) {
    if (characters.length >= 2) break;
    if (knownIds.has(fallbackCharacter.id)) continue;
    knownIds.add(fallbackCharacter.id);
    characters.push({ ...fallbackCharacter });
  }
  return characters.slice(0, 6);
}

function participantId(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (!isRecord(value)) return undefined;
  return stringValue(value.id) || stringValue(value.roleId) || stringValue(value.characterId);
}

function normalizeChatSession(value: unknown, index: number, characters: Character[]): ChatSession | undefined {
  if (!isRecord(value)) return undefined;
  const id = stringValue(value.id) || stringValue(value.sessionId) || stringValue(value.conversationId) || `chat-${index + 1}`;
  const rawParticipants = value.participantIds ?? value.participants ?? value.memberIds ?? value.characterIds ?? value.roleIds;
  const validCharacterIds = new Set(characters.map((character) => character.id));
  const player = characters.find((character) => character.side === "right") ?? characters[0];
  const participantIds = [
    player?.id,
    ...objectValues(rawParticipants).map(participantId)
  ].filter((roleId): roleId is string => Boolean(roleId && validCharacterIds.has(roleId)));
  const uniqueParticipantIds = [...new Set(participantIds)];
  const peer = characters.find((character) => character.side === "left" && uniqueParticipantIds.includes(character.id));
  return {
    id,
    title: stringValue(value.title) || stringValue(value.name) || stringValue(value.label) || peer?.name || `会话${index + 1}`,
    participantIds: uniqueParticipantIds.length ? uniqueParticipantIds : [characters[0].id]
  };
}

function normalizeChatSessions(source: Record<string, unknown>, characters: Character[], messages: ChatMessage[]): ChatSession[] {
  const rawSessions = source.chatSessions ?? source.sessions ?? source.conversations;
  const sessions = new Map<string, ChatSession>();
  namedObjectValues(rawSessions).slice(0, 4).forEach((value, index) => {
    const session = normalizeChatSession(value, index, characters);
    if (!session) return;
    const previous = sessions.get(session.id);
    sessions.set(session.id, previous ? {
      ...previous,
      participantIds: [...new Set([...previous.participantIds, ...session.participantIds])]
    } : session);
  });

  const player = characters.find((character) => character.side === "right") ?? characters[0];
  for (const message of messages) {
    if (!message.sessionId || sessions.has(message.sessionId) || sessions.size >= 4) continue;
    const peer = message.roleId ? characters.find((character) => character.id === message.roleId && character.side === "left") : undefined;
    sessions.set(message.sessionId, {
      id: message.sessionId,
      title: peer?.name || "新会话",
      participantIds: [...new Set([player?.id, message.roleId].filter((id): id is string => Boolean(id)))]
    });
  }
  return [...sessions.values()];
}

function normalizeMessage(
  value: unknown,
  index: number,
  characters: DramaProject["characters"]
): ChatMessage {
  const record = isRecord(value) ? value : { text: String(value ?? "") };
  const rawText =
    stringValue(record.text) ||
    stringValue(record.content) ||
    stringValue(record.message) ||
    stringValue(record.caption) ||
    stringValue(record.description) ||
    stringValue(record.alt) ||
    stringValue(record.title) ||
    "继续";
  const prefixed = splitSpeakerPrefix(rawText);
  const type = normalizeMessageType(record.type || record.kind, prefixed.text);
  const side = normalizeSide(record, rawText, type, index);
  const roleForSide = characters.find((character) => character.side === side);
  const mediaDescription =
    stringValue(record.caption) ||
    stringValue(record.description) ||
    stringValue(record.alt) ||
    stringValue(record.title);
  const text = type === "image" && isGenericImageCopy(prefixed.text) && !isGenericImageCopy(mediaDescription)
    ? mediaDescription!
    : prefixed.text;
  const rawSfx = stringValue(record.sendSfx) || stringValue(record.sfx);
  const sendSfx = enumValue(rawSfx, ["none", "send", "image", "transfer", "meme"] as const, type === "image" || type === "transfer" || type === "meme" ? type : "send");

  const message: ChatMessage = {
    id: stringValue(record.id) || `msg-${index + 1}`,
    sessionId: stringValue(record.sessionId) || stringValue(record.conversationId),
    roleId: side === "center" ? undefined : stringValue(record.roleId) || stringValue(record.characterId) || stringValue(record.character) || roleForSide?.id,
    side,
    type,
    text,
    ttsText: stringValue(record.ttsText) || stringValue(record.voiceText),
    emotion: stringValue(record.emotion) || "平静",
    sendSfx,
    pauseMs: boundedNumber(record.pauseMs, 360, 0, 8000),
    holdMs: boundedNumber(record.holdMs, 1400, 300, 12000),
    assetId: stringValue(record.assetId),
    imageUrl: validMediaUrl(stringValue(record.imageUrl) || stringValue(record.url)),
    amount: type === "transfer" ? optionalNumberValue(record.amount, record.money, record.value, amountFromText(text)) : undefined,
    transferNote: stringValue(record.transferNote),
    musicId: stringValue(record.musicId) || stringValue(record.songId),
    musicTitle: stringValue(record.musicTitle) || (type === "music" ? stringValue(record.title) : undefined),
    musicArtist: stringValue(record.musicArtist) || stringValue(record.artist),
    musicLyric: stringValue(record.musicLyric) || stringValue(record.lyric),
    musicCoverUrl: validMediaUrl(stringValue(record.musicCoverUrl) || stringValue(record.coverUrl)),
    musicPreviewUrl: validMediaUrl(stringValue(record.musicPreviewUrl) || stringValue(record.previewUrl)),
    musicShareUrl: validUrl(stringValue(record.musicShareUrl) || stringValue(record.shareUrl)),
    musicCommentCount: optionalNumberValue(record.musicCommentCount, record.commentCount)
  };
  return hydrateMusicMessage(message, text);
}

function normalizeSfx(value: unknown): DramaProject["sfx"] {
  if (!isRecord(value)) return {};
  return {
    send: stringValue(value.send),
    image: stringValue(value.image),
    transfer: stringValue(value.transfer),
    meme: stringValue(value.meme),
    ambient: stringValue(value.ambient)
  };
}

function limitMessages(messages: ChatMessage[], request: ScriptGenerateRequest): ChatMessage[] {
  const next = messages.slice(0, maxGeneratedMessages);
  for (const requiredType of ["image", "meme"] as const) {
    if (next.some((message) => message.type === requiredType)) continue;
    const candidate = messages.find((message) => message.type === requiredType);
    if (candidate) {
      const replaceIndex = Math.max(0, next.length - 1 - (requiredType === "image" ? 1 : 0));
      next[replaceIndex] = candidate;
    }
  }

  return next.map((message, index) => {
    const withId = { ...message, id: message.id || `msg-${index + 1}` };
    return normalizeMemeMessage(normalizeTransferMessage(withId, request.brief), request.brief);
  });
}

export function normalizeDeepSeekProject(value: unknown, request: ScriptGenerateRequest): DramaProject {
  const source = normalizeProjectSource(value);
  const fallback = customizeFallback(request);
  const chatMode = enumValue(source.chatMode, ["direct", "group"] as const, isGroupChatPrompt(request.brief) ? "group" : fallback.chatMode);
  const characters = normalizeCharacters(source.characters, fallback);
  const rawMessages = objectValues(source.messages);

  if (!rawMessages.length) {
    throw new Error("DeepSeek JSON did not include a messages array");
  }

  const messagesWithPossibleMusic = injectRomanticMusicMessage(
    limitMessages(rawMessages.map((message, index) => normalizeMessage(message, index, characters)), request),
    { ...fallback, chatMode },
    request.brief,
    "deepseek"
  );
  const messages = messagesWithPossibleMusic.map((message, index, allMessages) => {
    if (message.sessionId) return message;
    const inheritedSessionId = allMessages[index - 1]?.sessionId || allMessages[index + 1]?.sessionId;
    return inheritedSessionId ? { ...message, sessionId: inheritedSessionId } : message;
  });
  const chatSessions = normalizeChatSessions(source, characters, messages);
  const defaultSessionId = chatSessions.length === 1 ? chatSessions[0].id : undefined;

  return parseProject({
    ...fallback,
    id: stringValue(source.id) || makeId("deepseek"),
    title: stringValue(source.title) || fallback.title,
    brief: stringValue(source.brief) || request.brief,
    chatMode,
    stylePreset: "kuaishou-horizontal-chat",
    fps: boundedNumber(source.fps, fallback.fps, 24, 60),
    canvas: {
      width: Math.round(numberValue(isRecord(source.canvas) ? source.canvas.width : undefined, fallback.canvas.width)),
      height: Math.round(numberValue(isRecord(source.canvas) ? source.canvas.height : undefined, fallback.canvas.height))
    },
    characters,
    chatSessions,
    assets: [
      ...localMemeAssets,
      ...objectValues(source.assets).map(normalizeAsset).filter((asset): asset is DramaProject["assets"][number] => Boolean(asset))
    ],
    messages: defaultSessionId
      ? messages.map((message) => message.sessionId ? message : { ...message, sessionId: defaultSessionId })
      : messages,
    sfx: normalizeSfx(source.sfx),
    audioMix: isRecord(source.audioMix) ? { ...fallback.audioMix, ...source.audioMix } : fallback.audioMix
  });
}
