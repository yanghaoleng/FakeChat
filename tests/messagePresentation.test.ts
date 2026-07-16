import { describe, expect, it } from "vitest";
import { jojoProject } from "../src/shared/jojoProject";
import {
  avatarPresentationForCharacter,
  mediaPresentationForMessage,
  messagePresentationFor,
  speakerNameForMessage,
  visualSideForMessage
} from "../src/shared/messagePresentation";
import { sampleProject } from "../src/shared/sampleProject";
import { parseProject, type ChatMessage, type DramaProject } from "../src/shared/schema";

describe("shared message presentation", () => {
  it("keeps direct-chat side, avatar, and speaker-name behavior", () => {
    const message = sampleProject.messages[0];
    const presentation = messagePresentationFor(sampleProject, message);
    const character = sampleProject.characters.find((item) => item.id === message.roleId)!;

    expect(presentation.visualSide).toBe("right");
    expect(presentation.speakerName).toBeUndefined();
    expect(presentation.avatar).toEqual(avatarPresentationForCharacter(character));
    expect(presentation.media).toEqual({ kind: "none" });
  });

  it("shows speaker names for non-JOJO group messages on every renderer", () => {
    const project: DramaProject = { ...sampleProject, chatMode: "group" };
    const message = project.messages[1];

    expect(speakerNameForMessage(project, message, "interactive")).toBe("林夏");
    expect(speakerNameForMessage(project, message, "remotion")).toBe("林夏");
    expect(speakerNameForMessage(project, message, "canvas")).toBe("林夏");
  });

  it("uses the JOJO role side while preserving surface-specific speaker labels", () => {
    const message: ChatMessage = {
      ...jojoProject.messages[1],
      roleId: "jiaojiao",
      side: "left"
    };

    expect(visualSideForMessage(jojoProject, message)).toBe("right");
    expect(speakerNameForMessage(jojoProject, message, "interactive")).toBe("叫叫");
    expect(speakerNameForMessage(jojoProject, message, "remotion")).toBeUndefined();
    expect(speakerNameForMessage(jojoProject, message, "canvas")).toBe("叫叫");
  });

  it("presents system and center messages without avatar or speaker metadata", () => {
    const message: ChatMessage = {
      ...sampleProject.messages[0],
      id: "system-test",
      roleId: undefined,
      side: "center",
      type: "system",
      text: "以下是新消息"
    };
    const presentation = messagePresentationFor({ ...sampleProject, chatMode: "group" }, message, "canvas");

    expect(presentation.isSystem).toBe(true);
    expect(presentation.visualSide).toBe("center");
    expect(presentation.avatar).toBeUndefined();
    expect(presentation.speakerName).toBeUndefined();
    expect(presentation.media).toEqual({ kind: "none" });
  });

  it("shows names only for the group session inside a mixed-session project", () => {
    const friend = { ...sampleProject.characters[1], id: "friend", name: "周雨", avatarInitial: "雨" };
    const project = parseProject({
      ...sampleProject,
      schemaVersion: 2,
      selfCharacterId: "boy",
      characters: [...sampleProject.characters, friend],
      chatSessions: [
        { id: "direct", title: "林夏", kind: "direct", participantIds: ["boy", "girl"] },
        { id: "group", title: "三人群", kind: "group", participantIds: ["boy", "girl", "friend"] }
      ],
      messages: []
    });
    const directMessage = { ...sampleProject.messages[1], sessionId: "direct" };
    const groupMessage = { ...sampleProject.messages[1], sessionId: "group" };

    expect(messagePresentationFor(project, directMessage).isGroup).toBe(false);
    expect(speakerNameForMessage(project, directMessage)).toBeUndefined();
    expect(messagePresentationFor(project, groupMessage).isGroup).toBe(true);
    expect(speakerNameForMessage(project, groupMessage)).toBe("林夏");
  });

  it("normalizes image, local meme, CSS meme, and music media", () => {
    const image = sampleProject.messages.find((message) => message.type === "image")!;
    const localMeme = sampleProject.messages.find((message) => message.type === "meme")!;
    const cssMeme = jojoProject.messages.find((message) => message.assetId === "jojo-meme-jiaojiao-deadline")!;
    const music: ChatMessage = {
      ...sampleProject.messages[0],
      id: "music-test",
      type: "music",
      musicId: "17177324",
      musicTitle: "自定义 Yellow",
      musicArtist: "Coldplay"
    };

    const imageMedia = mediaPresentationForMessage(sampleProject, image);
    const localMemeMedia = mediaPresentationForMessage(sampleProject, localMeme);
    const cssMemeMedia = mediaPresentationForMessage(jojoProject, cssMeme);
    const musicMedia = mediaPresentationForMessage(sampleProject, music);

    expect(imageMedia).toMatchObject({ kind: "image", source: "/viral-assets/photos/phone-chat-blur.webp" });
    expect(imageMedia.kind === "image" && imageMedia.description).toContain("小学毕业照");
    expect(localMemeMedia).toMatchObject({ kind: "meme", caption: "偷笑" });
    expect(localMemeMedia.kind === "meme" && localMemeMedia.source).toBeTruthy();
    expect(cssMemeMedia).toMatchObject({
      kind: "meme",
      source: undefined,
      cssCard: { id: "jojo-meme-jiaojiao-deadline", title: "叫叫赶工" }
    });
    expect(musicMedia).toMatchObject({
      kind: "music",
      title: "自定义 Yellow",
      artist: "Coldplay"
    });
    expect(musicMedia.kind === "music" && musicMedia.source).toMatch(/^https:/);
  });
});
