import { describe, expect, it } from "vitest";
import { createInitialStaticProject, type PromptCard } from "../src/shared/linearStory";
import { parseProject, type Character, type DramaProject } from "../src/shared/schema";
import {
  attachStorySegment,
  restoreStoryBeforeCard,
  restoreStoryThroughCard
} from "../src/shared/storySegments";

function character(id: string, name: string, side: "left" | "right" = "left"): Character {
  return {
    id,
    name,
    side,
    avatarInitial: name.slice(0, 1),
    avatarGradient: "linear-gradient(#333,#111)",
    voiceId: "zh-CN-XiaoxiaoNeural",
    voiceDescription: "test"
  };
}

function card(id: string, prompt: string, messageIds: string[]): PromptCard {
  return {
    id,
    prompt,
    createdAt: "2026-07-16T00:00:00.000Z",
    messageIds,
    summary: `${messageIds.length} messages`
  };
}

function appendProject(
  project: DramaProject,
  overrides: Omit<Partial<DramaProject>, "messages"> & { messages: unknown[] }
) {
  return parseProject({ ...project, ...overrides });
}

describe("story segment topology restoration", () => {
  it("removes characters and conversations introduced by later multi-session and group segments", () => {
    const initial = createInitialStaticProject();
    const first = appendProject(initial, {
      title: "林夏",
      chatMode: "direct",
      chatSessions: [{ id: "chat-main", title: "林夏", kind: "direct", participantIds: ["boy", "girl"] }],
      messages: [{ id: "m1", sessionId: "chat-main", roleId: "girl", side: "left", type: "text", text: "第一段" }]
    });
    const firstCard = attachStorySegment(card("c1", "第一段", ["m1"]), initial, first);

    const lawyer = character("lawyer", "周律师");
    const second = appendProject(first, {
      title: "多个会话",
      characters: [...first.characters, lawyer],
      chatSessions: [
        ...first.chatSessions,
        { id: "chat-lawyer", title: "周律师", kind: "direct", participantIds: ["boy", "lawyer"] }
      ],
      messages: [
        ...first.messages,
        { id: "m2", sessionId: "chat-lawyer", roleId: "lawyer", side: "left", type: "text", text: "第二段" }
      ]
    });
    const secondCard = attachStorySegment(card("c2", "第二段", ["m2"]), first, second);

    const groupMember = character("member", "群友");
    const third = appendProject(second, {
      title: "项目群",
      chatMode: "group",
      characters: [...second.characters, groupMember],
      chatSessions: [{
        id: "chat-group",
        title: "项目群",
        kind: "group",
        participantIds: [...second.characters.map((item) => item.id), groupMember.id]
      }],
      messages: [
        ...second.messages,
        { id: "m3", sessionId: "chat-group", roleId: "member", side: "left", type: "text", text: "第三段" }
      ]
    });
    const thirdCard = attachStorySegment(card("c3", "第三段", ["m3"]), second, third);
    const cards = [firstCard, secondCard, thirdCard];

    const beforeGroup = restoreStoryBeforeCard(third, cards, 2);
    expect(beforeGroup.promptCards.map((item) => item.id)).toEqual(["c1", "c2"]);
    expect(beforeGroup.project.messages.map((message) => message.id)).toEqual(["m1", "m2"]);
    expect(beforeGroup.project.characters.some((item) => item.id === "member")).toBe(false);
    expect(beforeGroup.project.characters.some((item) => item.id === "lawyer")).toBe(true);
    expect(beforeGroup.project.chatSessions.map((session) => session.id)).toEqual(["chat-main", "chat-lawyer"]);
    expect(beforeGroup.project.chatSessions.map((session) => session.kind)).toEqual(["direct", "direct"]);
    expect(beforeGroup.project.chatMode).toBe("direct");
    expect(beforeGroup.project.selfCharacterId).toBe(second.selfCharacterId);

    const beforeMultiSession = restoreStoryBeforeCard(third, cards, 1);
    expect(beforeMultiSession.project.messages.map((message) => message.id)).toEqual(["m1"]);
    expect(beforeMultiSession.project.characters.some((item) => item.id === "lawyer")).toBe(false);
    expect(beforeMultiSession.project.chatSessions.map((session) => session.id)).toEqual(["chat-main"]);
    expect(beforeMultiSession.project.title).toBe("林夏");

    const beforeFirst = restoreStoryBeforeCard(third, cards, 0);
    expect(beforeFirst.promptCards).toEqual([]);
    expect(beforeFirst.project.messages).toEqual([]);
    expect(beforeFirst.project.characters.map((item) => item.id)).toEqual(initial.characters.map((item) => item.id));
    expect(beforeFirst.project.chatSessions).toEqual(initial.chatSessions);
    expect(beforeFirst.project.title).toBe(initial.title);
  });

  it("restarts through the selected card and restores its exact end topology", () => {
    const initial = createInitialStaticProject();
    const first = appendProject(initial, {
      title: "会话 A",
      chatSessions: [{ id: "chat-a", title: "A", participantIds: ["boy", "girl"] }],
      messages: [{ id: "m1", sessionId: "chat-a", roleId: "girl", side: "left", type: "text", text: "A" }]
    });
    const firstCard = attachStorySegment(card("c1", "A", ["m1"]), initial, first);
    const extra = character("extra", "B");
    const second = appendProject(first, {
      title: "会话 A+B",
      characters: [...first.characters, extra],
      chatSessions: [
        ...first.chatSessions,
        { id: "chat-b", title: "B", participantIds: ["boy", "extra"] }
      ],
      messages: [
        ...first.messages,
        { id: "m2", sessionId: "chat-b", roleId: "extra", side: "left", type: "text", text: "B" }
      ]
    });
    const secondCard = attachStorySegment(card("c2", "B", ["m2"]), first, second);

    const restarted = restoreStoryThroughCard(second, [firstCard, secondCard], 0);
    expect(restarted.promptCards.map((item) => item.id)).toEqual(["c1"]);
    expect(restarted.project.messages.map((message) => message.id)).toEqual(["m1"]);
    expect(restarted.project.characters.some((item) => item.id === "extra")).toBe(false);
    expect(restarted.project.chatSessions.map((session) => session.id)).toEqual(["chat-a"]);
    expect(restarted.project.title).toBe("会话 A");

    expect(firstCard.segment?.before).not.toHaveProperty("messages");
    expect(firstCard.segment?.after).not.toHaveProperty("messages");
  });
});
