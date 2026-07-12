import { describe, expect, it } from "vitest";
import { explicitViralPeerName, resolveFirstViralPeerCharacters } from "../src/shared/chatPeerName";
import { sampleProject } from "../src/shared/sampleProject";

function emptyProject() {
  return {
    ...sampleProject,
    characters: sampleProject.characters.map((character) => ({ ...character })),
    messages: []
  };
}

describe("微信聊天对象命名", () => {
  it("优先采用用户为左侧女主写出的名字", () => {
    const project = emptyProject();
    const prompt = "男主李浩是律所合伙人；女主周雨是第二天入职的新人律师。";

    expect(explicitViralPeerName(project, prompt)).toBe("周雨");
  });

  it("女性视角时采用用户为左侧男主写出的名字", () => {
    const project = emptyProject();
    project.characters = project.characters.map((character) => ({
      ...character,
      side: character.id === "girl" ? "right" as const : "left" as const
    }));

    expect(explicitViralPeerName(project, "男主李浩是房东，女主周雨是租客。")).toBe("李浩");
  });

  it("用户没写名字时采用 DeepSeek 生成的聊天对象名字", () => {
    const project = emptyProject();
    const generated = {
      ...project,
      characters: project.characters.map((character) => character.id === "girl"
        ? { ...character, name: "程露" }
        : { ...character })
    };

    const characters = resolveFirstViralPeerCharacters(project, generated, "男主和陌生女律师被一房两租。 ");
    expect(characters.find((character) => character.side === "left")?.name).toBe("程露");
    expect(characters.find((character) => character.side === "left")?.avatarInitial).toBe("露");
  });

  it("已有故事后不会被后续 DeepSeek 响应改名", () => {
    const project = { ...emptyProject(), messages: [sampleProject.messages[0]] };
    const generated = {
      ...project,
      characters: project.characters.map((character) => character.side === "left"
        ? { ...character, name: "新名字" }
        : { ...character })
    };

    expect(resolveFirstViralPeerCharacters(project, generated, "继续")).toEqual(project.characters);
  });
});
