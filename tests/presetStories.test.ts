import { describe, expect, it } from "vitest";
import { genderMatchedAvatarUrl } from "../src/shared/avatarLibrary";
import { createPresetInitialArchive } from "../src/shared/presetStories";

describe("微信预制首卡", () => {
  it("首卡自带本地名字与第一轮对话，不依赖 DeepSeek", () => {
    const archive = createPresetInitialArchive("viral", 0, { viralRole: "male" });
    const boy = archive.project.characters.find((character) => character.id === "boy")!;
    const girl = archive.project.characters.find((character) => character.id === "girl")!;

    expect(archive.nextPrompt).toContain(`男主${boy.name}是`);
    expect(archive.nextPrompt).toContain(`女主${girl.name}是`);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThan(0);
    expect(archive.cachedFirstSegment.project.messages).toEqual(archive.cachedFirstSegment.messages);
  });

  it("切换男女主视角后，角色头像仍与角色性别对应", () => {
    for (const viralRole of ["male", "female"] as const) {
      const archive = createPresetInitialArchive("viral", 1, { viralRole });
      for (const character of archive.project.characters) {
        expect(genderMatchedAvatarUrl(character)).toBe(character.avatarUrl);
      }
    }
  });
});
