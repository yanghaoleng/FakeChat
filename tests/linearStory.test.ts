import { describe, expect, it } from "vitest";
import {
  createInitialStaticProject,
  createInitialPlaybackProject,
  generateStorySegment,
  makeStoryArchive,
  parseStoryArchive,
  type PromptCard
} from "../src/shared/linearStory";

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
});
