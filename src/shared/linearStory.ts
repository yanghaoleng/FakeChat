import { sampleProject } from "./sampleProject.js";
import { imageHintFromContext } from "./imageNarrative.js";
import { normalizeMemeMessage } from "./memeLibrary.js";
import { injectRomanticMusicMessage } from "./musicLibrary.js";
import { isJojoProject, jojoCompanyAssets, jojoProject } from "./jojoProject.js";
import { randomJojoNpcProfile } from "./jojoNpcProfiles.js";
import { pickJojoPhotoAssetId, pickViralPhotoAssetId } from "./photoLibrary.js";
import { parseProject, type ChatMessage, type DramaProject } from "./schema.js";
import { normalizeSuggestedPrompt } from "./suggestedPrompt.js";
import { applyPromptJourneyRoster, groupTitleForPrompt, isGroupChatPrompt } from "./storyIdentity.js";
import { attachStorySegment, parseStorySegment, type StorySegment } from "./storySegments.js";
import { randomizeViralCharacterProfiles } from "./viralPersona.js";

export type PromptCard = {
  id: string;
  prompt: string;
  createdAt: string;
  messageIds: string[];
  summary: string;
  suggestedPrompt?: string;
  segment?: StorySegment;
};

export type StoryArchive = {
  version: 2;
  exportedAt: string;
  promptCards: PromptCard[];
  project: DramaProject;
};

const beatTemplates = [
  ["先等等", "这句备注不对", "我只是转发错了", "那你怎么知道这个金额"],
  ["你别装没看见", "我没有装", "那张截图还在吗", "在，但我不想发"],
  ["你先别急", "你每次都这样转移话题", "那你告诉我真相", "真相可能更难听"],
  ["你看这张图", "这不是你公司楼下吗", "你终于注意到了", "我一直在等你问"],
  ["我就问一句", "你到底是谁", "我是来替她问你的", "她还在等一个解释"],
  ["张阿姨没说是你", "小学那件事你还记得吗", "你铅笔盒里写过我名", "这场相亲是我先点头"]
];

const jojoBeatTemplates = [
  ["这个需求谁提的", "老板说很简单", "简单到写进周报了", "那就不简单了"],
  ["早会先别开", "我昨晚梦见排期", "梦见不算加班", "但是算精神损耗"],
  ["谁动了我的工位鸡", "是品牌资产巡检", "听起来更可怕了", "它现在比我有编制"],
  ["客户说要年轻化", "叫叫已经很年轻", "他说要更会来事", "那得让铃铛上"],
  ["今天谁背锅", "先按流程自查", "流程查完是叫叫", "系统你太诚实了"]
];

export type StoryPackage = "viral" | "jojo";

const seededPick = <T>(items: T[], seed: number) => items[Math.abs(seed) % items.length];

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

function randomizeCharacterAvatars(project: DramaProject): DramaProject {
  return randomizeViralCharacterProfiles(project);
}

function randomizeJojoNpcAvatar(project: DramaProject): DramaProject {
  const npc = randomJojoNpcProfile();
  return {
    ...project,
    characters: project.characters.map((character) => {
      if (character.id !== "npc") return character;
      return {
        ...character,
        name: npc.name,
        avatarInitial: npc.avatarInitial,
        avatarUrl: npc.avatarUrl,
        avatarGradient: npc.avatarGradient,
        voicePreset: npc.voicePreset,
        voiceDescription: npc.voiceDescription
      };
    })
  };
}

function promptSeed(prompt: string, index: number) {
  return [...prompt].reduce((total, char) => total + char.charCodeAt(0), index * 37 + 11);
}

function nextSide(index: number): ChatMessage["side"] {
  return index % 2 === 0 ? "right" : "left";
}

function cloneProject(project: DramaProject): DramaProject {
  return parseProject({
    ...project,
    characters: project.characters.map((character) => ({ ...character })),
    assets: project.assets.map((asset) => ({ ...asset, tags: [...asset.tags] })),
    messages: project.messages.map((message) => ({ ...message })),
    sfx: { ...project.sfx },
    audioMix: { ...project.audioMix }
  });
}

function contextualAmount(text: string) {
  if (/奶茶|咖啡|车费/.test(text)) return 38;
  if (/定金|预约|陪聊|服务/.test(text)) return 520;
  if (/账单|差额|订单|尾款/.test(text)) return 368;
  if (/房租|押金/.test(text)) return 1800;
  const candidates = [66, 88, 99, 188, 288, 520];
  const seed = [...text].reduce((total, char) => total + char.charCodeAt(0), 7);
  return candidates[seed % candidates.length];
}

function roleForSide(project: DramaProject, side: ChatMessage["side"]) {
  if (side === "center") return undefined;
  return project.characters.find((character) => character.side === side)?.id;
}

function jojoCharacterForTurn(project: DramaProject, index: number, type: ChatMessage["type"]) {
  const hasCharacter = (id: string) => project.characters.some((character) => character.id === id);
  const playerId = project.characters.find((character) => character.side === "right")?.id || "jiaojiao";
  const npcSequence = ["npc", "jiaojiao", "lingdang", "zhuxiaodi", "npc", "jiaojiao", "xitong"];
  const jiaojiaoSequence = ["jiaojiao", "npc", "lingdang", "zhuxiaodi", "jiaojiao", "lingdang", "xitong"];
  const sequence = type === "image"
    ? ["xitong", playerId === "npc" ? "npc" : "lingdang"]
    : type === "meme"
      ? [playerId, "jiaojiao", "zhuxiaodi", "lingdang", "xitong"]
      : playerId === "npc"
        ? npcSequence
        : jiaojiaoSequence;
  const validSequence = sequence.filter(hasCharacter);
  const id = seededPick(validSequence.length ? validSequence : project.characters.map((character) => character.id), index);
  return project.characters.find((character) => character.id === id) ?? project.characters[0];
}

function viralGroupCharacterForTurn(project: DramaProject, index: number) {
  const player = project.characters.find((character) => character.side === "right") ?? project.characters[0];
  const others = project.characters.filter((character) => character.id !== player.id);
  const sequence = [others[0], others[1], player, others[2], others[3], player, others[4], others[0]].filter(Boolean);
  return sequence[Math.abs(index) % sequence.length] ?? player;
}

function roleForMessage(project: DramaProject, side: ChatMessage["side"], index: number, type: ChatMessage["type"]) {
  if (side === "center") return undefined;
  if (isJojoProject(project)) return jojoCharacterForTurn(project, index, type)?.id;
  if (project.chatMode === "group") return viralGroupCharacterForTurn(project, index)?.id;
  return roleForSide(project, side);
}

function sideForMessage(project: DramaProject, index: number, type: ChatMessage["type"]): ChatMessage["side"] {
  if (type === "system") return "center";
  if (isJojoProject(project)) return jojoCharacterForTurn(project, index, type)?.side ?? "left";
  if (project.chatMode === "group") return viralGroupCharacterForTurn(project, index)?.side ?? "left";
  return nextSide(index);
}

function jojoMemeAsset(text: string, emotion?: string) {
  const corpus = `${text} ${emotion || ""}`;
  const candidates = jojoCompanyAssets.filter((asset) => asset.kind === "meme");
  let best = candidates[0];
  let bestScore = -1;
  for (const asset of candidates) {
    const score = asset.tags.reduce((total, tag) => total + (corpus.includes(tag) ? 3 : 0), 0) + (corpus.includes(asset.title) ? 4 : 0);
    if (score > bestScore) {
      best = asset;
      bestScore = score;
    }
  }
  return best;
}

function makeMessage(project: DramaProject, index: number, type: ChatMessage["type"], text: string): ChatMessage {
  const side = sideForMessage(project, index, type);
  const character = side === "center" ? undefined : project.characters.find((item) => item.id === roleForMessage(project, side, index, type));
  const message: ChatMessage = {
    id: makeId("msg"),
    roleId: character?.id,
    side,
    type,
    text,
    ttsText: type === "image" ? `你看，${text}。` : type === "meme" ? text : undefined,
    emotion: type === "transfer" ? "试探" : type === "image" ? "摊牌" : type === "meme" ? "调侃" : "推进",
    sendSfx: type === "transfer" || type === "image" || type === "meme" ? type : "send",
    pauseMs: type === "image" || type === "meme" ? 520 : 360,
    holdMs: type === "image" ? 2300 : type === "meme" ? 2100 : type === "transfer" ? 1700 : Math.min(2600, Math.max(1100, text.length * 120)),
    amount: type === "transfer" ? contextualAmount(text) : undefined,
    transferNote: type === "transfer" ? text : undefined
  };

  if (isJojoProject(project) && type === "image") {
    const assetId = pickJojoPhotoAssetId(text);
    return {
      ...message,
      roleId: "xitong",
      side: "left",
      text: text.includes("办公室") || text.includes("公司") || text.includes("会议") ? text : `${text}的公司局部抓拍`,
      ttsText: `你看，${text}。`,
      assetId
    };
  }

  if (!isJojoProject(project) && type === "image") {
    return {
      ...message,
      assetId: pickViralPhotoAssetId(text)
    };
  }

  if (isJojoProject(project) && type === "meme") {
    const asset = jojoMemeAsset(`${text} ${character?.name || ""}`, message.emotion);
    return {
      ...message,
      text: asset?.title || text,
      ttsText: undefined,
      assetId: asset?.id
    };
  }

  return message;
}

export function createInitialStaticProject(packageId: StoryPackage = "viral"): DramaProject {
  if (packageId === "jojo") return randomizeJojoNpcAvatar(cloneProject(jojoProject));
  return randomizeCharacterAvatars({
    ...sampleProject,
    id: "static-linear-chat",
    title: "线性聊天短剧",
    brief: "输入 Prompt 后逐段追加剧情，所有 Prompt 和对话会保存在同一条创作线上。",
    messages: [],
    sfx: {}
  });
}

export function createInitialPlaybackProject(packageId: StoryPackage = "viral"): DramaProject {
  if (packageId === "jojo") return randomizeJojoNpcAvatar(cloneProject(jojoProject));
  return randomizeCharacterAvatars({
    ...sampleProject,
    id: "static-linear-chat",
    sfx: {}
  });
}

export function generateStorySegment({
  project,
  prompt,
  promptCards
}: {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
}): { card: PromptCard; messages: ChatMessage[]; project: DramaProject } {
  const seed = promptSeed(prompt, project.messages.length + promptCards.length);
  const jojoMode = isJojoProject(project);
  const base = seededPick(jojoMode ? jojoBeatTemplates : beatTemplates, seed);
  const lastText = project.messages.at(-1)?.text || "";
  const previousPrompt = promptCards.at(-1)?.prompt || "";
  const premise = prompt.replace(/\s+/g, " ").trim();
  const viralGroupMode = !jojoMode && (project.chatMode === "group" || isGroupChatPrompt(premise));
  const workingProject: DramaProject = viralGroupMode ? {
    ...project,
    title: project.chatMode === "group" && project.messages.length
      ? project.title
      : groupTitleForPrompt(premise, project.title, project.characters.map((character) => character.name)),
    chatMode: "group",
    characters: applyPromptJourneyRoster(project.characters, premise, true),
    chatSessions: []
  } : {
    ...project,
    characters: applyPromptJourneyRoster(project.characters, premise, false)
  };
  const contextHook = lastText ? `接上：${lastText.slice(0, 12)}` : premise.slice(0, 14) || (jojoMode ? "公司日常" : "新的开场");
  const explicitImageRequest = /照片|图片|截图|证据|现场/.test(premise);
  const jojoPhotoContext = /工位|会议|办公室|老板|需求|排期|周报|咖啡|电梯|通勤|地铁|迟到|雨天|工牌|走廊|加班|日程|客户|打卡/.test(premise);
  const shouldAddMedia = jojoMode
    ? explicitImageRequest || (jojoPhotoContext && seed % 3 === 0)
    : project.messages.length === 0 || seed % 3 === 0;
  const explicitTransferRequest = /转账|红包|付款|收款|打钱/.test(premise);
  const shouldAddTransfer = !jojoMode
    && /转账|金额|钱|定金|账单|差额|订单|红包|赔|补|押金|尾款/.test(premise)
    && (explicitTransferRequest ? seed % 2 === 0 : seed % 4 === 0);
  const shouldAddMeme = jojoMode || /表情|尴尬|无语|震惊|生气|委屈|调侃|心虚|沉默/.test(premise) || seed % 5 === 0;

  const texts = jojoMode
    ? [
        premise.slice(0, 18) || base[0],
        previousPrompt ? "上次那坑还热着" : base[1],
        contextHook,
        base[2],
        /老板|客户|需求/.test(premise) ? "这句我先截屏" : "我先把锅扶正",
        "谁把需求写成愿望",
        base[3],
        "这排期会喘气吗",
        "周报已经在偷听",
        "铃铛先别冷笑",
        /会议|早会|评审/.test(premise) ? "会议纪要像遗书" : "系统开始念咒了",
        "猪小弟先别垫钱",
        `${premise.slice(0, 10) || "今天"}先记周报`
      ]
    : viralGroupMode
      ? [
          premise.slice(0, 18) || "这个小群是谁建的？",
          previousPrompt ? `上次那句还没解释` : "先别急着退群。",
          "大群里已经有人看见了。",
          contextHook,
          "谁把截图发出去了？",
          "不是我，但我保存了。",
          "你们两个先统一口径。",
          "统一口径更像有事。",
          "师父是不是也在这个群？",
          "刚才不在，现在在了。",
          "那就当什么都没说。",
          "来不及，群名暴露了。",
          `${premise.slice(0, 10) || "这件事"}还没结束`
        ]
      : [
        premise.slice(0, 18) || base[0],
        previousPrompt ? `你上次那句${previousPrompt.slice(0, 8)}` : base[1],
        "你是在躲我吗",
        contextHook,
        base[2],
        "你别用这种语气",
        "我会多想",
        base[3],
        "你明明也舍不得",
        "那张图我看懂了",
        "你现在还吃醋吗",
        "我不该秒回你",
        `${premise.slice(0, 10) || "这件事"}不是结束`
      ];

  let messages: ChatMessage[] = texts.map((text, index) => makeMessage(workingProject, project.messages.length + index, "text", text));

  if (shouldAddTransfer) {
    const transferText = /账单|差额|订单/.test(premise) ? "我先把差额补给你" : /道歉|赔/.test(premise) ? "我赔你这一单" : "我先转你一笔";
    messages.splice(Math.min(2, messages.length), 0, makeMessage(workingProject, project.messages.length + messages.length, "transfer", transferText));
  }
  if (shouldAddMedia) {
    messages.splice(
      Math.min(4, messages.length),
      0,
      makeMessage(
        workingProject,
        project.messages.length + messages.length,
        "image",
        jojoMode ? imageHintFromContext(`公司 办公室 ${premise} ${previousPrompt} ${contextHook}`) : imageHintFromContext([premise, previousPrompt, contextHook].join(" "))
      )
    );
  }
  if (shouldAddMeme) {
    const rawMeme = makeMessage(workingProject, project.messages.length + messages.length, "meme", jojoMode ? "公司群表情包" : "表情包");
    messages.push(jojoMode ? rawMeme : normalizeMemeMessage(rawMeme, [premise, contextHook].join(" ")));
  }
  messages = injectRomanticMusicMessage(messages, workingProject, [premise, previousPrompt, contextHook].join(" "), makeId("segment"));

  const cardWithoutSegment: PromptCard = {
    id: makeId("prompt"),
    prompt: premise,
    createdAt: new Date().toISOString(),
    messageIds: messages.map((message) => message.id),
    summary: `追加 ${messages.length} 条消息，承接 ${project.messages.length} 条历史对话`
  };

  const nextProject = parseProject({
    ...workingProject,
    brief: [...promptCards.map((cardItem) => cardItem.prompt), premise].join("\n"),
    messages: [...project.messages, ...messages]
  });
  const card = attachStorySegment(cardWithoutSegment, project, nextProject);

  return { card, messages, project: nextProject };
}

function messageText(message: ChatMessage) {
  return (message.text || message.ttsText || "").replace(/\s+/g, " ").trim();
}

function lastReadableMessage(messages: ChatMessage[]) {
  return [...messages].reverse().map(messageText).find(Boolean) || "";
}

export function suggestNextStoryPrompt({
  project,
  prompt,
  promptCards,
  messages
}: {
  project: DramaProject;
  prompt: string;
  promptCards: PromptCard[];
  messages: ChatMessage[];
}) {
  const jojoMode = isJojoProject(project);
  const context = [prompt, ...promptCards.map((card) => card.prompt), ...messages.map(messageText)].join(" ");
  const latest = lastReadableMessage(messages);
  const index = promptCards.length;

  if (jojoMode) {
    const player = project.characters.find((character) => character.side === "right");
    if (player?.id === "npc") {
      const npcRoutes = /甲方|乙方|客户|领导|其他部门|外包|财务|法务|园区/.test(context)
        ? [
            "接着写 NPC 说明自己只是来同步一个小问题，叫叫听完发现它能拆出五个部门，铃铛开始画风险边界，系统补上一条更扎心的待办。",
            "接着写 NPC 想把话说得客气一点，结果越解释越像正式甩锅，猪小弟认真帮忙圆场却暴露了更多细节。",
            "接着写叫叫试探 NPC 到底带来了需求还是风险，NPC 发来一张局部照片，群里瞬间从寒暄进入救火。"
          ]
        : [
            `接着“${latest.slice(0, 10) || "上一段"}”写 NPC 第一次在公司群里试探发言，叫叫热情接话，铃铛冷静观察，猪小弟把气氛越帮越忙。`,
            "接着写 NPC 刚加入就遇到一个看似很小的流程问题，叫叫想表现专业，系统用一句提醒把问题放大。",
            "接着写 NPC 以为只是普通寒暄，三四句后发现自己已经被卷进叫叫公司的荒诞日常。"
          ];
      return normalizeSuggestedPrompt(npcRoutes[index % npcRoutes.length]);
    }

    const jojoRoutes = /老板|客户|需求|排期|周报|会议|工位|报销|咖啡/.test(context)
      ? [
          "接着写老板突然进群催进度，叫叫假装冷静接招，铃铛用一句话拆穿排期漏洞，猪小弟默默补上最离谱的后勤成本。",
          "接着写客户又加一个小需求，叫叫把它当冒险任务，铃铛开始做风险清单，系统无情提醒周报已经自动同步。",
          "接着写会议结束后大家以为安全了，系统突然弹出待办，猪小弟说自己已经垫钱，叫叫发现锅又回来了。"
        ]
      : [
          `接着“${latest.slice(0, 10) || "上一段"}”写一个公司群小反转，让叫叫嘴硬冲锋，铃铛冷静补刀，猪小弟诚恳把事情越帮越忙。`,
          "接着写一个工位上的小误会，先像普通吐槽，三四句后反转成老板或系统早就看见了。",
          "接着写一个同事群里的荒诞小危机，让叫叫先接锅，再由铃铛把真正的问题翻出来。"
        ];
    return normalizeSuggestedPrompt(jojoRoutes[index % jojoRoutes.length]);
  }

  if (project.chatMode === "group") {
    const groupRoutes = [
      "八戒另建一个不带师父的小群复盘证据，女儿国国王刚进群就指出群名有问题，孙悟空和白骨精被迫同时解释。",
      "白骨精误把只发给孙悟空的截图发进大群，沙僧默默保存，唐僧开始追问两人为何共享同一个定位。",
      "孙悟空和白骨精切进秘密双人群统一口径，大群里的八戒却用一条旧消息把他们的时间线彻底对上。"
    ];
    return normalizeSuggestedPrompt(groupRoutes[index % groupRoutes.length]);
  }

  if (/张阿姨|相亲|小学|林夏|暗恋|毕业照|铅笔盒|小卖部/.test(context)) {
    const blindDateRoutes = [
      "男主追问张阿姨是不是早就知道，女生承认这场相亲是她先点头，还拿出男主小学铅笔盒照片继续戳破暗恋。",
      "女生说小学毕业那天其实也等过男主表白，男主嘴硬否认，张阿姨突然发来语音把两个人都拆穿。",
      "男主想把话题拉回相亲标准，女生反问他现在还会不会躲在小卖部门口，旧绰号让暧昧升级。",
      "女生发来一张旧同学录截图，里面有男主当年没送出去的话，男主装作不记得，最后被张阿姨的备注反杀。"
    ];
    return normalizeSuggestedPrompt(blindDateRoutes[index % blindDateRoutes.length]);
  }

  const viralRoutes = [
    `接着“${latest.slice(0, 10) || "上一段"}”写一次更具体的试探，让女生抛出新证据，男主嘴硬否认但露出心虚。`,
    "接着写女生发来一张截图或照片，把前面的误会翻深一层，男主先解释，最后发现她其实早就知道真相。",
    "接着写男主想转移话题，女生用一个只有两个人知道的旧细节逼他承认，结尾留下下一段钩子。"
  ];
  return normalizeSuggestedPrompt(viralRoutes[index % viralRoutes.length]);
}

export function makeStoryArchive(project: DramaProject, promptCards: PromptCard[]): StoryArchive {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    promptCards,
    project
  };
}

export function parseStoryArchive(value: unknown): StoryArchive {
  if (!value || typeof value !== "object") throw new Error("导入文件不是有效 JSON 对象");
  const archive = value as Partial<StoryArchive> & { version?: unknown };
  const project = parseProject(archive.project);
  const exportedAt = typeof archive.exportedAt === "string" ? archive.exportedAt : new Date().toISOString();
  const validMessageIds = new Set(project.messages.map((message) => message.id));
  const promptCards = Array.isArray(archive.promptCards)
    ? archive.promptCards.flatMap((rawCard, index): PromptCard[] => {
        if (!rawCard || typeof rawCard !== "object") return [];
        const candidate = rawCard as Partial<PromptCard>;
        const prompt = typeof candidate.prompt === "string" ? candidate.prompt.trim() : "";
        if (!prompt) return [];
        const rawMessageIds = Array.isArray(candidate.messageIds)
          ? candidate.messageIds.filter((id): id is string => typeof id === "string" && validMessageIds.has(id))
          : [];
        const parsedSegment = parseStorySegment(candidate.segment, rawMessageIds);
        const messageIds = [...new Set(
          (rawMessageIds.length ? rawMessageIds : parsedSegment?.messageIds ?? []).filter((id) => validMessageIds.has(id))
        )];
        const segment = parsedSegment ? { ...parsedSegment, messageIds } : undefined;
        const suggestedPrompt = normalizeSuggestedPrompt(
          typeof candidate.suggestedPrompt === "string" ? candidate.suggestedPrompt : undefined
        );
        return [{
          id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `imported-prompt-${index + 1}`,
          prompt,
          createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : exportedAt,
          messageIds,
          summary: typeof candidate.summary === "string" && candidate.summary.trim()
            ? candidate.summary
            : `导入故事卡 ${index + 1}，共 ${messageIds.length} 条消息`,
          ...(suggestedPrompt ? { suggestedPrompt } : {}),
          ...(segment ? { segment } : {})
        }];
      })
    : [];
  return {
    version: 2,
    exportedAt,
    promptCards,
    project
  };
}
