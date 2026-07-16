import { describe, expect, it } from "vitest";
import {
  buildConversationIndex,
  chatSessionIdForMessage,
  chatSessionParticipants,
  defaultChatSessionId,
  getConversationIndex,
  getChatSessions,
  incomingMessageIdsForChatSession,
  invalidateConversationIndex,
  isGroupChatSession,
  mergeChatSessions,
  messagesForChatSession,
  projectForChatSession,
  unreadCountForChatSession
} from "../src/shared/chatSessions";
import { parseProject } from "../src/shared/schema";
import { sampleProject } from "../src/shared/sampleProject";

function multiSessionProject() {
  const friend = {
    ...sampleProject.characters[1],
    id: "friend",
    name: "周雨",
    avatarInitial: "雨"
  };

  return parseProject({
    ...sampleProject,
    characters: [...sampleProject.characters, friend],
    chatSessions: [
      { id: "date", title: "林夏", participantIds: ["boy", "girl"] },
      { id: "friend-chat", title: "周雨", participantIds: ["boy", "friend"] }
    ],
    messages: [
      { ...sampleProject.messages[0], id: "date-outgoing", sessionId: "date" },
      { ...sampleProject.messages[1], id: "date-incoming", sessionId: "date" },
      { ...sampleProject.messages[0], id: "friend-outgoing", sessionId: "friend-chat" },
      { ...sampleProject.messages[1], id: "friend-incoming", roleId: "friend", sessionId: "friend-chat" }
    ]
  });
}

describe("chat sessions", () => {
  it("maps legacy projects to one default session", () => {
    const legacyProject = JSON.parse(JSON.stringify(sampleProject)) as Record<string, unknown>;
    delete legacyProject.chatSessions;
    const project = parseProject(legacyProject);
    const sessions = getChatSessions(project);

    expect(project.chatSessions).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(defaultChatSessionId);
    expect(sessions[0].title).toBe(project.characters.find((item) => item.side === "left")!.name);
    expect(messagesForChatSession(project, sessions[0].id)).toHaveLength(project.messages.length);
  });

  it("keeps independent message streams and infers an undeclared session", () => {
    const project = parseProject({
      ...sampleProject,
      characters: [
        ...sampleProject.characters,
        { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" }
      ],
      chatSessions: [
        { id: "date", title: "林夏", participantIds: ["boy", "girl"] }
      ],
      messages: [
        { ...sampleProject.messages[0], sessionId: "date" },
        { ...sampleProject.messages[1], id: "friend-message", roleId: "friend", sessionId: "friend-chat" }
      ]
    });

    const sessions = getChatSessions(project);
    expect(sessions.map((session) => session.id)).toEqual(["date", "friend-chat"]);
    expect(sessions[1].title).toBe("周雨");
    expect(chatSessionIdForMessage(project, project.messages[1])).toBe("friend-chat");
    expect(unreadCountForChatSession(project, "friend-chat", new Set())).toBe(1);
    expect(unreadCountForChatSession(project, "friend-chat", new Set(incomingMessageIdsForChatSession(project, "friend-chat")))).toBe(0);
  });

  it("filters the global timeline by session", () => {
    const project = multiSessionProject();

    expect(messagesForChatSession(project, "date").map((message) => message.id)).toEqual([
      "date-outgoing",
      "date-incoming"
    ]);
    expect(messagesForChatSession(project, "friend-chat").map((message) => message.id)).toEqual([
      "friend-outgoing",
      "friend-incoming"
    ]);
  });

  it("builds reusable lookup maps for sessions, messages, unread ids, and characters", () => {
    const project = multiSessionProject();
    const index = buildConversationIndex(project);

    expect([...index.sessionsById.keys()]).toEqual(["date", "friend-chat"]);
    expect(index.charactersById.get("friend")?.name).toBe("周雨");
    expect(index.sessionIdByMessageId.get("friend-incoming")).toBe("friend-chat");
    expect(index.messagesBySessionId.get("date")?.map((message) => message.id)).toEqual([
      "date-outgoing",
      "date-incoming"
    ]);
    expect(index.incomingIdsBySessionId.get("friend-chat")).toEqual(["friend-incoming"]);
    expect(messagesForChatSession(project, "friend-chat", index).map((message) => message.id)).toEqual([
      "friend-outgoing",
      "friend-incoming"
    ]);
    expect(unreadCountForChatSession(project, "friend-chat", new Set(), index)).toBe(1);
  });

  it("reuses an index until project collections change or the cache is invalidated", () => {
    const project = multiSessionProject();
    const firstIndex = getConversationIndex(project);

    expect(getConversationIndex(project)).toBe(firstIndex);

    project.messages = [...project.messages];
    const collectionReplacementIndex = getConversationIndex(project);
    expect(collectionReplacementIndex).not.toBe(firstIndex);

    invalidateConversationIndex(project);
    expect(getConversationIndex(project)).not.toBe(collectionReplacementIndex);
  });

  it("clears the active session unread count without marking another session read", () => {
    const project = multiSessionProject();
    expect(unreadCountForChatSession(project, "date", new Set())).toBe(1);
    expect(unreadCountForChatSession(project, "friend-chat", new Set())).toBe(1);

    const readMessageIds = new Set(incomingMessageIdsForChatSession(project, "date"));

    expect(readMessageIds).toEqual(new Set(["date-incoming"]));
    expect(unreadCountForChatSession(project, "date", readMessageIds)).toBe(0);
    expect(unreadCountForChatSession(project, "friend-chat", readMessageIds)).toBe(1);
  });

  it("builds a session project with only that session's participants and messages", () => {
    const project = multiSessionProject();
    const sessionProject = projectForChatSession(project, "friend-chat");

    expect(sessionProject.title).toBe("周雨");
    expect(sessionProject.characters.map((character) => character.id)).toEqual(["boy", "friend"]);
    expect(sessionProject.chatSessions).toEqual([
      { id: "friend-chat", title: "周雨", kind: "direct", participantIds: ["boy", "friend"] }
    ]);
    expect(sessionProject.messages.map((message) => message.id)).toEqual([
      "friend-outgoing",
      "friend-incoming"
    ]);
  });

  it("keeps group chat as one session containing every participant and message", () => {
    const directProject = multiSessionProject();
    const legacyGroupInput = JSON.parse(JSON.stringify({
      ...directProject,
      title: "三人同学群",
      chatMode: "group"
    })) as Record<string, unknown>;
    delete legacyGroupInput.schemaVersion;
    delete legacyGroupInput.selfCharacterId;
    const groupProject = parseProject(legacyGroupInput);
    const sessions = getChatSessions(groupProject);

    expect(sessions).toEqual([{
      id: defaultChatSessionId,
      title: "三人同学群",
      kind: "group",
      participantIds: ["boy", "girl", "friend"]
    }]);
    expect(messagesForChatSession(groupProject, defaultChatSessionId).map((message) => message.id)).toEqual(
      groupProject.messages.map((message) => message.id)
    );
    expect(chatSessionParticipants(groupProject, sessions[0]).map((character) => character.id)).toEqual([
      "boy", "girl", "friend"
    ]);
    expect(isGroupChatSession(groupProject, sessions[0])).toBe(true);
    expect(projectForChatSession(groupProject, defaultChatSessionId)).toMatchObject({
      chatMode: "group",
      selfCharacterId: "boy"
    });
  });

  it("repairs a generic persisted group title from the story context", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const project = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      selfCharacterId: "boy",
      title: "新群聊",
      brief: "西游记师徒四人在取经总群里聊天",
      chatMode: "group",
      characters: [...sampleProject.characters, friend],
      chatSessions: [{
        id: "chat-main",
        title: "新群聊",
        kind: "group",
        participantIds: ["boy", "girl", "friend"]
      }]
    });

    expect(getChatSessions(project)[0].title).toBe("取经项目总群");
  });

  it("supports direct and group sessions in the same v2 project", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const lawyer = { ...sampleProject.characters[1], id: "lawyer", name: "周律师", avatarInitial: "律" };
    const project = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      selfCharacterId: "boy",
      chatMode: "direct",
      characters: [...sampleProject.characters, friend, lawyer],
      chatSessions: [
        { id: "date", title: "林夏", kind: "direct", participantIds: ["boy", "girl"] },
        { id: "case-group", title: "合同应急群", kind: "group", participantIds: ["boy", "friend", "lawyer"] }
      ],
      messages: [
        { ...sampleProject.messages[0], id: "date-message", sessionId: "date" },
        { ...sampleProject.messages[1], id: "friend-message", senderId: "friend", roleId: "friend", sessionId: "case-group" },
        { ...sampleProject.messages[1], id: "lawyer-message", senderId: "lawyer", roleId: "lawyer", sessionId: "case-group" }
      ]
    });
    const [directSession, groupSession] = getChatSessions(project);

    expect(isGroupChatSession(project, directSession)).toBe(false);
    expect(isGroupChatSession(project, groupSession)).toBe(true);
    expect(projectForChatSession(project, directSession.id)).toMatchObject({
      chatMode: "direct",
      selfCharacterId: "boy"
    });
    expect(projectForChatSession(project, groupSession.id)).toMatchObject({
      chatMode: "group",
      selfCharacterId: "boy"
    });
    expect(projectForChatSession(project, groupSession.id).characters.map((character) => character.id)).toEqual([
      "boy", "friend", "lawyer"
    ]);
    expect(projectForChatSession(project, groupSession.id).messages.map((message) => message.id)).toEqual([
      "friend-message", "lawyer-message"
    ]);
  });

  it("does not downgrade an existing group when generated topology calls it direct", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const characters = [...sampleProject.characters, friend];
    const project = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      characters,
      chatSessions: [
        { id: "case-group", title: "合同群", kind: "group", participantIds: ["boy", "girl", "friend"] }
      ],
      messages: []
    });
    const generatedProject = parseProject({
      ...project,
      chatSessions: [
        { id: "case-group", title: "合同群", kind: "direct", participantIds: ["boy", "girl"] }
      ]
    });

    expect(mergeChatSessions(project, generatedProject, characters)).toEqual([{
      id: "case-group",
      title: "合同群",
      kind: "group",
      participantIds: ["boy", "girl", "friend"]
    }]);
  });

  it("does not let generated topology overwrite a creative group title with a default name", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const characters = [...sampleProject.characters, friend];
    const project = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      brief: "三个人核对合同证据",
      characters,
      chatSessions: [{
        id: "case-group",
        title: "合同拆弹小组",
        kind: "group",
        participantIds: ["boy", "girl", "friend"]
      }]
    });
    const generatedProject = parseProject({
      ...project,
      chatSessions: [{
        id: "case-group",
        title: "新群聊",
        kind: "group",
        participantIds: ["boy", "girl", "friend"]
      }]
    });

    expect(mergeChatSessions(project, generatedProject, characters)[0].title).toBe("合同拆弹小组");
  });
});
