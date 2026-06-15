import { ensureRuntimeDirs } from "../server/paths";
import { renderProject } from "../server/render";
import { avatarById } from "../src/shared/avatarLibrary";
import type { DramaProject } from "../src/shared/schema";

const project: DramaProject = {
  id: "demo-girlfriend-test-chat",
  title: "陌生美女加好友试探局",
  brief:
    "男主被陌生女子主动加好友。对方热情搭讪、反复撩拨，男主逐渐被带进暧昧节奏，却从细节里发现她可能是女友派来的试探。男主顺势反将一军逃过一劫，最后试探女生反而动心，暗示想真正私下约他。",
  stylePreset: "kuaishou-horizontal-chat",
  fps: 30,
  canvas: { width: 1516, height: 852 },
  characters: [
    {
      id: "boy",
      name: "我",
      side: "right",
      avatarInitial: "我",
      avatarUrl: avatarById("boy-mono-blur")?.url,
      avatarGradient: "linear-gradient(135deg,#111827,#155e75)",
      voiceId: "boy-composed",
      voicePreset: "young_male",
      voiceDescription:
        "特别青年音的真实男生，20岁出头，声音干净偏低一点，前面被撩到有点心虚，后面冷静反击但不油腻，像真人微信语音"
    },
    {
      id: "girl",
      name: "许晚",
      side: "left",
      avatarInitial: "晚",
      avatarUrl: avatarById("girl-soft-flash")?.url,
      avatarGradient: "linear-gradient(135deg,#fb7185,#7c3aed)",
      voiceId: "girl-flirty",
      voicePreset: "young_real_female",
      voiceDescription:
        "非常年轻的真实女生，20岁左右，声音清亮自然，有轻微气声，前面主动暧昧带一点坏笑，后面被戳穿时慌一下，最后变得认真又不甘心，像真人微信语音"
    }
  ],
  assets: [
    {
      id: "meme-qface-shock",
      kind: "meme",
      title: "震惊表情",
      sourceName: "QFace",
      sourceUrl: "https://github.com/koishijs/QFace",
      licenseNote: "腾讯官方表情资源，仅供学习交流，请勿直接商用。",
      tags: ["震惊", "心虚", "反转"],
      riskLevel: "restricted"
    },
    {
      id: "meme-qface-facepalm",
      kind: "meme",
      title: "捂脸表情",
      sourceName: "QFace",
      sourceUrl: "https://github.com/koishijs/QFace",
      licenseNote: "腾讯官方表情资源，仅供学习交流，请勿直接商用。",
      tags: ["尴尬", "被抓", "社死"],
      riskLevel: "restricted"
    },
    {
      id: "clue-screenshot",
      kind: "image",
      title: "朋友圈截图占位",
      sourceName: "Local Placeholder",
      sourceUrl: "",
      licenseNote: "本地占位图，正式发布前替换成授权截图或生成图。",
      tags: ["朋友圈", "线索", "女友"],
      riskLevel: "safe"
    }
  ],
  messages: [
    { id: "m01", roleId: "girl", side: "left", type: "text", text: "通过一下呀", emotion: "主动", sendSfx: "send", pauseMs: 340, holdMs: 1200 },
    { id: "m02", roleId: "girl", side: "left", type: "text", text: "你头像看着不像坏人", emotion: "轻撩", sendSfx: "send", pauseMs: 360, holdMs: 1450 },
    { id: "m03", roleId: "boy", side: "right", type: "text", text: "我们认识？", emotion: "警觉", sendSfx: "send", pauseMs: 330, holdMs: 1200 },
    { id: "m04", roleId: "girl", side: "left", type: "text", text: "现在不就认识了", emotion: "压着笑", sendSfx: "send", pauseMs: 340, holdMs: 1300 },
    { id: "m05", roleId: "girl", side: "left", type: "text", text: "你叫宋屿对吧", emotion: "抛钩子", sendSfx: "send", pauseMs: 420, holdMs: 1400 },
    { id: "m06", roleId: "boy", side: "right", type: "text", text: "你怎么知道", emotion: "被勾起", sendSfx: "send", pauseMs: 300, holdMs: 1200 },
    { id: "m07", roleId: "girl", side: "left", type: "text", text: "秘密", emotion: "暧昧", sendSfx: "send", pauseMs: 380, holdMs: 1100 },
    { id: "m08", roleId: "girl", side: "left", type: "text", text: "而且我还知道你今晚一个人", emotion: "进攻", sendSfx: "send", pauseMs: 470, holdMs: 1600 },
    { id: "m09", roleId: "boy", side: "right", type: "meme", text: "有点不对劲", ttsText: "你这就有点不对劲了。", assetId: "meme-qface-shock", emotion: "心虚", sendSfx: "meme", pauseMs: 540, holdMs: 2300 },
    { id: "m10", roleId: "girl", side: "left", type: "text", text: "怕什么", emotion: "撩拨", sendSfx: "send", pauseMs: 360, holdMs: 1100 },
    { id: "m11", roleId: "girl", side: "left", type: "text", text: "你女朋友又不在旁边", emotion: "试探", sendSfx: "send", pauseMs: 560, holdMs: 1700 },
    { id: "m12", roleId: "boy", side: "right", type: "text", text: "你还知道我有女朋友？", emotion: "起疑", sendSfx: "send", pauseMs: 360, holdMs: 1500 },
    { id: "m13", roleId: "girl", side: "left", type: "text", text: "朋友圈不难猜", emotion: "圆场", sendSfx: "send", pauseMs: 360, holdMs: 1200 },
    { id: "m14", roleId: "girl", side: "left", type: "image", text: "朋友圈截图", ttsText: "你这个朋友圈，挺好猜的。", assetId: "clue-screenshot", emotion: "证据", sendSfx: "image", pauseMs: 640, holdMs: 2700 },
    { id: "m15", roleId: "girl", side: "left", type: "text", text: "但我不介意", emotion: "加码", sendSfx: "send", pauseMs: 360, holdMs: 1150 },
    { id: "m16", roleId: "girl", side: "left", type: "text", text: "优秀的人有点归属感，很正常", emotion: "夸赞", sendSfx: "send", pauseMs: 480, holdMs: 1700 },
    { id: "m17", roleId: "boy", side: "right", type: "text", text: "你这话术挺熟", emotion: "半推半就", sendSfx: "send", pauseMs: 320, holdMs: 1300 },
    { id: "m18", roleId: "girl", side: "left", type: "text", text: "那你喜不喜欢听", emotion: "逼近", sendSfx: "send", pauseMs: 460, holdMs: 1400 },
    { id: "m19", roleId: "boy", side: "right", type: "text", text: "正常男的都顶不住吧", emotion: "松动", sendSfx: "send", pauseMs: 380, holdMs: 1500 },
    { id: "m20", roleId: "girl", side: "left", type: "text", text: "那十点出来", emotion: "邀约", sendSfx: "send", pauseMs: 440, holdMs: 1200 },
    { id: "m21", roleId: "girl", side: "left", type: "text", text: "我在你楼下那家便利店", emotion: "强钩", sendSfx: "send", pauseMs: 560, holdMs: 1650 },
    { id: "m22", roleId: "boy", side: "right", type: "text", text: "你连我住哪都知道？", emotion: "警觉升级", sendSfx: "send", pauseMs: 360, holdMs: 1500 },
    { id: "m23", roleId: "girl", side: "left", type: "text", text: "你女朋友发过定位啊", emotion: "露线索", sendSfx: "send", pauseMs: 520, holdMs: 1600 },
    { id: "m24", roleId: "boy", side: "right", type: "text", text: "她从来不发定位", emotion: "发现漏洞", sendSfx: "send", pauseMs: 560, holdMs: 1500 },
    { id: "m25", roleId: "girl", side: "left", type: "text", text: "那可能我记错了", emotion: "慌一下", sendSfx: "send", pauseMs: 460, holdMs: 1300 },
    { id: "m26", roleId: "boy", side: "right", type: "text", text: "还有一件事", emotion: "下套", sendSfx: "send", pauseMs: 360, holdMs: 1100 },
    { id: "m27", roleId: "boy", side: "right", type: "text", text: "她才会叫我小岛", emotion: "反击", sendSfx: "send", pauseMs: 460, holdMs: 1500 },
    { id: "m28", roleId: "boy", side: "right", type: "text", text: "你刚刚撤回那句也叫了", emotion: "戳穿", sendSfx: "send", pauseMs: 620, holdMs: 1800 },
    { id: "m29", roleId: "girl", side: "left", type: "meme", text: "露馅了", ttsText: "好吧，露馅了。", assetId: "meme-qface-facepalm", emotion: "尴尬", sendSfx: "meme", pauseMs: 580, holdMs: 2300 },
    { id: "m30", roleId: "girl", side: "left", type: "text", text: "是安安让我加你的", emotion: "坦白", sendSfx: "send", pauseMs: 520, holdMs: 1500 },
    { id: "m31", roleId: "girl", side: "left", type: "text", text: "她说你最近太会哄人了", emotion: "解释", sendSfx: "send", pauseMs: 420, holdMs: 1600 },
    { id: "m32", roleId: "girl", side: "left", type: "text", text: "想看看你会不会接招", emotion: "试探真相", sendSfx: "send", pauseMs: 480, holdMs: 1600 },
    { id: "m33", roleId: "boy", side: "right", type: "text", text: "所以刚才全程录屏？", emotion: "冷静", sendSfx: "send", pauseMs: 360, holdMs: 1300 },
    { id: "m34", roleId: "girl", side: "left", type: "text", text: "前半段是", emotion: "停顿", sendSfx: "send", pauseMs: 560, holdMs: 1100 },
    { id: "m35", roleId: "girl", side: "left", type: "text", text: "后半段我没舍得发", emotion: "变调", sendSfx: "send", pauseMs: 620, holdMs: 1600 },
    { id: "m36", roleId: "boy", side: "right", type: "text", text: "什么意思", emotion: "预感不妙", sendSfx: "send", pauseMs: 360, holdMs: 1100 },
    { id: "m37", roleId: "girl", side: "left", type: "text", text: "意思是", emotion: "真心试探", sendSfx: "send", pauseMs: 420, holdMs: 900 },
    { id: "m38", roleId: "girl", side: "left", type: "text", text: "你刚才拒绝得太漂亮了", emotion: "被吸引", sendSfx: "send", pauseMs: 560, holdMs: 1700 },
    { id: "m39", roleId: "girl", side: "left", type: "text", text: "如果不是她男朋友，我真想约你喝一杯", emotion: "暗示", sendSfx: "send", pauseMs: 620, holdMs: 1800 },
    { id: "m40", roleId: "boy", side: "right", type: "text", text: "这句我也截图了", emotion: "反手", sendSfx: "send", pauseMs: 380, holdMs: 1300 },
    { id: "m41", roleId: "girl", side: "left", type: "text", text: "别发", emotion: "急", sendSfx: "send", pauseMs: 360, holdMs: 900 },
    { id: "m42", roleId: "girl", side: "left", type: "text", text: "这是我自己的私心", emotion: "坦白", sendSfx: "send", pauseMs: 520, holdMs: 1500 },
    { id: "m43", roleId: "girl", side: "left", type: "text", text: "明天下午三点，咖啡店二楼", emotion: "再次暗示", sendSfx: "send", pauseMs: 650, holdMs: 1700 },
    { id: "m44", roleId: "girl", side: "left", type: "text", text: "你不来，我就当今晚只是测试", emotion: "留钩子", sendSfx: "send", pauseMs: 700, holdMs: 1900 },
    { id: "m45", roleId: "boy", side: "right", type: "text", text: "我会去", emotion: "反转停顿", sendSfx: "send", pauseMs: 520, holdMs: 1200 },
    { id: "m46", roleId: "boy", side: "right", type: "text", text: "带安安一起", emotion: "逃过一劫", sendSfx: "send", pauseMs: 900, holdMs: 2200 }
  ],
  sfx: {},
  audioMix: { ttsVolume: 1, sfxVolume: 0.28, ambientVolume: 0.035, limiterPeakDb: -1 }
};

await ensureRuntimeDirs();
const result = await renderProject(project);
console.log(JSON.stringify({ outputPath: result.outputPath, outputUrl: result.outputUrl, durationInFrames: result.durationInFrames }, null, 2));
