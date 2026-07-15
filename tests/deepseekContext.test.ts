import { describe, expect, it } from "vitest";
import type { PromptCard } from "../src/shared/linearStory";
import { sampleProject } from "../src/shared/sampleProject";
import type { ChatMessage, DramaProject, ScriptGenerateRequest } from "../src/shared/schema";
import {
  buildBoundedStoryContext,
  MAX_CONTEXT_MESSAGES_PER_SESSION,
  MAX_CONTEXT_MESSAGES_TOTAL,
  MAX_CONTEXT_USER_PROMPT_CHARS
} from "../src/shared/storyGeneration/context";
import { buildDeepSeekRequest } from "../src/shared/storyGeneration/deepseekCore";
import { normalizeGeneratedStoryOutput } from "../src/shared/storyGeneration/response";

const request: ScriptGenerateRequest = {
  brief: "多会话同时追查合同真相",
  durationSeconds: 90
};

function largeMultiSessionProject(): DramaProject {
  const peers = ["girl", "lawyer", "boss", "friend"].map((id, index) => ({
    ...sampleProject.characters[1],
    id,
    name: ["林夏", "周律师", "王总", "老陈"][index],
    avatarInitial: ["夏", "周", "王", "陈"][index]
  }));
  const chatSessions = peers.map((peer, index) => ({
    id: `chat-${index + 1}`,
    title: peer.name,
    participantIds: ["boy", peer.id]
  }));
  const messages: ChatMessage[] = Array.from({ length: 1_204 }, (_, index) => {
    const sessionIndex = index % chatSessions.length;
    const isPlayer = index % 3 === 0;
    return {
      ...sampleProject.messages[index % sampleProject.messages.length],
      id: `history-${index}`,
      sessionId: chatSessions[sessionIndex].id,
      roleId: isPlayer ? "boy" : peers[sessionIndex].id,
      side: isPlayer ? "right" : "left",
      type: "text",
      text: `SESSION-${sessionIndex + 1}-EVENT-${index} ${"详细证据".repeat(80)}`
    };
  });
  return {
    ...sampleProject,
    title: "合同调查多线程",
    brief: `稳定事实 ${"合同与付款记录".repeat(300)}`,
    characters: [sampleProject.characters[0], ...peers],
    chatSessions,
    messages
  };
}

function manyPromptCards(): PromptCard[] {
  return Array.from({ length: 40 }, (_, index) => ({
    id: `card-${index}`,
    prompt: `第 ${index} 步 ${"核对线索".repeat(60)}`,
    createdAt: new Date(2026, 0, index + 1).toISOString(),
    messageIds: [],
    summary: `SUMMARY-${index} ${"已确认的稳定事实".repeat(80)}`
  }));
}

describe("bounded DeepSeek story context", () => {
  it("keeps a 1000+ message prompt bounded while retaining every active session and latest events", () => {
    const project = largeMultiSessionProject();
    const promptCards = manyPromptCards();
    const context = buildBoundedStoryContext({ project, promptCards });
    const body = buildDeepSeekRequest({
      project,
      prompt: `继续交叉推进 ${"不要遗漏会话".repeat(500)}`,
      promptCards,
      model: "deepseek-test"
    });
    const user = body.messages[1].content;

    expect(user.length).toBeLessThanOrEqual(MAX_CONTEXT_USER_PROMPT_CHARS);
    expect(context.includedMessageCount).toBeLessThanOrEqual(MAX_CONTEXT_MESSAGES_TOTAL);
    expect(context.includedSessionIds.sort()).toEqual(["chat-1", "chat-2", "chat-3", "chat-4"]);
    expect(context.recentMessages).toContain("SESSION-1-EVENT-1200");
    expect(context.recentMessages).toContain("SESSION-2-EVENT-1201");
    expect(context.recentMessages).toContain("SESSION-3-EVENT-1202");
    expect(context.recentMessages).toContain("SESSION-4-EVENT-1203");
    expect(context.recentPromptCards).toContain("SUMMARY-39");
    expect(context.recentPromptCards).not.toContain("SUMMARY-0 ");
  });

  it("uses the same bounded history for repair retries", () => {
    const project = largeMultiSessionProject();
    const promptCards = manyPromptCards();
    const userPrompts = [0, 1, 2].map((repairAttempt) => buildDeepSeekRequest({
      project,
      prompt: "让最新证据触发反转",
      promptCards,
      model: "deepseek-test",
      repairAttempt
    }).messages[1].content);

    expect(new Set(userPrompts).size).toBe(1);
    expect(userPrompts[0].length).toBeLessThanOrEqual(MAX_CONTEXT_USER_PROMPT_CHARS);
    const historyLines = userPrompts[0].split("\n").filter((line) => /^\d+\. \[会话:/.test(line));
    expect(historyLines.length).toBeLessThanOrEqual(MAX_CONTEXT_MESSAGES_TOTAL);
    for (const sessionId of ["chat-1", "chat-2", "chat-3", "chat-4"]) {
      expect(historyLines.filter((line) => line.includes(`/${sessionId}]`)).length)
        .toBeLessThanOrEqual(MAX_CONTEXT_MESSAGES_PER_SESSION);
    }
  });
});

describe("DeepSeek generated response compatibility", () => {
  it("normalizes the historical full-project JSON contract", () => {
    const normalized = normalizeGeneratedStoryOutput({
      value: {
        title: "旧格式返回",
        characters: sampleProject.characters,
        messages: [
          { roleId: "girl", side: "left", type: "text", text: "旧 mock 仍然可以用" }
        ],
        assets: [],
        sfx: {},
        suggestedPrompt: "对方拿出第二份合同。"
      },
      project: { ...sampleProject, messages: [] },
      request
    });

    expect(normalized.format).toBe("full-project");
    expect(normalized.project.messages[0].text).toBe("旧 mock 仍然可以用");
    expect(normalized.suggestedPrompt).toBe("对方拿出第二份合同。");
  });

  it("normalizes a compact delta, maps senderId, and retains mixed session topology", () => {
    const current: DramaProject = {
      ...sampleProject,
      messages: [],
      chatSessions: [{ id: "chat-main", title: "林夏", participantIds: ["boy", "girl"] }]
    };
    const groupSession = {
      id: "chat-contract-team",
      title: "合同核对群",
      kind: "group" as const,
      participantIds: ["boy", "girl", "lawyer"]
    };
    const lawyer = {
      ...sampleProject.characters[1],
      id: "lawyer",
      name: "周律师",
      avatarInitial: "周"
    };
    const normalized = normalizeGeneratedStoryOutput({
      value: {
        schemaVersion: 1,
        newMessages: [
          {
            sessionId: groupSession.id,
            senderId: "lawyer",
            side: "left",
            type: "text",
            text: "第七条已经被替换",
            emotion: "确认",
            sendSfx: "send",
            pauseMs: 300,
            holdMs: 1_200
          }
        ],
        topologyChanges: {
          characters: [...current.characters, lawyer],
          chatSessions: [current.chatSessions[0], groupSession]
        },
        suggestedPrompt: "让林夏发出原始文件。"
      },
      project: current,
      request
    });

    expect(normalized.format).toBe("delta");
    expect(normalized.project.messages).toHaveLength(1);
    expect(normalized.project.messages[0]).toMatchObject({
      sessionId: groupSession.id,
      roleId: "lawyer",
      text: "第七条已经被替换"
    });
    expect(normalized.project.chatSessions.map((session) => session.id)).toEqual(["chat-main", groupSession.id]);
    expect((normalized.project.chatSessions[1] as typeof groupSession).kind).toBe("group");
    expect(normalized.suggestedPrompt).toBe("让林夏发出原始文件。");
  });
});
