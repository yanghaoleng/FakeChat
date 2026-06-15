import type { MemeAsset } from "./schema";

export type PhotoChoice = {
  id: string;
  title: string;
  tags: string[];
};

const generatedPhotoLicense = "本地生成的模糊氛围照片资产，无可识别正脸，公开商用前建议人工复核。";

export const viralPhotoAssets: MemeAsset[] = [
  {
    id: "viral-photo-cafe-table",
    kind: "image",
    title: "昏暗咖啡桌空镜",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/cafe-table-blur.png",
    tags: ["咖啡", "桌面", "空镜", "约会", "等待", "夜晚", "餐厅"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-takeout-food",
    kind: "image",
    title: "夜宵外卖模糊照",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/takeout-food-blur.png",
    tags: ["食物", "外卖", "夜宵", "餐盒", "吃饭", "日常"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-hand-phone",
    kind: "image",
    title: "手边手机亮屏",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/hand-phone-blur.png",
    tags: ["手", "手机", "截图", "聊天", "屏幕", "证据", "局部"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-mirror-selfie-hidden",
    kind: "image",
    title: "看不清脸的镜前自拍",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/mirror-selfie-hidden.png",
    tags: ["自拍", "镜子", "背影", "氛围", "看不清", "房间", "身影"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-rainy-car-window",
    kind: "image",
    title: "雨夜车窗光斑",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/rainy-car-window.png",
    tags: ["车", "雨", "窗", "夜晚", "定位", "路上", "光斑"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-bedside-props",
    kind: "image",
    title: "床头道具氛围照",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/bedside-props-blur.png",
    tags: ["床头", "道具", "房间", "项链", "钥匙", "夜晚", "私人物品"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-elevator-hand",
    kind: "image",
    title: "电梯按钮手部局部",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/elevator-hand-blur.png",
    tags: ["电梯", "手", "门口", "楼下", "小区", "酒店", "局部"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-night-street",
    kind: "image",
    title: "夜晚街道路灯空镜",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/night-street-blur.png",
    tags: ["街道", "路灯", "夜晚", "定位", "路上", "空镜", "等人"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-cup-lipstick",
    kind: "image",
    title: "杯沿口红印局部",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/cup-lipstick-blur.png",
    tags: ["杯子", "口红", "餐厅", "暧昧", "证据", "桌面", "局部"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-door-card",
    kind: "image",
    title: "门边房卡道具照",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/door-card-blur.png",
    tags: ["门", "房卡", "钥匙", "酒店", "门口", "道具", "误会"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-shoes-door",
    kind: "image",
    title: "门口鞋子和包",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/shoes-door-blur.png",
    tags: ["鞋", "包", "门口", "回家", "生活", "同居", "玄关"],
    riskLevel: "safe"
  },
  {
    id: "viral-photo-phone-chat",
    kind: "image",
    title: "模糊聊天屏幕",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/viral-assets/photos/phone-chat-blur.png",
    tags: ["手机", "聊天", "截图", "账单", "备注", "屏幕", "证据"],
    riskLevel: "safe"
  }
];

export const jojoPhotoAssets: MemeAsset[] = [
  {
    id: "jojo-photo-desk-morning",
    kind: "image",
    title: "早晨工位桌面抓拍",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/desk-morning-blur.png",
    tags: ["工位", "桌面", "办公室", "早晨", "电脑", "日常", "打卡", "待办", "键盘", "开工"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-subway-commute",
    kind: "image",
    title: "通勤地铁车厢虚焦",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/subway-commute-blur.png",
    tags: ["通勤", "地铁", "路上", "迟到", "早高峰", "背影", "赶路", "人群", "站台", "上班"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-keyboard-coffee",
    kind: "image",
    title: "键盘旁冷掉咖啡",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/keyboard-coffee-blur.png",
    tags: ["键盘", "咖啡", "冷咖啡", "加班", "电脑", "工位", "deadline", "改稿", "代码", "疲惫"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-elevator-panel",
    kind: "image",
    title: "电梯按钮手部局部",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/elevator-panel-blur.png",
    tags: ["电梯", "按钮", "迟到", "门口", "手", "通勤", "楼层", "赶路", "上班", "打卡"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-badge-lanyard",
    kind: "image",
    title: "工牌挂绳局部",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/badge-lanyard-blur.png",
    tags: ["工牌", "挂绳", "入职", "公司", "流程", "工位", "身份", "门禁", "考勤", "行政"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-office-corridor",
    kind: "image",
    title: "办公室走廊背影",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/office-corridor-blur.png",
    tags: ["走廊", "背影", "办公室", "会议室", "客户", "路上", "加班", "路过", "工区", "门口"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-laptop-calendar",
    kind: "image",
    title: "电脑日程表虚焦",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/laptop-calendar-blur.png",
    tags: ["电脑", "日程", "日历", "排期", "会议", "周报", "需求", "待办", "评审", "deadline"],
    riskLevel: "safe"
  },
  {
    id: "jojo-photo-rainy-office-window",
    kind: "image",
    title: "雨天办公室窗边",
    sourceName: "AI-generated local bitmap",
    sourceUrl: "",
    licenseNote: generatedPhotoLicense,
    localPath: "/jojo-assets/photos/rainy-office-window.png",
    tags: ["雨天", "窗边", "办公室", "加班", "下班", "氛围", "情绪", "晚高峰", "灯光", "工位"],
    riskLevel: "safe"
  }
];

export const viralPhotoCatalog: PhotoChoice[] = viralPhotoAssets.map((asset) => ({ id: asset.id, title: asset.title, tags: asset.tags }));

export const jojoPhotoCatalog: PhotoChoice[] = [
  { id: "jojo-photo-meeting-blur", title: "会议桌局部抓拍", tags: ["会议", "会议室", "桌面", "电脑", "咖啡", "手", "办公室", "评审", "老板", "需求"] },
  { id: "jojo-photo-corridor-blur", title: "电梯口背影抓拍", tags: ["电梯", "走廊", "背影", "迟到", "门口", "路上", "通勤", "赶路", "打卡", "运动模糊"] },
  ...jojoPhotoAssets.map((asset) => ({ id: asset.id, title: asset.title, tags: asset.tags }))
];

function hashText(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 29);
}

function pickPhotoAssetId(candidates: PhotoChoice[], text: string) {
  const corpus = text.replace(/\s+/g, "");
  let best = candidates[hashText(corpus) % candidates.length];
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = candidate.tags.reduce((total, tag) => total + (corpus.includes(tag) ? 3 : 0), 0) + (corpus.includes(candidate.title) ? 4 : 0);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best.id;
}

export function pickViralPhotoAssetId(text: string) {
  return pickPhotoAssetId(viralPhotoCatalog, text);
}

export function pickJojoPhotoAssetId(text: string) {
  return pickPhotoAssetId(jojoPhotoCatalog, text);
}

export function describePhotoAssetIds(assets: MemeAsset[]) {
  return assets.map((asset) => `${asset.id}=${asset.title}`).join("；");
}

export function describePhotoAssetCatalog(catalog: PhotoChoice[]) {
  return catalog.map((asset) => `${asset.id}=${asset.title}（标签：${asset.tags.join("、")}）`).join("；");
}

export function findJojoPhotoChoice(id: string) {
  return jojoPhotoCatalog.find((asset) => asset.id === id);
}
