import type { PresetStory } from "./presetStories.js";

type PresetMessage = PresetStory["messages"][number];

const m = (
  roleId: string,
  text: string,
  options: Omit<PresetMessage, "roleId" | "text"> = {}
): PresetMessage => ({ roleId, text, ...options });

export const viralPresetStories: PresetStory[] = [
  {
    id: "viral-pan-jinlian-window-request",
    title: "大郎烧饼售后群",
    viralRole: "male",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "西门庆", girl: "武大郎" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "西门庆申请添加潘金莲时，武大郎先用她的手机通过好友，还把聊天窗口改名成了“大郎烧饼售后群”。",
    nextPrompt: "武大郎发来满十送一券，西门庆准备退群时才发现群里从头到尾只有他们两个人。",
    messages: [
      m("boy", "你家窗户是不是又掉东西了？"),
      m("girl", "掉了，掉进我手机里了。"),
      m("boy", "潘姑娘在吗？"),
      m("girl", "烧饼要甜的还是咸的？"),
      m("boy", "我不买烧饼。"),
      m("girl", "那你加我家顾客微信做什么？"),
      m("boy", "我找掉下来的叉竿。"),
      m("girl", "叉竿找到了，人也找到了。"),
      m("boy", "误会。"),
      m("girl", "没事，拉你进售后群了。"),
      m("boy", "能退群吗？"),
      m("girl", "先下单。")
    ]
  },
  {
    id: "viral-trump-takaichi-tariff-coupon",
    title: "特朗普的关税优惠券",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "特朗普", girl: "高市早苗" },
    prompt: "特朗普给高市早苗发了一张亲笔签名的“关税优惠券”，高市早苗问他能不能和会员折扣叠加使用。",
    nextPrompt: "特朗普说优惠券仅限当面使用，高市早苗追问是不是还要满额。",
    messages: [
      m("boy", "送你一张最好的关税优惠券。"),
      m("girl", "可以和会员折扣叠加吗？"),
      m("boy", "仅限当面使用。"),
      m("girl", "还要满额吗？")
    ]
  },
  {
    id: "viral-musk-altman-alumni-group",
    title: "OpenAI 离职员工群",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "马斯克", girl: "Sam Altman" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "马斯克给 Sam Altman 发了一张“OpenAI 离职员工群”二维码，Sam 点进去后发现群主还是自己。",
    nextPrompt: "Sam 追问马斯克为什么不自己进群，马斯克说自己刚进去就被踢了。",
    messages: [
      m("boy", "给你个老同事群。"),
      m("girl", "为什么群主是我？"),
      m("boy", "方便你管理。"),
      m("girl", "那你怎么不进？"),
      m("boy", "刚进去就被踢了。")
    ]
  },
  {
    id: "viral-altman-dario-safe-document",
    title: "安全文档禁止复制",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "Sam Altman", girl: "Dario Amodei" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "Sam Altman 约 Dario Amodei 聊 AI 安全，Dario 打开共享文档后发现权限是“可查看、禁止复制、随时可能改名”。",
    nextPrompt: "Dario 要求先锁定文档标题，Sam 说模型都没锁定，标题更不可能。",
    messages: [
      m("boy", "今晚聊聊安全？"),
      m("girl", "先把文档权限开一下。"),
      m("boy", "你已经能看了。"),
      m("girl", "能看，不能复制。"),
      m("boy", "安全第一。"),
      m("girl", "标题怎么又改了？")
    ]
  },
  {
    id: "viral-fengge-female-fan-private-chat",
    title: "这个问题不公开采访",
    viralRole: "female",
    characterNames: { boy: "峰哥", girl: "成年女粉" },
    characterVoiceDescriptions: {
      boy: "成熟真实的西北男性声线，判断笃定，短句下结论后突然反转，生活化、自嘲，像一本正经地解答世间万物"
    },
    prompt: "成年女粉深夜问峰哥为什么一直不采访自己，峰哥先说这是好事，再反向判断她不是缺采访，而是想把好感研究成社会问题。",
    nextPrompt: "女粉追问两人的关系到底算什么，峰哥从采访方法一路分析到暧昧，最后说这个问题得到现场看看。",
    messages: [
      m("girl", "峰哥，你采访过那么多人，什么时候采访我？"),
      m("boy", "这是好事呀。"),
      m("girl", "什么好事？"),
      m("boy", "说明你还没被生活采访够。"),
      m("girl", "我只想被你采访。"),
      m("boy", "恰恰相反，这就不是采访了。"),
      m("girl", "那是什么？"),
      m("boy", "你把好感研究成社会问题了。"),
      m("girl", "那你给个结论。"),
      m("boy", "我得到现场看看。"),
      m("girl", "现场在哪？"),
      m("boy", "你定，峰哥负责下结论。")
    ]
  },
  {
    id: "viral-fengge-male-b-friend-advice",
    title: "到账不算心动",
    viralRole: "male",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "男B友", girl: "峰哥" },
    characterGenders: { boy: "boy", girl: "boy" },
    characterVoiceDescriptions: {
      girl: "成熟真实的西北男性声线，判断笃定，短句下结论后突然反转，生活化、自嘲，像一本正经地解答世间万物"
    },
    prompt: "男B友问峰哥，喜欢的女生平时不回消息、收到红包却秒回是不是慢热；峰哥把情感问题分析成支付平台活跃问题。",
    nextPrompt: "男B友继续拿更多聊天细节让峰哥判断，峰哥每次先宣布是好事，再反向拆穿他的自我安慰。",
    messages: [
      m("boy", "峰哥，她平时不回我，发红包却秒回，是不是慢热？"),
      m("girl", "这是好事呀。"),
      m("boy", "真有戏？"),
      m("girl", "恰恰相反，她对你没反应，对到账有反应。"),
      m("boy", "那她到底喜不喜欢我？"),
      m("girl", "我跟你说，别研究她，先研究你自己。"),
      m("boy", "我怎么了？"),
      m("girl", "你把转账当聊天，把收款提示当心动。"),
      m("girl", "这不是追人，是给支付平台做活跃。"),
      m("boy", "那我还追吗？"),
      m("girl", "停七天。她来找你是关系，只催红包是业务。"),
      m("boy", "听完更难受了。"),
      m("girl", "难受是好事，说明支付密码还没替你做决定。")
    ]
  },
  {
    id: "viral-luo-jia-next-week-live",
    title: "下周一定进直播间",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "罗永浩", girl: "贾跃亭" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "罗永浩邀请贾跃亭进直播间聊“如何按时交付”，贾跃亭回复“下周一定”，罗永浩把预约时间直接设成了每周循环。",
    nextPrompt: "罗永浩追问具体是哪个下周，贾跃亭发来一个没有结束日期的日历邀请。",
    messages: [
      m("boy", "来直播间聊聊按时交付？"),
      m("girl", "下周一定。"),
      m("boy", "具体哪天下周？"),
      m("girl", "下周的下周。"),
      m("boy", "那我把预约设成每周循环。")
    ]
  },
  {
    id: "viral-lei-yu-joint-launch",
    title: "两场遥遥领先发布会",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "雷军", girl: "余承东" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "雷军和余承东同时给对方发来新品发布会邀请函，备注都写着“欢迎友商到场见证遥遥领先”。",
    nextPrompt: "两人发现发布会撞在同一分钟，于是开始争谁去谁的直播间刷礼物。",
    messages: [
      m("boy", "今晚发布会，欢迎友商。"),
      m("girl", "巧了，我也发你一张。"),
      m("boy", "你那张写着遥遥领先。"),
      m("girl", "你这张写着全面领先。"),
      m("boy", "要不一起开？"),
      m("girl", "直播间会放不下。")
    ]
  },
  {
    id: "viral-liu-qiangdong-passerby",
    title: "你只是路人",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "刘强东", girl: "点外卖的路人" },
    characterGenders: { boy: "boy", girl: "boy" },
    prompt: "一位顾客问刘强东，自己天天点京东外卖算不算兄弟，刘强东看完他的配送记录后回复：“你只是路人，不是我们的兄弟。”",
    nextPrompt: "顾客拿出全年订单证明贡献，刘强东让他先从亲自送一单开始。",
    messages: [
      m("girl", "我天天点京东外卖，算兄弟吗？"),
      m("boy", "你送过外卖吗？"),
      m("girl", "我负责点。"),
      m("boy", "那你只是路人。"),
      m("girl", "优惠券也不算家书？"),
      m("boy", "先亲自送一单再进群。")
    ]
  },
  {
    id: "viral-wang-dong-nearby-office",
    title: "离职了还要随时汇报",
    viralRole: "any",
    characterAvatarSet: "neutral-editorial",
    characterNames: { boy: "王自如", girl: "董明珠" },
    prompt: "王自如离职后，董明珠发消息问他那间离自己最近的办公室还留不留，王自如嘴上说不用，听说要给别人又立刻改口。",
    nextPrompt: "董明珠把王自如新公司的地址发来，让他先算算以后过来汇报还算不算顺路。",
    messages: [
      m("girl", "你的办公室还留吗？"),
      m("boy", "人都离职了，还留什么。"),
      m("girl", "那我让别人搬进去。"),
      m("boy", "等一下。"),
      m("girl", "不是不留吗？"),
      m("boy", "我只是离职，又没说以后不汇报。")
    ]
  },
  {
    id: "viral-king-of-comedy-support-you",
    title: "演员训练班家属免费",
    viralRole: "any",
    characterNames: { boy: "尹天仇", girl: "柳飘飘" },
    prompt: "尹天仇追着出租车喊出“我养你啊”后，柳飘飘在车上加了他的微信，第一句就问他打算拿什么养。",
    nextPrompt: "尹天仇说演员训练班家属免费，柳飘飘让他先把家属两个字解释清楚。",
    messages: [
      m("girl", "你刚刚说什么？"),
      m("boy", "我养你啊。"),
      m("girl", "先把你自己养明白。"),
      m("boy", "那两个人一起省。"),
      m("girl", "怎么省？"),
      m("boy", "演员训练班，家属免费。")
    ]
  },
  {
    id: "viral-daughter-kingdom-520",
    title: "唐僧给女王发了 520",
    viralRoles: ["male", "female"],
    characterNames: { boy: "唐玄奘", girl: "女儿国国王" },
    prompt: "唐僧离开女儿国后，突然给女儿国国王发了一个 520 红包，备注却写着“功德随喜”。",
    nextPrompt: "女王收下红包，问他这算化缘还是还情债。",
    messages: [
      m("boy", "一点心意", { type: "transfer", amount: 520, transferNote: "功德随喜" }),
      m("girl", "御弟哥哥，佛门现在也过 520？"),
      m("boy", "路过女儿国，手滑。"),
      m("girl", "那你再滑一次给我看看。")
    ]
  },
  {
    id: "viral-baigujing-third-account",
    title: "白骨精的第三个小号",
    viralRoles: ["male", "female"],
    characterNames: { boy: "孙悟空", girl: "白骨精" },
    prompt: "白骨精用第三个微信小号添加孙悟空，好友验证写着“都见第三次了，能不能先聊天再动手”。",
    nextPrompt: "孙悟空通过好友后，第一句就问她这次用的是谁的头像。",
    messages: [
      m("girl", "都见第三次了，能不能先聊天再动手？"),
      m("boy", "你这次又是谁？"),
      m("girl", "先通过，再发原图。"),
      m("boy", "老孙就看你还有几个号。")
    ]
  },
  {
    id: "viral-old-crush-roommate",
    title: "房东把你推给我了",
    viralRoles: ["male", "female"],
    prompt: "男主是游戏公司的主策；女主是刚调回本地的记者，也是他高中时没能追到的人。两人会因合租重新靠近，过去的拒绝和误会也会逐渐被翻出来；此刻，女主发现新房钥匙在男主手里，而他第一句话就叫出了她多年前的绰号。",
    nextPrompt: "接着写女主坚持两人已经不熟，男主却从她的行李和旧钥匙扣里认出更多高中细节，合租第一晚开始翻旧账。",
    messages: [
      m("girl", "房东把你推给我了"),
      m("boy", "钥匙在我这里"),
      m("girl", "你知道我是谁？"),
      m("boy", "小刺猬，好久不见"),
      m("girl", "别叫那个名字"),
      m("boy", "那你当年别突然消失"),
      m("girl", "我们只是新室友"),
      m("boy", "门边房卡和旧钥匙扣局部：钥匙扣背面刻着高中毕业年份", { type: "image", assetId: "viral-photo-door-card", emotion: "旧物" }),
      m("girl", "你还留着这个？"),
      m("boy", "房东刚给的"),
      m("girl", "刻字也是房东刻的？"),
      m("boy", "你以前送的"),
      m("girl", "我不记得"),
      m("boy", "你擅长不记得"),
      m("girl", "今晚先把房间分清"),
      m("boy", "可以，旧账明天算")
    ]
  }
];
