import { describe, expect, it } from "vitest";
import {
  chatSessionIdForMessage,
  defaultChatSessionId,
  getChatSessions,
  incomingMessageIdsForChatSession,
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
      { id: "friend-chat", title: "周雨", participantIds: ["boy", "friend"] }
    ]);
    expect(sessionProject.messages.map((message) => message.id)).toEqual([
      "friend-outgoing",
      "friend-incoming"
    ]);
  });

  it("keeps group chat as one session containing every participant and message", () => {
    const directProject = multiSessionProject();
    const groupProject = parseProject({
      ...directProject,
      title: "三人同学群",
      chatMode: "group"
    });
    const sessions = getChatSessions(groupProject);

    expect(sessions).toEqual([{
      id: defaultChatSessionId,
      title: "三人同学群",
      participantIds: ["boy", "girl", "friend"]
    }]);
    expect(messagesForChatSession(groupProject, defaultChatSessionId).map((message) => message.id)).toEqual(
      groupProject.messages.map((message) => message.id)
    );
    expect(projectForChatSession(groupProject, defaultChatSessionId)).toBe(groupProject);
  });
});
