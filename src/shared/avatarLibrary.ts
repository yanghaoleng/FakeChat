import type { DramaProject, MemeAsset } from "./schema";

export type DefaultAvatarGender = "boy" | "girl";

export interface DefaultAvatar {
  id: string;
  title: string;
  vibe: string;
  gender: DefaultAvatarGender;
  url: string;
  sourceName: string;
  sourceUrl: string;
  licenseNote: string;
  riskLevel: MemeAsset["riskLevel"];
}

const localAvatar = (fileName: string) => `/avatars/${fileName}`;

const generatedSource = {
  sourceName: "AI-generated local bitmap",
  sourceUrl: "",
  licenseNote: "本地生成的虚构成人头像位图，用于短剧样片；公开商用前建议人工复核相似性与授权风险。",
  riskLevel: "safe" as const
};

export const defaultAvatars: DefaultAvatar[] = [
  {
    id: "girl-nostalgia-dark",
    title: "早餐杯沿",
    vibe: "女主 / 早餐桌 / 杯子遮脸",
    gender: "girl",
    url: localAvatar("girl-nostalgia-dark.webp"),
    ...generatedSource
  },
  {
    id: "boy-soft-selfie",
    title: "便利店红袋",
    vibe: "男主 / 便利店 / 零食袋遮半脸",
    gender: "boy",
    url: localAvatar("boy-soft-selfie.webp"),
    ...generatedSource
  },
  {
    id: "boy-cartoon-night",
    title: "本子挡脸",
    vibe: "男主 / 书桌 / 牛皮本遮脸",
    gender: "boy",
    url: localAvatar("boy-cartoon-night.webp"),
    ...generatedSource
  },
  {
    id: "boy-neon-blur",
    title: "楼梯袖口",
    vibe: "男主 / 楼梯仰拍 / 袖口遮下脸",
    gender: "boy",
    url: localAvatar("boy-neon-blur.webp"),
    ...generatedSource
  },
  {
    id: "boy-room-selfie",
    title: "公园翻书",
    vibe: "男主 / 公园长椅 / 书遮半脸",
    gender: "boy",
    url: localAvatar("boy-room-selfie.webp"),
    ...generatedSource
  },
  {
    id: "girl-sweater-soft",
    title: "公交围巾",
    vibe: "女主 / 公交窗边 / 围巾遮脸",
    gender: "girl",
    url: localAvatar("girl-sweater-soft.webp"),
    ...generatedSource
  },
  {
    id: "boy-mono-blur",
    title: "电梯手机",
    vibe: "男主 / 电梯镜面 / 手机遮脸",
    gender: "boy",
    url: localAvatar("boy-mono-blur.webp"),
    ...generatedSource
  },
  {
    id: "girl-cartoon-pink",
    title: "雨伞袖口",
    vibe: "女主 / 雨天伞下 / 袖口遮脸",
    gender: "girl",
    url: localAvatar("girl-cartoon-pink.webp"),
    ...generatedSource
  },
  {
    id: "girl-soft-flash",
    title: "抱枕半脸",
    vibe: "女主 / 房间墙面 / 抱枕遮脸",
    gender: "girl",
    url: localAvatar("girl-soft-flash.webp"),
    ...generatedSource
  },
  {
    id: "abstract-neon-profile",
    title: "蓝帽咖啡",
    vibe: "女主 / 咖啡店 / 纸杯遮脸",
    gender: "girl",
    url: localAvatar("abstract-neon-profile.webp"),
    ...generatedSource
  },
  {
    id: "girl-headphone-blur",
    title: "洗衣白被",
    vibe: "女主 / 洗衣房 / 被子遮脸",
    gender: "girl",
    url: localAvatar("girl-headphone-blur.webp"),
    ...generatedSource
  },
  {
    id: "abstract-dark-glasses",
    title: "书店绿书",
    vibe: "女主 / 书店局部 / 绿书遮脸",
    gender: "girl",
    url: localAvatar("abstract-dark-glasses.webp"),
    ...generatedSource
  }
];

export function avatarById(id: string): DefaultAvatar | undefined {
  return defaultAvatars.find((avatar) => avatar.id === id);
}

export function avatarsByGender(gender: DefaultAvatarGender): DefaultAvatar[] {
  return defaultAvatars.filter((avatar) => avatar.gender === gender);
}

function randomAvatar(gender: DefaultAvatarGender): DefaultAvatar | undefined {
  const avatars = avatarsByGender(gender);
  return avatars[Math.floor(Math.random() * avatars.length)];
}

function genderForCharacter(character: DramaProject["characters"][number]): DefaultAvatarGender {
  if (character.id === "girl") return "girl";
  if (character.id === "boy") return "boy";
  return character.side === "left" ? "girl" : "boy";
}

export function randomizeViralCharacterAvatars(project: DramaProject): DramaProject {
  const selectedAvatars: Record<DefaultAvatarGender, DefaultAvatar | undefined> = {
    boy: randomAvatar("boy"),
    girl: randomAvatar("girl")
  };

  return {
    ...project,
    characters: project.characters.map((character) => {
      const avatar = selectedAvatars[genderForCharacter(character)];
      return avatar ? { ...character, avatarUrl: avatar.url } : character;
    })
  };
}
