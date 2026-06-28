import type { MemeAsset } from "./schema";

export interface DefaultAvatar {
  id: string;
  title: string;
  vibe: string;
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
    title: "暗光甜妹",
    vibe: "非主流自拍 / 模糊 / 清冷",
    url: localAvatar("girl-nostalgia-dark.webp"),
    ...generatedSource
  },
  {
    id: "boy-soft-selfie",
    title: "软光男友",
    vibe: "网图男生 / 遮脸 / 白毛衣",
    url: localAvatar("boy-soft-selfie.webp"),
    ...generatedSource
  },
  {
    id: "boy-cartoon-night",
    title: "夜色卡通",
    vibe: "卡通男生 / 夜景 / 干净",
    url: localAvatar("boy-cartoon-night.webp"),
    ...generatedSource
  },
  {
    id: "boy-neon-blur",
    title: "霓虹男主",
    vibe: "蓝紫光 / 模糊 / 拽感",
    url: localAvatar("boy-neon-blur.webp"),
    ...generatedSource
  },
  {
    id: "boy-room-selfie",
    title: "宿舍男生",
    vibe: "非主流自拍 / 低像素 / 慵懒",
    url: localAvatar("boy-room-selfie.webp"),
    ...generatedSource
  },
  {
    id: "girl-sweater-soft",
    title: "毛衣女主",
    vibe: "柔焦自拍 / 清冷感 / 网图",
    url: localAvatar("girl-sweater-soft.webp"),
    ...generatedSource
  },
  {
    id: "boy-mono-blur",
    title: "灰调男主",
    vibe: "黑白模糊 / 破碎感 / 网感",
    url: localAvatar("boy-mono-blur.webp"),
    ...generatedSource
  },
  {
    id: "girl-cartoon-pink",
    title: "粉帽卡通",
    vibe: "可爱卡通 / 头像感 / 软萌",
    url: localAvatar("girl-cartoon-pink.webp"),
    ...generatedSource
  },
  {
    id: "girl-soft-flash",
    title: "闪光女主",
    vibe: "过曝自拍 / 软糊 / 网图",
    url: localAvatar("girl-soft-flash.webp"),
    ...generatedSource
  },
  {
    id: "abstract-neon-profile",
    title: "霓虹抽象",
    vibe: "抽象头像 / 彩色拖影 / 情绪图",
    url: localAvatar("abstract-neon-profile.webp"),
    ...generatedSource
  },
  {
    id: "girl-headphone-blur",
    title: "耳机女头",
    vibe: "灰调自拍 / wink / 头像感",
    url: localAvatar("girl-headphone-blur.webp"),
    ...generatedSource
  },
  {
    id: "abstract-dark-glasses",
    title: "抽象墨镜",
    vibe: "抽象图 / 模糊 / 搞怪",
    url: localAvatar("abstract-dark-glasses.webp"),
    ...generatedSource
  }
];

export function avatarById(id: string): DefaultAvatar | undefined {
  return defaultAvatars.find((avatar) => avatar.id === id);
}
