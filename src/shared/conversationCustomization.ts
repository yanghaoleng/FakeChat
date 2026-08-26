import { getChatSessions } from "./chatSessions.js";
import type { DramaProject } from "./schema.js";

const storagePrefix = "ququ-conversation-customization-v1";

export interface ConversationCharacterCustomization {
  name?: string;
  avatarUrl?: string;
}

export interface ConversationCustomization {
  title?: string;
  characters?: Record<string, ConversationCharacterCustomization>;
}

export type ConversationCustomizationMap = Record<string, ConversationCustomization>;

function storageKey(project: DramaProject, sessionId: string) {
  return [storagePrefix, project.stylePreset, project.id, sessionId]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanAvatarUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(value) ? value : undefined;
}

export function normalizeConversationCustomization(value: unknown): ConversationCustomization {
  if (!value || typeof value !== "object") return {};
  const candidate = value as { title?: unknown; characters?: unknown };
  const title = cleanText(candidate.title, 48) || undefined;
  const characters: Record<string, ConversationCharacterCustomization> = {};

  if (candidate.characters && typeof candidate.characters === "object") {
    for (const [characterId, rawCharacter] of Object.entries(candidate.characters)) {
      if (!rawCharacter || typeof rawCharacter !== "object") continue;
      const character = rawCharacter as { name?: unknown; avatarUrl?: unknown };
      const name = cleanText(character.name, 32) || undefined;
      const avatarUrl = cleanAvatarUrl(character.avatarUrl);
      if (name || avatarUrl) characters[characterId] = { name, avatarUrl };
    }
  }

  return {
    ...(title ? { title } : {}),
    ...(Object.keys(characters).length ? { characters } : {})
  };
}

export function isConversationCustomizationEmpty(customization: ConversationCustomization) {
  return !customization.title && !Object.keys(customization.characters ?? {}).length;
}

export function readConversationCustomizations(project: DramaProject): ConversationCustomizationMap {
  if (typeof window === "undefined") return {};
  const customizations: ConversationCustomizationMap = {};

  for (const session of getChatSessions(project)) {
    try {
      const rawValue = window.localStorage.getItem(storageKey(project, session.id));
      if (!rawValue) continue;
      const customization = normalizeConversationCustomization(JSON.parse(rawValue));
      if (!isConversationCustomizationEmpty(customization)) customizations[session.id] = customization;
    } catch {
      // A corrupt or unavailable local entry should never block the chat preview.
    }
  }

  return customizations;
}

export function saveConversationCustomization(
  project: DramaProject,
  sessionId: string,
  customization: ConversationCustomization
) {
  if (typeof window === "undefined") return false;
  const normalized = normalizeConversationCustomization(customization);
  try {
    if (isConversationCustomizationEmpty(normalized)) {
      window.localStorage.removeItem(storageKey(project, sessionId));
    } else {
      window.localStorage.setItem(storageKey(project, sessionId), JSON.stringify(normalized));
    }
    return true;
  } catch {
    return false;
  }
}

function avatarInitial(name: string) {
  return Array.from(name.trim()).slice(0, 2).join("") || "？";
}

export function applyConversationCustomization(
  project: DramaProject,
  sessionId: string,
  customization: ConversationCustomization | undefined
): DramaProject {
  if (!customization || isConversationCustomizationEmpty(customization)) return project;
  const characterCustomizations = customization.characters ?? {};
  const characters = project.characters.map((character) => {
    const customCharacter = characterCustomizations[character.id];
    if (!customCharacter) return character;
    const name = customCharacter.name || character.name;
    return {
      ...character,
      name,
      avatarInitial: customCharacter.name ? avatarInitial(name) : character.avatarInitial,
      avatarUrl: customCharacter.avatarUrl || character.avatarUrl
    };
  });
  const chatSessions = customization.title
    ? getChatSessions(project).map((session) => (
      session.id === sessionId ? { ...session, title: customization.title! } : session
    ))
    : project.chatSessions;

  return {
    ...project,
    characters,
    chatSessions
  };
}
