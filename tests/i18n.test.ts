import { describe, expect, it } from "vitest";
import { detectBrowserLanguage, languageGenerationInstruction } from "../src/shared/i18n";
import { sampleProject } from "../src/shared/sampleProject";
import { buildDeepSeekRequest } from "../src/shared/storyGeneration/deepseekCore";

describe("application language", () => {
  it.each([
    [["zh-Hant-HK"], "zh-TW"],
    [["zh-SG"], "zh-CN"],
    [["en-GB", "zh-CN"], "en"],
    [["ja-JP"], "ja"],
    [["fr-FR"], "zh-CN"]
  ] as const)("maps browser languages %j to %s", (languages, expected) => {
    expect(detectBrowserLanguage(languages)).toBe(expected);
  });

  it.each(["zh-CN", "zh-TW", "en", "ja"] as const)("adds the %s output-language contract to model prompts", (language) => {
    const request = buildDeepSeekRequest({
      project: { ...sampleProject, messages: [] },
      prompt: "Continue the story",
      promptCards: [],
      model: "test-model",
      language
    });

    expect(request.messages[0].content).toContain(languageGenerationInstruction(language));
  });
});
