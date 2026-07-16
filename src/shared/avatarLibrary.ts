import type { DramaProject, MemeAsset } from "./schema";

export type DefaultAvatarGender = "boy" | "girl";

export interface DefaultAvatar {
  id: string;
  title: string;
  vibe: string;
  gender: DefaultAvatarGender | "neutral";
  group?: "western-student" | "neutral-editorial" | "journey-character" | "gta-character";
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
  },
  ...[
    ["neutral-animal-orange-cat", "丑橘", "橘猫 / 厌世脸 / 晴空蓝"],
    ["neutral-animal-capybara", "橘子水豚", "水豚 / 小橘子 / 奶油黄"],
    ["neutral-animal-shiba", "侧眼柴犬", "柴犬 / 侧眼 / 杏橙"],
    ["neutral-animal-red-panda", "捏叶小熊猫", "小熊猫 / 绿叶 / 薄荷"],
    ["neutral-animal-alpaca", "乱毛羊驼", "羊驼 / 乱刘海 / 珊瑚"],
    ["neutral-animal-seal", "放空海豹", "海豹 / 放空脸 / 暖白"]
  ].map(([id, title, vibe]) => ({
    id,
    title,
    vibe: `中性插画 / ${vibe}`,
    gender: "neutral" as const,
    group: "neutral-editorial" as const,
    url: localAvatar(`${id}.webp`),
    ...generatedSource
  })),
  {
    id: "dragonball-goku-orange",
    title: "孙悟空（橘色武道服）",
    vibe: "七龙珠角色 / 孙悟空 / 橘色武道服",
    gender: "boy",
    url: localAvatar("dragonball-goku-orange.webp"),
    ...generatedSource
  },
  ...[
    ["journey-1986-tang", "唐玄奘", "西游角色 / 唐玄奘 / 86 版妆造语言", "boy"],
    ["journey-1986-queen", "女儿国国王", "西游角色 / 女儿国国王 / 86 版妆造语言", "girl"],
    ["journey-1986-wukong", "孙悟空", "西游角色 / 孙悟空 / 86 版妆造语言", "boy"],
    ["journey-1986-baigujing", "白骨精", "西游角色 / 白骨精 / 86 版妆造语言", "girl"],
    ["journey-1986-shaseng", "沙僧", "西游角色 / 沙僧 / 86 版妆造语言", "boy"],
    ["journey-1986-bajie", "猪八戒", "西游角色 / 猪八戒 / 86 版妆造语言", "boy"]
  ].map(([id, title, vibe, gender]) => ({
    id,
    title,
    vibe,
    gender: gender as DefaultAvatarGender,
    group: "journey-character" as const,
    url: localAvatar(`${id}.webp`),
    ...generatedSource
  })),
  ...[
    ["gta-lucia", "Lucia Caminos", "GTA 角色 / Lucia / Vice City 暮色", "girl"],
    ["gta-jason", "Jason Duval", "GTA 角色 / Jason / Leonida 海岸", "boy"],
    ["gta-michael", "Michael De Santa", "GTA 角色 / Michael / Los Santos 豪宅", "boy"],
    ["gta-franklin", "Franklin Clinton", "GTA 角色 / Franklin / Los Santos 城区", "boy"],
    ["gta-trevor", "Trevor Philips", "GTA 角色 / Trevor / Blaine County 荒漠", "boy"],
    ["gta-niko", "Niko Bellic", "GTA 角色 / Niko / Liberty City", "boy"],
    ["gta-cj", "Carl Johnson", "GTA 角色 / CJ / 90 年代 Los Santos", "boy"],
    ["gta-tommy", "Tommy Vercetti", "GTA 角色 / Tommy / 80 年代 Vice City", "boy"],
    ["gta-claude", "Claude", "GTA 角色 / Claude / Liberty City 雨夜", "boy"]
  ].map(([id, title, vibe, gender]) => ({
    id,
    title,
    vibe,
    gender: gender as DefaultAvatarGender,
    group: "gta-character" as const,
    url: localAvatar(`${id}.webp`),
    ...generatedSource
  })),
  {
    id: "western-student-male-cafe",
    title: "Campus Coffee",
    vibe: "欧美男留学生 / 校园咖啡 / 纸杯遮脸",
    gender: "boy",
    group: "western-student",
    url: localAvatar("western-student-male-cafe.webp"),
    ...generatedSource
  },
  {
    id: "western-student-female-cafe",
    title: "Library Coffee",
    vibe: "欧美女留学生 / 图书馆咖啡 / 纸杯遮脸",
    gender: "girl",
    group: "western-student",
    url: localAvatar("western-student-female-cafe.webp"),
    ...generatedSource
  }
];

export function avatarById(id: string): DefaultAvatar | undefined {
  return defaultAvatars.find((avatar) => avatar.id === id);
}

export function avatarsByGender(gender: DefaultAvatarGender, group: DefaultAvatar["group"] | "asian" = "asian"): DefaultAvatar[] {
  return defaultAvatars.filter((avatar) => avatar.gender === gender && (avatar.group ?? "asian") === group);
}

export function neutralEditorialAvatars(): DefaultAvatar[] {
  return defaultAvatars.filter((avatar) => avatar.gender === "neutral" && avatar.group === "neutral-editorial");
}

export function avatarGenderForCharacter(character: DramaProject["characters"][number]): DefaultAvatarGender {
  if (character.avatarGender) return character.avatarGender;
  if (character.id === "girl") return "girl";
  if (character.id === "boy") return "boy";
  if (character.voicePreset === "young_real_female") return "girl";
  if (character.voicePreset === "young_male") return "boy";
  return character.side === "left" ? "girl" : "boy";
}

function configuredDefaultAvatar(avatarUrl: string | undefined) {
  if (!avatarUrl) return undefined;
  return defaultAvatars.find((avatar) => avatar.url === avatarUrl || avatarUrl.endsWith(avatar.url));
}

function stableAvatar(gender: DefaultAvatarGender, seed: string, group: DefaultAvatar["group"] | "asian" = "asian") {
  const avatars = avatarsByGender(gender, group);
  if (!avatars.length) return undefined;
  const hash = [...seed].reduce((total, character) => total + character.charCodeAt(0), 17);
  return avatars[Math.abs(hash) % avatars.length];
}

export function genderMatchedAvatarUrl(character: DramaProject["characters"][number]) {
  const configured = configuredDefaultAvatar(character.avatarUrl);
  if (!configured) return character.avatarUrl;
  if (configured.gender === "neutral") return configured.url;
  const gender = avatarGenderForCharacter(character);
  if (configured.gender === gender) return configured.url;
  return stableAvatar(gender, `${character.id}:${character.name}`, configured.group ?? "asian")?.url ?? character.avatarUrl;
}

export function assignDistinctCharacterAvatars(
  characters: DramaProject["characters"],
  {
    random = Math.random,
    randomizeCharacterIds = []
  }: {
    random?: () => number;
    randomizeCharacterIds?: Iterable<string>;
  } = {}
): DramaProject["characters"] {
  const forceRandom = new Set(randomizeCharacterIds);
  const usedAvatarUrls = new Set<string>();

  return characters.map((character) => {
    const currentAvatarUrl = genderMatchedAvatarUrl(character);
    const shouldReplace = forceRandom.has(character.id)
      || !currentAvatarUrl
      || usedAvatarUrls.has(currentAvatarUrl);
    const candidates = avatarsByGender(avatarGenderForCharacter(character))
      .filter((avatar) => !usedAvatarUrls.has(avatar.url));
    const selected = shouldReplace && candidates.length
      ? candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
      : undefined;
    const avatarUrl = selected?.url || currentAvatarUrl;
    if (avatarUrl) usedAvatarUrls.add(avatarUrl);
    return avatarUrl ? { ...character, avatarUrl } : character;
  });
}

export function randomizeViralCharacterAvatars(project: DramaProject): DramaProject {
  return {
    ...project,
    characters: assignDistinctCharacterAvatars(project.characters, {
      randomizeCharacterIds: project.characters.map((character) => character.id)
    })
  };
}
