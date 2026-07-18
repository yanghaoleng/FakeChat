import { jojoProject } from "./jojoProject.js";
import { randomJojoNpcProfile } from "./jojoNpcProfiles.js";
import { sampleProject } from "./sampleProject.js";
import { avatarById, avatarsByGender, neutralEditorialAvatars } from "./avatarLibrary.js";
import { injectRomanticMusicMessage } from "./musicLibrary.js";
import { parseProject, type ChatMessage, type DramaProject } from "./schema.js";
import { normalizeSuggestedPrompt } from "./suggestedPrompt.js";
import type { PromptCard, StoryPackage } from "./linearStory.js";
import { attachStorySegment } from "./storySegments.js";
import { randomizeViralCharacterProfiles } from "./viralPersona.js";
import { viralPresetStories } from "./viralPresetStories.js";
import type {
  JojoPresetRole,
  PresetMessageSpec,
  PresetRoleSelection,
  PresetStory,
  ViralPresetRole
} from "./presetStorySchema.js";

export type {
  JojoPresetRole,
  PresetCharacterSpec,
  PresetMessageSpec,
  PresetRoleSelection,
  PresetStory,
  ViralPresetRole
} from "./presetStorySchema.js";

export type PresetInitialArchive = {
  preset: PresetStory;
  presetIndex: number;
  roleSelection: PresetRoleSelection;
  customStartProject: DramaProject;
  project: DramaProject;
  promptCards: PromptCard[];
  nextPrompt: string;
  cachedFirstSegment: {
    project: DramaProject;
    card: PromptCard;
    messages: ChatMessage[];
    suggestedPrompt: string;
  };
};

export function initialProjectForPrompt(
  archive: PresetInitialArchive,
  currentProject: DramaProject,
  currentPromptCards: PromptCard[],
  prompt: string
) {
  if (currentProject.messages.length || currentPromptCards.length) return currentProject;
  if (prompt.trim() === archive.preset.prompt.trim()) return currentProject;
  return archive.customStartProject;
}

const m = (
  roleId: string,
  text: string,
  options: Omit<PresetMessageSpec, "roleId" | "text"> = {}
): PresetMessageSpec => ({ roleId, text, ...options });

export const defaultPresetRoleSelection: PresetRoleSelection = {
  viralRole: "any",
  jojoRole: "npc"
};

export function normalizePresetRoleSelection(selection: Partial<PresetRoleSelection> = {}): PresetRoleSelection {
  return {
    viralRole: selection.viralRole === "male" || selection.viralRole === "female"
      ? selection.viralRole
      : defaultPresetRoleSelection.viralRole,
    jojoRole: selection.jojoRole === "jiaojiao" ? "jiaojiao" : defaultPresetRoleSelection.jojoRole
  };
}

const jojoPresetStories: PresetStory[] = [
  {
    id: "jojo-new-coworker",
    title: "新同事像领导亲戚",
    prompt: "公司来了一个神秘新同事，大家从头像、入群方式和自我介绍里疯狂推理他的来头，主打蛐蛐空降和入职仪式感。",
    nextPrompt: "接着写新同事第一天就被拉去开会，叫叫想套近乎，铃铛冷静观察，猪小弟开始判断他到底是关系户还是隐藏高手。",
    messages: [
      m("xitong", "新人已加入本群"),
      m("jiaojiao", "欢迎欢迎"),
      m("lingdang", "他头像怎么有点眼熟"),
      m("zhuxiaodi", "像老板朋友圈那种构图"),
      m("jiaojiao", "别乱说，可能只是审美同步"),
      m("xitong", "新人职位：特别项目协同"),
      m("lingdang", "这个职位名字很会绕"),
      m("zhuxiaodi", "是不是很厉害的意思"),
      m("jiaojiao", "也可能是还没想好干啥"),
      m("xitong", "工牌挂绳局部：新工牌还没有贴照片", { type: "image", assetId: "jojo-photo-badge-lanyard", emotion: "入职" }),
      m("lingdang", "先别蛐蛐，等他发第一份文档"),
      m("jiaojiao", "第一份文档决定江湖地位"),
      m("zhuxiaodi", "我已经准备好点赞了"),
      m("zhuxiaodi", "猪小弟点赞", { type: "meme", assetId: "jojo-meme-zhuxiaodi-like", emotion: "支持" })
    ]
  },
  {
    id: "jojo-flexible-work",
    title: "新政策：弹性上班",
    prompt: "公司宣布弹性上班，叫叫以为终于自由，铃铛指出弹性的是下班时间，群里开始吐槽制度文字游戏。",
    nextPrompt: "接着写大家研究弹性上班到底弹在哪里，系统给出一串规则，叫叫发现自己只是从固定焦虑变成弹性焦虑。",
    messages: [
      m("xitong", "公司新政策：试行弹性上班"),
      m("jiaojiao", "自由的风吹进工区"),
      m("lingdang", "先看细则"),
      m("zhuxiaodi", "我已经开心了"),
      m("xitong", "弹性范围：到岗时间前后 15 分钟"),
      m("jiaojiao", "这叫橡皮筋上班"),
      m("lingdang", "而且下班需根据项目情况灵活调整"),
      m("zhuxiaodi", "那弹的是下班？"),
      m("jiaojiao", "自由的风又吹走了"),
      m("xitong", "通勤地铁车厢虚焦：屏幕显示早高峰", { type: "image", assetId: "jojo-photo-subway-commute", emotion: "通勤" }),
      m("lingdang", "制度写得很美，生活过得很紧"),
      m("jiaojiao", "弹性上班，刚性开会"),
      m("zhuxiaodi", "迟到算不算弹性的一部分"),
      m("xitong", "不算")
    ]
  },
  {
    id: "jojo-office-cp",
    title: "茶水间 CP 观察",
    prompt: "群里开始蛐蛐公司里疑似 CP 的两位同事：请假时间、茶水间偶遇、一起加班的频率都很可疑，主打轻松八卦和合理但离谱的推理。",
    nextPrompt: "接着写叫叫拿出更多离谱证据，铃铛负责把推理拉回现实，系统突然提示两人一起预约了同一间会议室。",
    messages: [
      m("zhuxiaodi", "我发现一个事情"),
      m("jiaojiao", "这种开头一般有瓜"),
      m("lingdang", "先声明，不造谣"),
      m("zhuxiaodi", "他们俩又同时去茶水间了"),
      m("jiaojiao", "频率多少"),
      m("zhuxiaodi", "今天第三次"),
      m("lingdang", "也可能只是都爱喝水"),
      m("jiaojiao", "成年人哪有这么爱喝水"),
      m("xitong", "办公室走廊背影：两个人一前一后经过茶水间", { type: "image", assetId: "jojo-photo-office-corridor", emotion: "观察" }),
      m("zhuxiaodi", "我刚刚听到他们说一起下楼"),
      m("lingdang", "可能是拿快递"),
      m("jiaojiao", "CP 的第一步就是一起拿快递"),
      m("xitong", "提醒：请勿在工作群传播未经证实信息"),
      m("jiaojiao", "收到，我们改成学术研究")
    ]
  },
  {
    id: "jojo-afternoon-tea",
    title: "下午茶是谁点的",
    prompt: "公司突然来了下午茶，大家以为是福利，系统说费用归属待确认。既想吃又怕背锅，最后发现是客户送错楼层。",
    nextPrompt: "接着写叫叫已经吃完才发现送错楼层，铃铛开始设计归还话术，猪小弟认真思考能不能按精神损失留下奶茶。",
    messages: [
      m("xitong", "前台收到下午茶 12 份"),
      m("jiaojiao", "公司终于想起我们了"),
      m("zhuxiaodi", "有芋泥吗"),
      m("lingdang", "先问谁点的"),
      m("xitong", "费用归属待确认"),
      m("jiaojiao", "这句话让奶茶变沉了"),
      m("zhuxiaodi", "我已经插管了"),
      m("lingdang", "你动作太快"),
      m("xitong", "夜宵外卖模糊照：袋子上贴着隔壁公司名称", { type: "image", assetId: "viral-photo-takeout-food", emotion: "送错" }),
      m("jiaojiao", "隔壁公司也太客气了"),
      m("lingdang", "那叫送错"),
      m("zhuxiaodi", "喝过的怎么还"),
      m("jiaojiao", "用感谢信还"),
      m("lingdang", "你先别代表公司")
    ]
  },
  {
    id: "jojo-ex-coworker-client",
    title: "离职同事变甲方",
    prompt: "刚离职的同事成了客户方负责人，昨天还一起骂需求，今天开始提需求。群里一边怀念一边吐槽身份变化。",
    nextPrompt: "接着写前同事发来第一版反馈，开口就是“这个很简单”，叫叫破防，铃铛冷静指出这叫职场轮回。",
    messages: [
      m("xitong", "新客户联系人已同步"),
      m("jiaojiao", "这名字怎么这么熟"),
      m("lingdang", "上周刚离职那位"),
      m("zhuxiaodi", "他变甲方了？"),
      m("jiaojiao", "昨天还一起骂需求"),
      m("lingdang", "今天开始提需求"),
      m("xitong", "会议桌局部抓拍：电脑上打开新需求文档", { type: "image", assetId: "jojo-photo-meeting-blur", emotion: "轮回" }),
      m("zhuxiaodi", "身份切换好快"),
      m("jiaojiao", "他会不会放我们一马"),
      m("lingdang", "不一定，熟人更敢提"),
      m("xitong", "客户反馈：这个应该很简单"),
      m("jiaojiao", "熟悉的刀扎回来了"),
      m("zhuxiaodi", "他成长了"),
      m("lingdang", "成长成了甲方")
    ]
  },
  {
    id: "jojo-okr-wishing-well",
    title: "OKR 写成许愿池",
    prompt: "公司开始定 OKR，老板希望大家写得有挑战性，叫叫把 O 写成愿望，铃铛指出 KR 全靠玄学，群里吐槽目标管理。",
    nextPrompt: "接着写大家互相围观 OKR，叫叫想把“活着交付”写进去，系统提示该表述不够积极。",
    messages: [
      m("xitong", "本季度 OKR 填写提醒"),
      m("jiaojiao", "O：平安度过本季度"),
      m("lingdang", "太真实，不够战略"),
      m("zhuxiaodi", "KR：每天准时吃饭"),
      m("jiaojiao", "这很关键"),
      m("xitong", "请填写可衡量结果"),
      m("lingdang", "比如少改 3 次需求"),
      m("jiaojiao", "这个不可控"),
      m("xitong", "电脑日程表虚焦：OKR 截止时间标红", { type: "image", assetId: "jojo-photo-laptop-calendar", emotion: "目标" }),
      m("zhuxiaodi", "那写提升幸福感 20%"),
      m("lingdang", "谁来测幸福感"),
      m("jiaojiao", "看我今天有没有叹气"),
      m("xitong", "检测到叹气 7 次"),
      m("jiaojiao", "系统你退出评审")
    ]
  },
  {
    id: "jojo-performance-review",
    title: "绩效自评文学",
    prompt: "绩效自评开始，大家研究怎么把“救火、背锅、忍住没哭”写成正向表达，主打职场话术和互相打趣。",
    nextPrompt: "接着写叫叫把自评写得像求生记录，铃铛帮他翻译成职场表达，猪小弟意外写出全场最真诚的一版。",
    messages: [
      m("xitong", "绩效自评入口已开放"),
      m("jiaojiao", "年度玄学开始了"),
      m("lingdang", "注意措辞"),
      m("zhuxiaodi", "我写：努力活着"),
      m("lingdang", "改成：持续保持高压环境下的稳定输出"),
      m("jiaojiao", "我写：帮同事背锅"),
      m("lingdang", "改成：跨团队协同解决不确定问题"),
      m("xitong", "键盘旁冷掉咖啡：绩效表格停在自评栏", { type: "image", assetId: "jojo-photo-keyboard-coffee", emotion: "自评" }),
      m("zhuxiaodi", "那忍住没哭怎么写"),
      m("jiaojiao", "情绪管理能力突出"),
      m("lingdang", "这句可以"),
      m("xitong", "建议补充量化数据"),
      m("jiaojiao", "本季度眼泪节省率 100%"),
      m("zhuxiaodi", "叫哥稳了")
    ]
  },
  {
    id: "jojo-before-holiday",
    title: "放假前最后一天",
    prompt: "放假前最后一天，大家都想安静摸到下班，系统突然提醒还有待办。群里一边期待假期一边害怕节前临门一脚。",
    nextPrompt: "接着写老板节前发来一句“大家辛苦了，顺便”，群里瞬间从假期模式切回求生模式。",
    messages: [
      m("xitong", "距离假期还有 6 小时"),
      m("jiaojiao", "心已经在路上"),
      m("zhuxiaodi", "我行李都带公司了"),
      m("lingdang", "别高兴太早"),
      m("xitong", "检测到未关闭待办 4 项"),
      m("jiaojiao", "系统假期前不要说脏话"),
      m("lingdang", "待办不是脏话，但很伤人"),
      m("xitong", "雨天办公室窗边：灯光还亮着，桌上有半杯咖啡", { type: "image", assetId: "jojo-photo-rainy-office-window", emotion: "节前" }),
      m("zhuxiaodi", "我能不能先精神放假"),
      m("jiaojiao", "我已经精神离职又复职了"),
      m("lingdang", "先把文档关掉"),
      m("xitong", "老板正在输入"),
      m("jiaojiao", "不许输入"),
      m("zhuxiaodi", "我开始紧张了")
    ]
  },
  {
    id: "jojo-just-a-quick-thing",
    title: "领导说顺手一下",
    prompt: "下班前领导丢来小任务，说只是顺手一下。叫叫想装没看见，系统提示已读，铃铛统计这种话术平均耗时 3.7 天。",
    nextPrompt: "接着写叫叫试图把“顺手一下”拆成任务清单，发现它包含调研、方案、设计、对齐和复盘五件事。",
    messages: [
      m("xitong", "老板：这个顺手一下就行"),
      m("jiaojiao", "我刚刚是不是眼花了"),
      m("lingdang", "你已读了"),
      m("zhuxiaodi", "顺手一般要多久"),
      m("lingdang", "历史均值 3.7 天"),
      m("jiaojiao", "那叫顺命"),
      m("xitong", "电脑日程表虚焦：下班时间旁边新增待办", { type: "image", assetId: "jojo-photo-laptop-calendar", emotion: "顺手" }),
      m("zhuxiaodi", "能不能不顺"),
      m("lingdang", "可以，但要有勇气"),
      m("jiaojiao", "我只有叫叫气"),
      m("xitong", "老板正在补充细节"),
      m("jiaojiao", "不要补充"),
      m("lingdang", "已经从顺手变成项目了"),
      m("zhuxiaodi", "我去买咖啡")
    ]
  },
  {
    id: "jojo-fishing-at-work",
    title: "摸鱼侦察系统",
    prompt: "大家讨论怎样在不影响工作的情况下优雅摸鱼，系统突然上线活动检测，叫叫、铃铛、猪小弟开始互相掩护。",
    nextPrompt: "接着写系统识别到叫叫长时间静止，叫叫解释自己在深度思考，铃铛补刀说他是在加载人生。",
    messages: [
      m("jiaojiao", "如何优雅地摸鱼"),
      m("lingdang", "先把优雅去掉"),
      m("zhuxiaodi", "我可以帮你望风"),
      m("xitong", "检测到本群出现高风险词：摸鱼"),
      m("jiaojiao", "我们说的是鱼类生态研究"),
      m("lingdang", "研究地点：工位"),
      m("xitong", "早晨工位桌面抓拍：屏幕角落有未关闭的待办", { type: "image", assetId: "jojo-photo-desk-morning", emotion: "摸鱼" }),
      m("zhuxiaodi", "叫哥刚刚 8 分钟没动"),
      m("jiaojiao", "我在深度思考"),
      m("lingdang", "思考午饭吃什么"),
      m("xitong", "活动状态：低频移动"),
      m("jiaojiao", "这是节能模式"),
      m("zhuxiaodi", "叫哥省电"),
      m("lingdang", "但不省事")
    ]
  }
];

const jojoNpcPresetStories: PresetStory[] = [
  {
    id: "jojo-npc-new-coworker",
    title: "新同事第一天",
    prompt: "用户扮演一只随机 NPC 小动物，作为叫叫公司的新同事第一天入群。大家从自我介绍、工牌和座位安排里开始蛐蛐新人到底是高手还是关系户。",
    nextPrompt: "接着写 NPC 第一次被拉进会议，叫叫想套近乎，铃铛冷静观察，猪小弟认真帮忙占座，系统突然分配第一个待办。",
    messages: [
      m("xitong", "新人已加入本群"),
      m("npc", "大家好，我今天入职"),
      m("jiaojiao", "欢迎来到工位副本"),
      m("lingdang", "先别吓新人"),
      m("zhuxiaodi", "我给你留了座位"),
      m("npc", "听起来很需要勇气"),
      m("jiaojiao", "勇气是本公司基础福利"),
      m("xitong", "工牌挂绳局部：新工牌还没有贴照片", { type: "image", assetId: "jojo-photo-badge-lanyard", emotion: "入职" }),
      m("lingdang", "第一天先观察"),
      m("npc", "我已经观察到大家都很忙"),
      m("jiaojiao", "这叫氛围感"),
      m("xitong", "新人待办已生成"),
      m("npc", "入职礼物是待办吗"),
      m("zhuxiaodi", "还有早餐券")
    ]
  },
  {
    id: "jojo-npc-new-leader",
    title: "新领导空降",
    prompt: "用户扮演一只随机 NPC 小动物，作为新来的小领导空降进群。叫叫想表现，铃铛观察话术，猪小弟担心组织架构又要变。",
    nextPrompt: "接着写 NPC 新领导说先不改流程，结果第一句话就让大家同步所有历史文档，叫叫瞬间从欢迎模式切到求生模式。",
    messages: [
      m("xitong", "新负责人已入群"),
      m("npc", "大家不用紧张"),
      m("jiaojiao", "我一点都不紧张"),
      m("lingdang", "你打字有点快"),
      m("zhuxiaodi", "领导好"),
      m("npc", "先了解一下现有项目"),
      m("jiaojiao", "现有项目比较有层次"),
      m("lingdang", "也可以叫坑"),
      m("xitong", "会议桌局部抓拍：电脑上打开组织架构表", { type: "image", assetId: "jojo-photo-meeting-blur", emotion: "空降" }),
      m("npc", "历史文档都同步我一下"),
      m("jiaojiao", "历史比较长"),
      m("lingdang", "从盘古开需求开始"),
      m("npc", "那先同步最近三版"),
      m("zhuxiaodi", "最近三版也很多")
    ]
  },
  {
    id: "jojo-npc-other-department",
    title: "其他部门来借人",
    prompt: "用户扮演一只随机 NPC 小动物，来自其他部门，临时来群里借叫叫参与一个跨部门项目。大家一边礼貌接待，一边判断这是不是新锅。",
    nextPrompt: "接着写 NPC 解释只是一个很小的协同，铃铛把协同拆成五个工种，叫叫发现自己已经被写进排期。",
    messages: [
      m("npc", "打扰一下，想借叫叫半天"),
      m("jiaojiao", "借我需要押金吗"),
      m("lingdang", "先问借去做什么"),
      m("npc", "一个很小的跨部门协同"),
      m("zhuxiaodi", "小到什么程度"),
      m("npc", "大概半页需求"),
      m("lingdang", "半页可以藏很多字"),
      m("xitong", "电脑日程表虚焦：叫叫下午排期被标红", { type: "image", assetId: "jojo-photo-laptop-calendar", emotion: "借人" }),
      m("jiaojiao", "我怎么已经在排期里"),
      m("npc", "我以为这是确认流程"),
      m("lingdang", "这是预埋流程"),
      m("jiaojiao", "我被借得很突然"),
      m("npc", "那我先正式借一下"),
      m("zhuxiaodi", "叫哥被礼貌装走了")
    ]
  },
  {
    id: "jojo-npc-client-party-a",
    title: "甲方突然进群",
    prompt: "用户扮演一只随机 NPC 小动物，作为甲方公司的联系人突然进群。叫叫努力保持专业，铃铛负责翻译需求，猪小弟默默统计新增工作量。",
    nextPrompt: "接着写 NPC 甲方说只是补充一个小需求，叫叫发现这个小需求需要设计、开发、法务和老板一起点头。",
    messages: [
      m("xitong", "甲方联系人已加入"),
      m("npc", "大家好，我这边补充一点"),
      m("jiaojiao", "一点是计量单位吗"),
      m("lingdang", "先听完"),
      m("npc", "不影响主流程"),
      m("zhuxiaodi", "这句话听着像会影响"),
      m("npc", "只是入口文案和链路都调一下"),
      m("jiaojiao", "入口和链路叫主流程全家"),
      m("xitong", "会议桌局部抓拍：电脑旁边贴着客户反馈", { type: "image", assetId: "jojo-photo-meeting-blur", emotion: "甲方" }),
      m("lingdang", "需要确认范围"),
      m("npc", "我可以先发标注"),
      m("jiaojiao", "标注越多越冷静"),
      m("zhuxiaodi", "我先泡咖啡"),
      m("npc", "辛苦大家")
    ]
  },
  {
    id: "jojo-npc-vendor-party-b",
    title: "乙方项目经理求救",
    prompt: "用户扮演一只随机 NPC 小动物，作为乙方公司的项目经理来找叫叫公司救火。表面是对接，实际上是来承认交付快翻车了。",
    nextPrompt: "接着写 NPC 乙方项目经理说只差一点点，铃铛一问发现差的是需求、排期和测试，叫叫开始判断要不要接锅。",
    messages: [
      m("npc", "我这边想同步个风险"),
      m("jiaojiao", "风险一般不会自己来"),
      m("lingdang", "它已经进群了"),
      m("npc", "乙方交付可能晚一天"),
      m("zhuxiaodi", "一天还好吧"),
      m("npc", "也可能是三个工作日"),
      m("jiaojiao", "一天长大了"),
      m("xitong", "雨天办公室窗边：灯光还亮着，桌上有半杯咖啡", { type: "image", assetId: "jojo-photo-rainy-office-window", emotion: "救火" }),
      m("lingdang", "具体卡在哪里"),
      m("npc", "需求还有两处没闭环"),
      m("jiaojiao", "这叫还没出生"),
      m("npc", "所以想请你们帮忙评估"),
      m("zhuxiaodi", "评估是不是要加班"),
      m("lingdang", "大概率")
    ]
  },
  {
    id: "jojo-npc-outsourced-designer",
    title: "外包设计师进群",
    prompt: "用户扮演一只随机 NPC 小动物，作为外包设计师进群交稿。叫叫觉得很好看，铃铛发现尺寸不对，猪小弟只关心能不能今天下班。",
    nextPrompt: "接着写 NPC 设计师说尺寸是按旧文档做的，系统翻出新版规范，大家开始追查到底是谁没同步。",
    messages: [
      m("npc", "设计稿我发群里了"),
      m("jiaojiao", "看起来很高级"),
      m("lingdang", "尺寸不对"),
      m("zhuxiaodi", "高级但放不下？"),
      m("npc", "我按文档来的"),
      m("jiaojiao", "文档也会老"),
      m("xitong", "电脑日程表虚焦：设计稿标注和规范尺寸不一致", { type: "image", assetId: "jojo-photo-laptop-calendar", emotion: "稿件" }),
      m("lingdang", "你拿的是旧规范"),
      m("npc", "我收到的就是这版"),
      m("jiaojiao", "谁给的"),
      m("zhuxiaodi", "不会是我转的吧"),
      m("xitong", "转发人：猪小弟"),
      m("zhuxiaodi", "我先道歉"),
      m("npc", "那我先改一版")
    ]
  },
  {
    id: "jojo-npc-finance-audit",
    title: "财务来查报销",
    prompt: "用户扮演一只随机 NPC 小动物，作为财务同事来群里查一笔会议室费。叫叫以为只是报销，结果费用备注写得像悬疑片。",
    nextPrompt: "接着写 NPC 财务要求解释“冒险经费”是什么，叫叫试图美化，铃铛把它翻译成会议室超时费。",
    messages: [
      m("npc", "有笔报销需要解释"),
      m("jiaojiao", "解释也是我的强项"),
      m("lingdang", "先看金额"),
      m("npc", "88，备注冒险经费"),
      m("zhuxiaodi", "听起来很热血"),
      m("jiaojiao", "其实是团队建设"),
      m("npc", "会议室超时费用？"),
      m("xitong", "会议桌局部抓拍：费用单上写着超时 30 分钟", { type: "image", assetId: "jojo-photo-meeting-blur", emotion: "报销" }),
      m("lingdang", "热血翻译成超时"),
      m("jiaojiao", "职业表达被拆穿了"),
      m("npc", "那不能走团建"),
      m("zhuxiaodi", "能走冒险吗"),
      m("npc", "不能"),
      m("jiaojiao", "财务很冷静")
    ]
  },
  {
    id: "jojo-npc-hrbp",
    title: "HRBP 关怀一下",
    prompt: "用户扮演一只随机 NPC 小动物，作为 HRBP 来群里做员工关怀。叫叫努力表现积极，铃铛觉得这像压力测试，猪小弟认真回答得过于真实。",
    nextPrompt: "接着写 NPC HRBP 问大家最近工作状态如何，系统自动弹出加班记录，关怀现场变成证据展示。",
    messages: [
      m("npc", "来做个轻量关怀"),
      m("jiaojiao", "我们很轻量"),
      m("lingdang", "精神重量另算"),
      m("zhuxiaodi", "我最近睡得很快"),
      m("npc", "这听起来不错"),
      m("zhuxiaodi", "因为太累了"),
      m("jiaojiao", "他比较诚实"),
      m("xitong", "早晨工位桌面抓拍：屏幕角落有未关闭的待办", { type: "image", assetId: "jojo-photo-desk-morning", emotion: "关怀" }),
      m("npc", "大家压力大吗"),
      m("lingdang", "这个问题有标准答案吗"),
      m("jiaojiao", "我们压力很有成长性"),
      m("npc", "我记录一下"),
      m("zhuxiaodi", "能记录成调休吗"),
      m("npc", "我努力往上反馈")
    ]
  },
  {
    id: "jojo-npc-legal-review",
    title: "法务同事看一眼",
    prompt: "用户扮演一只随机 NPC 小动物，作为法务同事来群里看合同。叫叫以为只是看一眼，结果 NPC 连续圈出三个高危条款。",
    nextPrompt: "接着写 NPC 法务说这个合同不能随手签，甲方把责任都塞进附件。叫叫开始感谢这只看起来很温和的小动物。",
    messages: [
      m("npc", "合同我看了一眼"),
      m("jiaojiao", "一眼就好"),
      m("npc", "一眼三个风险"),
      m("lingdang", "法务的一眼很长"),
      m("zhuxiaodi", "要不要喝咖啡"),
      m("npc", "先别签附件二"),
      m("jiaojiao", "附件二怎么了"),
      m("xitong", "电脑屏幕局部：合同附件被红色批注圈出", { type: "image", assetId: "jojo-photo-laptop-calendar", emotion: "法务" }),
      m("npc", "责任全在你们这边"),
      m("jiaojiao", "这不是附件，是陷阱"),
      m("lingdang", "幸好看了一眼"),
      m("npc", "我再多看两眼"),
      m("zhuxiaodi", "法务眼神真好"),
      m("jiaojiao", "救命眼神")
    ]
  },
  {
    id: "jojo-npc-park-ops",
    title: "园区运营通知",
    prompt: "用户扮演一只随机 NPC 小动物，作为园区运营来群里通知电梯维护。叫叫以为只是通知，结果发现维护时间刚好卡在客户来访前。",
    nextPrompt: "接着写 NPC 园区运营提出备用路线，叫叫和猪小弟开始计算客户爬楼梯时的情绪风险，铃铛准备改接待方案。",
    messages: [
      m("npc", "通知一下，电梯下午维护"),
      m("jiaojiao", "维护多久"),
      m("npc", "14 点到 17 点"),
      m("lingdang", "客户 15 点到"),
      m("zhuxiaodi", "那客户要爬楼？"),
      m("npc", "有备用货梯"),
      m("jiaojiao", "客户走货梯会不会太硬核"),
      m("xitong", "电梯口面板虚焦：维护通知贴在按钮旁", { type: "image", assetId: "jojo-photo-elevator-panel", emotion: "通知" }),
      m("npc", "也可以从 B 座绕行"),
      m("lingdang", "路线发我"),
      m("jiaojiao", "我负责假装这是参观动线"),
      m("zhuxiaodi", "我负责引路"),
      m("npc", "我给你们开门禁"),
      m("jiaojiao", "园区救场侠")
    ]
  }
];

function cloneBaseProject(project: DramaProject): DramaProject {
  return parseProject({
    ...project,
    characters: project.characters.map((character) => ({ ...character })),
    assets: project.assets.map((asset) => ({ ...asset, tags: [...asset.tags] })),
    messages: project.messages.map((message) => ({ ...message })),
    sfx: { ...project.sfx },
    audioMix: { ...project.audioMix }
  });
}

const viralPresetPriority = [
  "viral-journey-secret-cp-group",
  "viral-daughter-kingdom-520",
  "viral-fengge-female-fan-private-chat",
  "viral-fengge-male-b-friend-advice",
  "viral-gta-release-city-summit"
];

const orderedViralPresetStories = [...viralPresetStories].sort((left, right) => {
  const leftPriority = viralPresetPriority.indexOf(left.id);
  const rightPriority = viralPresetPriority.indexOf(right.id);
  const leftRank = leftPriority < 0 ? viralPresetPriority.length + viralPresetStories.indexOf(left) : leftPriority;
  const rightRank = rightPriority < 0 ? viralPresetPriority.length + viralPresetStories.indexOf(right) : rightPriority;
  return leftRank - rightRank;
});

function presetStoriesFor(packageId: StoryPackage, roleSelection: Partial<PresetRoleSelection> = {}) {
  const role = normalizePresetRoleSelection(roleSelection);
  if (packageId === "jojo") return role.jojoRole === "npc" ? jojoNpcPresetStories : jojoPresetStories;
  if (role.viralRole === "any") return orderedViralPresetStories;
  return orderedViralPresetStories.filter((story) => (
    story.viralRole === role.viralRole || story.viralRoles?.includes(role.viralRole as "male" | "female")
  ));
}

function withViralCharacterNames(prompt: string, project: DramaProject) {
  const boyName = project.characters.find((character) => character.id === "boy")?.name;
  const girlName = project.characters.find((character) => character.id === "girl")?.name;
  return prompt
    .replace(/男主(?=是)/g, boyName ? `男主${boyName}` : "男主")
    .replace(/女主(?=是)/g, girlName ? `女主${girlName}` : "女主")
    .replace(/the male lead(?= is)/gi, boyName ? `The male lead ${boyName}` : "The male lead")
    .replace(/the female lead(?= is)/gi, girlName ? `The female lead ${girlName}` : "The female lead");
}

function initialsForPresetName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return [...name].slice(-2).join("");
}

function applyPresetCharacterOverrides(project: DramaProject, preset: PresetStory) {
  if (!preset.characterNames && !preset.characterGenders && !preset.characterVoiceDescriptions && !preset.peerAvatarSet && !preset.characterAvatarSet && !preset.characterAvatarIds) return project;
  return parseProject({
    ...project,
    characters: project.characters.map((character) => {
      const presetCharacterId = character.id === "boy" || character.id === "girl" ? character.id : undefined;
      const name = presetCharacterId
        ? preset.characterNames?.[presetCharacterId] || character.name
        : character.name;
      const avatarGender = presetCharacterId ? preset.characterGenders?.[presetCharacterId] : undefined;
      const voiceDescription = presetCharacterId ? preset.characterVoiceDescriptions?.[presetCharacterId] : undefined;
      const exactAvatar = presetCharacterId && preset.characterAvatarIds?.[presetCharacterId]
        ? avatarById(preset.characterAvatarIds[presetCharacterId]!)
        : undefined;
      const genderAvatars = avatarGender ? avatarsByGender(avatarGender) : [];
      const avatarHash = [...`${character.id}:${name}`]
        .reduce((total, item) => total + item.charCodeAt(0), 17);
      const genderAvatar = genderAvatars.length
        ? genderAvatars[Math.abs(avatarHash) % genderAvatars.length]
        : undefined;
      const neutralAvatars = preset.characterAvatarSet === "neutral-editorial" ? neutralEditorialAvatars() : [];
      const neutralAvatar = neutralAvatars.length
        ? neutralAvatars[Math.abs(avatarHash) % neutralAvatars.length]
        : undefined;
      const peerAvatar = preset.peerAvatarSet === "western-student" && character.side === "left"
        ? avatarById(character.id === "girl" ? "western-student-female-cafe" : "western-student-male-cafe")
        : undefined;
      return {
        ...character,
        name,
        avatarGender: avatarGender || character.avatarGender,
        avatarInitial: initialsForPresetName(name),
        avatarUrl: exactAvatar?.url || neutralAvatar?.url || genderAvatar?.url || peerAvatar?.url || character.avatarUrl,
        voicePreset: avatarGender === "girl"
          ? "young_real_female"
          : avatarGender === "boy"
            ? "young_male"
            : character.voicePreset,
        voiceDescription: voiceDescription || (avatarGender === "girl"
          ? "自然、清晰的年轻女声"
          : avatarGender === "boy"
            ? "自然、清晰的年轻男声"
            : character.voiceDescription)
      };
    })
  });
}

function applyPresetCharacters(project: DramaProject, preset: PresetStory) {
  if (!preset.presetCharacters?.length && !preset.chatMode) return project;
  return parseProject({
    ...project,
    chatMode: preset.chatMode || project.chatMode,
    characters: preset.presetCharacters?.map((character) => {
      const avatar = avatarById(character.avatarId);
      return {
        id: character.id,
        name: character.name,
        side: character.side,
        avatarGender: character.avatarGender,
        avatarUrl: avatar?.url,
        avatarInitial: initialsForPresetName(character.name),
        avatarGradient: character.avatarGender === "girl"
          ? "linear-gradient(145deg, #cc7a9b, #713e68)"
          : "linear-gradient(145deg, #7d9470, #344b3c)",
        voiceId: `viral-${character.id}`,
        voicePreset: character.avatarGender === "girl" ? "young_real_female" : "young_male",
        voiceDescription: character.voiceDescription
      };
    }) || project.characters
  });
}

function applyPresetPlayer(project: DramaProject, preset: PresetStory) {
  const playerCharacterId = preset.playerCharacterId;
  if (!playerCharacterId || !project.characters.some((character) => character.id === playerCharacterId)) {
    return project;
  }
  return parseProject({
    ...project,
    selfCharacterId: playerCharacterId,
    characters: project.characters.map((character) => ({
      ...character,
      side: character.id === playerCharacterId ? "right" as const : "left" as const
    })),
    messages: project.messages.map((message) => {
      if (!message.roleId) return message;
      return {
        ...message,
        side: message.roleId === playerCharacterId ? "right" as const : "left" as const
      };
    })
  });
}

function applyViralRole(project: DramaProject, viralRole: ViralPresetRole): DramaProject {
  if (viralRole !== "female") return project;
  return parseProject({
    ...project,
    id: `${project.id}-female`,
    brief: project.brief.replace(/男主/g, "女主").replace(/女生/g, "男生").replace(/女主/g, "女主"),
    characters: project.characters.map((character) => {
      if (character.id === "girl") return { ...character, side: "right" as const };
      if (character.id === "boy") return { ...character, side: "left" as const };
      return character;
    }),
    messages: project.messages.map((message) => {
      if (message.roleId === "girl") return { ...message, side: "right" as const };
      if (message.roleId === "boy") return { ...message, side: "left" as const };
      return message;
    })
  });
}

function withRandomJojoNpc(project: DramaProject): DramaProject {
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

function applyJojoRole(project: DramaProject, jojoRole: JojoPresetRole): DramaProject {
  const projectWithNpc = withRandomJojoNpc(project);
  const selectedCharacter = projectWithNpc.characters.find((character) => character.id === jojoRole);
  return parseProject({
    ...projectWithNpc,
    id: `${project.id}-${jojoRole}`,
    brief: jojoRole === "npc"
      ? `${selectedCharacter?.name || "NPC"}是用户自己扮演的随机小动物 NPC，可能是新同事、新领导、其他部门、甲方或乙方角色。叫叫、铃铛、猪小弟和系统在左侧参与公司群聊。`
      : "叫叫是用户自己扮演的勇敢小鸡吉祥物，随机 NPC 小动物、铃铛、猪小弟和系统在左侧参与公司群聊。",
    characters: projectWithNpc.characters.map((character) => ({
      ...character,
      side: character.id === jojoRole ? "right" as const : "left" as const
    })),
    messages: projectWithNpc.messages.map((message) => {
      if (!message.roleId) return message;
      return { ...message, side: message.roleId === jojoRole ? "right" as const : "left" as const };
    })
  });
}

function baseProjectFor(packageId: StoryPackage, roleSelection: PresetRoleSelection) {
  const baseProject = cloneBaseProject(packageId === "jojo" ? jojoProject : sampleProject);
  return packageId === "jojo"
    ? applyJojoRole(baseProject, roleSelection.jojoRole)
    : randomizeViralCharacterProfiles(applyViralRole(baseProject, roleSelection.viralRole));
}

function effectiveViralRoleForPreset(roleSelection: PresetRoleSelection, preset: PresetStory): ViralPresetRole {
  if (roleSelection.viralRole !== "any") return roleSelection.viralRole;
  if (preset.viralRole === "male" || preset.viralRole === "female") return preset.viralRole;
  if (preset.viralRoles?.includes("male")) return "male";
  if (preset.viralRoles?.includes("female")) return "female";
  return "any";
}

function messageSide(project: DramaProject, roleId: string): ChatMessage["side"] {
  return project.characters.find((character) => character.id === roleId)?.side ?? "left";
}

function sendSfxFor(type: ChatMessage["type"]): ChatMessage["sendSfx"] {
  if (type === "image" || type === "meme" || type === "transfer") return type;
  return type === "system" ? "none" : "send";
}

function holdMsFor(text: string, type: ChatMessage["type"]) {
  if (type === "image") return 2500;
  if (type === "meme") return 2100;
  if (type === "music") return 2600;
  if (type === "transfer") return 1700;
  return Math.min(2400, Math.max(1050, text.length * 96));
}

function buildPresetMessages(project: DramaProject, preset: PresetStory): ChatMessage[] {
  const messages = preset.messages.map((message, index) => {
    const type = message.type ?? "text";
    const side = type === "system" ? "center" : messageSide(project, message.roleId);
    return {
      id: `${preset.id}-m${String(index + 1).padStart(2, "0")}`,
      roleId: side === "center" ? undefined : message.roleId,
      side,
      type,
      text: message.text,
      ttsText: message.ttsText ?? (type === "image" ? `你看，${message.text}。` : type === "meme" ? undefined : undefined),
      emotion: message.emotion ?? (type === "image" ? "现场" : type === "meme" ? "表情" : "推进"),
      sendSfx: message.sendSfx ?? sendSfxFor(type),
      pauseMs: message.pauseMs ?? (type === "image" || type === "meme" ? 520 : 320),
      holdMs: message.holdMs ?? holdMsFor(message.text, type),
      assetId: message.assetId,
      amount: message.amount,
      transferNote: message.transferNote
    };
  });
  return injectRomanticMusicMessage(messages, project, preset.prompt, preset.id);
}

export function presetStoryCount(packageId: StoryPackage, roleSelection: Partial<PresetRoleSelection> = {}) {
  return presetStoriesFor(packageId, roleSelection).length;
}

export function randomPresetStoryIndex(packageId: StoryPackage, roleSelection: Partial<PresetRoleSelection> = {}) {
  return Math.floor(Math.random() * presetStoryCount(packageId, roleSelection));
}

export function nextPresetStoryIndex(packageId: StoryPackage, currentIndex: number, roleSelection: Partial<PresetRoleSelection> = {}) {
  return (currentIndex + 1) % presetStoryCount(packageId, roleSelection);
}

export function isPresetPromptCard(card: PromptCard | undefined) {
  return Boolean(card?.id.startsWith("preset-"));
}

export function createPresetInitialArchive(
  packageId: StoryPackage,
  requestedIndex?: number,
  roleSelection: Partial<PresetRoleSelection> = {}
): PresetInitialArchive {
  const resolvedRoleSelection = normalizePresetRoleSelection(roleSelection);
  const stories = presetStoriesFor(packageId, resolvedRoleSelection);
  const selectedIndex = requestedIndex ?? randomPresetStoryIndex(packageId, resolvedRoleSelection);
  const presetIndex = ((selectedIndex % stories.length) + stories.length) % stories.length;
  const rawPreset = stories[presetIndex];
  const layoutRoleSelection = packageId === "viral"
    ? { ...resolvedRoleSelection, viralRole: effectiveViralRoleForPreset(resolvedRoleSelection, rawPreset) }
    : resolvedRoleSelection;
  const initialBaseProject = baseProjectFor(packageId, layoutRoleSelection);
  const customStartProject = parseProject({
    ...initialBaseProject,
    id: `${packageId}-custom-start`,
    title: packageId === "jojo" ? initialBaseProject.title : "线性聊天短剧",
    brief: packageId === "jojo" ? initialBaseProject.brief : "",
    chatSessions: packageId === "jojo" ? initialBaseProject.chatSessions : [],
    messages: []
  });
  const presetCharacterProject = applyPresetCharacters(initialBaseProject, rawPreset);
  const presetPlayerProject = applyPresetPlayer(presetCharacterProject, rawPreset);
  const baseProject = applyPresetCharacterOverrides(presetPlayerProject, rawPreset);
  const preset = packageId === "jojo"
    ? { ...rawPreset, nextPrompt: normalizeSuggestedPrompt(rawPreset.nextPrompt) }
    : {
        ...rawPreset,
        prompt: withViralCharacterNames(rawPreset.prompt, baseProject),
        nextPrompt: normalizeSuggestedPrompt(rawPreset.nextPrompt)
      };
  const messages = buildPresetMessages(baseProject, preset);
  const project = parseProject({
    ...baseProject,
    id: `${packageId}-${preset.id}`,
    title: preset.title,
    brief: preset.prompt,
    messages: []
  });
  const cachedProject = parseProject({
    ...baseProject,
    id: `${packageId}-${preset.id}`,
    title: preset.title,
    brief: preset.prompt,
    messages
  });
  const promptCard: PromptCard = {
    id: `preset-${preset.id}`,
    prompt: preset.prompt,
    createdAt: new Date().toISOString(),
    messageIds: cachedProject.messages.map((message) => message.id),
    summary: `预设开场 ${cachedProject.messages.length} 条消息`,
    suggestedPrompt: preset.nextPrompt
  };
  const promptCardWithSegment = attachStorySegment(promptCard, project, cachedProject);

  return {
    preset,
    presetIndex,
    roleSelection: resolvedRoleSelection,
    customStartProject,
    project,
    promptCards: [],
    nextPrompt: preset.prompt,
    cachedFirstSegment: {
      project: cachedProject,
      card: promptCardWithSegment,
      messages: cachedProject.messages,
      suggestedPrompt: preset.nextPrompt
    }
  };
}
