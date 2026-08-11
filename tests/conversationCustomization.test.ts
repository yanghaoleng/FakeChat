import { describe, expect, it } from "vitest";
import { getChatSessions } from "../src/shared/chatSessions";
import {
  applyConversationCustomization,
  isConversationCustomizationEmpty,
  normalizeConversationCustomization
} from "../src/shared/conversationCustomization";
import { sampleProject } from "../src/shared/sampleProject";

describe("conversation customization", () => {
  it("normalizes text and accepts only locally stored raster avatars", () => {
    const customization = normalizeConversationCustomization({
      title: "  周末摸鱼群  ",
      characters: {
        girl: { name: "  夏夏  ", avatarUrl: "data:image/jpeg;base64,abc" },
        boy: { avatarUrl: "https://example.com/avatar.jpg" },
        unsafe: { avatarUrl: "data:image/svg+xml;base64,abc" }
      }
    });

    expect(customization).toEqual({
      title: "周末摸鱼群",
      characters: {
        girl: { name: "夏夏", avatarUrl: "data:image/jpeg;base64,abc" }
      }
    });
  });

  it("applies a title, nickname, and avatar without mutating the source project", () => {
    const sessionId = getChatSessions(sampleProject)[0].id;
    const customized = applyConversationCustomization(sampleProject, sessionId, {
      title: "只属于这段会话",
      characters: {
        girl: { name: "小夏", avatarUrl: "data:image/jpeg;base64,local" }
      }
    });

    expect(getChatSessions(customized)[0].title).toBe("只属于这段会话");
    expect(customized.characters.find((character) => character.id === "girl")).toMatchObject({
      name: "小夏",
      avatarInitial: "小夏",
      avatarUrl: "data:image/jpeg;base64,local"
    });
    expect(sampleProject.characters.find((character) => character.id === "girl")?.name).toBe("林夏");
  });

  it("recognizes customizations that can be removed from local storage", () => {
    expect(isConversationCustomizationEmpty({})).toBe(true);
    expect(isConversationCustomizationEmpty({ characters: {} })).toBe(true);
    expect(isConversationCustomizationEmpty({ title: "会话" })).toBe(false);
  });
});
