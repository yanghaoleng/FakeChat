import type { DefaultAvatarGender } from "./avatarLibrary.js";
import type { ChatMessage } from "./schema.js";

export type PresetMessageSpec = {
  roleId: string;
  text: string;
  type?: ChatMessage["type"];
  assetId?: string;
  emotion?: string;
  ttsText?: string;
  pauseMs?: number;
  holdMs?: number;
  amount?: number;
  transferNote?: string;
  sendSfx?: ChatMessage["sendSfx"];
};

export type PresetCharacterSpec = {
  id: string;
  name: string;
  side: "left" | "right";
  avatarGender: DefaultAvatarGender;
  avatarId: string;
  voiceDescription: string;
};

export type ViralPresetRole = "any" | "male" | "female";
export type JojoPresetRole = "jiaojiao" | "npc";

export type PresetStory = {
  id: string;
  title: string;
  prompt: string;
  nextPrompt: string;
  messages: PresetMessageSpec[];
  language?: "zh" | "en";
  chatMode?: "direct" | "group";
  viralRole?: ViralPresetRole;
  viralRoles?: Array<Exclude<ViralPresetRole, "any">>;
  playerCharacterId?: string;
  presetCharacters?: PresetCharacterSpec[];
  peerAvatarSet?: "western-student";
  characterAvatarSet?: "neutral-editorial";
  characterAvatarIds?: Partial<Record<"boy" | "girl", string>>;
  characterNames?: Partial<Record<"boy" | "girl", string>>;
  characterGenders?: Partial<Record<"boy" | "girl", DefaultAvatarGender>>;
  characterVoiceDescriptions?: Partial<Record<"boy" | "girl", string>>;
};

export type PresetRoleSelection = {
  viralRole: ViralPresetRole;
  jojoRole: JojoPresetRole;
};
