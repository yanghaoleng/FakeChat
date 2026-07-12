import { avatarGenderForCharacter, randomizeViralCharacterAvatars, type DefaultAvatarGender } from "./avatarLibrary.js";
import type { ChatMessage, DramaProject } from "./schema.js";

type ViralRegion = {
  id: string;
  label: string;
  terms: string[];
  prefix: string;
  suffix: string;
  intensifier: string;
  aside: string;
};

const boyNames = [
  "张伟",
  "王磊",
  "李浩",
  "刘洋",
  "陈宇",
  "赵鹏",
  "周杰",
  "吴昊",
  "孙浩",
  "郑凯",
  "许航",
  "唐泽",
  "宋扬",
  "徐宁",
  "高远",
  "梁越",
  "何川",
  "马超"
];

const girlNames = [
  "李娜",
  "王欣",
  "张敏",
  "刘佳",
  "陈雪",
  "赵婷",
  "周雨",
  "吴静",
  "孙悦",
  "郑琳",
  "林夏",
  "许晴",
  "唐佳",
  "宋瑶",
  "何雨",
  "梁甜",
  "高洁",
  "程露"
];

const viralRegions: ViralRegion[] = [
  {
    id: "chengdu",
    label: "成都",
    terms: ["莫慌", "要得", "晓得", "巴适"],
    prefix: "莫慌",
    suffix: "嘛",
    intensifier: "蛮",
    aside: "要得，我晓得了"
  },
  {
    id: "wuhan",
    label: "武汉",
    terms: ["蛮", "搞么事", "莫急", "晓得"],
    prefix: "莫急",
    suffix: "撒",
    intensifier: "蛮",
    aside: "你这是搞么事"
  },
  {
    id: "guangzhou",
    label: "广州",
    terms: ["唔该", "冇事", "几好", "饮茶"],
    prefix: "唔该",
    suffix: "啦",
    intensifier: "几",
    aside: "先讲清楚啦"
  },
  {
    id: "hangzhou",
    label: "杭州",
    terms: ["蛮灵", "拎得清", "先别急", "有点意思"],
    prefix: "先别急",
    suffix: "呀",
    intensifier: "蛮",
    aside: "这事还蛮灵的"
  },
  {
    id: "changsha",
    label: "长沙",
    terms: ["莫急", "蛮会", "搞不赢", "咯"],
    prefix: "莫急",
    suffix: "咯",
    intensifier: "蛮",
    aside: "你这下蛮会讲"
  },
  {
    id: "nanjing",
    label: "南京",
    terms: ["你先等下", "蛮有意思", "怪不得", "哎"],
    prefix: "你先等下",
    suffix: "哎",
    intensifier: "蛮",
    aside: "怪不得呢"
  }
];

const regionMarker = "地域口吻：";
const regionBriefMarker = "地域设定：";
const regionPromptMarker = "地域：";

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function rememberDistinct<T>(storageKey: string, items: T[], valueKey: (item: T) => string): T {
  if (typeof window === "undefined") return randomItem(items);

  try {
    const previous = window.localStorage.getItem(storageKey);
    const pool = items.filter((item) => valueKey(item) !== previous);
    const selected = randomItem(pool.length ? pool : items);
    window.localStorage.setItem(storageKey, valueKey(selected));
    return selected;
  } catch {
    return randomItem(items);
  }
}

function initialsForName(name: string) {
  const compact = [...name.replace(/\s+/g, "")];
  return compact.slice(Math.max(0, compact.length - 2)).join("") || name.slice(0, 2);
}

function stripRegionalMarker(value: string) {
  return value
    .replace(new RegExp(`\\s*${regionMarker}[^。\\n]*。?`, "g"), "")
    .replace(new RegExp(`\\s*${regionBriefMarker}[^。\\n]*。?`, "g"), "")
    .replace(new RegExp(`\\s*${regionPromptMarker}(?:男主来自|故事发生在)[^。\\n]*。?`, "g"), "")
    .trim();
}

function withRegionalVoice(description: string, region: ViralRegion) {
  const clean = stripRegionalMarker(description);
  return `${clean} ${regionMarker}${region.label}日常口吻，偶尔自然带${region.terms.slice(0, 3).join("、")}这类词，不要硬凹方言。`;
}

function replaceKnownNames(value: string | undefined, names: Record<DefaultAvatarGender, string>) {
  if (!value) return value;
  return value
    .replace(/阿泽/g, names.boy)
    .replace(/林夏/g, names.girl);
}

function regionalBrief(brief: string, region: ViralRegion) {
  const clean = stripRegionalMarker(brief);
  return `${clean}\n${regionBriefMarker}故事发生在${region.label}，男女主都可自然带${region.terms.slice(0, 3).join("、")}。`;
}

export function viralRegionFromProject(project: DramaProject): ViralRegion {
  const corpus = [
    project.brief,
    ...project.characters.map((character) => character.voiceDescription)
  ].join("\n");
  return viralRegions.find((region) => (
    corpus.includes(`${regionMarker}${region.label}`)
    || corpus.includes(`故事发生在${region.label}`)
    || corpus.includes(`男主来自${region.label}`)
    || corpus.includes(`女主来自${region.label}`)
  )) || viralRegions[0];
}

export function viralRegionalInstruction(project: DramaProject) {
  const region = viralRegionFromProject(project);
  return [
    `故事发生在${region.label}，男女主共用同一套地域口吻，可偶尔自然使用：${region.terms.join("、")}。`,
    "频率要克制，约每 4-6 条消息点一下即可，不要整句硬写方言。"
  ].join("");
}

export function withViralRegionalPrompt(prompt: string, project: DramaProject) {
  if (prompt.includes(`${regionPromptMarker}故事发生在`)) return prompt;
  const region = viralRegionFromProject(project);
  const clean = stripRegionalMarker(prompt);
  return `${clean} ${regionPromptMarker}故事发生在${region.label}，男女主都可带“${region.terms.slice(0, 3).join("、")}”。`;
}

function hasRegionalTerm(text: string, region: ViralRegion) {
  return region.terms.some((term) => text.includes(term)) || text.includes(region.prefix) || text.includes(region.aside);
}

function regionalizeLine(text: string, region: ViralRegion, index: number) {
  if (!text || hasRegionalTerm(text, region)) return text;
  if (/照片|截图|局部|报告|体测|导航|订单|电脑屏幕/.test(text)) return text;

  const questionLike = /[吗么呢?？]$/.test(text);
  const mode = index % 4;
  if (questionLike) return `${region.prefix}，${text}`;
  if (mode === 0) return `${region.prefix}，${text}`;
  if (mode === 1 && !/[嘛呀啦咯撒哎]$/.test(text)) return `${text}${region.suffix}`;
  if (mode === 2) {
    const next = text.replace(/挺|很|太/, region.intensifier);
    return next === text ? `${text}，${region.aside}` : next;
  }
  return `${text}，${region.aside}`;
}

export function applyViralRegionalFlavorToMessages(messages: ChatMessage[], project: DramaProject): ChatMessage[] {
  const region = viralRegionFromProject(project);
  let textCount = 0;
  let flavoredCount = 0;
  return messages.map((message) => {
    if (message.type !== "text") return message;
    const textIndex = textCount;
    textCount += 1;
    if ((textIndex + region.id.length) % 4 !== 0) return message;
    const regionalIndex = flavoredCount;
    flavoredCount += 1;
    return {
      ...message,
      text: regionalizeLine(message.text, region, regionalIndex),
      ttsText: message.ttsText ? regionalizeLine(message.ttsText, region, regionalIndex) : message.ttsText
    };
  });
}

export function randomizeViralCharacterProfiles(project: DramaProject): DramaProject {
  const region = rememberDistinct("ququ:last-viral-region", viralRegions, (item) => item.id);
  const names: Record<DefaultAvatarGender, string> = {
    boy: rememberDistinct("ququ:last-viral-boy-name", boyNames, (item) => item),
    girl: rememberDistinct("ququ:last-viral-girl-name", girlNames, (item) => item)
  };
  const projectWithAvatars = randomizeViralCharacterAvatars(project);

  return {
    ...projectWithAvatars,
    brief: regionalBrief(projectWithAvatars.brief, region),
    characters: projectWithAvatars.characters.map((character) => {
      const gender = avatarGenderForCharacter(character);
      const name = names[gender];
      return {
        ...character,
        name,
        avatarInitial: initialsForName(name),
        voiceDescription: withRegionalVoice(character.voiceDescription, region)
      };
    }),
    messages: projectWithAvatars.messages.map((message) => ({
      ...message,
      text: replaceKnownNames(message.text, names) || "",
      ttsText: replaceKnownNames(message.ttsText, names),
      transferNote: replaceKnownNames(message.transferNote, names)
    }))
  };
}
