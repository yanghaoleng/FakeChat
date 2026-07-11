import { describe, expect, it } from "vitest";
import { injectRomanticMusicMessage, musicTracks } from "../src/shared/musicLibrary.js";
import { sampleProject } from "../src/shared/sampleProject.js";
import { parseProject } from "../src/shared/schema.js";

describe("music message library", () => {
  it("includes every track from the shared NetEase playlist", () => {
    const playlistTrackIds = [
      "2786284",
      "2019574134",
      "25730796",
      "1501153061",
      "17331759",
      "31918190",
      "27252045",
      "1317475507",
      "5104574",
      "1338836367"
    ];
    const libraryIds = new Set(musicTracks.map((track) => track.id));

    expect(musicTracks).toHaveLength(17);
    expect(new Set(musicTracks.map((track) => track.id)).size).toBe(musicTracks.length);
    playlistTrackIds.forEach((id) => expect(libraryIds.has(id)).toBe(true));
  });

  it("injects one hydrated music card into a romantic conversation", () => {
    const project = { ...sampleProject, messages: [] };
    const messages = sampleProject.messages.slice(0, 8);
    const next = injectRomanticMusicMessage(messages, project, "两个人从试探走向暧昧，感情开始升温", "test");
    const music = next.find((message) => message.type === "music");

    expect(next).toHaveLength(messages.length + 1);
    expect(music?.musicTitle).toBeTruthy();
    expect(music?.musicArtist).toBeTruthy();
    expect(music?.musicCoverUrl).toMatch(/^https:\/\//);
    expect(music?.musicPreviewUrl).toMatch(/^https:\/\//);
    expect(music?.musicShareUrl).toContain("music.163.com/song?id=");
  });

  it("keeps the music metadata valid in project archives", () => {
    const track = musicTracks[0];
    const parsed = parseProject({
      ...sampleProject,
      messages: [{
        ...sampleProject.messages[0],
        type: "music",
        text: `分享歌曲：${track.title}`,
        musicId: track.id,
        musicTitle: track.title,
        musicArtist: track.artist,
        musicLyric: track.lyric,
        musicCoverUrl: track.coverUrl,
        musicPreviewUrl: track.previewUrl,
        musicShareUrl: track.shareUrl,
        musicCommentCount: track.commentCount
      }]
    });

    expect(parsed.messages[0].type).toBe("music");
    expect(parsed.messages[0].musicId).toBe(track.id);
  });
});
