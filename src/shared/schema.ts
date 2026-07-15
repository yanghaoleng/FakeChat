import { z } from "zod";

export const messageTypes = ["text", "image", "meme", "music", "transfer", "system"] as const;
export const sides = ["left", "right", "center"] as const;
export const riskLevels = ["safe", "unknown_or_restricted", "restricted"] as const;
export const stylePresets = ["kuaishou-horizontal-chat", "jojo-company-chat"] as const;

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
  participantIds: z.array(z.string()).min(1)
});

export const projectSchema = z.object({
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

export function parseProject(value: unknown): DramaProject {
  return projectSchema.parse(value);
}

export function getCharacter(project: DramaProject, message: ChatMessage): Character {
  const byId = message.roleId ? project.characters.find((character) => character.id === message.roleId) : undefined;
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
