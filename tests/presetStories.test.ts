import { describe, expect, it } from "vitest";
import { avatarGenderForCharacter, genderMatchedAvatarUrl } from "../src/shared/avatarLibrary";
import {
  createPresetInitialArchive,
  defaultPresetRoleSelection,
  normalizePresetRoleSelection,
  presetStoryCount
} from "../src/shared/presetStories";
import { viralNamedCharacterStyleInstruction } from "../src/shared/deepseekBrowser";

function archiveById(viralRole: "any" | "male" | "female", presetId: string) {
  const count = presetStoryCount("viral", { viralRole });
  for (let index = 0; index < count; index += 1) {
    const archive = createPresetInitialArchive("viral", index, { viralRole });
    if (archive.preset.id === presetId) return archive;
  }
  throw new Error(`Preset not found: ${presetId}`);
}

describe("微信预制首卡", () => {
  it("微信默认不限角色，钉钉默认 NPC", () => {
    expect(defaultPresetRoleSelection).toEqual({ viralRole: "any", jojoRole: "npc" });
    expect(normalizePresetRoleSelection()).toEqual(defaultPresetRoleSelection);
    expect(createPresetInitialArchive("viral", 0).roleSelection.viralRole).toBe("any");
    expect(createPresetInitialArchive("jojo", 0).roleSelection.jojoRole).toBe("npc");
  });

  it("首卡自带一句话梗概与第一轮对话，不依赖 DeepSeek", () => {
    const archive = createPresetInitialArchive("viral", 1, { viralRole: "any" });

    expect(archive.nextPrompt).toMatch(/[。！？]$/);
    expect((archive.nextPrompt.match(/[。！？]/g) ?? [])).toHaveLength(1);
    expect(archive.nextPrompt.length).toBeLessThan(70);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThan(0);
    expect(archive.cachedFirstSegment.project.messages).toEqual(archive.cachedFirstSegment.messages);
  });

  it.each([
    ["any", "viral-musk-altman-alumni-group"],
    ["female", "viral-daughter-kingdom-520"]
  ] as const)("%s 视角拥有高辨识度同人梗开场", (viralRole, presetId) => {
    const archive = archiveById(viralRole, presetId);

    expect(archive.preset.language).toBeUndefined();
    expect(archive.nextPrompt.length).toBeLessThan(70);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThanOrEqual(4);
    expect(archive.cachedFirstSegment.suggestedPrompt.length).toBeLessThan(70);
  });

  it("保留一个支持男女视角的经典长线小说式预制故事", () => {
    const maleArchive = archiveById("male", "viral-old-crush-roommate");
    const femaleArchive = archiveById("female", "viral-old-crush-roommate");

    expect(maleArchive.preset.prompt.length).toBeGreaterThan(100);
    expect(maleArchive.cachedFirstSegment.messages.length).toBeGreaterThan(10);
    expect(maleArchive.project.characters.find((character) => character.id === "boy")?.side).toBe("right");
    expect(femaleArchive.project.characters.find((character) => character.id === "girl")?.side).toBe("right");
  });

  it("不限模式收录指定的历史、科技与中文互联网人物梗", () => {
    const presetIds = [
      "viral-pan-jinlian-window-request",
      "viral-trump-takaichi-tariff-coupon",
      "viral-musk-altman-alumni-group",
      "viral-altman-dario-safe-document",
      "viral-fengge-female-fan-private-chat",
      "viral-fengge-male-b-friend-advice",
      "viral-luo-jia-next-week-live",
      "viral-lei-yu-joint-launch",
      "viral-liu-qiangdong-passerby",
      "viral-wang-dong-nearby-office",
      "viral-king-of-comedy-support-you"
    ];

    expect(presetStoryCount("viral", { viralRole: "any" })).toBe(14);
    expect(presetStoryCount("viral", { viralRole: "male" })).toBe(5);
    expect(presetStoryCount("viral", { viralRole: "female" })).toBe(4);
    for (const presetId of presetIds) expect(archiveById("any", presetId).preset.id).toBe(presetId);
  });

  it("双男对话同时使用男性头像和声音", () => {
    const archive = archiveById("any", "viral-musk-altman-alumni-group");

    expect(archive.project.characters.map(avatarGenderForCharacter)).toEqual(["boy", "boy"]);
    expect(archive.project.characters.every((character) => character.voicePreset === "young_male")).toBe(true);
    for (const character of archive.project.characters) {
      expect(genderMatchedAvatarUrl(character)).toBe(character.avatarUrl);
    }
  });

  it("非恋爱题材优先使用中性插画头像", () => {
    const archive = archiveById("any", "viral-wang-dong-nearby-office");
    const avatarUrls = archive.project.characters.map((character) => character.avatarUrl);

    expect(avatarUrls.every((avatarUrl) => avatarUrl?.includes("neutral-animal-"))).toBe(true);
    expect(new Set(avatarUrls).size).toBe(2);
  });

  it("首条预制是扩写后的西门庆与武大郎对手戏", () => {
    const archive = createPresetInitialArchive("viral", 0, { viralRole: "any" });

    expect(archive.preset.id).toBe("viral-pan-jinlian-window-request");
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThanOrEqual(12);
    expect(archive.project.characters.map((character) => character.name)).toEqual(["西门庆", "武大郎"]);
  });

  it("峰哥拥有女粉私聊和男B友答疑两条不同脚本", () => {
    const privateChat = archiveById("female", "viral-fengge-female-fan-private-chat");
    const advice = archiveById("male", "viral-fengge-male-b-friend-advice");

    expect(privateChat.project.characters.map((character) => character.name)).toEqual(["峰哥", "成年女粉"]);
    expect(privateChat.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(privateChat.project.characters.find((character) => character.name === "成年女粉")?.side).toBe("right");
    expect(privateChat.cachedFirstSegment.messages.some((message) => message.text.includes("现场看看"))).toBe(true);
    expect(advice.project.characters.map((character) => character.name)).toEqual(["男B友", "峰哥"]);
    expect(advice.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(advice.project.characters.find((character) => character.name === "男B友")?.side).toBe("right");
    expect(advice.cachedFirstSegment.messages.some((message) => message.text.includes("支付平台做活跃"))).toBe(true);
    expect(viralNamedCharacterStyleInstruction(advice.project)).toContain("解答世间万物");
    expect(viralNamedCharacterStyleInstruction(advice.project)).toContain("得到现场看看");
  });

  it("男生视角可以抽到西游与水浒本，西游本同时支持男女视角", () => {
    for (const presetId of [
      "viral-daughter-kingdom-520",
      "viral-baigujing-third-account"
    ]) {
      expect(archiveById("male", presetId).preset.id).toBe(presetId);
      expect(archiveById("female", presetId).preset.id).toBe(presetId);
    }
    expect(archiveById("male", "viral-pan-jinlian-window-request").preset.id)
      .toBe("viral-pan-jinlian-window-request");
  });

  it("切换不限、男、女视角后，角色头像仍与角色性别对应", () => {
    for (const viralRole of ["any", "male", "female"] as const) {
      const archive = createPresetInitialArchive("viral", 1, { viralRole });
      for (const character of archive.project.characters) {
        expect(genderMatchedAvatarUrl(character)).toBe(character.avatarUrl);
      }
    }
  });
});
