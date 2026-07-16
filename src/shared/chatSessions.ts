import type { Character, ChatMessage, ChatSession, DramaProject } from "./schema.js";
import { groupTitleForPrompt, isUsableGroupTitle } from "./storyIdentity.js";

export const defaultChatSessionId = "chat-main";

export interface ConversationIndex {
  readonly sessions: readonly ChatSession[];
  readonly sessionsById: ReadonlyMap<string, ChatSession>;
  readonly sessionIdByMessageId: ReadonlyMap<string, string>;
  readonly messagesBySessionId: ReadonlyMap<string, readonly ChatMessage[]>;
  readonly incomingIdsBySessionId: ReadonlyMap<string, readonly string[]>;
  readonly charactersById: ReadonlyMap<string, Character>;
  readonly sessionIdsByParticipantId: ReadonlyMap<string, readonly string[]>;
}

interface CachedConversationIndex {
  readonly index: ConversationIndex;
  readonly characters: DramaProject["characters"];
  readonly chatSessions: DramaProject["chatSessions"];
  readonly messages: DramaProject["messages"];
  readonly characterCount: number;
  readonly chatSessionCount: number;
  readonly messageCount: number;
  readonly chatMode: DramaProject["chatMode"];
  readonly selfCharacterId: DramaProject["selfCharacterId"];
  readonly title: string;
}

const conversationIndexCache = new WeakMap<DramaProject, CachedConversationIndex>();

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function playerCharacter(project: DramaProject) {
  return project.characters.find((character) => character.id === project.selfCharacterId)
    ?? project.characters.find((character) => character.side === "right")
    ?? project.characters[0];
}

function creativeGroupTitle(project: DramaProject, suggestedTitle: string | undefined, participantIds: string[]) {
  const characterNames = project.characters
    .filter((character) => participantIds.includes(character.id))
    .map((character) => character.name);
  return groupTitleForPrompt(
    `${project.title}\n${project.brief}\n${project.messages.slice(-12).map((message) => message.text || message.ttsText || "").join("\n")}`,
    suggestedTitle || project.title,
    characterNames
  );
}

function fallbackChatSession(project: DramaProject): ChatSession {
  const player = playerCharacter(project);
  const peer = project.characters.find((character) => character.side === "left")
    ?? project.characters.find((character) => character.id !== player?.id)
    ?? project.characters[0];
  const participantIds = project.chatMode === "group"
    ? unique([player?.id || "", ...project.characters.map((character) => character.id)])
    : unique([player?.id, peer?.id].filter((id): id is string => Boolean(id)));

  return {
    id: defaultChatSessionId,
    title: project.chatMode === "group"
      ? creativeGroupTitle(project, project.title, participantIds)
      : (peer?.name || project.title || "聊天"),
    kind: project.chatMode,
    participantIds
  };
}

function inferredSession(
  project: DramaProject,
  sessionId: string,
  roleIds: string[]
): ChatSession & { kind: "direct" | "group" } {
  const player = playerCharacter(project);
  const peer = project.characters.find((character) => roleIds.includes(character.id) && character.side === "left");
  const participantIds = unique([player?.id || "", ...roleIds]);
  const kind = participantIds.length > 2 ? "group" : "direct";
  return {
    id: sessionId,
    title: kind === "group"
      ? creativeGroupTitle(project, undefined, participantIds)
      : (peer?.name || "新会话"),
    kind,
    participantIds
  };
}

function deriveChatSessions(project: DramaProject): ChatSession[] {
  const validCharacterIds = new Set(project.characters.map((character) => character.id));
  const player = playerCharacter(project);
  const sessions = project.chatSessions.map((session) => {
    const requestedParticipants = unique([
      player?.id || "",
      ...session.participantIds.filter((id) => validCharacterIds.has(id))
    ]);
    const kind = session.kind
      ?? (requestedParticipants.length > 2 || project.chatMode === "group" ? "group" : "direct");
    return {
      ...session,
      kind,
      title: kind === "group"
        ? creativeGroupTitle(project, session.title, requestedParticipants)
        : (session.title.trim() || "聊天"),
      participantIds: kind === "direct"
        ? unique([
          player?.id || "",
          requestedParticipants.find((id) => id !== player?.id)
            ?? project.characters.find((character) => character.id !== player?.id)?.id
            ?? ""
        ])
        : requestedParticipants
    };
  });
  const knownIds = new Set(sessions.map((session) => session.id));
  const inferredRoleIds = new Map<string, string[]>();
  for (const message of project.messages) {
    if (!message.sessionId) continue;
    const roleIds = inferredRoleIds.get(message.sessionId) ?? [];
    const senderId = message.senderId ?? message.roleId;
    if (senderId && !roleIds.includes(senderId)) roleIds.push(senderId);
    inferredRoleIds.set(message.sessionId, roleIds);
  }
  for (const [sessionId, roleIds] of inferredRoleIds) {
    if (!knownIds.has(sessionId)) {
      sessions.push(inferredSession(project, sessionId, roleIds));
      knownIds.add(sessionId);
    }
  }
  return sessions.length ? sessions : [fallbackChatSession(project)];
}

type ConversationSessionLookup = Pick<
  ConversationIndex,
  "sessions" | "sessionsById" | "sessionIdsByParticipantId"
>;

function resolveChatSessionId(index: ConversationSessionLookup, message: ChatMessage): string {
  if (message.sessionId && index.sessionsById.has(message.sessionId)) return message.sessionId;
  const senderId = message.senderId ?? message.roleId;
  if (senderId) {
    const matchingSessionIds = index.sessionIdsByParticipantId.get(senderId);
    if (matchingSessionIds?.length === 1) return matchingSessionIds[0];
  }
  return index.sessions[0].id;
}

/**
 * Builds all frequently-used conversation lookups in one pass over the project.
 * Prefer getConversationIndex() in UI/read paths so the result can be reused.
 */
export function buildConversationIndex(project: DramaProject): ConversationIndex {
  const sessions = deriveChatSessions(project);
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const charactersById = new Map(project.characters.map((character) => [character.id, character]));
  const participantSessionIds = new Map<string, string[]>();

  for (const session of sessions) {
    for (const participantId of session.participantIds) {
      const sessionIds = participantSessionIds.get(participantId) ?? [];
      if (!sessionIds.includes(session.id)) sessionIds.push(session.id);
      participantSessionIds.set(participantId, sessionIds);
    }
  }

  const sessionIdsByParticipantId = new Map<string, readonly string[]>(participantSessionIds);
  const sessionLookup: ConversationSessionLookup = {
    sessions,
    sessionsById,
    sessionIdsByParticipantId
  };
  const sessionIdByMessageId = new Map<string, string>();
  const messagesBySessionId = new Map<string, ChatMessage[]>(sessions.map((session) => [session.id, []]));
  const incomingIdsBySessionId = new Map<string, string[]>(sessions.map((session) => [session.id, []]));

  for (const message of project.messages) {
    const sessionId = resolveChatSessionId(sessionLookup, message);
    sessionIdByMessageId.set(message.id, sessionId);
    messagesBySessionId.get(sessionId)?.push(message);
    if (message.side !== "right") incomingIdsBySessionId.get(sessionId)?.push(message.id);
  }

  return {
    sessions,
    sessionsById,
    sessionIdByMessageId,
    messagesBySessionId,
    incomingIdsBySessionId,
    charactersById,
    sessionIdsByParticipantId
  };
}

/**
 * Returns a cached index while the project and its collection references stay unchanged.
 * Project state is treated as immutable; call invalidateConversationIndex() after an
 * intentional in-place mutation.
 */
export function getConversationIndex(project: DramaProject): ConversationIndex {
  const cached = conversationIndexCache.get(project);
  if (
    cached
    && cached.characters === project.characters
    && cached.chatSessions === project.chatSessions
    && cached.messages === project.messages
    && cached.characterCount === project.characters.length
    && cached.chatSessionCount === project.chatSessions.length
    && cached.messageCount === project.messages.length
    && cached.chatMode === project.chatMode
    && cached.selfCharacterId === project.selfCharacterId
    && cached.title === project.title
  ) {
    return cached.index;
  }

  const index = buildConversationIndex(project);
  conversationIndexCache.set(project, {
    index,
    characters: project.characters,
    chatSessions: project.chatSessions,
    messages: project.messages,
    characterCount: project.characters.length,
    chatSessionCount: project.chatSessions.length,
    messageCount: project.messages.length,
    chatMode: project.chatMode,
    selfCharacterId: project.selfCharacterId,
    title: project.title
  });
  return index;
}

export function invalidateConversationIndex(project: DramaProject) {
  conversationIndexCache.delete(project);
}

export function getChatSessions(project: DramaProject, index = getConversationIndex(project)): ChatSession[] {
  return [...index.sessions];
}

export function chatSessionIdForMessage(
  project: DramaProject,
  message: ChatMessage,
  index = getConversationIndex(project)
): string {
  return resolveChatSessionId(index, message);
}

export function messagesForChatSession(
  project: DramaProject,
  sessionId: string,
  index = getConversationIndex(project)
) {
  return [...(index.messagesBySessionId.get(sessionId) ?? [])];
}

export function incomingMessageIdsForChatSession(
  project: DramaProject,
  sessionId: string,
  index = getConversationIndex(project)
) {
  return [...(index.incomingIdsBySessionId.get(sessionId) ?? [])];
}

export function unreadCountForChatSession(
  project: DramaProject,
  sessionId: string,
  readMessageIds: ReadonlySet<string>,
  index = getConversationIndex(project)
) {
  let unreadCount = 0;
  for (const messageId of index.incomingIdsBySessionId.get(sessionId) ?? []) {
    if (!readMessageIds.has(messageId)) unreadCount += 1;
  }
  return unreadCount;
}

export function chatSessionParticipants(
  project: DramaProject,
  session: ChatSession,
  index = getConversationIndex(project)
) {
  const participantIds = new Set(session.participantIds);
  return project.characters
    .filter((character) => participantIds.has(character.id))
    .map((character) => index.charactersById.get(character.id) ?? character);
}

export function isGroupChatSession(
  project: DramaProject,
  session: ChatSession,
  index = getConversationIndex(project)
) {
  return session.kind === "group" || chatSessionParticipants(project, session, index).length > 2;
}

export function chatSessionPeer(
  project: DramaProject,
  session: ChatSession,
  index = getConversationIndex(project)
): Character {
  const characters = project.characters.map((character) => index.charactersById.get(character.id) ?? character);
  const player = characters.find((character) => character.id === playerCharacter(project).id) ?? characters[0];
  return characters.find((character) => (
    character.id !== player?.id
      && character.side === "left"
      && session.participantIds.includes(character.id)
  )) ?? characters.find((character) => character.side === "left") ?? characters[0];
}

export function chatSessionTitle(
  project: DramaProject,
  session: ChatSession,
  index = getConversationIndex(project)
) {
  if (isGroupChatSession(project, session, index)) {
    const participants = chatSessionParticipants(project, session, index);
    return `${session.title || project.title} (${participants.length})`;
  }
  return session.title || chatSessionPeer(project, session, index).name || project.title;
}

export function projectForChatSession(
  project: DramaProject,
  sessionId: string,
  index = getConversationIndex(project)
): DramaProject {
  const sessions = getChatSessions(project, index);
  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0];
  const participantIds = new Set(session.participantIds);
  const characters = project.characters.filter((character) => participantIds.has(character.id));
  const chatMode = isGroupChatSession(project, session, index) ? "group" as const : "direct" as const;
  return {
    ...project,
    chatMode,
    title: chatSessionTitle(project, session, index),
    characters: characters.length >= 2 ? characters : project.characters,
    chatSessions: [session],
    messages: messagesForChatSession(project, session.id, index)
  };
}

export function chatSessionsForMessages(
  project: DramaProject,
  messages: ChatMessage[],
  index = getConversationIndex(project)
) {
  if (!project.chatSessions.length) return project.chatSessions;
  const usedSessionIds = new Set(messages.map((message) => resolveChatSessionId(index, message)));
  return getChatSessions(project, index).filter((session) => usedSessionIds.has(session.id));
}

export function mergeChatSessions(
  project: DramaProject,
  generatedProject: DramaProject,
  characters: DramaProject["characters"]
): ChatSession[] {
  const player = characters.find((character) => character.id === project.selfCharacterId)
    ?? characters.find((character) => character.side === "right")
    ?? characters[0];
  const validCharacterIds = new Set(characters.map((character) => character.id));
  const effectiveProject = { ...project, characters };
  const merged = new Map<string, ChatSession>();
  for (const session of [...project.chatSessions, ...generatedProject.chatSessions]) {
    const previous = merged.get(session.id);
    const requestedParticipants = unique([
      player?.id || "",
      ...(previous?.participantIds || []),
      ...session.participantIds.filter((id) => validCharacterIds.has(id))
    ]);
    const kind = previous?.kind === "group" || session.kind === "group" || requestedParticipants.length > 2
      ? "group"
      : session.kind ?? previous?.kind ?? "direct";
    const participantNames = characters
      .filter((character) => requestedParticipants.includes(character.id))
      .map((character) => character.name);
    const existingCreativeTitle = isUsableGroupTitle(previous?.title, participantNames)
      ? previous?.title
      : undefined;
    merged.set(session.id, {
      id: session.id,
      title: kind === "group"
        ? creativeGroupTitle(effectiveProject, existingCreativeTitle || session.title, requestedParticipants)
        : (session.title.trim() || previous?.title || "聊天"),
      kind,
      participantIds: kind === "direct"
        ? unique([
          player?.id || "",
          requestedParticipants.find((id) => id !== player?.id)
            ?? characters.find((character) => character.id !== player?.id)?.id
            ?? ""
        ])
        : requestedParticipants
    });
  }
  return [...merged.values()].slice(0, 6);
}
