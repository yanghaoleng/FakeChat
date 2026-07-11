import { isJojoProject } from "./jojoProject.js";
import type { ChatMessage, DramaProject } from "./schema.js";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  lyric: string;
  coverUrl: string;
  previewUrl: string;
  shareUrl: string;
  commentCount: number;
};

export const musicTracks: MusicTrack[] = [
  {
    id: "17177324",
    title: "Yellow",
    artist: "Coldplay",
    lyric: "Look at the stars, look how they shine",
    coverUrl: "https://p2.music.126.net/n6BatGZdnRaEnIC0h7kVOg==/109951167815599264.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=17177324",
    commentCount: 116296
  },
  {
    id: "460043703",
    title: "Perfect",
    artist: "Ed Sheeran",
    lyric: "I found a love for me",
    coverUrl: "https://p1.music.126.net/99_i681E6ZE74t_xue6PUA==/109951166151204092.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c7/ba/bc/c7babc66-f598-aaa6-bcf6-307281795817/mzaf_16337361235117168274.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=460043703",
    commentCount: 64399
  },
  {
    id: "27556211",
    title: "All of Me",
    artist: "John Legend",
    lyric: "All of me loves all of you",
    coverUrl: "https://p2.music.126.net/xbhqfih88eVMAIItjBC81Q==/109951165968631390.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ff/94/6c/ff946ca7-e49a-fdf8-ea5b-11e6f56a0417/mzaf_17369156110722174773.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=27556211",
    commentCount: 48251
  },
  {
    id: "19292984",
    title: "Love Story",
    artist: "Taylor Swift",
    lyric: "You'll be the prince and I'll be the princess",
    coverUrl: "https://p1.music.126.net/GZERNplXUdzTPkKqo2F4tA==/109951169217536854.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8b/4c/b3/8b4cb3a5-b1d1-c82c-e6ab-48cc3969d4ff/mzaf_858711921713575608.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=19292984",
    commentCount: 147222
  },
  {
    id: "1874585362",
    title: "Until I Found You",
    artist: "Stephen Sanchez",
    lyric: "Until I found her",
    coverUrl: "https://p1.music.126.net/A0yhkDH7ZQ9l2QrjXy6_Dg==/109951166347255254.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/53/82/c1/5382c1d4-ddba-aa2b-90df-57268895fac9/mzaf_8926201202931541051.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=1874585362",
    commentCount: 5312
  },
  {
    id: "479223413",
    title: "I Like Me Better",
    artist: "Lauv",
    lyric: "I like me better when I'm with you",
    coverUrl: "https://p1.music.126.net/TWsOQM-prOlWSOPSf9Q6xw==/109951170007381434.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/3d/1a/11/3d1a118e-5a23-1fac-e96a-fa2df3b005df/mzaf_17702973250867027226.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=479223413",
    commentCount: 31870
  },
  {
    id: "2617944302",
    title: "Die With A Smile",
    artist: "Lady Gaga / Bruno Mars",
    lyric: "I'd wanna hold you just for a while",
    coverUrl: "https://p2.music.126.net/ycobchpRFRpUx_oKSoTkPw==/109951170009341937.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e9/d1/46/e9d14699-9505-493e-cd27-a501095c81ff/mzaf_7283388936457278756.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=2617944302",
    commentCount: 15115
  },
  {
    id: "2786284",
    title: "What Can I Do (But Love You)",
    artist: "Joy Williams",
    lyric: "All I do is think of you",
    coverUrl: "https://p1.music.126.net/KNfrkkoS7tCM5p78HDz-2w==/1761417627702349.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/72/26/65/72266569-017e-3d46-13a3-7f2a75afdfca/mzaf_15546635746166794764.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=2786284",
    commentCount: 4572
  },
  {
    id: "2019574134",
    title: "真夜中のドア〜stay with me",
    artist: "松原みき",
    lyric: "Yes my love to you",
    coverUrl: "https://p1.music.126.net/MVU9ZgpfGVpuwMyS5J1skA==/109951172387748861.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e1/28/78/e1287879-74f1-660b-34b7-ad323a612056/mzaf_16413173230631267645.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=2019574134",
    commentCount: 1333
  },
  {
    id: "25730796",
    title: "Sealed With A Kiss (以吻封缄)",
    artist: "Dana Winner",
    lyric: "Sealed with a kiss",
    coverUrl: "https://p1.music.126.net/NVosqd0wGUTq4vAilYzp3Q==/2465105069489195.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/fe/a2/3c/fea23c61-d6c8-317f-8b53-15918a0bc64c/mzaf_17744617008125647386.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=25730796",
    commentCount: 11091
  },
  {
    id: "1501153061",
    title: "OH NO, OH YES! (2012 Remastered)",
    artist: "中森明菜",
    lyric: "ひとつひとつ消えてゆく",
    coverUrl: "https://p1.music.126.net/vzw9Wxp1FYM3uf0poOIXJg==/109951165524572570.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/60/df/52/60df5222-e8a1-306e-a490-2e56ef91f35c/mzaf_7266565316263581610.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=1501153061",
    commentCount: 624
  },
  {
    id: "17331759",
    title: "Sharing The Night Together",
    artist: "Dr. Hook",
    lyric: "I'm feeling kinda lonely too",
    coverUrl: "https://p1.music.126.net/cvx3aJK9X-UdIIJwbUz6Ww==/109951169262855889.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/68/6e/5e/686e5e73-9bf8-4cea-6919-9208ae3c6e49/mzaf_13378421565693503940.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=17331759",
    commentCount: 677
  },
  {
    id: "31918190",
    title: "Gotta Go Home (12'' Vinyl Maxi)",
    artist: "Boney M.",
    lyric: "纯音乐，请欣赏",
    coverUrl: "https://p1.music.126.net/F8gn7sts4_TLjmQYv9ot_A==/109951169300296829.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/bc/57/0a/bc570aa2-5467-0825-3598-2be41f75770e/mzaf_10745842369080255044.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=31918190",
    commentCount: 64
  },
  {
    id: "27252045",
    title: "Till Then",
    artist: "The Mills Brothers",
    lyric: "Till then, my darling, please wait for me",
    coverUrl: "https://p1.music.126.net/5gJOfURaQ3aGS4VeQbLxmw==/3247957348498925.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/13/d1/e8/13d1e87e-6426-5ff8-c0f3-837ed2878c2e/mzaf_13956056507654232694.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=27252045",
    commentCount: 41
  },
  {
    id: "1317475507",
    title: "Something Stupid (From Better Call Saul)",
    artist: "Lola Marsh",
    lyric: "By saying something stupid like I love you",
    coverUrl: "https://p1.music.126.net/OxK_qTJfksuIF-3vO33Rig==/109951163599302788.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/05/2b/59/052b5943-951a-8446-2148-8983492430f3/mzaf_16755639132165884458.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=1317475507",
    commentCount: 1927
  },
  {
    id: "5104574",
    title: "Beat It",
    artist: "Lizette / Groove Da Praia",
    lyric: "So beat it, just beat it",
    coverUrl: "https://p1.music.126.net/bhPEXBeP2QoiQ5knT2t6fQ==/109951163600341973.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/00/b3/e0/00b3e0f2-a268-50b2-4d2c-6f5fbc23e36e/mzaf_17207188899111994339.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=5104574",
    commentCount: 1985
  },
  {
    id: "1338836367",
    title: "The Wanderer",
    artist: "Dion",
    lyric: "I'm the type of guy who never settles down",
    coverUrl: "https://p1.music.126.net/SSjAdQ_Uy_cWxTVxf7xhhA==/109951163786844752.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/67/68/31/6768311b-5969-6cf5-08d1-8277965a886a/mzaf_9472595021691898405.plus.aac.p.m4a",
    shareUrl: "https://music.163.com/song?id=1338836367",
    commentCount: 0
  }
];

const romanticContextPattern = /暧昧|喜欢|心动|恋爱|感情|升温|靠近|在意|舍不得|吃醋|想见|见面|约会|合租|室友|重逢|暗恋|真话|晚安|陪你|等你|合适|旧账|前任/;
const warmingMessagePattern = /喜欢|心动|在意|舍不得|吃醋|想见|见面|明晚|晚安|陪|等你|合适|真话|旧账|记得|不熟|认识|条件过了/;

function stableHash(value: string) {
  return [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

export function musicTrackForContext(context: string) {
  return musicTracks[stableHash(context || "romance") % musicTracks.length];
}

export function musicTrackForMessage(message: ChatMessage, context = "") {
  const direct = message.musicId ? musicTracks.find((track) => track.id === message.musicId) : undefined;
  const byTitle = message.musicTitle
    ? musicTracks.find((track) => track.title.toLowerCase() === message.musicTitle?.toLowerCase())
    : undefined;
  return direct ?? byTitle ?? musicTrackForContext(`${context} ${message.text}`);
}

export function hydrateMusicMessage(message: ChatMessage, context = ""): ChatMessage {
  if (message.type !== "music") return message;
  const track = musicTrackForMessage(message, context);
  return {
    ...message,
    text: message.text || `分享歌曲：${track.title}`,
    musicId: message.musicId || track.id,
    musicTitle: message.musicTitle || track.title,
    musicArtist: message.musicArtist || track.artist,
    musicLyric: message.musicLyric || track.lyric,
    musicCoverUrl: message.musicCoverUrl || track.coverUrl,
    musicPreviewUrl: message.musicPreviewUrl || track.previewUrl,
    musicShareUrl: message.musicShareUrl || track.shareUrl,
    musicCommentCount: message.musicCommentCount || track.commentCount,
    emotion: message.emotion || "心动",
    sendSfx: "send",
    pauseMs: message.pauseMs || 480,
    holdMs: Math.max(message.holdMs || 0, 2600)
  };
}

export function injectRomanticMusicMessage(
  messages: ChatMessage[],
  project: DramaProject,
  context: string,
  idPrefix = "music"
) {
  if (isJojoProject(project) || project.messages.some((message) => message.type === "music") || messages.some((message) => message.type === "music")) return messages;
  if (/不要(?:加|发|用)?音乐|无音乐/.test(context) || !romanticContextPattern.test(context)) return messages;

  const lowerBound = Math.max(1, Math.floor(messages.length * 0.42));
  const upperBound = Math.max(lowerBound, Math.floor(messages.length * 0.8));
  let anchorIndex = Math.min(messages.length - 1, Math.floor(messages.length * 0.64));
  for (let index = lowerBound; index <= upperBound; index += 1) {
    if (warmingMessagePattern.test(messages[index]?.text || "")) anchorIndex = index;
  }

  const anchor = messages[anchorIndex] ?? messages.at(-1);
  if (!anchor || anchor.side === "center") return messages;
  const track = musicTrackForContext(`${context} ${anchor.text}`);
  const musicMessage = hydrateMusicMessage({
    id: `${idPrefix}-music-${track.id}`,
    roleId: anchor.roleId,
    side: anchor.side,
    type: "music",
    text: `分享歌曲：${track.title}`,
    emotion: "心动",
    sendSfx: "send",
    pauseMs: 480,
    holdMs: 2600,
    musicId: track.id
  }, context);

  return [...messages.slice(0, anchorIndex + 1), musicMessage, ...messages.slice(anchorIndex + 1)];
}
