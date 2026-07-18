import { extractJson } from "../deepseekProject.js";
import { assignDistinctCharacterAvatars } from "../avatarLibrary.js";
import { resolveFirstViralPeerCharacters } from "../chatPeerName.js";
import { defaultChatSessionId, getChatSessions, projectForChatSession } from "../chatSessions.js";
import { isGenericImageCopy } from "../imageNarrative.js";
import { isJojoProject } from "../jojoProject.js";
import {
  describePhotoAssetCatalog,
  findJojoPhotoChoice,
  jojoPhotoCatalog,
  pickJojoPhotoAssetId,
  pickViralPhotoAssetId,
  viralPhotoCatalog
} from "../photoLibrary.js";
import { parseProject, type ChatMessage, type DramaProject, type ScriptGenerateRequest } from "../schema.js";
import {
  assignMessagesToMultiSessions,
  generationTargetSession,
  multiSessionGenerationInstruction,
  reconcileGeneratedMultiSessions
} from "../multiSession.js";
import {
  applyGeneratedJourneyIdentities,
  applyPromptJourneyRoster,
  canonicalJourneyRoleId,
  groupTitleForPrompt,
  isGroupChatPrompt,
  isGenericGroupTitle
} from "../storyIdentity.js";
import type { PromptCard } from "../linearStory.js";
import type {
  DeepSeekRequestBody,
  DeepSeekRequestInput,
  DeepSeekSegmentResult,
  GenerateDeepSeekSegmentInput
} from "./contract.js";
import { buildBoundedUserPrompt, generatedStoryDeltaInstruction } from "./context.js";
import { normalizeGeneratedStoryOutput } from "./response.js";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

const storyBeats = [
  "3句内进入冲突",
  "试探身份/关系",
  "对方异常熟悉",
  "账单备注/利益动作制造压迫",
  "照片/截图/语音等关键证据",
  "女主反咬或男主误判反转",
  "表情包缓冲情绪",
  "结尾留下二次反转钩子"
];

const staleMotifs: Array<[RegExp, string]> = [
  [/高中合照背面写着[“"']?别等我[”"']?/g, "照片里出现了当前剧情的关键细节"],
  [/旧照片背面写着[：:]?别等我/g, "照片里出现了当前剧情的关键细节"],
  [/这张照片背面写着[：:]?别等我/g, "这张照片里有当前剧情的关键线索"],
  [/转账截图备注是[“"']?甜柚[”"']?/g, "转账截图备注露出当前剧情的关键称呼"],
  [/旧照片第三排马尾女生/g, "照片里的人物细节和当前剧情有关"],
  [/操场后门那家甜柚/g, "只有两人知道的地点"],
  [/高中初恋/g, "旧关系"],
  [/像初恋/g, "像旧关系里的人"]
];

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

function hashText(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 31);
}

function cleanBaseUrl(value: string) {
  return (value || "https://api.deepseek.com").replace(/\/+$/, "");
}

function roleForSide(project: DramaProject, side: ChatMessage["side"]) {
  if (side === "center") return undefined;
  if (side === "right" && project.selfCharacterId) return project.selfCharacterId;
  return project.characters.find((character) => character.side === side)?.id;
}

function roleForGeneratedMessage(project: DramaProject, message: ChatMessage, index: number) {
  if (message.side === "center") return undefined;
  const requestedSenderId = message.senderId ?? message.roleId;
  const validRole = requestedSenderId && project.characters.some((character) => character.id === requestedSenderId) ? requestedSenderId : undefined;
  if (!isJojoProject(project)) return validRole || roleForSide(project, message.side);
  if (validRole) return validRole;
  const corpus = `${requestedSenderId || ""} ${message.text || ""} ${message.ttsText || ""}`;
  const playerRole = project.selfCharacterId
    ?? project.characters.find((character) => character.side === "right")?.id
    ?? "jiaojiao";
  if (/我先|我来|我已经|我/.test(corpus)) return playerRole;
  if (/叫叫|jiaojiao/.test(corpus)) return "jiaojiao";
  if (/NPC|npc|新同事|新领导|甲方|乙方|其他部门|外包|财务|法务|HR|园区|喵|兔|狐|熊|蛙|鹿|鹅/.test(corpus)) return "npc";
  if (/铃铛|lingdang|分析|冷静|排期|数据|拆/.test(corpus)) return "lingdang";
  if (/猪小弟|zhuxiaodi|垫|早餐|我给|靠谱|跟班/.test(corpus)) return "zhuxiaodi";
  if (/系统|xitong|提醒|已读|流程|通知/.test(corpus)) return "xitong";
  const sequence = project.characters.filter((character) => character.id !== "xitong").map((character) => character.id);
  return sequence[Math.abs(index) % sequence.length];
}

function normalizeJojoGeneratedMessage(message: ChatMessage): ChatMessage {
  if (message.type === "image" && !message.assetId && !message.imageUrl) {
    return { ...message, assetId: pickJojoPhotoAssetId(message.text) };
  }
  if (message.type === "meme" && !message.assetId && !message.imageUrl) {
    const corpus = `${message.roleId || ""} ${message.text} ${message.emotion}`;
    if (/铃铛|lingdang|分析|冷静/.test(corpus)) return { ...message, assetId: "jojo-meme-lingdang-chart" };
    if (/猪小弟|zhuxiaodi|垫|靠谱|点赞|支持/.test(corpus)) return { ...message, assetId: "jojo-meme-zhuxiaodi-like" };
    if (/系统|xitong|提醒|通知|已读/.test(corpus)) return { ...message, assetId: "jojo-meme-xitong-notice" };
    if (/沉默|尴尬|会议/.test(corpus)) return { ...message, assetId: "jojo-meme-meeting-silence" };
    if (/deadline|赶|冒汗|自嘲/.test(corpus)) return { ...message, assetId: "jojo-meme-jiaojiao-deadline" };
    return { ...message, assetId: "jojo-meme-jiaojiao-flag" };
  }
  return message;
}

function normalizeGeneratedImageMessage(project: DramaProject, message: ChatMessage): ChatMessage {
  if (message.type !== "image" || message.assetId || message.imageUrl) return message;
  return {
    ...message,
    assetId: isJojoProject(project) ? pickJojoPhotoAssetId(message.text) : pickViralPhotoAssetId(message.text)
  };
}

function demoteMediaMessage(message: ChatMessage): ChatMessage {
  const { amount, transferNote, assetId, imageUrl, ...rest } = message;
  void amount;
  void transferNote;
  void assetId;
  void imageUrl;
  return {
    ...rest,
    type: "text",
    sendSfx: "send"
  };
}

function transferContextAllowsCard(project: DramaProject, corpus: string) {
  const compact = corpus.replace(/\s+/g, "");
  if (isJojoProject(project)) {
    return /转账|转你|转一笔|付款|收款|报销|垫付|垫钱|费用|会议室费|早餐|咖啡|打车|车费|发票|账单|团建/.test(compact);
  }
  return /转账|转你|转一笔|红包|付款|收款|打钱|¥|￥|金额|钱|定金|账单|差额|订单|尾款|押金|赔|补偿|小费|房租|车费/.test(compact);
}

function reduceTransferFrequency(project: DramaProject, messages: ChatMessage[], premise: string) {
  let keptTransfers = 0;
  return messages.map((message, index) => {
    if (message.type !== "transfer") return message;
    const corpus = `${premise} ${message.text} ${message.ttsText || ""} ${message.transferNote || ""}`;
    const explicit = transferContextAllowsCard(project, corpus);
    const occasionalAllowance = hashText(`${premise}:${project.messages.length}:${index}`) % (isJojoProject(project) ? 5 : 4) === 0;
    if (keptTransfers < 1 && (explicit || occasionalAllowance)) {
      keptTransfers += 1;
      return message;
    }
    return demoteMediaMessage(message);
  });
}

function capJojoImageFrequency(project: DramaProject, messages: ChatMessage[]) {
  if (!isJojoProject(project)) return messages;
  let imageCount = 0;
  return messages.map((message) => {
    if (message.type !== "image") return message;
    imageCount += 1;
    return imageCount <= 2 ? message : demoteMediaMessage(message);
  });
}

function capMusicFrequency(project: DramaProject, messages: ChatMessage[]) {
  let keptMusic = project.messages.some((message) => message.type === "music") ? 1 : 0;
  return messages.map((message) => {
    if (message.type !== "music") return message;
    if (keptMusic === 0) {
      keptMusic += 1;
      return message;
    }
    return { ...message, type: "text" as const, sendSfx: "send" as const };
  });
}

function makeJojoPhotoMessage(premise: string, messages: ChatMessage[]): ChatMessage {
  const context = `${premise} ${messages.map((message) => message.text || message.ttsText || "").join(" ")}`;
  const assetId = pickJojoPhotoAssetId(context);
  const asset = findJojoPhotoChoice(assetId);
  const text = asset ? `${asset.title}：${asset.tags.slice(0, 3).join("、")}的公司局部照片` : "公司日常局部抓拍";
  return {
    id: makeId("msg"),
    roleId: "xitong",
    side: "left",
    type: "image",
    text,
    ttsText: `你看，${asset?.title || "公司日常局部抓拍"}。`,
    emotion: "现场记录",
    sendSfx: "image",
    pauseMs: 520,
    holdMs: 2400,
    assetId
  };
}

function ensureOccasionalJojoPhoto(project: DramaProject, messages: ChatMessage[], premise: string) {
  if (!isJojoProject(project) || messages.some((message) => message.type === "image")) return messages;
  const corpus = `${premise} ${messages.map((message) => message.text || "").join(" ")}`;
  const relevant = /照片|图片|截图|证据|现场|工位|会议|办公室|老板|需求|排期|周报|咖啡|电梯|通勤|地铁|迟到|雨天|工牌|走廊|加班|日程|客户|工位|打卡/.test(corpus);
  if (!relevant) return messages;
  const shouldAdd = hashText(`${corpus}:${project.messages.length}`) % 3 === 0;
  if (!shouldAdd) return messages;
  const next = [...messages];
  next.splice(Math.min(4, next.length), 0, makeJojoPhotoMessage(premise, messages));
  return next;
}

function tuneGeneratedMediaDensity(project: DramaProject, messages: ChatMessage[], premise: string) {
  return ensureOccasionalJojoPhoto(
    project,
    capMusicFrequency(project, capJojoImageFrequency(project, reduceTransferFrequency(project, messages, premise))),
    premise
  );
}

function mergeAssets(project: DramaProject, generated: DramaProject) {
  const seen = new Set(project.assets.map((asset) => asset.id));
  const next = [...project.assets];
  for (const asset of generated.assets) {
    if (seen.has(asset.id)) continue;
    seen.add(asset.id);
    next.push(asset);
  }
  return next;
}

function mergeGeneratedGroupCharacters(project: DramaProject, generated: DramaProject, premise: string) {
  const baseCharacters = resolveFirstViralPeerCharacters(project, generated, premise);
  if (isJojoProject(project)) return baseCharacters;
  if (project.chatMode !== "group" && !project.messages.length) {
    const generatedRoster = generated.characters.slice(0, 6);
    const roster = generatedRoster.length >= 2 ? generatedRoster : baseCharacters;
    const rightCharacter = roster.find((character) => character.side === "right") ?? roster[0];
    const normalizedRoster = roster.map((character) => ({
      ...character,
      side: character.id === rightCharacter.id ? "right" as const : "left" as const
    }));
    return applyGeneratedJourneyIdentities(normalizedRoster, generated.characters, premise);
  }
  return applyGeneratedJourneyIdentities(baseCharacters, generated.characters, premise);
}

function groupChatSession(project: DramaProject, characters: DramaProject["characters"]) {
  return [{
    id: defaultChatSessionId,
    title: groupTitleForPrompt(project.brief, project.title, characters.map((character) => character.name)),
    kind: "group" as const,
    participantIds: characters.map((character) => character.id)
  }];
}

function assignGeneratedMessageSessions(
  project: DramaProject,
  characters: DramaProject["characters"],
  chatSessions: DramaProject["chatSessions"],
  messages: ChatMessage[],
  standaloneGroupIntent: boolean
) {
  if (!isJojoProject(project) && !standaloneGroupIntent) {
    return assignMessagesToMultiSessions({ project, characters, chatSessions, messages });
  }
  const effectiveProject = { ...project, chatMode: standaloneGroupIntent ? "group" as const : project.chatMode, characters, chatSessions };
  const effectiveSessions = getChatSessions(effectiveProject);
  const validSessionIds = new Set(effectiveSessions.map((session) => session.id));
  const singleSessionId = effectiveSessions[0]?.id;
  let previousSessionId = singleSessionId;

  return messages.map((message) => {
    let sessionId = message.sessionId && validSessionIds.has(message.sessionId) ? message.sessionId : undefined;
    if (isJojoProject(project) || standaloneGroupIntent) sessionId = singleSessionId;
    const senderId = message.senderId ?? message.roleId;
    if (!sessionId && senderId) {
      const matches = effectiveSessions.filter((session) => session.participantIds.includes(senderId));
      if (matches.length === 1) sessionId = matches[0].id;
    }
    sessionId = sessionId || previousSessionId || singleSessionId;
    if (sessionId) previousSessionId = sessionId;
    return sessionId ? { ...message, sessionId } : message;
  });
}

function currentPromptUsesGroupSession(
  project: DramaProject,
  prompt: string,
  allowMultiSession = false,
  activeSessionId?: string
) {
  if (generationTargetSession(project, activeSessionId).kind === "group") return true;
  if (isJojoProject(project) || !isGroupChatPrompt(prompt)) return false;
  return allowMultiSession || (project.messages.length === 0 && project.chatSessions.length === 0);
}

function replacesWholeProjectWithGroup(project: DramaProject, prompt: string) {
  if (isJojoProject(project)) return true;
  if (project.chatMode === "group") return getChatSessions(project).length <= 1;
  return isGroupChatPrompt(prompt) && project.messages.length === 0 && project.chatSessions.length === 0;
}

function chatSessionGenerationInstruction(
  project: DramaProject,
  prompt = "",
  standaloneGroupIntent = replacesWholeProjectWithGroup(project, prompt),
  allowMultiSession = false,
  activeSessionId?: string
) {
  if (isJojoProject(project) || standaloneGroupIntent) {
    return [
      "这个项目只有一个群聊会话：禁止新建其他会话，禁止将群成员拆成私聊。",
      "chatSessions 最多输出当前这一个会话，kind=group；所有 newMessages 都必须使用同一个 sessionId。",
      "群名要根据人物关系和当前剧情起得像真实群聊、有记忆点；禁止使用“新群聊”“群聊”“多人群聊”“未命名群聊”“新建群聊”等默认名。续写时沿用已有创意群名，除非用户明确要求改名。"
    ].join("\n");
  }
  if (!allowMultiSession) {
    const targetSession = generationTargetSession(project, activeSessionId);
    return [
      "多会话测试版未开启：禁止新增、复制、拆分或替换 chatSession。",
      `本段只能推进当前会话 sessionId=${targetSession.id}（${targetSession.title}）；所有 newMessages 必须使用该 sessionId，不得写入其他会话。`,
      "topologyChanges.chatSessions 必须省略；不得创建仅用于新会话的联系人或群成员。沿用当前会话的参与者、姓名和 senderId。"
    ].join("\n");
  }
  return [
    multiSessionGenerationInstruction(),
    "chatSessions.kind 是每个会话的真实类型：可为 direct 或 group，同一个多会话项目允许两者混合；chatMode 只是旧数据兼容字段。",
    "direct 会话通常是玩家与一名联系人；group 会话可有多名左侧成员。每条 newMessage 使用 senderId（兼容旧 roleId），且 senderId 必须属于对应 sessionId。",
    ...(currentPromptUsesGroupSession(project, prompt, allowMultiSession, activeSessionId) ? [
      "当前 Prompt 要求在多会话项目中新建或推进一个 kind=group 会话。必须保留其他已有 direct/group 会话，禁止把整个项目替换成单一群聊。",
      "topologyChanges.chatSessions 如有输出，必须包含所有旧会话和当前群会话；项目级 title 不变，群名写在该 chatSession.title。"
    ] : [])
  ].join("\n");
}

function targetMessageRange(project: DramaProject) {
  return project.messages.length ? "本段新增 20-32 条 messages，最多不要超过 36 条。" : "第一段要一次性成片，生成 48-68 条 messages，绝对不要少于 44 条。";
}

function mediaRule(project: DramaProject) {
  if (isJojoProject(project)) {
    return `图片不是每段必须有；当当前 Prompt 涉及工位、会议、排期、通勤、迟到、咖啡、周报、老板、客户、雨天、工牌、日程等可视化日常时，本段可以自然插入 0-2 条 image，常见情况只用 1 条。图片必须按标签选择现有照片 assetId，不要反复只用会议桌和电梯口两张。可用办公室日常照片目录：${describePhotoAssetCatalog(jojoPhotoCatalog)}。表情消息优先指定现有 jojo-meme-* assetId。`;
  }
  const viralAssets = describePhotoAssetCatalog(viralPhotoCatalog);
  if (!project.messages.length) return `第一段可以按剧情需要插入 image/meme/transfer，但不要为了凑数机械插入；transfer 本段最多 1 条，只有付款纠纷或订单金额是核心冲突时才用。图片消息优先按标签指定这些 assetId：${viralAssets}。`;
  return `续写段如果当前 Prompt 涉及证据、截图、现场、情绪爆点，可以插入 image/meme；transfer 要明显降频，本段最多 1 条，只在付款、补偿、订单、押金、红包确实是剧情核心时出现。图片消息优先按标签指定这些 assetId：${viralAssets}。`;
}

function rightSideCharacter(project: DramaProject) {
  return project.characters.find((character) => character.id === project.selfCharacterId)
    ?? project.characters.find((character) => character.side === "right")
    ?? project.characters[0];
}

function leftSideCharacter(project: DramaProject) {
  return project.characters.find((character) => character.side === "left") || project.characters[1] || project.characters[0];
}

function viralPerspectiveInstruction(
  project: DramaProject,
  groupIntent = project.chatMode === "group",
  allowMultiSession = false,
  activeSessionId?: string
) {
  const rightCharacter = rightSideCharacter(project);
  const activeSession = generationTargetSession(project, activeSessionId);
  const leftCharacter = project.characters.find((character) => (
    character.side === "left" && activeSession.participantIds.includes(character.id)
  )) ?? leftSideCharacter(project);
  if (groupIntent) {
    const activeGroupSession = activeSession.kind === "group";
    const activeParticipantIds = new Set(activeSession.participantIds);
    const groupCharacters = activeGroupSession
      ? project.characters.filter((character) => activeParticipantIds.has(character.id))
      : project.characters;
    const leftCharacters = groupCharacters.filter((character) => character.side === "left");
    const roleList = groupCharacters.map((character) => `${character.name}(senderId=${character.id}, side=${character.side})`).join("、");
    if (!activeGroupSession) {
      return {
        rightLabel: rightCharacter.name,
        leftLabel: "其他群成员",
        rightCharacter,
        leftCharacter,
        tone: "群里每个人都要有明显不同的说话节奏；围观者可以追问、起哄、截图和补刀，但不能抢走主线。",
        sideRule: `当前 Prompt 明确要求微信多人群聊。右侧只保留一名玩家，Prompt 里的其他具名成员全部在左侧。`,
        roleRule: "characters 必须按当前 Prompt 收齐 3-6 名群成员，每人使用独立 id；恰好一名玩家 side=right，其余成员 side=left。每条非 system 新消息必须使用准确 senderId。"
      };
    }
    return {
      rightLabel: rightCharacter.name,
      leftLabel: "其他群成员",
      rightCharacter,
      leftCharacter,
      tone: "群里每个人都要有明显不同的说话节奏；围观者可以追问、起哄、截图和补刀，但不能抢走主线。",
      sideRule: `这是微信多人群聊。用户/玩家/我方扮演${rightCharacter.name}（senderId=${rightCharacter.id}），永远在右侧；${leftCharacters.map((character) => character.name).join("、")}永远在左侧。`,
      roleRule: `固定群成员只有这 ${groupCharacters.length} 人：${roleList}。每条非 system 新消息必须填写其中一个准确 senderId，禁止新增、删除、合并或改名。`
    };
  }
  const rightLabel = rightCharacter.id === "girl" ? "女主" : "男主";
  const leftLabel = leftCharacter.id === "girl" ? "女主" : "男主";
  const tone = rightCharacter.id === "girl"
    ? "女主可以嘴硬、克制、敏感但不被动；男主可以温柔、试探、藏着旧关系。"
    : "男主可以嘴硬、心虚、急；女主可以冷静、克制、带刺、藏秘密。";
  return {
    rightLabel,
    leftLabel,
    rightCharacter,
    leftCharacter,
    tone,
    sideRule: `用户/玩家/我方永远扮演${rightLabel}：${rightLabel} side=right，${leftLabel} side=left。哪怕你先写${leftLabel}开口，也不能把左右写反。`,
    roleRule: allowMultiSession
      ? `右侧玩家固定是${rightLabel}（senderId=${rightCharacter.id}）；左侧已有联系人是${leftLabel}（senderId=${leftCharacter.id}）。direct 多会话只能按剧情需要追加左侧联系人，不得替换或复制玩家，characters 总数 2-6 个；每条非 system 新消息必须使用准确 senderId。`
      : `右侧玩家固定是${rightLabel}（senderId=${rightCharacter.id}）；左侧联系人固定是${leftLabel}（senderId=${leftCharacter.id}）。单会话模式禁止追加联系人或为其他会话创建角色；每条非 system 新消息必须使用这两个 senderId 之一。`
  };
}

export function viralNamedCharacterStyleInstruction(project: DramaProject) {
  const fengge = project.characters.find((character) => character.name === "峰哥");
  if (!fengge) return "";
  return [
    `角色“峰哥”（senderId=${fengge.id}）是左侧聊天对象，不是玩家；续写时必须保持这一身份和位置。`,
    "峰哥的回答要像在解答世间万物：先迅速给出一个高确定性结论，再用“恰恰相反”式的反向翻转拆掉对方的预设，最后落到一句接地气的判断。",
    "表达节奏用短句断言与稍长的生活化比喻交替；可以自然使用“这是好事”“我跟你说”“说白了”“话又说回来”，但不要机械重复口头禅。",
    "他的典型观点必须进入回答：先看对方做了什么，不替任何人自我感动；不强行给小事上意义；人是矛盾的，也要为自己的选择负责；没有现场就保留判断；真正解决问题靠行动和执行。",
    "他不做温柔情感导师，也不只抖机灵；要从红包、已读不回、见面、工作和日常小事里提炼出一套看似能解释万物的民间逻辑，观点要具体，偶尔自我拆台。",
    "如果没有足够信息，就说得到现场看看，不能凭空把猜测说成事实；不要输出性别羞辱、群体贬损或极端社会理论。"
  ].join("\n");
}

function jojoPerspectiveInstruction(project: DramaProject) {
  const player = rightSideCharacter(project);
  const others = project.characters.filter((character) => character.id !== player.id).map((character) => character.name).join("、");
  return {
    player,
    others,
    sideRule: `这是钉钉手机版群聊风格：玩家扮演${player.name}，界面会把${player.name}渲染成右侧蓝色气泡；${others}在左侧白色气泡。`,
    messageRule: `每条非 system 新消息必须写 senderId。${player.name}消息 side=right，${others}消息 side=left。视觉左右由前端处理。`
  };
}

function jojoRoleListInstruction(project: DramaProject) {
  return project.characters.map((character) => {
    if (character.id === "jiaojiao") return "叫叫 senderId=jiaojiao，是勇敢爱冒险的小鸡吉祥物";
    if (character.id === "npc") return `${character.name} senderId=npc，是随机小动物 NPC，可作为新同事、新领导、其他部门、甲方、乙方、外包、财务、法务或园区运营等外来角色`;
    if (character.id === "lingdang") return "铃铛 senderId=lingdang，是高知女生，聪明冷静会来事";
    if (character.id === "zhuxiaodi") return "猪小弟 senderId=zhuxiaodi，憨厚踏实、家里条件好、正直";
    if (character.id === "xitong") return "系统 senderId=xitong，冷静无情地提醒流程";
    return `${character.name} senderId=${character.id}`;
  }).join("；");
}

function repairInstruction(
  project: DramaProject,
  attempt: number,
  prompt = "",
  allowMultiSession = false,
  activeSessionId?: string
) {
  const groupIntent = currentPromptUsesGroupSession(project, prompt, allowMultiSession, activeSessionId);
  const standaloneGroupIntent = replacesWholeProjectWithGroup(project, prompt);
  const viralInstruction = viralPerspectiveInstruction(project, groupIntent, allowMultiSession, activeSessionId);
  const hardTemplate = attempt > 1
    ? [
        "第二次返工，必须按这个密度写：3句内有动作，5句内出现可视化证据，8句内发生关系反转。",
        "证据可以是订单截图、门禁照片、定位截图、收款备注、现场照片，但必须来自当前 Prompt 的剧情，不要套用固定关系梗。",
        "重点：用当前剧情里的具体物件、地点、金额、备注、截图让观众自己意识到反转。"
      ]
    : [];

  return [
    "上一版作废，原因：开头太像普通闲聊，缺少短剧钩子。",
    "重新输出严格 JSON：第一条不得问候，不得问“聊什么”，不得写“声音好熟悉/声音像谁/同学很像/像一个人/大众脸/大众嗓/认错人”。",
    viralInstruction.sideRule,
    `${viralInstruction.leftLabel}永远在左边 side=left，${viralInstruction.rightLabel}永远在右边 side=right，绝对不要反过来。`,
    chatSessionGenerationInstruction(project, prompt, standaloneGroupIntent, allowMultiSession, activeSessionId),
    ...(groupIntent ? [standaloneGroupIntent
      ? "topologyChanges.title 必须是群名，不能使用某个群成员的人名；chatMode 必须是 group。"
      : allowMultiSession
        ? "当前群名写入 kind=group 的 chatSession.title；保留其他已有会话和项目级 title。"
        : "当前活动会话已是群聊；沿用现有群名、群成员和 sessionId，不得新建群或改写其他会话。"] : []),
    "第一屏必须直接出现当前 Prompt 里的具体事件：下单、金额/定金、现场照片、截图备注、只有两人知道的旧细节、误会被翻出。",
    "图片消息必须写清照片/截图里到底是什么，禁止只写“关键照片/证据/图片”。图片内容只能服务当前剧情，不要复用固定例子。",
    "每 2-3 条消息就要推进一次信息，不要原地追问。",
    ...hardTemplate
  ].join("\n");
}

function scrubStaleMotifs(value: string) {
  return staleMotifs.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function isLowQualitySegment(messages: ChatMessage[]) {
  const firstScreen = messages.slice(0, 8).map((message) => message.text || message.ttsText || "").join("\n");
  const hasEmptyImageCopy = messages.some((message) => message.type === "image" && isGenericImageCopy(message.text));
  return hasEmptyImageCopy || /你好|聊什么|声音好熟悉|声音.*像|同学.*像|像一个人|像初恋|大众脸|大众嗓|认错人了|你是谁呀|谁呀|不认识$|真的吗|怎么会这样|我不知道你在说什么/.test(firstScreen);
}

function removeDuplicateMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();
  return messages.filter((message, index) => {
    const signature = `${message.type}:${message.text || message.ttsText || ""}`;
    const previous = messages[index - 1];
    const duplicateAdjacent = previous && (previous.text || previous.ttsText) === (message.text || message.ttsText);
    if (duplicateAdjacent) return false;
    if (["image", "meme", "music", "transfer"].includes(message.type) && seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function systemPrompt(
  project: DramaProject,
  prompt = "",
  allowMultiSession = false,
  activeSessionId?: string
) {
  if (isJojoProject(project)) {
    const jojoInstruction = jojoPerspectiveInstruction(project);
    return [
      "你是叫叫公司日常群聊编剧，输出必须是严格 JSON，不要 markdown。",
      jojoInstruction.sideRule,
      "title 是群聊名称，要像同事背后蛐蛐用的小群名，4-10 个中文字，轻松、机灵、有梗，不要正式公司群名。示例：工位蛐蛐小队、早会避难所、需求受害者联盟、周报幸存者。",
      "只写叫叫公司里的日常吐槽、自嘲、会议、需求、排期、周报、老板、客户、工位、电梯口、咖啡、deadline 等职场小反转。",
      "喜剧密度要更高：多写办公室荒诞、同事吐槽、反差包袱、系统无情补刀；每 4-6 条至少有一个轻笑点，但不要变成段子合集。",
      `固定角色和 senderId：${jojoRoleListInstruction(project)}。当前用户自己是${jojoInstruction.player.name}。`,
      jojoInstruction.messageRule,
      targetMessageRange(project),
      mediaRule(project),
      "消息必须短，单条中文尽量 4-18 字；不要写小说旁白，不要写爱情误会，不要套网红短剧男女主。",
      "图片消息 text 必须描述真实办公室局部证据：手、电脑、咖啡、背影、走廊、电梯口、运动模糊。禁止真实正脸、卡通脸、吉祥物脸、全身角色、识别性人物。",
      "image 类型只用 text 一个字段描述图片内容，写清这张图里具体有什么；不要拆成 label/title/detail，也不要输出额外图片文案字段。",
      "可用图片 assetId 已在照片目录列出；优先按标签匹配当前剧情，偶尔用 1 张，最多 2 张。",
      "可用表情 assetId：jojo-meme-jiaojiao-flag、jojo-meme-lingdang-chart、jojo-meme-zhuxiaodi-like、jojo-meme-xitong-notice、jojo-meme-jiaojiao-deadline、jojo-meme-meeting-silence。",
      "transfer 很少出现：平均 3-5 段最多 1 段；本段最多 1 条；只有当前 Prompt 明确涉及会议室费、报销、垫付、早餐、车费、发票等公司费用时才用，否则用普通 text 推进。",
      "叫叫公司群聊不要生成 music 类型。",
      "每条消息都要带 emotion、sendSfx、pauseMs、holdMs，sendSfx 只能是 none/send/image/transfer/meme。",
      chatSessionGenerationInstruction(project, prompt, undefined, allowMultiSession, activeSessionId),
      generatedStoryDeltaInstruction(),
      "suggestedPrompt 只写 1-2 句下一步核心剧情，不要以“接着写”或“继续写”开头，不要重复角色或语言设定；没有自然建议就留空。",
      "当前 stylePreset 固定为 jojo-company-chat，不要在增量里重复 stylePreset、fps、canvas、sfx 或 audioMix。"
    ].join("\n");
  }
  const groupIntent = currentPromptUsesGroupSession(project, prompt, allowMultiSession, activeSessionId);
  const standaloneGroupIntent = replacesWholeProjectWithGroup(project, prompt);
  const viralInstruction = viralPerspectiveInstruction(project, groupIntent, allowMultiSession, activeSessionId);
  const englishStory = /\bLanguage:\s*English\b/i.test(project.brief);
  return [
    "你是爆款聊天记录短剧编剧，擅长写高密度微信聊天短剧。输出必须是严格 JSON，不要 markdown。",
    standaloneGroupIntent
      ? "当前故事是多人群聊：chatMode 必须是 group；title 必须像真实群名，使用 3-18 个字符，不能填某个成员的人名，也不能写成“某某和某某的聊天”。"
      : groupIntent
        ? allowMultiSession
          ? "当前段落在已有多会话故事中新建或推进一个 kind=group 会话；保留其他会话，群名写入 chatSession.title，不要改项目级 title。"
          : "当前活动会话是已有群聊；只续写该群聊，沿用现有群名、群成员和 sessionId。"
        : allowMultiSession
          ? "当前故事是私聊或多会话故事：以 chatSessions.kind 为准，每个 direct 会话的 title 使用对应联系人的名字。"
          : "当前故事使用单会话模式：只推进当前私聊，禁止创建第二个会话。",
    englishStory
      ? "This story is in English. Write every chat message, ttsText, transferNote, image description, character name, and suggestedPrompt in concise, natural conversational English. Do not insert Chinese dialogue."
      : "所有聊天内容使用自然中文。",
    "成片观感：横向聊天画布，大字号短消息，连续滚屏，像真实聊天局部放大。用户只看聊天，不看旁白，也必须看懂剧情。",
    project.messages.length ? "你正在续写同一条全局剧情时间线。只输出新段落，不要重复已有对话，不要混淆会话边界。" : "你正在写第一段。它要一次性生成到位，像能直接剪成短视频的完整开局。",
    `本段节拍：${storyBeats.join(" -> ")}。`,
    targetMessageRange(project),
    mediaRule(project),
    englishStory
      ? "Keep each English message short, usually 2-12 words and occasionally up to 18 words; never write novel-style narration."
      : "消息必须短，单条中文尽量 4-18 字；偶尔可到 24 字，但不能写小说旁白。",
    "每一句都要有信息量：试探、隐瞒、证据、反问、误会、旧称呼、金额、截图、沉默、钩子。不要写寒暄废话。",
    "网红版要更暧昧、更情绪化：多写拉扯、吃醋、克制、欲言又止、嘴硬心软、旧关系刺痛；情绪要递进，不要只靠大吵。",
    "当前新 Prompt 的明确修改优先级最高。用户如果更改名字、职业、性格、关系、性别、前史或世界设定，立即以新设定为准；默认用秘密、误会或身份揭露自然承接，不要反驳前后矛盾。只有用户明确说从头重写或重新开始时，才把修改视为硬重置。",
    englishStory ? "The international-student story should use natural campus English." : "使用自然、清楚的普通中文。",
    "第一条消息不得是问候，必须直接进入事件：下单、账单备注、现场照片、误会、旧称呼、截图、备注。",
    "如果 Prompt 里有陪聊/旧关系：第一屏必须出现下单、订单备注、只有两人知道的具体细节、现场照片或备注，不许从陌生人闲聊开始。",
    viralInstruction.sideRule,
    "transfer 是低频可选消息类型，本段最多 1 条，只在剧情确实把付款、补偿、订单、押金、红包作为核心冲突时出现；出现时必须给合理 amount 和 transferNote，不要默认 200。",
    "meme 是可选消息类型，只用于真实聊天里的表情反应；text 写情绪或表情名，如“流汗”“白眼”“偷笑”“委屈”，不要写固定口头禅。",
    groupIntent ? "群聊不要生成 music 类型。" : "music 是低频可选消息类型，只在两个人关系明显升温、暧昧确认或分享心情时出现，text 写分享歌曲时的自然语气。不要每段都发音乐，具体曲目由系统匹配。",
    "image 类型消息的 text 必须描述照片/截图的实际内容：主体是谁、在哪里、出现了什么关键物件/备注/动作。禁止只写“关键照片/证据/图片/截图”。",
    "image 类型只用 text 一个字段描述图片内容，写清这张图里具体有什么；不要拆成 label/title/detail，也不要输出额外图片文案字段。",
    "不要复用上一轮或示例里的固定图片梗、固定关系梗、固定备注梗；除非用户当前 Prompt 明确要求，否则完全按当前剧情生成新照片内容。",
    "禁止低质套话：不要写“你好”“想聊什么”“你声音好熟悉”“声音跟同学很像”“大众脸/大众嗓”“认错人”“真的吗”“你是谁呀”这类平铺直叙；要用具体细节和压迫感推动。",
    `${viralInstruction.leftLabel}永远在左边 side=left，${viralInstruction.rightLabel}永远在右边 side=right，绝对不要反过来。system 只用于时间/提示，少用。`,
    groupIntent ? viralInstruction.tone : `${viralInstruction.tone}两个人的语气要明显不同。`,
    viralNamedCharacterStyleInstruction(project),
    "每条消息都要带 emotion、sendSfx、pauseMs、holdMs，sendSfx 只能是 none/send/image/transfer/meme；music 使用 send。",
    viralInstruction.roleRule,
    chatSessionGenerationInstruction(project, prompt, standaloneGroupIntent, allowMultiSession, activeSessionId),
    groupIntent
      ? standaloneGroupIntent && project.chatMode === "group" && project.messages.length
        ? "沿用已经确定的人物姓名和群成员，不要在续写中擅自改名、删人或新增角色。"
        : standaloneGroupIntent
          ? "从当前 Prompt 提取所有具名群成员，characters 中必须完整列出；群名写入 topologyChanges.title，不要把任一成员姓名直接当作 title。"
          : allowMultiSession
            ? "从当前 Prompt 提取当前群会话所有具名成员，必要时在 topologyChanges 中输出变更后的完整 characters 与 chatSessions；保留所有旧会话。"
            : "沿用当前群会话已经确定的群成员、姓名与 senderId；禁止新增角色或会话。"
      : project.messages.length
        ? allowMultiSession
          ? "沿用已经确定的人物姓名与 senderId；仅当新会话是推进剧情所必需时，才可追加左侧新联系人。"
          : "沿用已经确定的人物姓名与 senderId；单会话模式禁止追加联系人或会话。"
      : `第一段必须在 characters 中确定左侧聊天对象（${viralInstruction.leftLabel}）的真实姓名：当前 Prompt 明确写了名字就原样采用；没有写名字就由你编一个自然的中文姓名。不要用“男主”“女主”“对方”等占位词。`,
    generatedStoryDeltaInstruction(),
    englishStory
      ? "For suggestedPrompt, write only the next core plot beat in 1-2 concise sentences. Do not prefix it with 'Continue' and do not repeat language or fixed character setup."
      : "suggestedPrompt 只写 1-2 句下一步核心剧情，不要以“接着写”或“继续写”开头，不要重复角色或语言设定；没有自然建议就留空。",
    "不要在增量里重复 id、brief、stylePreset、fps、canvas、sfx 或 audioMix。"
  ].join("\n");
}

function isUsableJojoGroupTitle(title: string | undefined) {
  const value = title?.replace(/\s+/g, "").trim();
  if (!value) return false;
  if (value.length < 4 || value.length > 10) return false;
  if (isGenericGroupTitle(value)) return false;
  if (/叫叫公司日常群|公司日常|DramaProject|DeepSeek|Prompt|JSON|剧情|短剧/.test(value)) return false;
  return true;
}

function nextProjectTitle(project: DramaProject, generated: DramaProject) {
  if (isJojoProject(project)) {
    if (project.messages.length && isUsableJojoGroupTitle(project.title)) return project.title;
    if (isUsableJojoGroupTitle(generated.title)) return generated.title;
    return groupTitleForPrompt(project.brief, project.title, project.characters.map((character) => character.name));
  }
  return project.messages.length ? project.title : generated.title;
}

function userPrompt(
  project: DramaProject,
  prompt: string,
  promptCards: PromptCard[],
  allowMultiSession = false,
  activeSessionId?: string
) {
  const promptProject = allowMultiSession
    ? project
    : projectForChatSession(project, generationTargetSession(project, activeSessionId).id);
  return buildBoundedUserPrompt({
    project: promptProject,
    prompt,
    promptCards,
    sanitize: scrubStaleMotifs
  });
}

/**
 * Pure request builder used by both browser and server transports. Exporting a
 * single entry point makes prompt changes reviewable and regression-testable.
 */
export function buildDeepSeekRequest({
  project,
  prompt,
  promptCards,
  model,
  allowMultiSession = false,
  activeSessionId,
  repairAttempt = 0
}: DeepSeekRequestInput): DeepSeekRequestBody {
  return {
    model,
    temperature: repairAttempt ? 0.94 : 0.86,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system", content: systemPrompt(project, prompt, allowMultiSession, activeSessionId) },
      { role: "user", content: userPrompt(project, prompt, promptCards, allowMultiSession, activeSessionId) },
      ...(repairAttempt ? [{
        role: "user" as const,
        content: repairInstruction(project, repairAttempt, prompt, allowMultiSession, activeSessionId)
      }] : [])
    ]
  };
}

export async function generateDeepSeekStorySegmentWithConfig({
  project,
  prompt,
  promptCards,
  config,
  allowMultiSession = false,
  activeSessionId,
  logLabel = "deepseek",
  signal
}: GenerateDeepSeekSegmentInput): Promise<DeepSeekSegmentResult> {
  const normalizedConfig = {
    apiKey: config.apiKey.trim(),
    baseUrl: cleanBaseUrl(config.baseUrl),
    model: config.model.trim() || DEFAULT_DEEPSEEK_MODEL,
    source: config.source,
    label: config.label
  };
  const premise = prompt.replace(/\s+/g, " ").trim();
  if (!premise) throw new Error("Prompt 为空");
  if (!normalizedConfig.apiKey) throw new Error("DeepSeek API key 未配置");
  const standaloneGroupIntent = replacesWholeProjectWithGroup(project, premise);

  const request: ScriptGenerateRequest = {
    brief: [...promptCards.map((card) => card.prompt), premise].join("\n"),
    durationSeconds: project.messages.length ? 90 : 180,
    styleNotes: project.messages.length ? "线性续写当前卡片，不要重复旧对话。" : "第一段一次性生成到位，冲突强，反转密。"
  };
  const url = `${normalizedConfig.baseUrl}/chat/completions`;
  async function fetchGeneratedProject(repairAttempt: number) {
    const requestId = makeId("fresh");
    console.info(`[${logLabel}] request`, {
      requestId,
      url,
      model: normalizedConfig.model,
      provider: normalizedConfig.label || normalizedConfig.source || "custom",
      prompt: premise,
      promptCards: promptCards.length,
      existingMessages: project.messages.length,
      repairAttempt,
      stateless: true
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${normalizedConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildDeepSeekRequest({
        project,
        prompt: premise,
        promptCards,
        model: normalizedConfig.model,
        allowMultiSession,
        activeSessionId,
        repairAttempt
      })),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000)
    });

    console.info(`[${logLabel}] response`, { ok: response.ok, status: response.status, repairAttempt });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`DeepSeek 请求失败：${response.status}${text ? ` ${text.slice(0, 120)}` : ""}`);
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek 响应没有 content");
    const extracted = extractJson(content);
    const normalized = normalizeGeneratedStoryOutput({
      value: extracted,
      project,
      request,
      allowMultiSession,
      activeSessionId
    });
    console.info(`[${logLabel}] normalized response`, {
      format: normalized.format,
      newMessages: normalized.project.messages.length,
      repairAttempt
    });
    return normalized;
  }

  let generated = await fetchGeneratedProject(0);
  for (let repairAttempt = 1; repairAttempt <= 2 && isLowQualitySegment(generated.project.messages); repairAttempt += 1) {
    console.warn(`[${logLabel}] low-quality opening; retrying with repair prompt`, { repairAttempt });
    generated = await fetchGeneratedProject(repairAttempt);
  }
  const identityCharacters = standaloneGroupIntent
    ? mergeGeneratedGroupCharacters(project, generated.project, premise)
    : resolveFirstViralPeerCharacters(project, generated.project, premise);
  const promptedCharacters = applyPromptJourneyRoster(identityCharacters, premise, standaloneGroupIntent);
  const multiSessionTopology = allowMultiSession && !isJojoProject(project) && !standaloneGroupIntent
    ? reconcileGeneratedMultiSessions({
        project,
        generatedProject: generated.project,
        baseCharacters: promptedCharacters
      })
    : undefined;
  const baseCharacters = multiSessionTopology?.characters
    ?? (!isJojoProject(project) && standaloneGroupIntent
      ? assignDistinctCharacterAvatars(promptedCharacters)
      : promptedCharacters);
  const nextTitle = !isJojoProject(project) && standaloneGroupIntent
    ? groupTitleForPrompt(
        premise,
        project.chatMode === "group" && project.messages.length ? project.title : generated.project.title,
        baseCharacters.map((character) => character.name)
      )
    : nextProjectTitle(project, generated.project);
  const chatSessions = multiSessionTopology?.chatSessions
    ?? (!isJojoProject(project) && standaloneGroupIntent
      ? groupChatSession({ ...project, title: nextTitle }, baseCharacters)
      : project.chatSessions);
  const cardId = makeId("prompt");
  const normalizedMessages = removeDuplicateMessages(generated.project.messages)
    .map((message, index) => {
      const currentSenderId = message.senderId ?? message.roleId;
      const journeyRoleId = canonicalJourneyRoleId(currentSenderId, generated.project.characters, premise);
      const identifiedMessage = journeyRoleId
        ? { ...message, senderId: journeyRoleId, roleId: journeyRoleId }
        : message;
      const senderId = roleForGeneratedMessage({ ...project, characters: baseCharacters }, identifiedMessage, index);
      return {
        ...identifiedMessage,
        id: makeId("msg"),
        senderId,
        roleId: senderId
      };
    })
    .map((message) => {
      const senderId = message.senderId ?? message.roleId;
      if (!senderId) return message;
      const character = baseCharacters.find((item) => item.id === senderId);
      return character ? { ...message, side: character.side } : message;
    })
    .map((message) => normalizeGeneratedImageMessage(project, message))
    .map((message) => isJojoProject(project) ? normalizeJojoGeneratedMessage(message) : message);
  const messages = assignGeneratedMessageSessions(
    project,
    baseCharacters,
    chatSessions,
    tuneGeneratedMediaDensity(project, normalizedMessages, premise),
    standaloneGroupIntent
  );
  const card: PromptCard = {
    id: cardId,
    prompt: premise,
    createdAt: new Date().toISOString(),
    messageIds: messages.map((message) => message.id),
    summary: `DeepSeek 追加 ${messages.length} 条消息，承接 ${project.messages.length} 条历史对话`
  };

  const nextProject = parseProject({
    ...project,
    title: nextTitle,
    brief: request.brief,
    chatMode: !isJojoProject(project) && standaloneGroupIntent ? "group" : project.chatMode,
    characters: baseCharacters,
    chatSessions,
    assets: mergeAssets(project, generated.project),
    messages: [...project.messages, ...messages],
    sfx: { ...project.sfx, ...generated.project.sfx },
    audioMix: { ...project.audioMix, ...generated.project.audioMix }
  });

  return {
    card,
    messages,
    project: nextProject,
    ...(generated.suggestedPrompt ? { suggestedPrompt: generated.suggestedPrompt } : {}),
    provider: {
      source: normalizedConfig.source,
      label: normalizedConfig.label,
      baseUrl: normalizedConfig.baseUrl,
      model: normalizedConfig.model
    }
  };
}
