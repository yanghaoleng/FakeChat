import { assignDistinctCharacterAvatars } from "./avatarLibrary.js";
import { chatSessionTitle, getChatSessions } from "./chatSessions.js";
import { parseProject, type Character, type ChatMessage, type ChatSession, type DramaProject } from "./schema.js";
import { groupTitleForPrompt, isGenericGroupTitle } from "./storyIdentity.js";

export const maxMultiSessionCount = 4;
export const maxMultiSessionCharacterCount = 6;

export function generationTargetSession(project: DramaProject, activeSessionId?: string) {
  const sessions = getChatSessions(project);
  return sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
}

/**
 * Treat model topology as untrusted whenever the multi-session capability is
 * disabled. Existing topology is retained for archive compatibility, while
 * every generated message is forced into the active (or first) session. A
 * blank story may accept exactly the first generated session plus its
 * roster/chatMode so the traditional one-group-chat flow and first-contact
 * naming keep working without exposing additional sessions.
 */
export function constrainGeneratedProjectSessions({
  project,
  generatedProject,
  allowMultiSession = false,
  activeSessionId,
  preserveExistingMessages = true
}: {
  project: DramaProject;
  generatedProject: DramaProject;
  allowMultiSession?: boolean;
  activeSessionId?: string;
  preserveExistingMessages?: boolean;
}): DramaProject {
  if (allowMultiSession) return generatedProject;

  const establishedStory = project.messages.length > 0 || project.chatSessions.length > 0;
  const generatedFirstSession = getChatSessions(generatedProject)[0];
  const targetSession = establishedStory
    ? generationTargetSession(project, activeSessionId)
    : generatedFirstSession;
  const firstSessionParticipantIds = new Set(generatedFirstSession.participantIds);
  const firstSessionCharacters = generatedProject.characters.filter((character) => (
    firstSessionParticipantIds.has(character.id)
  ));
  const generatedPlayer = generatedProject.characters.find((character) => character.id === generatedProject.selfCharacterId)
    ?? generatedProject.characters.find((character) => character.side === "right")
    ?? generatedProject.characters[0];
  const generatedPeer = generatedProject.characters.find((character) => character.id !== generatedPlayer.id);
  const blankStoryCharacters = firstSessionCharacters.length >= 2
    ? firstSessionCharacters
    : [generatedPlayer, generatedPeer].filter((character): character is Character => Boolean(character));
  const existingMessagesById = preserveExistingMessages
    ? new Map(project.messages.map((message) => [message.id, message]))
    : new Map<string, ChatMessage>();
  return parseProject({
    ...generatedProject,
    chatMode: establishedStory ? project.chatMode : generatedProject.chatMode,
    characters: establishedStory ? project.characters : blankStoryCharacters,
    selfCharacterId: establishedStory ? project.selfCharacterId : generatedProject.selfCharacterId,
    chatSessions: establishedStory ? project.chatSessions : [generatedFirstSession],
    messages: generatedProject.messages.map((message) => {
      const existingMessage = existingMessagesById.get(message.id);
      return existingMessage ?? { ...message, sessionId: targetSession.id };
    })
  });
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function playerCharacter(characters: Character[], selfCharacterId?: string) {
  return characters.find((character) => character.id === selfCharacterId)
    ?? characters.find((character) => character.side === "right")
    ?? characters[0];
}

function initialsForName(name: string) {
  const compact = [...name.replace(/\s+/g, "")];
  return compact.slice(Math.max(0, compact.length - 2)).join("") || "新";
}

function usableSessionName(value: string | undefined, index: number) {
  const name = value?.trim();
  if (!name || /^(?:聊天|新会话|会话\d*|chat(?:-?\d+)?)$/i.test(name)) return `联系人${index + 1}`;
  return name.slice(0, 12);
}

function uniqueName(candidate: string, usedNames: Set<string>) {
  if (!usedNames.has(candidate)) return candidate;
  let suffix = 2;
  while (usedNames.has(`${candidate}${suffix}`)) suffix += 1;
  return `${candidate}${suffix}`;
}

function uniqueCharacterId(sessionId: string, usedIds: Set<string>) {
  const stem = sessionId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "contact";
  const base = `contact-${stem}`;
  if (!usedIds.has(base)) return base;
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function synthesizedContact(template: Character, session: ChatSession, index: number, characters: Character[]) {
  const usedIds = new Set(characters.map((character) => character.id));
  const usedNames = new Set(characters.map((character) => character.name.trim()).filter(Boolean));
  const name = uniqueName(usableSessionName(session.title, index), usedNames);
  const id = uniqueCharacterId(session.id, usedIds);
  return {
    ...template,
    id,
    name,
    side: "left" as const,
    avatarUrl: undefined,
    avatarInitial: initialsForName(name),
    voiceId: `multi-session-${id}`
  };
}

function mergedSessionInputs(project: DramaProject, generatedProject: DramaProject) {
  const sessions = new Map<string, ChatSession>();
  for (const session of [...project.chatSessions, ...generatedProject.chatSessions]) {
    const previous = sessions.get(session.id);
    sessions.set(session.id, previous ? {
      ...session,
      title: isGenericGroupTitle(previous.title) ? session.title : previous.title,
      kind: previous.kind === "group" || session.kind === "group"
        ? "group"
        : session.kind ?? previous.kind,
      participantIds: unique([...previous.participantIds, ...session.participantIds])
    } : { ...session, participantIds: unique(session.participantIds) });
  }
  return [...sessions.values()].slice(0, maxMultiSessionCount);
}

function orderedGeneratedRoleIds(generatedProject: DramaProject) {
  return unique([
    ...generatedProject.chatSessions.flatMap((session) => session.participantIds),
    ...generatedProject.messages.map((message) => message.senderId ?? message.roleId ?? "")
  ]);
}

export function reconcileGeneratedMultiSessions({
  project,
  generatedProject,
  baseCharacters,
  random = Math.random
}: {
  project: DramaProject;
  generatedProject: DramaProject;
  baseCharacters: Character[];
  random?: () => number;
}): { characters: Character[]; chatSessions: ChatSession[] } {
  const basePlayer = playerCharacter(baseCharacters, project.selfCharacterId);
  const characters = baseCharacters.map((character) => ({
    ...character,
    side: character.id === basePlayer.id ? "right" as const : "left" as const
  }));
  const merged = new Map(characters.map((character) => [character.id, character]));
  const knownNames = new Set(characters.map((character) => character.name.trim()).filter(Boolean));
  const newCharacterIds = new Set<string>();

  for (const roleId of orderedGeneratedRoleIds(generatedProject)) {
    if (merged.size >= maxMultiSessionCharacterCount || merged.has(roleId)) continue;
    const generatedCharacter = generatedProject.characters.find((character) => character.id === roleId);
    if (!generatedCharacter || generatedCharacter.side === "right") continue;
    const name = generatedCharacter.name.trim();
    if (!name || knownNames.has(name)) continue;
    merged.set(generatedCharacter.id, { ...generatedCharacter, side: "left" });
    knownNames.add(name);
    newCharacterIds.add(generatedCharacter.id);
  }

  const sessionInputs = mergedSessionInputs(project, generatedProject);
  if (!sessionInputs.length) {
    return {
      characters: assignDistinctCharacterAvatars([...merged.values()].slice(0, maxMultiSessionCharacterCount), {
        random,
        randomizeCharacterIds: newCharacterIds
      }),
      chatSessions: project.chatSessions
    };
  }
  const usedPeerIds = new Set<string>();
  const sessions: ChatSession[] = [];
  const currentSessionIds = new Set(project.chatSessions.map((session) => session.id));

  for (const [index, session] of sessionInputs.entries()) {
    const allCharacters = [...merged.values()];
    const participantCandidates = session.participantIds
      .map((roleId) => merged.get(roleId))
      .filter((character): character is Character => Boolean(character && character.id !== basePlayer.id));
    const messageCandidates = generatedProject.messages
      .filter((message) => message.sessionId === session.id && (message.senderId || message.roleId))
      .map((message) => merged.get(message.senderId ?? message.roleId!))
      .filter((character): character is Character => Boolean(character && character.id !== basePlayer.id));
    const titleCandidate = allCharacters.find((character) => (
      character.id !== basePlayer.id
      && character.name.trim() === session.title.trim()
    ));
    const kind = session.kind
      ?? (unique([basePlayer.id, ...session.participantIds]).length > 2 ? "group" : "direct");
    const candidatePeers = [...new Map(
      [...participantCandidates, ...messageCandidates, ...(titleCandidate ? [titleCandidate] : [])]
        .map((character) => [character.id, character])
    ).values()];

    if (kind === "group" && candidatePeers.length) {
      const participantIds = unique([basePlayer.id, ...candidatePeers.map((character) => character.id)]);
      const participantNames = allCharacters
        .filter((character) => participantIds.includes(character.id))
        .map((character) => character.name);
      sessions.push({
        id: session.id,
        title: groupTitleForPrompt(
          `${project.title}\n${project.brief}\n${generatedProject.brief}`,
          session.title,
          participantNames
        ),
        kind: "group",
        participantIds
      });
      continue;
    }

    let peer = candidatePeers
      .find((character) => character.side === "left" && !usedPeerIds.has(character.id));

    if (!peer && merged.size < maxMultiSessionCharacterCount) {
      const template = generatedProject.characters.find((character) => character.side === "left")
        ?? allCharacters.find((character) => character.side === "left")
        ?? basePlayer;
      peer = synthesizedContact(template, session, index, allCharacters);
      merged.set(peer.id, peer);
      newCharacterIds.add(peer.id);
    }
    if (!peer) continue;

    usedPeerIds.add(peer.id);
    sessions.push({
      id: session.id,
      title: currentSessionIds.has(session.id) ? session.title : (session.title.trim() || peer.name),
      kind,
      participantIds: [basePlayer.id, peer.id]
    });
  }

  const sessionPeerIds = new Set(sessions.flatMap((session) => session.participantIds).filter((id) => id !== basePlayer.id));
  const retainedUnusedCharacters = project.messages.length || project.chatSessions.length
    ? [...merged.values()].filter((character) => character.id !== basePlayer.id && !sessionPeerIds.has(character.id))
    : [];
  const orderedCharacters = [
    merged.get(basePlayer.id)!,
    ...[...merged.values()].filter((character) => character.id !== basePlayer.id && sessionPeerIds.has(character.id)),
    ...retainedUnusedCharacters
  ].slice(0, maxMultiSessionCharacterCount);
  const distinctCharacters = assignDistinctCharacterAvatars(orderedCharacters, {
    random,
    randomizeCharacterIds: newCharacterIds
  });

  return {
    characters: distinctCharacters,
    chatSessions: sessions
  };
}

export function assignMessagesToMultiSessions({
  project,
  characters,
  chatSessions,
  messages
}: {
  project: DramaProject;
  characters: Character[];
  chatSessions: ChatSession[];
  messages: ChatMessage[];
}) {
  const effectiveProject = { ...project, characters, chatSessions };
  const sessions = getChatSessions(effectiveProject);
  const player = playerCharacter(characters, project.selfCharacterId);
  const validSessionIds = new Set(sessions.map((session) => session.id));
  let previousSessionId = sessions[0]?.id;

  return messages.map((message) => {
    let sessionId = message.sessionId && validSessionIds.has(message.sessionId) ? message.sessionId : undefined;
    const requestedSenderId = message.senderId ?? message.roleId;
    if (!sessionId && requestedSenderId) {
      const matches = sessions.filter((session) => session.participantIds.includes(requestedSenderId));
      if (matches.length === 1) sessionId = matches[0].id;
    }
    sessionId = sessionId || previousSessionId || sessions[0]?.id;
    if (sessionId) previousSessionId = sessionId;
    if (!sessionId || message.side === "center" || message.type === "system") {
      return sessionId ? { ...message, sessionId, senderId: undefined, roleId: undefined } : message;
    }

    const session = sessions.find((item) => item.id === sessionId) ?? sessions[0];
    const peerId = session.participantIds.find((roleId) => roleId !== player.id);
    const isPlayerMessage = requestedSenderId
      ? requestedSenderId === player.id
      : message.side === "right";
    const senderId = isPlayerMessage
      ? player.id
      : requestedSenderId && session.participantIds.includes(requestedSenderId) && requestedSenderId !== player.id
        ? requestedSenderId
        : peerId;
    return {
      ...message,
      sessionId,
      senderId,
      roleId: senderId,
      side: isPlayerMessage ? "right" as const : "left" as const
    };
  });
}

export function multiSessionCatalog(project: DramaProject) {
  return getChatSessions(project).map((session, index) => {
    const participants = session.participantIds.map((roleId) => {
      const character = project.characters.find((item) => item.id === roleId);
      return character ? `${character.name}(senderId=${character.id})` : roleId;
    }).join("、");
    return `${index + 1}. ${chatSessionTitle(project, session)} (sessionId=${session.id}, kind=${session.kind ?? "direct"})：${participants}`;
  }).join("\n");
}

export function multiSessionGenerationInstruction() {
  return [
    `这是微信多会话故事。根据剧情可以只推进原会话，也可以自然新建私聊或群聊；整个项目保持 1-${maxMultiSessionCount} 个 chatSessions，不要为了凑数建群。`,
    `chatSessions 每项必须有 id、title、kind(direct|group)、participantIds；输出多个 direct 会话时，每个会话必须创建一名不同的左侧联系人角色，不能让两个会话复用同一个 roleId；group 会话保留所有参与者。所有会话都包含同一名右侧玩家，characters 总数不得超过 ${maxMultiSessionCharacterCount}。`,
    "group 会话的 title 要根据人物关系和当前剧情起一个像真实微信群的有梗名字，3-18 个字符；禁止使用“新群聊”“群聊”“多人群聊”“未命名群聊”“新建群聊”等默认名。已有创意群名必须沿用，除非用户明确要求改名。",
    "每条 message 必须有有效 sessionId 和 senderId（兼容字段 roleId 与 senderId 保持一致），且 senderId 必须属于对应会话。messages 是全局剧情时间线，不同会话的消息可以按发生顺序交错排列；不要把 messages 嵌套进 chatSessions。",
    "沿用已有会话和角色的 id、姓名、头像与参与关系；只有剧情明确需要新联系人时才新建 id。新联系人必须使用不同头像，不能和已有角色重复。"
  ].join("\n");
}
