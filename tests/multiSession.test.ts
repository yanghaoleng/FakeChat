import { describe, expect, it } from "vitest";
import {
  assignMessagesToMultiSessions,
  multiSessionGenerationInstruction,
  reconcileGeneratedMultiSessions
} from "../src/shared/multiSession";
import { parseProject } from "../src/shared/schema";
import { sampleProject } from "../src/shared/sampleProject";

describe("multi-session topology", () => {
  it("keeps the legacy two-person topology when the model does not return sessions", () => {
    const result = reconcileGeneratedMultiSessions({
      project: { ...sampleProject, messages: [], chatSessions: [] },
      generatedProject: { ...sampleProject, messages: [], chatSessions: [] },
      baseCharacters: sampleProject.characters,
      random: () => 0
    });

    expect(result.characters).toHaveLength(2);
    expect(result.chatSessions).toEqual([]);
  });

  it("creates one distinct contact and random unique avatar for every generated session", () => {
    const sharedAvatar = sampleProject.characters.find((character) => character.side === "left")!.avatarUrl;
    const generatedProject = parseProject({
      ...sampleProject,
      characters: [
        sampleProject.characters.find((character) => character.side === "right")!,
        { ...sampleProject.characters[1], id: "lawyer", name: "周律师", avatarUrl: sharedAvatar },
        { ...sampleProject.characters[1], id: "boss", name: "王总", avatarUrl: sharedAvatar }
      ],
      chatSessions: [
        { id: "chat-lawyer", title: "周律师", participantIds: ["boy", "lawyer"] },
        { id: "chat-boss", title: "王总", participantIds: ["boy", "lawyer"] },
        { id: "chat-mother", title: "妈妈", participantIds: ["boy"] }
      ],
      messages: [
        { ...sampleProject.messages[1], id: "lawyer-message", roleId: "lawyer", sessionId: "chat-lawyer" },
        { ...sampleProject.messages[1], id: "boss-message", roleId: "boss", sessionId: "chat-boss" },
        { ...sampleProject.messages[1], id: "mother-message", roleId: "lawyer", sessionId: "chat-mother" }
      ]
    });

    const result = reconcileGeneratedMultiSessions({
      project: { ...sampleProject, messages: [], chatSessions: [] },
      generatedProject,
      baseCharacters: sampleProject.characters,
      random: () => 0
    });
    const player = result.characters.find((character) => character.side === "right")!;
    const peers = result.chatSessions.map((session) => (
      result.characters.find((character) => session.participantIds.includes(character.id) && character.id !== player.id)!
    ));

    expect(result.chatSessions).toHaveLength(3);
    expect(new Set(peers.map((character) => character.id)).size).toBe(3);
    expect(new Set(peers.map((character) => character.name)).size).toBe(3);
    expect(peers.map((character) => character.name)).toEqual(["周律师", "王总", "妈妈"]);
    expect(result.characters.filter((character) => character.side === "right")).toHaveLength(1);
    expect(result.characters.every((character) => Boolean(character.avatarUrl))).toBe(true);
    expect(new Set(result.characters.map((character) => character.avatarUrl)).size).toBe(result.characters.length);
    expect(result.chatSessions.every((session) => (
      session.participantIds.length === 2
      && session.participantIds.includes(player.id)
      && new Set(session.participantIds).size === 2
    ))).toBe(true);

    const messages = assignMessagesToMultiSessions({
      project: { ...sampleProject, messages: [], chatSessions: [] },
      characters: result.characters,
      chatSessions: result.chatSessions,
      messages: generatedProject.messages
    });
    for (const message of messages) {
      const session = result.chatSessions.find((item) => item.id === message.sessionId)!;
      expect(session.participantIds).toContain(message.roleId);
    }
    expect(messages.map((message) => message.roleId)).toEqual(peers.map((character) => character.id));
  });

  it("keeps every participant and sender in a generated group session", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const lawyer = { ...sampleProject.characters[1], id: "lawyer", name: "周律师", avatarInitial: "律" };
    const generatedProject = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      selfCharacterId: "boy",
      characters: [...sampleProject.characters, friend, lawyer],
      chatSessions: [
        { id: "date", title: "林夏", kind: "direct", participantIds: ["boy", "girl"] },
        { id: "case-group", title: "合同应急群", kind: "group", participantIds: ["boy", "friend", "lawyer"] }
      ],
      messages: [
        { ...sampleProject.messages[1], id: "friend-message", senderId: "friend", roleId: "friend", side: "right", sessionId: "case-group" },
        { ...sampleProject.messages[1], id: "lawyer-message", senderId: "lawyer", roleId: "lawyer", sessionId: "case-group" }
      ]
    });
    const baseProject = parseProject({ ...sampleProject, messages: [], chatSessions: [] });
    const result = reconcileGeneratedMultiSessions({
      project: baseProject,
      generatedProject,
      baseCharacters: sampleProject.characters,
      random: () => 0
    });
    const group = result.chatSessions.find((session) => session.id === "case-group")!;

    expect(group.kind).toBe("group");
    expect(group.participantIds).toEqual(["boy", "friend", "lawyer"]);

    const assigned = assignMessagesToMultiSessions({
      project: baseProject,
      characters: result.characters,
      chatSessions: result.chatSessions,
      messages: generatedProject.messages
    });
    expect(assigned.map((message) => message.senderId)).toEqual(["friend", "lawyer"]);
    expect(assigned.map((message) => message.roleId)).toEqual(["friend", "lawyer"]);
    expect(assigned.map((message) => message.side)).toEqual(["left", "left"]);
  });

  it("replaces a generic AI group title with a plot-specific title", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const lawyer = { ...sampleProject.characters[1], id: "lawyer", name: "周律师", avatarInitial: "律" };
    const baseProject = parseProject({
      ...sampleProject,
      brief: "三个人在群里核对合同、账单和付款证据",
      messages: [],
      chatSessions: []
    });
    const generatedProject = parseProject({
      ...baseProject,
      schemaVersion: 2,
      characters: [...sampleProject.characters, friend, lawyer],
      chatSessions: [{
        id: "case-group",
        title: "新群聊",
        kind: "group",
        participantIds: ["boy", "friend", "lawyer"]
      }]
    });
    const result = reconcileGeneratedMultiSessions({
      project: baseProject,
      generatedProject,
      baseCharacters: sampleProject.characters,
      random: () => 0
    });

    expect(result.chatSessions[0].title).toBe("证据链补完小组");
  });

  it("tells the model that sessions cannot reuse contacts or avatars", () => {
    const instruction = multiSessionGenerationInstruction();
    expect(instruction).toContain("每个会话必须创建一名不同的左侧联系人角色");
    expect(instruction).toContain("不能让两个会话复用同一个 roleId");
    expect(instruction).toContain("新联系人必须使用不同头像");
    expect(instruction).toContain("禁止使用“新群聊”");
  });
});
