import type { PresetStory } from "./presetStories.js";

type PresetMessage = PresetStory["messages"][number];

const m = (
  roleId: string,
  text: string,
  options: Omit<PresetMessage, "roleId" | "text"> = {}
): PresetMessage => ({ roleId, text, ...options });

export const viralPresetStories: PresetStory[] = [
  {
    id: "viral-double-life-clerk",
    title: "下班后别叫我店员",
    prompt: "男主是经常深夜买咖啡的广告策划；女主是白天温柔的便利店员，晚上却用另一个微信做乐队鼓手。男主分别加了她两个账号，却不知道是同一个人，两段关系会同时升温并逐渐撞车；今晚，他把只告诉过店员的秘密发给了她的夜间账号。",
    nextPrompt: "接着写男主从咖啡口味和女主手链发现两个账号属于同一个人，女主继续嘴硬，只承认自己认识那位店员。",
    messages: [
      m("girl", "今晚别来找店里的我"),
      m("boy", "你认识那个店员？"),
      m("girl", "比你早认识"),
      m("boy", "她今天请假了？"),
      m("girl", "她今晚在台上"),
      m("boy", "你到底是谁"),
      m("girl", "夜晚街道路灯空镜：便利店招牌旁贴着一张临时演出海报", { type: "image", assetId: "viral-photo-night-street", emotion: "露馅" }),
      m("boy", "海报上那条手链"),
      m("girl", "手链很常见"),
      m("boy", "咖啡也无糖？"),
      m("girl", "你只跟她说过？"),
      m("boy", "我刚刚只跟你说了"),
      m("girl", "那就当我听错了"),
      m("boy", "十点二十，无糖"),
      m("girl", "明晚别迟到"),
      m("boy", "去便利店还是演出"),
      m("girl", "看你想见谁")
    ]
  },
  {
    id: "viral-old-crush-roommate",
    title: "房东把你推给我了",
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
  },
  {
    id: "viral-double-lease-lawyers",
    title: "一套房，两份合同",
    prompt: "男主是嘴毒但专业的律所合伙人；女主是第二天即将入职的新人律师。两人被同一位房东一房两租，白天会成为上下级，晚上却不得不暂时合住；此刻，两人都拿着有效合同站在门外，谁也不肯离开。",
    nextPrompt: "接着写两人开始逐条检查租房合同，女主先发现房东留下的漏洞，男主则认出她就是明早要来报到的新人。",
    messages: [
      m("girl", "你现在在门口吗"),
      m("boy", "你怎么有我微信"),
      m("girl", "房东发的"),
      m("boy", "让你来交钥匙？"),
      m("girl", "让我来住"),
      m("boy", "这套房我租了"),
      m("girl", "门口鞋子、行李箱和两份同地址租房合同局部", { type: "image", assetId: "viral-photo-shoes-door", emotion: "双合同" }),
      m("boy", "签约日期也是今天"),
      m("girl", "你不会是房托吧"),
      m("boy", "先进去，再报警"),
      m("girl", "谁跟你一起进去"),
      m("boy", "明早九点你还要入职"),
      m("girl", "你怎么知道"),
      m("boy", "衡川律所，对吧"),
      m("girl", "你是面试里那个合伙人？"),
      m("boy", "也是你今晚的室友"),
      m("girl", "我现在辞职还来得及吗")
    ]
  },
  {
    id: "viral-second-phone-persona",
    title: "你把另一部手机落下了",
    prompt: "男主是擅长经营精英形象的投资经理；女主是同样习惯假装成熟的初级律师。两人会在互相试探中逐渐拆穿彼此的人设；此刻，女主在出差返程时拿错了男主的备用手机，男主突然发来消息，让她千万不要解锁。",
    nextPrompt: "接着写备用手机上的匿名账号弹出一条新提醒，女主发现男主一直在记录两人的偶遇，而男主反过来指出她也有一套假装精致的朋友圈。",
    messages: [
      m("boy", "别解锁那部手机"),
      m("girl", "你怎么知道在我这"),
      m("boy", "定位开着"),
      m("girl", "锁屏已经亮了"),
      m("boy", "看见什么了"),
      m("girl", "你不是没有朋友圈吗"),
      m("boy", "那不是朋友圈"),
      m("girl", "手边手机亮屏局部：匿名账号草稿写着她在返程车上睡着了", { type: "image", assetId: "viral-photo-hand-phone", emotion: "人设裂缝" }),
      m("boy", "只是随手记录"),
      m("girl", "连我耳环颜色都记录？"),
      m("boy", "职业习惯"),
      m("girl", "投资也看耳环？"),
      m("boy", "你朋友圈的书也没翻过"),
      m("girl", "你调查我"),
      m("boy", "彼此彼此"),
      m("girl", "手机可以还你"),
      m("boy", "条件呢"),
      m("girl", "当面交换真话")
    ]
  },
  {
    id: "viral-wrong-interview-target",
    title: "采访对象加错了",
    prompt: "男主是低调的科技投资人；女主是想拿下独家采访的财经记者。女主误以为他是前任新欢的哥哥，带着一点报复心主动接近，而男主早已看穿却没有拆穿；此刻，她刚发出一句越界的试探，第二天的正式采访还没开始。",
    nextPrompt: "接着写男主把女主最初的好友验证备注截给她看，证明自己从一开始就知道她认错了人，却仍然答应了采访。",
    messages: [
      m("girl", "采访提纲发你了"),
      m("boy", "第七题不像公事"),
      m("girl", "哪一题"),
      m("boy", "有没有女朋友"),
      m("girl", "人物背景调查"),
      m("boy", "还是想报复前任"),
      m("girl", "你什么意思"),
      m("boy", "模糊聊天屏幕：最初的好友验证备注写着她哥哥", { type: "image", assetId: "viral-photo-phone-chat", emotion: "认错人" }),
      m("girl", "你早就看到了？"),
      m("boy", "我不是她哥哥"),
      m("girl", "那你是谁"),
      m("boy", "她哥哥的投资人"),
      m("girl", "为什么不早说"),
      m("boy", "想看你能试探到哪"),
      m("girl", "现在看够了吗"),
      m("boy", "采访还没开始"),
      m("girl", "第七题删掉"),
      m("boy", "来不及，我记住了")
    ]
  },
  {
    id: "viral-old-game-id",
    title: "这个 ID 你用了十年",
    prompt: "男主是游戏公司的算法工程师；女主是游戏水平很差却立了高手人设的生活博主。女主秘密请他做陪练，却不知道他是多年未见的高中同桌；此刻，男主通过她用了十年的游戏 ID 认出了她，而她的直播考核只剩三天。",
    nextPrompt: "接着写男主用只有高中同桌才知道的旧称呼试探女主，女主一边否认身份，一边不得不请他继续陪练保住工作。",
    messages: [
      m("girl", "今晚能带我上分吗"),
      m("boy", "先回答一个问题"),
      m("girl", "加钱不行？"),
      m("boy", "这个 ID 用了十年？"),
      m("girl", "你怎么知道"),
      m("boy", "头像也没换"),
      m("girl", "游戏资料页局部：旧账号创建日期是十年前，头像是一只手绘小猫", { type: "image", assetId: "viral-photo-phone-chat", emotion: "旧账号" }),
      m("boy", "小班长"),
      m("girl", "别乱叫"),
      m("boy", "你高中也这么说"),
      m("girl", "你是谁"),
      m("boy", "数学课坐你右边"),
      m("girl", "不可能"),
      m("boy", "你还欠我一顿夜宵"),
      m("girl", "那个人早就不联系了"),
      m("boy", "现在联系上了"),
      m("girl", "三天后我有直播考核"),
      m("boy", "那先还一局")
    ]
  }
];
