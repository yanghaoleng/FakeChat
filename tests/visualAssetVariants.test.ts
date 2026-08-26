import { describe, expect, it } from "vitest";
import { avatarPreviewPath, messageImagePreviewPath, visualPreviewPath } from "../src/shared/visualAssetVariants";

describe("visual asset variants", () => {
  it("maps local avatars to 96px preview assets", () => {
    expect(avatarPreviewPath("/avatars/boy-soft-selfie.webp")).toBe("/avatars/thumbs/96/boy-soft-selfie.webp");
    expect(avatarPreviewPath("/avatars/jojo/jiaojiao.webp")).toBe("/avatars/thumbs/96/jojo/jiaojiao.webp");
    expect(avatarPreviewPath("/avatars/thumbs/96/boy-soft-selfie.webp")).toBe("/avatars/thumbs/96/boy-soft-selfie.webp");
  });

  it("maps local chat photos to 480px preview assets", () => {
    expect(messageImagePreviewPath("/viral-assets/photos/phone-chat-blur.webp")).toBe("/viral-assets/photos-480/phone-chat-blur.webp");
    expect(messageImagePreviewPath("/jojo-assets/photos/company-daily.webp")).toBe("/jojo-assets/photos-480/company-daily.webp");
  });

  it("leaves remote and non-previewed visual assets alone", () => {
    expect(visualPreviewPath("https://example.com/avatar.webp")).toBe("https://example.com/avatar.webp");
    expect(visualPreviewPath("/memes/qface/20.webp")).toBe("/memes/qface/20.webp");
    expect(visualPreviewPath("/wechat-ui/topbar.webp")).toBe("/wechat-ui/topbar.webp");
  });
});
