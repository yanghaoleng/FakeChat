import { describe, expect, it } from "vitest";
import { jojoProject } from "../src/shared/jojoProject";
import { sampleProject } from "../src/shared/sampleProject";
import { parseProject } from "../src/shared/schema";

describe("project schema", () => {
  it("accepts the built-in first-love sample", () => {
    const project = parseProject(sampleProject);
    expect(project.canvas).toEqual({ width: 1516, height: 852 });
    expect(project.messages.length).toBeGreaterThanOrEqual(18);
  });

  it("keeps the required drama media beats", () => {
    const types = new Set(sampleProject.messages.map((message) => message.type));
    expect(types.has("transfer")).toBe(true);
    expect(types.has("image")).toBe(true);
    expect(types.has("meme")).toBe(true);
  });

  it("uses short chat-style text instead of long prose", () => {
    const textMessages = sampleProject.messages.filter((message) => message.type === "text");
    expect(textMessages.every((message) => message.text.length <= 24)).toBe(true);
  });

  it("accepts the built-in JOJO company sample", () => {
    const project = parseProject(jojoProject);
    expect(project.stylePreset).toBe("jojo-company-chat");
    expect(project.characters.map((character) => character.id)).toEqual(["jiaojiao", "lingdang", "zhuxiaodi", "xitong"]);
    expect(project.messages.some((message) => message.roleId === "jiaojiao")).toBe(true);
    expect(project.assets.some((asset) => asset.id === "jojo-photo-meeting-blur")).toBe(true);
    expect(project.assets.find((asset) => asset.id === "jojo-photo-laptop-calendar")?.tags).toContain("排期");
    expect(project.assets.find((asset) => asset.id === "jojo-photo-keyboard-coffee")?.tags).toContain("冷咖啡");
  });
});
