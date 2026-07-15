import { describe, expect, it } from "vitest";
import {
  avatarById,
  avatarGenderForCharacter,
  avatarsByGender,
  genderMatchedAvatarUrl,
  neutralEditorialAvatars
} from "../src/shared/avatarLibrary";
import { sampleProject } from "../src/shared/sampleProject";

describe("微信角色头像性别", () => {
  it("默认头像池只给自己使用亚洲头像，欧美留学生头像单独分组", () => {
    expect(avatarsByGender("boy").every((avatar) => !avatar.group)).toBe(true);
    expect(avatarsByGender("girl").every((avatar) => !avatar.group)).toBe(true);
    expect(avatarsByGender("boy", "western-student").map((avatar) => avatar.id)).toEqual(["western-student-male-cafe"]);
    expect(avatarsByGender("girl", "western-student").map((avatar) => avatar.id)).toEqual(["western-student-female-cafe"]);
  });

  it("非恋爱题材拥有独立的无性别插画头像池", () => {
    const avatars = neutralEditorialAvatars();

    expect(avatars).toHaveLength(6);
    expect(avatars.every((avatar) => avatar.gender === "neutral")).toBe(true);
    expect(avatars.every((avatar) => avatar.url.includes("neutral-animal-"))).toBe(true);
  });

  it("按角色身份判断性别，不受左右位置变化影响", () => {
    const girl = sampleProject.characters.find((character) => character.id === "girl")!;
    const boy = sampleProject.characters.find((character) => character.id === "boy")!;

    expect(avatarGenderForCharacter({ ...girl, side: "right" })).toBe("girl");
    expect(avatarGenderForCharacter({ ...boy, side: "left" })).toBe("boy");
  });

  it("女生误配男头像时自动换回女生头像", () => {
    const girl = sampleProject.characters.find((character) => character.id === "girl")!;
    const maleAvatar = avatarById("boy-soft-selfie")!;
    const correctedUrl = genderMatchedAvatarUrl({ ...girl, avatarUrl: maleAvatar.url });

    expect(correctedUrl).not.toBe(maleAvatar.url);
    expect(correctedUrl?.startsWith("/avatars/")).toBe(true);
    expect(correctedUrl?.includes("boy-")).toBe(false);
  });

  it("男生误配女头像时自动换回男生头像", () => {
    const boy = sampleProject.characters.find((character) => character.id === "boy")!;
    const femaleAvatar = avatarById("girl-sweater-soft")!;
    const correctedUrl = genderMatchedAvatarUrl({ ...boy, avatarUrl: femaleAvatar.url });

    expect(correctedUrl).not.toBe(femaleAvatar.url);
    expect(correctedUrl?.startsWith("/avatars/boy-")).toBe(true);
  });

  it("中性插画头像不会被男女角色匹配逻辑替换", () => {
    const girl = sampleProject.characters.find((character) => character.id === "girl")!;
    const neutralAvatar = neutralEditorialAvatars()[0];

    expect(genderMatchedAvatarUrl({ ...girl, avatarUrl: neutralAvatar.url })).toBe(neutralAvatar.url);
  });
});
