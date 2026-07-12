import { describe, expect, it } from "vitest";
import { genderMatchedAvatarUrl } from "../src/shared/avatarLibrary";
import {
  createPresetInitialArchive,
  defaultPresetRoleSelection,
  normalizePresetRoleSelection,
  presetStoryCount
} from "../src/shared/presetStories";

function archiveById(viralRole: "male" | "female", presetId: string) {
  const count = presetStoryCount("viral", { viralRole });
  for (let index = 0; index < count; index += 1) {
    const archive = createPresetInitialArchive("viral", index, { viralRole });
    if (archive.preset.id === presetId) return archive;
  }
  throw new Error(`Preset not found: ${presetId}`);
}

describe("微信预制首卡", () => {
  it("微信默认女性视角，钉钉默认 NPC", () => {
    expect(defaultPresetRoleSelection).toEqual({ viralRole: "female", jojoRole: "npc" });
    expect(normalizePresetRoleSelection()).toEqual(defaultPresetRoleSelection);
    expect(createPresetInitialArchive("viral", 0).roleSelection.viralRole).toBe("female");
    expect(createPresetInitialArchive("jojo", 0).roleSelection.jojoRole).toBe("npc");
  });

  it("首卡自带本地名字与第一轮对话，不依赖 DeepSeek", () => {
    const archive = createPresetInitialArchive("viral", 1, { viralRole: "male" });
    const boy = archive.project.characters.find((character) => character.id === "boy")!;
    const girl = archive.project.characters.find((character) => character.id === "girl")!;

    expect(archive.nextPrompt).toContain(`男主${boy.name}是`);
    expect(archive.nextPrompt).toContain(`女主${girl.name}是`);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThan(0);
    expect(archive.cachedFirstSegment.project.messages).toEqual(archive.cachedFirstSegment.messages);
  });

  it.each([
    ["female", "viral-english-campus-lost-card-female"],
    ["male", "viral-english-campus-lost-card-male"]
  ] as const)("%s 视角拥有全英文留学生预制首卡和欧美聊天对象头像", (viralRole, presetId) => {
    const archive = archiveById(viralRole, presetId);
    const self = archive.project.characters.find((character) => character.side === "right")!;
    const peer = archive.project.characters.find((character) => character.side === "left")!;

    expect(archive.preset.language).toBe("en");
    expect(archive.nextPrompt).toContain("Language: English");
    expect(archive.nextPrompt).toContain(self.name);
    expect(archive.nextPrompt).toContain(peer.name);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThan(10);
    expect(archive.cachedFirstSegment.messages.every((message) => !/\p{Script=Han}/u.test(message.text))).toBe(true);
    expect(archive.cachedFirstSegment.suggestedPrompt).not.toMatch(/^Continue/i);
    expect(archive.cachedFirstSegment.suggestedPrompt).not.toMatch(/Language:\s*English/i);
    expect(self.avatarUrl).not.toContain("western-student");
    expect(peer.avatarUrl).toContain("western-student");
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
