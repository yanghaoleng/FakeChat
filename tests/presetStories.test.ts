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

  it("每个首卡都有丰富的第一段和开放式后续方向，不依赖 DeepSeek", () => {
    const count = presetStoryCount("viral", { viralRole: "any" });
    for (let index = 0; index < count; index += 1) {
      const archive = createPresetInitialArchive("viral", index, { viralRole: "any" });
      expect(archive.nextPrompt).toMatch(/[。！？][”"』】]?$/);
      expect(archive.cachedFirstSegment.suggestedPrompt).toMatch(/[。！？]$/);
      expect(archive.cachedFirstSegment.suggestedPrompt.length).toBeGreaterThanOrEqual(45);
      expect(archive.cachedFirstSegment.suggestedPrompt.length).toBeLessThanOrEqual(120);
      expect(archive.cachedFirstSegment.messages.length).toBeGreaterThanOrEqual(12);
      expect(archive.cachedFirstSegment.project.messages).toEqual(archive.cachedFirstSegment.messages);
    }
  });

  it.each([
    ["any", "viral-journey-secret-cp-group"],
    ["female", "viral-daughter-kingdom-520"]
  ] as const)("%s 视角拥有高辨识度同人梗开场", (viralRole, presetId) => {
    const archive = archiveById(viralRole, presetId);

    expect(archive.preset.language).toBeUndefined();
    expect(archive.cachedFirstSegment.suggestedPrompt.length).toBeGreaterThanOrEqual(45);
    expect(archive.cachedFirstSegment.messages.length).toBeGreaterThanOrEqual(12);
    expect(archive.cachedFirstSegment.suggestedPrompt.length).toBeLessThanOrEqual(120);
  });

  it("职场、合租、偶遇三条简洁恋爱本都支持男女视角", () => {
    for (const presetId of [
      "viral-office-private-calendar",
      "viral-roommate-last-key",
      "viral-encounter-wrong-umbrella"
    ]) {
      const maleArchive = archiveById("male", presetId);
      const femaleArchive = archiveById("female", presetId);
      expect(maleArchive.cachedFirstSegment.messages.length).toBeGreaterThanOrEqual(12);
      expect(maleArchive.cachedFirstSegment.messages.length).toBeLessThanOrEqual(16);
      expect(maleArchive.project.characters.find((character) => character.id === "boy")?.side).toBe("right");
      expect(femaleArchive.project.characters.find((character) => character.id === "girl")?.side).toBe("right");
    }
  });

  it("不限模式收录指定的历史、科技与中文互联网人物梗", () => {
    const presetIds = [
      "viral-pan-jinlian-window-request",
      "viral-trump-takaichi-tariff-coupon",
      "viral-fengge-female-fan-private-chat",
      "viral-fengge-male-b-friend-advice",
      "viral-luo-jia-next-week-live",
      "viral-lei-yu-joint-launch",
      "viral-liu-qiangdong-passerby",
      "viral-wang-dong-nearby-office",
      "viral-king-of-comedy-support-you",
      "viral-journey-secret-cp-group",
      "viral-office-private-calendar",
      "viral-roommate-last-key",
      "viral-encounter-wrong-umbrella"
    ];

    expect(presetStoryCount("viral", { viralRole: "any" })).toBe(15);
    expect(presetStoryCount("viral", { viralRole: "male" })).toBe(7);
    expect(presetStoryCount("viral", { viralRole: "female" })).toBe(6);
    for (const presetId of presetIds) expect(archiveById("any", presetId).preset.id).toBe(presetId);
  });

  it("已移除 OpenAI 相关预制故事", () => {
    expect(() => archiveById("any", "viral-musk-altman-alumni-group")).toThrow();
    expect(() => archiveById("any", "viral-altman-dario-safe-document")).toThrow();
  });

  it("水浒本使用武松与潘金莲并匹配角色性别", () => {
    const archive = archiveById("any", "viral-pan-jinlian-window-request");

    expect(archive.project.characters.map((character) => character.name)).toEqual(["武松", "潘金莲"]);
    expect(archive.project.characters.map(avatarGenderForCharacter)).toEqual(["boy", "girl"]);
    expect(archive.cachedFirstSegment.messages.some((message) => message.text.includes("门外"))).toBe(true);
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

  it("西游本排在最前面，峰哥本紧随其后", () => {
    const firstFive = Array.from({ length: 5 }, (_, index) => (
      createPresetInitialArchive("viral", index, { viralRole: "any" }).preset.id
    ));

    expect(firstFive).toEqual([
      "viral-journey-secret-cp-group",
      "viral-daughter-kingdom-520",
      "viral-baigujing-third-account",
      "viral-fengge-female-fan-private-chat",
      "viral-fengge-male-b-friend-advice"
    ]);
  });

  it("峰哥拥有女粉私聊和男B友答疑两条不同脚本", () => {
    const privateChat = archiveById("female", "viral-fengge-female-fan-private-chat");
    const advice = archiveById("male", "viral-fengge-male-b-friend-advice");
    const privateChatFromAny = archiveById("any", "viral-fengge-female-fan-private-chat");
    const adviceFromAny = archiveById("any", "viral-fengge-male-b-friend-advice");

    expect(privateChat.project.characters.map((character) => character.name)).toEqual(["峰哥", "成年女粉"]);
    expect(privateChat.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(privateChat.project.characters.find((character) => character.name === "成年女粉")?.side).toBe("right");
    expect(privateChat.cachedFirstSegment.messages.some((message) => message.text.includes("现场看看"))).toBe(true);
    expect(privateChat.cachedFirstSegment.messages.some((message) => message.text.includes("37 次"))).toBe(true);
    expect(advice.project.characters.map((character) => character.name)).toEqual(["男B友", "峰哥"]);
    expect(advice.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(advice.project.characters.find((character) => character.name === "男B友")?.side).toBe("right");
    expect(privateChatFromAny.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(privateChatFromAny.project.characters.find((character) => character.name === "成年女粉")?.side).toBe("right");
    expect(adviceFromAny.project.characters.find((character) => character.name === "峰哥")?.side).toBe("left");
    expect(adviceFromAny.project.characters.find((character) => character.name === "男B友")?.side).toBe("right");
    expect(advice.cachedFirstSegment.messages.some((message) => message.text.includes("支付平台做活跃"))).toBe(true);
    expect(viralNamedCharacterStyleInstruction(advice.project)).toContain("解答世间万物");
    expect(viralNamedCharacterStyleInstruction(advice.project)).toContain("得到现场看看");
    expect(viralNamedCharacterStyleInstruction(advice.project)).not.toMatch(/方言|口音|东北|莫急|搞么事|搁这|咋说/);
    for (const archive of [privateChat, advice, privateChatFromAny, adviceFromAny]) {
      const fengge = archive.project.characters.find((character) => character.name === "峰哥");
      expect(fengge?.avatarUrl).toBe("/avatars/journey-1986-shaseng.webp");
      expect(fengge?.voiceDescription).not.toMatch(/方言|口音|东北/);
      expect(archive.cachedFirstSegment.messages.map((message) => message.text).join(" "))
        .not.toMatch(/莫急|搞么事|搁这|咋说|莫慌|要得|巴适/);
    }
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

  it("西游预制绑定专属 86 版妆造语言头像", () => {
    const daughterKingdom = archiveById("any", "viral-daughter-kingdom-520");
    const baigujing = archiveById("any", "viral-baigujing-third-account");

    expect(daughterKingdom.project.characters.map((character) => character.avatarUrl)).toEqual([
      "/avatars/journey-1986-tang.webp",
      "/avatars/journey-1986-queen.webp"
    ]);
    expect(baigujing.project.characters.map((character) => character.avatarUrl)).toEqual([
      "/avatars/journey-1986-wukong.webp",
      "/avatars/journey-1986-baigujing.webp"
    ]);
    expect(daughterKingdom.cachedFirstSegment.messages.some((message) => message.text.includes("返程终点"))).toBe(true);
    expect(baigujing.cachedFirstSegment.messages.some((message) => message.text.includes("战绩"))).toBe(true);
  });

  it("微信西游大群保留六名成员、真实 roleId 和秘密 CP 线", () => {
    const archive = archiveById("any", "viral-journey-secret-cp-group");
    const project = archive.cachedFirstSegment.project;
    const characters = new Map(project.characters.map((character) => [character.id, character]));

    expect(project.chatMode).toBe("group");
    expect(project.characters.map((character) => character.name)).toEqual([
      "孙悟空", "白骨精", "唐玄奘", "女儿国国王", "沙僧", "猪八戒"
    ]);
    expect(characters.get("wukong")?.side).toBe("right");
    expect(project.characters.filter((character) => character.side === "left")).toHaveLength(5);
    expect(new Set(project.messages.map((message) => message.roleId).filter(Boolean))).toEqual(
      new Set(["wukong", "baigujing", "tang", "queen", "shaseng", "bajie"])
    );
    expect(project.messages.some((message) => message.text.includes("昨晚"))).toBe(true);
    expect(project.messages.some((message) => message.text.includes("小群"))).toBe(true);
    for (const character of project.characters) {
      expect(character.avatarUrl).toContain("/avatars/journey-1986-");
    }
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
