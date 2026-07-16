import { avatarGenderForCharacter, randomizeViralCharacterAvatars, type DefaultAvatarGender } from "./avatarLibrary.js";
import type { DramaProject } from "./schema.js";

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

function replaceKnownNames(value: string | undefined, names: Record<DefaultAvatarGender, string>) {
  if (!value) return value;
  return value
    .replace(/阿泽/g, names.boy)
    .replace(/林夏/g, names.girl);
}

export function randomizeViralCharacterProfiles(project: DramaProject): DramaProject {
  const names: Record<DefaultAvatarGender, string> = {
    boy: rememberDistinct("ququ:last-viral-boy-name", boyNames, (item) => item),
    girl: rememberDistinct("ququ:last-viral-girl-name", girlNames, (item) => item)
  };
  const projectWithAvatars = randomizeViralCharacterAvatars(project);

  return {
    ...projectWithAvatars,
    characters: projectWithAvatars.characters.map((character) => {
      const gender = avatarGenderForCharacter(character);
      const name = names[gender];
      return {
        ...character,
        name,
        avatarInitial: initialsForName(name)
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
