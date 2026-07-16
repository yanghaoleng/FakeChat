import { z } from "zod";

export const messageTypes = ["text", "image", "meme", "music", "transfer", "system"] as const;
export const sides = ["left", "right", "center"] as const;
export const riskLevels = ["safe", "unknown_or_restricted", "restricted"] as const;
export const stylePresets = ["kuaishou-horizontal-chat", "jojo-company-chat"] as const;
export const chatSessionKinds = ["direct", "group"] as const;
export const currentProjectSchemaVersion = 2 as const;

const isAbsoluteUrlOrPublicPath = (value: string) => {
  if (/^\/[^\s]*$/.test(value)) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const mediaUrlSchema = z.string().refine(isAbsoluteUrlOrPublicPath, "Expected an absolute URL or public path");

export const assetSchema = z.object({
  id: z.string(),
  kind: z.enum(["avatar", "image", "meme", "sound"]),
  title: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string().url().or(z.literal("")),
  licenseNote: z.string(),
  localPath: z.string().optional(),
  remoteUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  riskLevel: z.enum(riskLevels).default("unknown_or_restricted")
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(["left", "right"]),
  avatarGender: z.enum(["boy", "girl"]).optional(),
  avatarUrl: mediaUrlSchema.optional(),
  avatarInitial: z.string().min(1).max(2),
  avatarGradient: z.string(),
  voiceId: z.string(),
  voicePreset: z.enum(["young_real_female", "young_male"]).optional(),
  voiceDescription: z.string()
});

export const chatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string().optional(),
  senderId: z.string().optional(),
  roleId: z.string().optional(),
  side: z.enum(sides),
  type: z.enum(messageTypes),
  text: z.string().default(""),
  ttsText: z.string().optional(),
  emotion: z.string().default("平静"),
  sendSfx: z.enum(["none", "send", "image", "transfer", "meme"]).default("send"),
  pauseMs: z.number().int().min(0).max(8000).default(380),
  holdMs: z.number().int().min(300).max(12000).default(1200),
  assetId: z.string().optional(),
  imageUrl: mediaUrlSchema.optional(),
  amount: z.number().min(0).optional(),
  transferNote: z.string().optional(),
  musicId: z.string().optional(),
  musicTitle: z.string().optional(),
  musicArtist: z.string().optional(),
  musicLyric: z.string().optional(),
  musicCoverUrl: mediaUrlSchema.optional(),
  musicPreviewUrl: mediaUrlSchema.optional(),
  musicShareUrl: z.string().url().optional(),
  musicCommentCount: z.number().int().min(0).optional(),
  audioUrl: z.string().optional(),
  audioPath: z.string().optional(),
  durationMs: z.number().int().positive().optional()
});

export const chatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(chatSessionKinds).optional(),
  participantIds: z.array(z.string()).min(1)
});

export const projectSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(currentProjectSchemaVersion)]).optional(),
  id: z.string(),
  title: z.string(),
  brief: z.string(),
  chatMode: z.enum(["direct", "group"]).default("direct"),
  stylePreset: z.enum(stylePresets).default("kuaishou-horizontal-chat"),
  fps: z.number().int().min(24).max(60).default(30),
  canvas: z.object({
    width: z.number().int().default(1516),
    height: z.number().int().default(852)
  }),
  characters: z.array(characterSchema).min(2),
  selfCharacterId: z.string().optional(),
  chatSessions: z.array(chatSessionSchema).default([]),
  messages: z.array(chatMessageSchema),
  assets: z.array(assetSchema).default([]),
  sfx: z.object({
    send: z.string().optional(),
    image: z.string().optional(),
    transfer: z.string().optional(),
    meme: z.string().optional(),
    ambient: z.string().optional()
  }).default({}),
  audioMix: z.object({
    ttsVolume: z.number().min(0).max(2).default(1),
    sfxVolume: z.number().min(0).max(1).default(0.28),
    ambientVolume: z.number().min(0).max(1).default(0.035),
    limiterPeakDb: z.number().max(0).default(-1)
  }).default({
    ttsVolume: 1,
    sfxVolume: 0.28,
    ambientVolume: 0.035,
    limiterPeakDb: -1
  })
});

export const scriptGenerateRequestSchema = z.object({
  brief: z.string().min(2),
  durationSeconds: z.number().int().min(30).max(180).default(75),
  styleNotes: z.string().optional()
});

export type MemeAsset = z.infer<typeof assetSchema>;
export type Character = z.infer<typeof characterSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type DramaProject = z.infer<typeof projectSchema>;
export type ScriptGenerateRequest = z.infer<typeof scriptGenerateRequestSchema>;

export type CanonicalChatMessage = Omit<ChatMessage, "sessionId" | "senderId" | "roleId"> & {
  sessionId: string;
  senderId: string | undefined;
  roleId: string | undefined;
};

export type CanonicalChatSession = Omit<ChatSession, "kind"> & {
  kind: (typeof chatSessionKinds)[number];
};

/**
 * The in-memory v2 shape. The public DramaProject type intentionally keeps the
 * new fields optional so old presets and integrations remain valid inputs;
 * parseProject() is the boundary that guarantees this canonical output.
 */
export type CanonicalDramaProject = Omit<
  DramaProject,
  "schemaVersion" | "selfCharacterId" | "chatSessions" | "messages"
> & {
  schemaVersion: typeof currentProjectSchemaVersion;
  selfCharacterId: string;
  chatSessions: CanonicalChatSession[];
  messages: CanonicalChatMessage[];
};

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function inferSelfCharacterId(project: DramaProject) {
  if (project.selfCharacterId && project.characters.some((character) => character.id === project.selfCharacterId)) {
    return project.selfCharacterId;
  }
  return project.characters.find((character) => character.side === "right")?.id ?? project.characters[0].id;
}

function canonicalSession(
  project: DramaProject,
  session: ChatSession,
  selfCharacterId: string
): CanonicalChatSession {
  const validCharacterIds = new Set(project.characters.map((character) => character.id));
  const requestedParticipants = unique([
    selfCharacterId,
    ...session.participantIds.filter((id) => validCharacterIds.has(id))
  ]);
  const kind = session.kind
    ?? (project.chatMode === "group" || requestedParticipants.length > 2 ? "group" : "direct");
  const participantIds = kind === "direct"
    ? unique([
      selfCharacterId,
      requestedParticipants.find((id) => id !== selfCharacterId)
        ?? project.characters.find((character) => character.id !== selfCharacterId)?.id
    ])
    : requestedParticipants;

  return {
    ...session,
    title: session.title.trim() || (kind === "group" ? project.title : "聊天"),
    kind,
    participantIds
  };
}

function legacyGroupSession(project: DramaProject, selfCharacterId: string): CanonicalChatSession {
  return {
    id: "chat-main",
    title: project.title.trim() || "群聊",
    kind: "group",
    participantIds: unique([
      selfCharacterId,
      ...project.characters.map((character) => character.id)
    ])
  };
}

/** Upgrade a parsed v1/legacy project without mutating the caller's object. */
export function canonicalizeProject(project: DramaProject): CanonicalDramaProject {
  const selfCharacterId = inferSelfCharacterId(project);
  const isLegacyProject = project.schemaVersion !== currentProjectSchemaVersion;
  const chatSessions = isLegacyProject && project.chatMode === "group"
    ? [legacyGroupSession(project, selfCharacterId)]
    : project.chatSessions.map((session) => canonicalSession(project, session, selfCharacterId));
  const sessionsByParticipantId = new Map<string, string[]>();
  for (const session of chatSessions) {
    for (const participantId of session.participantIds) {
      const sessionIds = sessionsByParticipantId.get(participantId) ?? [];
      sessionIds.push(session.id);
      sessionsByParticipantId.set(participantId, sessionIds);
    }
  }
  const soleSessionId = chatSessions.length === 1 ? chatSessions[0].id : undefined;
  const fallbackSessionId = chatSessions[0]?.id ?? "chat-main";
  const legacyGroupSessionId = isLegacyProject && project.chatMode === "group"
    ? fallbackSessionId
    : undefined;
  const nextExplicitSessionIds = new Array<string | undefined>(project.messages.length);
  let nextExplicitSessionId: string | undefined;
  for (let index = project.messages.length - 1; index >= 0; index -= 1) {
    nextExplicitSessionIds[index] = nextExplicitSessionId;
    if (project.messages[index].sessionId) nextExplicitSessionId = project.messages[index].sessionId;
  }
  let previousSessionId: string | undefined;
  const messages = project.messages.map((message, index): CanonicalChatMessage => {
    const isSystem = message.type === "system" || message.side === "center";
    const inferredCharacter = isSystem
      ? undefined
      : project.characters.find((character) => character.side === message.side);
    const requestedSenderId = message.senderId ?? message.roleId;
    const senderId = isSystem
      ? undefined
      : requestedSenderId && project.characters.some((character) => character.id === requestedSenderId)
        ? requestedSenderId
        : inferredCharacter?.id;
    const senderSessionIds = senderId && senderId !== selfCharacterId
      ? sessionsByParticipantId.get(senderId)
      : undefined;
    const sessionId = legacyGroupSessionId
      ?? message.sessionId
      ?? (senderSessionIds?.length === 1 ? senderSessionIds[0] : undefined)
      ?? previousSessionId
      ?? nextExplicitSessionIds[index]
      ?? soleSessionId
      ?? fallbackSessionId;
    previousSessionId = sessionId;
    return {
      ...message,
      sessionId,
      senderId,
      roleId: senderId
    };
  });

  return {
    ...project,
    schemaVersion: currentProjectSchemaVersion,
    selfCharacterId,
    chatSessions,
    messages
  };
}

export function parseProject(value: unknown): CanonicalDramaProject {
  return canonicalizeProject(projectSchema.parse(value));
}

export function getCharacter(project: DramaProject, message: ChatMessage): Character {
  const senderId = message.senderId ?? message.roleId;
  const byId = senderId ? project.characters.find((character) => character.id === senderId) : undefined;
  const bySide = project.characters.find((character) => character.side === message.side);
  return byId ?? bySide ?? project.characters[0];
}

export function isVoiceMessage(message: ChatMessage): boolean {
  return message.type === "text" || message.type === "transfer" || Boolean(message.ttsText);
}

export function messageVoiceText(message: ChatMessage): string {
  if (message.ttsText) return message.ttsText;
  if (message.type === "transfer") {
    return message.text || `转账 ${message.amount ?? ""} 元`;
  }
  return message.text;
}
