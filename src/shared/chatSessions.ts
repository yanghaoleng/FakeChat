import type { Character, ChatMessage, ChatSession, DramaProject } from "./schema.js";

export const defaultChatSessionId = "chat-main";

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function playerCharacter(project: DramaProject) {
  return project.characters.find((character) => character.side === "right") ?? project.characters[0];
}

function fallbackChatSession(project: DramaProject): ChatSession {
  const player = playerCharacter(project);
  const peer = project.characters.find((character) => character.side === "left")
    ?? project.characters.find((character) => character.id !== player?.id)
    ?? project.characters[0];
  const participantIds = project.chatMode === "group"
    ? project.characters.map((character) => character.id)
    : unique([player?.id, peer?.id].filter((id): id is string => Boolean(id)));

  return {
    id: defaultChatSessionId,
    title: project.chatMode === "group" ? (project.title || "群聊") : (peer?.name || project.title || "聊天"),
    participantIds
  };
}

function inferredSession(project: DramaProject, sessionId: string): ChatSession {
  const player = playerCharacter(project);
  const roleIds = unique(project.messages
    .filter((message) => message.sessionId === sessionId)
    .map((message) => message.roleId || ""));
  const peer = project.characters.find((character) => roleIds.includes(character.id) && character.side === "left");
  return {
    id: sessionId,
    title: peer?.name || "新会话",
    participantIds: unique([player?.id || "", ...roleIds])
  };
}

export function getChatSessions(project: DramaProject): ChatSession[] {
  if (project.chatMode === "group") return [fallbackChatSession(project)];
  const validCharacterIds = new Set(project.characters.map((character) => character.id));
  const player = playerCharacter(project);
  const sessions = project.chatSessions.map((session) => ({
    ...session,
    title: session.title.trim() || "聊天",
    participantIds: unique([
      player?.id || "",
      ...session.participantIds.filter((id) => validCharacterIds.has(id))
    ])
  }));
  const knownIds = new Set(sessions.map((session) => session.id));
  for (const sessionId of unique(project.messages.map((message) => message.sessionId || ""))) {
    if (!knownIds.has(sessionId)) {
      sessions.push(inferredSession(project, sessionId));
      knownIds.add(sessionId);
    }
  }
  return sessions.length ? sessions : [fallbackChatSession(project)];
}

export function chatSessionIdForMessage(project: DramaProject, message: ChatMessage): string {
  const sessions = getChatSessions(project);
  if (message.sessionId && sessions.some((session) => session.id === message.sessionId)) return message.sessionId;
  if (message.roleId) {
    const matchingSessions = sessions.filter((session) => session.participantIds.includes(message.roleId!));
    if (matchingSessions.length === 1) return matchingSessions[0].id;
  }
  return sessions[0].id;
}

export function messagesForChatSession(project: DramaProject, sessionId: string) {
  return project.messages.filter((message) => chatSessionIdForMessage(project, message) === sessionId);
}

export function incomingMessageIdsForChatSession(project: DramaProject, sessionId: string) {
  return messagesForChatSession(project, sessionId)
    .filter((message) => message.side !== "right")
    .map((message) => message.id);
}

export function unreadCountForChatSession(project: DramaProject, sessionId: string, readMessageIds: ReadonlySet<string>) {
  return incomingMessageIdsForChatSession(project, sessionId)
    .filter((messageId) => !readMessageIds.has(messageId))
    .length;
}

export function chatSessionPeer(project: DramaProject, session: ChatSession): Character {
  const player = playerCharacter(project);
  return project.characters.find((character) => (
    character.id !== player?.id
      && character.side === "left"
      && session.participantIds.includes(character.id)
  )) ?? project.characters.find((character) => character.side === "left") ?? project.characters[0];
}

export function chatSessionTitle(project: DramaProject, session: ChatSession) {
  if (project.chatMode === "group") return `${project.title} (${project.characters.length})`;
  return session.title || chatSessionPeer(project, session).name || project.title;
}

export function projectForChatSession(project: DramaProject, sessionId: string): DramaProject {
  const sessions = getChatSessions(project);
  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0];
  if (project.chatMode === "group") return project;
  const participantIds = new Set(session.participantIds);
  const characters = project.characters.filter((character) => participantIds.has(character.id));
  return {
    ...project,
    title: chatSessionTitle(project, session),
    characters: characters.length >= 2 ? characters : project.characters,
    chatSessions: [session],
    messages: messagesForChatSession(project, session.id)
  };
}

export function chatSessionsForMessages(project: DramaProject, messages: ChatMessage[]) {
  if (project.chatMode === "group" || !project.chatSessions.length) return project.chatSessions;
  const usedSessionIds = new Set(messages.map((message) => chatSessionIdForMessage(project, message)));
  return project.chatSessions.filter((session) => usedSessionIds.has(session.id));
}

export function mergeChatSessions(
  project: DramaProject,
  generatedProject: DramaProject,
  characters: DramaProject["characters"]
): ChatSession[] {
  if (project.chatMode === "group") return project.chatSessions;
  const player = characters.find((character) => character.side === "right") ?? characters[0];
  const validCharacterIds = new Set(characters.map((character) => character.id));
  const merged = new Map<string, ChatSession>();
  for (const session of [...project.chatSessions, ...generatedProject.chatSessions]) {
    const previous = merged.get(session.id);
    merged.set(session.id, {
      id: session.id,
      title: session.title.trim() || previous?.title || "聊天",
      participantIds: unique([
        player?.id || "",
        ...(previous?.participantIds || []),
        ...session.participantIds.filter((id) => validCharacterIds.has(id))
      ])
    });
  }
  return [...merged.values()].slice(0, 6);
}
