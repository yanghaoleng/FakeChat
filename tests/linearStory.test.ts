import { describe, expect, it } from "vitest";
import {
  createInitialStaticProject,
  createInitialPlaybackProject,
  generateStorySegment,
  makeStoryArchive,
  parseStoryArchive,
  type PromptCard
} from "../src/shared/linearStory";
import { parseProject } from "../src/shared/schema";

describe("linear story archive", () => {
  it("keeps the viral static project empty but boots with a default playback story", () => {
    expect(createInitialStaticProject("viral").messages).toHaveLength(0);
    expect(createInitialPlaybackProject("viral").messages.length).toBeGreaterThan(0);
  });

  it("keeps prompt cards and generated messages in one linear context", () => {
    const first = generateStorySegment({
      project: createInitialStaticProject(),
      prompt: "男主收到一张误发账单截图。",
      promptCards: []
    });

    const second = generateStorySegment({
      project: first.project,
      prompt: "女生用订单定位把误会翻出来。",
      promptCards: [first.card]
    });

    expect(first.card.summary).toContain("承接 0 条历史对话");
    expect(second.card.summary).toContain(`承接 ${first.messages.length} 条历史对话`);
    expect(second.project.messages).toHaveLength(first.messages.length + second.messages.length);
  });

  it("turns an explicit Journey group prompt into a named group with matching character avatars", () => {
    const segment = generateStorySegment({
      project: createInitialStaticProject(),
      prompt: "写一个唐僧、孙悟空、女儿国国王、白骨精、沙僧和猪八戒的微信群聊。",
      promptCards: []
    });

    expect(segment.project.chatMode).toBe("group");
    expect(segment.project.title).toBe("取经项目总群");
    expect(segment.project.characters.map((character) => character.name)).toEqual([
      "唐玄奘", "孙悟空", "女儿国国王", "白骨精", "沙僧", "猪八戒"
    ]);
    expect(segment.project.characters.map((character) => character.avatarUrl)).toEqual([
      "/avatars/journey-1986-tang.webp",
      "/avatars/journey-1986-wukong.webp",
      "/avatars/journey-1986-queen.webp",
      "/avatars/journey-1986-baigujing.webp",
      "/avatars/journey-1986-shaseng.webp",
      "/avatars/journey-1986-bajie.webp"
    ]);
    expect(new Set(segment.messages.map((message) => message.roleId).filter(Boolean)).size).toBeGreaterThan(2);
  });

  it("exports and imports prompts with the whole dialogue project", () => {
    const segment = generateStorySegment({
      project: createInitialStaticProject(),
      prompt: "账单截图把误会翻出来。",
      promptCards: []
    });
    const promptCards: PromptCard[] = [segment.card];

    const archive = makeStoryArchive(segment.project, promptCards);
    const imported = parseStoryArchive(JSON.parse(JSON.stringify(archive)));

    expect(imported.version).toBe(1);
    expect(imported.promptCards[0]?.prompt).toBe("账单截图把误会翻出来。");
    expect(imported.project.messages).toHaveLength(segment.messages.length);
  });

  it("round-trips chat sessions and message session ids while accepting legacy archives", () => {
    const segment = generateStorySegment({
      project: createInitialStaticProject(),
      prompt: "男主一边问林夏，一边找周律师核对合同。",
      promptCards: []
    });
    const sessionizedProject = parseProject({
      ...segment.project,
      chatSessions: [
        { id: "chat-main", title: "林夏", participantIds: ["boy", "girl"] },
        { id: "chat-lawyer", title: "周律师", participantIds: ["boy", "girl"] }
      ],
      messages: segment.project.messages.map((message, index) => ({
        ...message,
        sessionId: index % 2 === 0 ? "chat-main" : "chat-lawyer"
      }))
    });
    const archive = makeStoryArchive(sessionizedProject, [segment.card]);
    const imported = parseStoryArchive(JSON.parse(JSON.stringify(archive)));

    expect(imported.project.chatSessions).toEqual(sessionizedProject.chatSessions);
    expect(imported.project.messages.map((message) => message.sessionId)).toEqual(
      sessionizedProject.messages.map((message) => message.sessionId)
    );

    const legacyArchive = JSON.parse(JSON.stringify(archive)) as {
      project: Record<string, unknown> & { messages: Array<Record<string, unknown>> };
    };
    delete legacyArchive.project.chatSessions;
    legacyArchive.project.messages.forEach((message) => delete message.sessionId);
    const importedLegacy = parseStoryArchive(legacyArchive);

    expect(importedLegacy.project.chatSessions).toEqual([]);
    expect(importedLegacy.project.messages.every((message) => message.sessionId === undefined)).toBe(true);
  });
});
