import { genderMatchedAvatarUrl } from "./avatarLibrary.js";
import { getChatSessions, isGroupChatSession } from "./chatSessions.js";
import { imageNarrativeCopy, imageSourceForMessage } from "./imageNarrative.js";
import { jojoCssMemeCardForMessage, type JojoCssMemeCard } from "./jojoMemeCards.js";
import { isJojoProject } from "./jojoProject.js";
import { musicTrackForMessage } from "./musicLibrary.js";
import { getCharacter, type Character, type ChatMessage, type DramaProject } from "./schema.js";

export type MessagePresentationSurface = "interactive" | "remotion" | "canvas";

export interface MessageAvatarPresentation {
  characterId: string;
  name: string;
  source?: string;
  initial: string;
  gradient: string;
}

export type MessageMediaPresentation =
  | { kind: "none" }
  | {
    kind: "image";
    source?: string;
    alt: string;
    description: string;
  }
  | {
    kind: "meme";
    source?: string;
    cssCard?: JojoCssMemeCard;
    caption: string;
  }
  | {
    kind: "music";
    source: string;
    title: string;
    artist: string;
    lyric: string;
    previewUrl: string;
    shareUrl: string;
    commentCount: number;
  };

export interface MessagePresentation {
  character: Character;
  visualSide: ChatMessage["side"];
  isSystem: boolean;
  isJojo: boolean;
  isGroup: boolean;
  speakerName?: string;
  avatar?: MessageAvatarPresentation;
  media: MessageMediaPresentation;
}

export function isSystemMessage(message: ChatMessage) {
  return message.type === "system" || message.side === "center";
}

export function visualSideForMessage(project: DramaProject, message: ChatMessage): ChatMessage["side"] {
  if (message.side === "center") return "center";
  if (!isJojoProject(project)) return message.side;
  return getCharacter(project, message).side || message.side;
}

export function avatarPresentationForCharacter(character: Character): MessageAvatarPresentation {
  return {
    characterId: character.id,
    name: character.name,
    source: genderMatchedAvatarUrl(character),
    initial: character.avatarInitial,
    gradient: character.avatarGradient
  };
}

export function avatarPresentationForMessage(
  project: DramaProject,
  message: ChatMessage
): MessageAvatarPresentation | undefined {
  if (isSystemMessage(message)) return undefined;
  return avatarPresentationForCharacter(getCharacter(project, message));
}

export function speakerNameForMessage(
  project: DramaProject,
  message: ChatMessage,
  surface: MessagePresentationSurface = "interactive"
): string | undefined {
  if (isSystemMessage(message)) return undefined;
  const jojoMode = isJojoProject(project);
  const sessions = getChatSessions(project);
  const session = message.sessionId
    ? sessions.find((item) => item.id === message.sessionId)
    : sessions.length === 1 ? sessions[0] : undefined;
  const groupMode = session ? isGroupChatSession(project, session) : project.chatMode === "group";
  const shouldShow = surface === "interactive"
    ? jojoMode || groupMode
    : surface === "remotion"
      ? groupMode && !jojoMode
      : groupMode;
  return shouldShow ? getCharacter(project, message).name : undefined;
}

export function mediaPresentationForMessage(
  project: DramaProject,
  message: ChatMessage
): MessageMediaPresentation {
  if (message.type === "image") {
    const copy = imageNarrativeCopy(project, message);
    return {
      kind: "image",
      source: imageSourceForMessage(project, message),
      alt: copy.alt,
      description: copy.description
    };
  }

  if (message.type === "meme") {
    const cssCard = jojoCssMemeCardForMessage(message);
    return {
      kind: "meme",
      source: cssCard ? undefined : imageSourceForMessage(project, message),
      cssCard,
      caption: message.text
    };
  }

  if (message.type === "music") {
    const track = musicTrackForMessage(message);
    return {
      kind: "music",
      source: message.musicCoverUrl || track.coverUrl,
      title: message.musicTitle || track.title,
      artist: message.musicArtist || track.artist,
      lyric: message.musicLyric || track.lyric,
      previewUrl: message.musicPreviewUrl || track.previewUrl,
      shareUrl: message.musicShareUrl || track.shareUrl,
      commentCount: message.musicCommentCount || track.commentCount
    };
  }

  return { kind: "none" };
}

export function messagePresentationFor(
  project: DramaProject,
  message: ChatMessage,
  surface: MessagePresentationSurface = "interactive"
): MessagePresentation {
  const isSystem = isSystemMessage(message);
  const sessions = getChatSessions(project);
  const session = message.sessionId
    ? sessions.find((item) => item.id === message.sessionId)
    : sessions.length === 1 ? sessions[0] : undefined;
  return {
    character: getCharacter(project, message),
    visualSide: visualSideForMessage(project, message),
    isSystem,
    isJojo: isJojoProject(project),
    isGroup: session ? isGroupChatSession(project, session) : project.chatMode === "group",
    speakerName: speakerNameForMessage(project, message, surface),
    avatar: isSystem ? undefined : avatarPresentationForMessage(project, message),
    media: mediaPresentationForMessage(project, message)
  };
}
