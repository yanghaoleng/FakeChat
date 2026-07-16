import { avatarById, type DefaultAvatarGender } from "./avatarLibrary.js";
import type { Character } from "./schema.js";

type JourneyProfile = {
  id: string;
  canonicalName: string;
  aliases: string[];
  avatarId: string;
  avatarGender: DefaultAvatarGender;
};

const journeyProfiles: JourneyProfile[] = [
  {
    id: "tang",
    canonicalName: "唐玄奘",
    aliases: ["唐玄奘", "唐僧", "玄奘", "唐三藏"],
    avatarId: "journey-1986-tang",
    avatarGender: "boy"
  },
  {
    id: "queen",
    canonicalName: "女儿国国王",
    aliases: ["女儿国国王", "女儿国王"],
    avatarId: "journey-1986-queen",
    avatarGender: "girl"
  },
  {
    id: "wukong",
    canonicalName: "孙悟空",
    aliases: ["孙悟空", "悟空", "齐天大圣", "猴哥"],
    avatarId: "journey-1986-wukong",
    avatarGender: "boy"
  },
  {
    id: "baigujing",
    canonicalName: "白骨精",
    aliases: ["白骨精"],
    avatarId: "journey-1986-baigujing",
    avatarGender: "girl"
  },
  {
    id: "shaseng",
    canonicalName: "沙僧",
    aliases: ["沙僧", "沙和尚", "沙悟净"],
    avatarId: "journey-1986-shaseng",
    avatarGender: "boy"
  },
  {
    id: "bajie",
    canonicalName: "猪八戒",
    aliases: ["猪八戒", "八戒", "猪悟能"],
    avatarId: "journey-1986-bajie",
    avatarGender: "boy"
  }
];

const genericGroupTitlePattern = /^(?:新建?|默认|未命名|临时)?(?:群聊|微信群|多人群聊|多人聊天|聊天群|讨论群|群组|群)$/;

function compact(value: string) {
  return value.replace(/[\s·_\-—]+/g, "").toLowerCase();
}

export function isGroupChatPrompt(prompt: string) {
  const value = prompt.replace(/\s+/g, "");
  return /群聊|微信群|多人聊天|多人对话|群成员|群主|群名|大群|小群|工作群|项目群|家族群|同学群|好友群|粉丝群/.test(value)
    || /(?:建|创建|新建|拉|加|进|退|加入|邀请).{0,8}群/.test(value)
    || /群里|群中|群内/.test(value);
}

export function isUsableGroupTitle(title: string | undefined, characterNames: string[] = []) {
  const value = title?.replace(/\s+/g, "").trim();
  if (!value || value.length < 3 || value.length > 18) return false;
  if (characterNames.some((name) => value === name.trim())) return false;
  if (/^(?:男主|女主|聊天对象|联系人)$/.test(value)) return false;
  if (/^(?:线性聊天短剧|聊天短剧|新故事|未命名故事|DramaProject)$/.test(value)) return false;
  if (genericGroupTitlePattern.test(value)) return false;
  if (/^.{1,8}(?:和|与).{1,8}的聊天$/.test(value)) return false;
  return true;
}

export function isGenericGroupTitle(title: string | undefined) {
  const value = title?.replace(/\s+/g, "").trim();
  return !value || genericGroupTitlePattern.test(value);
}

function explicitGroupTitle(prompt: string) {
  const quoted = prompt.match(/[“"「『]([^”"」』]{2,18}(?:群|小组|项目组|工作组|办公室|一家人|联盟|后援会|俱乐部|联络处|委员会|大队|聊天局))[”"」』]/)?.[1];
  if (quoted) return quoted;
  return prompt.match(/(?:群名(?:叫|是|为)|叫作|命名为)[：:]?([^，。；;]{2,18})/)?.[1]?.trim();
}

export function groupTitleForPrompt(prompt: string, generatedTitle?: string, characterNames: string[] = []) {
  const explicit = explicitGroupTitle(prompt);
  if (isUsableGroupTitle(explicit, characterNames)) return explicit!;
  if (isUsableGroupTitle(generatedTitle, characterNames)) return generatedTitle!.trim();
  if (/西游|取经|唐僧|唐玄奘|孙悟空|悟空|白骨精|猪八戒|八戒|沙僧|女儿国/.test(prompt)) return "取经项目总群";
  if (/GTA|Grand\s*Theft\s*Auto|洛圣都|罪恶都市|自由城|Vice\s*City/i.test(prompt)) return "洛圣都候场室";
  if (/水浒|武松|潘金莲|梁山|阳谷县/.test(prompt)) return "阳谷县吃瓜局";
  if (/合同|付款|账单|律师|证据/.test(prompt)) return "证据链补完小组";
  if (/家人|家庭|亲戚/.test(prompt)) return "相亲相爱一家人";
  if (/同学|校友|毕业/.test(prompt)) return "老同学联络处";
  if (/同事|工作|项目|甲方|乙方|公司/.test(prompt)) return "项目推进小组";
  if (/朋友|好友|闺蜜|兄弟/.test(prompt)) return "朋友闲聊小组";
  return "今晚不许潜水";
}

export function journeyProfilesInText(value: string) {
  const source = compact(value);
  const matches = journeyProfiles
    .map((profile) => ({
      profile,
      index: Math.min(...profile.aliases
        .map((alias) => source.indexOf(compact(alias)))
        .filter((index) => index >= 0))
    }))
    .filter((match) => Number.isFinite(match.index));
  if (/女王/.test(value) && /西游|女儿国|唐僧|唐玄奘|御弟/.test(value) && !matches.some((match) => match.profile.id === "queen")) {
    matches.push({ profile: journeyProfiles.find((profile) => profile.id === "queen")!, index: value.indexOf("女王") });
  }
  return matches.sort((left, right) => left.index - right.index).map((match) => match.profile);
}

function journeyProfileForCharacter(character: Character, context: string) {
  const source = compact(`${character.id}${character.name}`);
  const direct = journeyProfiles.find((profile) => (
    source.includes(compact(profile.id))
    || profile.aliases.some((alias) => source.includes(compact(alias)))
  ));
  if (direct) return direct;
  if (character.name === "女王" && /西游|女儿国|唐僧|唐玄奘|御弟/.test(context)) {
    return journeyProfiles.find((profile) => profile.id === "queen");
  }
  return undefined;
}

export function canonicalJourneyRoleId(
  roleId: string | undefined,
  generatedCharacters: Character[],
  context: string
) {
  if (!roleId) return undefined;
  const generatedCharacter = generatedCharacters.find((character) => character.id === roleId);
  const generatedProfile = generatedCharacter ? journeyProfileForCharacter(generatedCharacter, context) : undefined;
  if (generatedProfile) return generatedProfile.id;
  const source = compact(roleId);
  return journeyProfiles.find((profile) => (
    source === compact(profile.id)
    || profile.aliases.some((alias) => source.includes(compact(alias)))
  ))?.id;
}

export function applyJourneyCharacterAvatars(characters: Character[], context: string) {
  return characters.map((character) => {
    const profile = journeyProfileForCharacter(character, context);
    const avatar = profile ? avatarById(profile.avatarId) : undefined;
    if (!profile || !avatar) return character;
    return {
      ...character,
      avatarGender: profile.avatarGender,
      avatarUrl: avatar.url,
      avatarInitial: [...character.name].slice(-2).join(""),
      voicePreset: profile.avatarGender === "girl" ? "young_real_female" as const : "young_male" as const
    };
  });
}

export function applyGeneratedJourneyIdentities(
  characters: Character[],
  generatedCharacters: Character[],
  context: string
) {
  const next = characters.map((character) => {
    const generated = generatedCharacters.find((item) => item.id === character.id)
      ?? generatedCharacters.find((item) => item.side === character.side && journeyProfileForCharacter(item, context));
    if (!generated || !journeyProfileForCharacter(generated, context)) return character;
    return { ...character, name: generated.name, avatarInitial: [...generated.name].slice(-2).join("") };
  });
  return applyJourneyCharacterAvatars(next, context);
}

export function applyPromptJourneyRoster(characters: Character[], context: string, groupIntent: boolean) {
  const profiles = journeyProfilesInText(context);
  if (!profiles.length) return applyJourneyCharacterAvatars(characters, context);
  if (profiles.length < 2) return applyJourneyCharacterAvatars(characters, context);

  const rightTemplate = characters.find((character) => character.side === "right") ?? characters[0];
  const leftTemplate = characters.find((character) => character.side === "left") ?? characters[1] ?? characters[0];
  const roster = profiles.slice(0, groupIntent ? 6 : 2).map((profile, index) => ({
    ...(index === 0 ? rightTemplate : leftTemplate),
    id: profile.id,
    name: profile.canonicalName,
    side: index === 0 ? "right" as const : "left" as const,
    avatarGender: profile.avatarGender,
    avatarInitial: [...profile.canonicalName].slice(-2).join(""),
    voiceId: `viral-${profile.id}`,
    voicePreset: profile.avatarGender === "girl" ? "young_real_female" as const : "young_male" as const
  }));
  return applyJourneyCharacterAvatars(roster, context);
}
