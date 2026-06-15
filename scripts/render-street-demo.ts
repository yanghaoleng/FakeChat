import { ensureRuntimeDirs } from "../server/paths";
import { renderProject } from "../server/render";
import { avatarById } from "../src/shared/avatarLibrary";
import type { DramaProject } from "../src/shared/schema";

const project: DramaProject = {
  id: "demo-street-wechat-mistaken-love",
  title: "街头搭讪后的误认局",
  brief: "男主白天在街上搭讪美女并加到微信。晚上美女把他误认成另一个人，吐露自己不能说的秘密。男主顺着演，最后发现真相，美女反而真的爱上了他。",
  stylePreset: "kuaishou-horizontal-chat",
  fps: 30,
  canvas: { width: 1516, height: 852 },
  characters: [
    {
      id: "boy",
      name: "我",
      side: "right",
      avatarInitial: "我",
      avatarUrl: avatarById("boy-neon-blur")?.url,
      avatarGradient: "linear-gradient(135deg,#111827,#065f46)",
      voiceId: "boy-playful",
      voicePreset: "young_male",
      voiceDescription: "特别青年音的真实男生，20岁出头，声音干净偏低一点，嘴贫但自然，后面有点心动和慌，像真人微信语音"
    },
    {
      id: "girl",
      name: "林夏",
      side: "left",
      avatarInitial: "夏",
      avatarUrl: avatarById("girl-nostalgia-dark")?.url,
      avatarGradient: "linear-gradient(135deg,#fb7185,#7c3aed)",
      voiceId: "girl-secretive",
      voicePreset: "young_real_female",
      voiceDescription: "非常年轻的真实女生，18到22岁，声音清亮自然，有轻微气声，漂亮冷感，夜里脆弱，后面变得认真，像真人微信语音"
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
      remoteUrl: "https://koishi.js.org/QFace/assets/qq_emoji/0/png/0.png",
      tags: ["震惊", "破防", "误会"],
      riskLevel: "restricted"
    },
    {
      id: "meme-qface-facepalm",
      kind: "meme",
      title: "捂脸表情",
      sourceName: "QFace",
      sourceUrl: "https://github.com/koishijs/QFace",
      licenseNote: "腾讯官方表情资源，仅供学习交流，请勿直接商用。",
      remoteUrl: "https://koishi.js.org/QFace/assets/qq_emoji/124/png/124.png",
      tags: ["尴尬", "捂脸", "社死"],
      riskLevel: "restricted"
    },
    {
      id: "street-photo",
      kind: "image",
      title: "街角照片占位",
      sourceName: "Local Placeholder",
      sourceUrl: "",
      licenseNote: "本地占位图，正式发布前替换成授权街拍/生成图。",
      tags: ["街头", "搭讪", "证据"],
      riskLevel: "safe"
    }
  ],
  messages: [
    { id: "m01", roleId: "boy", side: "right", type: "text", text: "到家了吗", emotion: "试探", sendSfx: "send", pauseMs: 300, holdMs: 1250 },
    { id: "m02", roleId: "girl", side: "left", type: "text", text: "你终于回我了", emotion: "委屈", sendSfx: "send", pauseMs: 360, holdMs: 1450 },
    { id: "m03", roleId: "boy", side: "right", type: "text", text: "啊？我们认识很久？", emotion: "疑惑", sendSfx: "send", pauseMs: 340, holdMs: 1600 },
    { id: "m04", roleId: "girl", side: "left", type: "text", text: "别装了，阿沉", emotion: "压抑", sendSfx: "send", pauseMs: 390, holdMs: 1600 },
    { id: "m05", roleId: "boy", side: "right", type: "meme", text: "我人傻了", ttsText: "我人傻了。", assetId: "meme-qface-shock", imageUrl: "https://koishi.js.org/QFace/assets/qq_emoji/0/png/0.png", emotion: "震惊", sendSfx: "meme", pauseMs: 560, holdMs: 2300 },
    { id: "m06", roleId: "boy", side: "right", type: "text", text: "你先说", emotion: "顺着演", sendSfx: "send", pauseMs: 320, holdMs: 1200 },
    { id: "m07", roleId: "girl", side: "left", type: "text", text: "今天街上那个人", emotion: "不安", sendSfx: "send", pauseMs: 340, holdMs: 1450 },
    { id: "m08", roleId: "girl", side: "left", type: "text", text: "他长得太像你了", emotion: "恍惚", sendSfx: "send", pauseMs: 380, holdMs: 1650 },
    { id: "m09", roleId: "boy", side: "right", type: "text", text: "所以你才加我？", emotion: "抓重点", sendSfx: "send", pauseMs: 330, holdMs: 1400 },
    { id: "m10", roleId: "girl", side: "left", type: "text", text: "我以为是你回来了", emotion: "脆弱", sendSfx: "send", pauseMs: 420, holdMs: 1700 },
    { id: "m11", roleId: "girl", side: "left", type: "image", text: "白天街角照片", ttsText: "你看，就是这里。", assetId: "street-photo", emotion: "回忆", sendSfx: "image", pauseMs: 620, holdMs: 2700 },
    { id: "m12", roleId: "boy", side: "right", type: "text", text: "这不就是我吗", emotion: "心虚", sendSfx: "send", pauseMs: 320, holdMs: 1300 },
    { id: "m13", roleId: "girl", side: "left", type: "text", text: "不，你不是", emotion: "笃定", sendSfx: "send", pauseMs: 360, holdMs: 1200 },
    { id: "m14", roleId: "girl", side: "left", type: "text", text: "阿沉三年前死了", emotion: "爆点", sendSfx: "send", pauseMs: 600, holdMs: 1900 },
    { id: "m15", roleId: "boy", side: "right", type: "text", text: "你别吓我", emotion: "慌张", sendSfx: "send", pauseMs: 360, holdMs: 1200 },
    { id: "m16", roleId: "girl", side: "left", type: "text", text: "我一直没告诉别人", emotion: "秘密", sendSfx: "send", pauseMs: 420, holdMs: 1700 },
    { id: "m17", roleId: "girl", side: "left", type: "text", text: "我不是路过那条街", emotion: "自责", sendSfx: "send", pauseMs: 380, holdMs: 1500 },
    { id: "m18", roleId: "girl", side: "left", type: "text", text: "我每天都去等他", emotion: "崩溃边缘", sendSfx: "send", pauseMs: 500, holdMs: 1800 },
    { id: "m19", roleId: "boy", side: "right", type: "text", text: "那今天呢", emotion: "认真", sendSfx: "send", pauseMs: 320, holdMs: 1100 },
    { id: "m20", roleId: "girl", side: "left", type: "text", text: "今天我想结束了", emotion: "危险", sendSfx: "send", pauseMs: 650, holdMs: 1900 },
    { id: "m21", roleId: "boy", side: "right", type: "text", text: "别乱来", emotion: "急切", sendSfx: "send", pauseMs: 320, holdMs: 1300 },
    { id: "m22", roleId: "boy", side: "right", type: "text", text: "我陪你聊到天亮", emotion: "真心", sendSfx: "send", pauseMs: 390, holdMs: 1700 },
    { id: "m23", roleId: "girl", side: "left", type: "text", text: "你不是他", emotion: "清醒", sendSfx: "send", pauseMs: 420, holdMs: 1300 },
    { id: "m24", roleId: "girl", side: "left", type: "text", text: "但你刚刚那句话", emotion: "被击中", sendSfx: "send", pauseMs: 420, holdMs: 1600 },
    { id: "m25", roleId: "girl", side: "left", type: "text", text: "他从来没说过", emotion: "反转", sendSfx: "send", pauseMs: 600, holdMs: 1700 },
    { id: "m26", roleId: "boy", side: "right", type: "text", text: "所以你没认错？", emotion: "试探反转", sendSfx: "send", pauseMs: 360, holdMs: 1300 },
    { id: "m27", roleId: "girl", side: "left", type: "text", text: "我从第一眼就知道", emotion: "承认", sendSfx: "send", pauseMs: 500, holdMs: 1600 },
    { id: "m28", roleId: "girl", side: "left", type: "text", text: "你不是阿沉", emotion: "坦白", sendSfx: "send", pauseMs: 360, holdMs: 1200 },
    { id: "m29", roleId: "girl", side: "left", type: "text", text: "我是故意加你的", emotion: "真相", sendSfx: "send", pauseMs: 560, holdMs: 1700 },
    { id: "m30", roleId: "boy", side: "right", type: "meme", text: "被套路了", ttsText: "我这是被套路了？", assetId: "meme-qface-facepalm", imageUrl: "https://koishi.js.org/QFace/assets/qq_emoji/124/png/124.png", emotion: "社死", sendSfx: "meme", pauseMs: 520, holdMs: 2300 },
    { id: "m31", roleId: "girl", side: "left", type: "text", text: "嗯，但我后悔了", emotion: "温柔", sendSfx: "send", pauseMs: 420, holdMs: 1400 },
    { id: "m32", roleId: "girl", side: "left", type: "text", text: "本来想利用你", emotion: "内疚", sendSfx: "send", pauseMs: 360, holdMs: 1300 },
    { id: "m33", roleId: "girl", side: "left", type: "text", text: "现在想认识你", emotion: "动心", sendSfx: "send", pauseMs: 600, holdMs: 1700 },
    { id: "m34", roleId: "boy", side: "right", type: "transfer", text: "给你买热牛奶", ttsText: "先给你买杯热牛奶，别再去那条街等了。", amount: 18.8, transferNote: "你发起了一笔转账", emotion: "认真", sendSfx: "transfer", pauseMs: 620, holdMs: 1900 },
    { id: "m35", roleId: "girl", side: "left", type: "text", text: "明天还在那条街吗", emotion: "期待", sendSfx: "send", pauseMs: 420, holdMs: 1500 },
    { id: "m36", roleId: "boy", side: "right", type: "text", text: "在，但这次我等你", emotion: "收束", sendSfx: "send", pauseMs: 800, holdMs: 2200 }
  ],
  sfx: {},
  audioMix: { ttsVolume: 1, sfxVolume: 0.28, ambientVolume: 0.035, limiterPeakDb: -1 }
};

await ensureRuntimeDirs();
const result = await renderProject(project);
console.log(JSON.stringify({ outputPath: result.outputPath, outputUrl: result.outputUrl, durationInFrames: result.durationInFrames }, null, 2));
