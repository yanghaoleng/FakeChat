import { describe, expect, it } from "vitest";
import { jojoProject } from "../src/shared/jojoProject";
import { sampleProject } from "../src/shared/sampleProject";
import { currentProjectSchemaVersion, getCharacter, parseProject } from "../src/shared/schema";

describe("project schema", () => {
  it("accepts the built-in first-love sample", () => {
    const project = parseProject(sampleProject);
    expect(project.canvas).toEqual({ width: 1516, height: 852 });
    expect(project.messages.length).toBeGreaterThanOrEqual(18);
  });

  it("keeps the required drama media beats", () => {
    const types = new Set(sampleProject.messages.map((message) => message.type));
    expect(types.has("transfer")).toBe(true);
    expect(types.has("image")).toBe(true);
    expect(types.has("meme")).toBe(true);
  });

  it("uses short chat-style text instead of long prose", () => {
    const textMessages = sampleProject.messages.filter((message) => message.type === "text");
    expect(textMessages.every((message) => message.text.length <= 24)).toBe(true);
  });

  it("accepts the built-in JOJO company sample", () => {
    const project = parseProject(jojoProject);
    expect(project.stylePreset).toBe("jojo-company-chat");
    expect(project.characters.map((character) => character.id)).toEqual(["jiaojiao", "npc", "lingdang", "zhuxiaodi", "xitong"]);
    expect(project.characters.find((character) => character.id === "npc")?.avatarUrl).toMatch(/^\/avatars\/jojo\/npc-/);
    expect(project.messages.some((message) => message.roleId === "jiaojiao")).toBe(true);
    expect(project.assets.some((asset) => asset.id === "jojo-photo-meeting-blur")).toBe(true);
    expect(project.assets.find((asset) => asset.id === "jojo-photo-laptop-calendar")?.tags).toContain("排期");
    expect(project.assets.find((asset) => asset.id === "jojo-photo-keyboard-coffee")?.tags).toContain("冷咖啡");
  });

  it("migrates a v1 role/session shape to the canonical v2 model", () => {
    const legacy = JSON.parse(JSON.stringify({
      ...sampleProject,
      schemaVersion: 1,
      chatSessions: [{ id: "date", title: "林夏", participantIds: ["boy", "girl"] }],
      messages: sampleProject.messages.slice(0, 2).map(({ sessionId: _sessionId, ...message }) => message)
    }));
    const project = parseProject(legacy);

    expect(project.schemaVersion).toBe(currentProjectSchemaVersion);
    expect(project.selfCharacterId).toBe("boy");
    expect(project.chatSessions).toEqual([
      { id: "date", title: "林夏", kind: "direct", participantIds: ["boy", "girl"] }
    ]);
    expect(project.messages.map((message) => ({
      sessionId: message.sessionId,
      senderId: message.senderId,
      roleId: message.roleId
    }))).toEqual([
      { sessionId: "date", senderId: "boy", roleId: "boy" },
      { sessionId: "date", senderId: "girl", roleId: "girl" }
    ]);
  });

  it("uses a stable fallback session id without materializing a direct session", () => {
    const project = parseProject({ ...sampleProject, chatSessions: [] });

    expect(project.chatSessions).toEqual([]);
    expect(new Set(project.messages.map((message) => message.sessionId))).toEqual(new Set(["chat-main"]));
  });

  it("prefers senderId over the legacy roleId when resolving a character", () => {
    const project = parseProject(sampleProject);
    const message = {
      ...project.messages[0],
      senderId: "girl",
      roleId: "boy"
    };

    expect(getCharacter(project, message).id).toBe("girl");
  });

  it("repairs an unknown senderId from the visual side during migration", () => {
    const project = parseProject({
      ...sampleProject,
      messages: [{
        ...sampleProject.messages[1],
        senderId: "removed-contact",
        roleId: "removed-contact",
        side: "left"
      }]
    });

    expect(project.messages[0].senderId).toBe("girl");
    expect(project.messages[0].roleId).toBe("girl");
  });
});
