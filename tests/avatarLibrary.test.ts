import { describe, expect, it } from "vitest";
import {
  avatarById,
  avatarGenderForCharacter,
  genderMatchedAvatarUrl
} from "../src/shared/avatarLibrary";
import { sampleProject } from "../src/shared/sampleProject";

describe("微信角色头像性别", () => {
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
});
