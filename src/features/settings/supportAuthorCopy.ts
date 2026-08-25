import type { AppLanguage } from "../../shared/i18n";

export type SupportAuthorCopy = {
  wechat: string;
  alipay: string;
  back: string;
  title: string;
  subtitle: string;
  intro: string;
  praises: readonly string[];
  request: string;
  choosePayment: string;
  qr: string;
  preparing: string;
  openSource: string;
  copyOpenSource: string;
  wechatId: string;
  copyWechat: string;
  pendingWechat: string;
  homepage: string;
};

export const supportAuthorCopy: Record<AppLanguage, SupportAuthorCopy> = {
  "zh-CN": {
    wechat: "微信",
    alipay: "支付宝",
    back: "返回设置",
    title: "支持作者",
    subtitle: "开源链接和联系方式",
    intro: "这个工具会一直免费。",
    praises: [
      "谢谢你把喜欢变成鼓励。你的一点点支持，真的会让我开心很久！💛",
      "能为你带来一点快乐，我已经很满足；还能收到你的支持，就更幸运了！✨",
      "会支持独立作品的人，眼光和心意都很棒。谢谢你发现了这里！🌟",
      "懂得给创作者一点鼓励的人，真的又温柔又酷。谢谢你！😎",
      "会为好玩的小工具鼓掌的人，品味和人品都很在线。祝你今天诸事顺利！🎉",
      "能点开这个小窗口的人，一般都很有眼光。谢谢你让我的好心情直接续杯！☕",
      "你不只会发现有趣的东西，还愿意给它一点鼓励——这件事本身就很可爱！🥰",
      "谢谢你给这个聊天小宇宙续航。愿你发出的每条消息，都能等到想要的回应！💬",
      "你的支持比咖啡更提神。谢谢你让我有动力继续写梗、修细节、加新玩法！☕",
      "谢谢这位有品位的体验官。愿你聊天有梗、工作不卷、每天都有小惊喜！🎁",
      "愿意支持这个小世界的人，自带主角光环。谢谢你让下一段故事更快发生！🎬",
      "谢谢你陪这个小工具继续长大。愿你灵感在线、需求少改、下班准点！🚀"
    ],
    request: "也可以给我提要求，我会努力实现！",
    choosePayment: "选择收款方式",
    qr: "收款码",
    preparing: "收款码准备中",
    openSource: "开源链接",
    copyOpenSource: "复制开源链接",
    wechatId: "作者微信号",
    copyWechat: "复制作者微信号",
    pendingWechat: "作者微信号待补充",
    homepage: "作者主页"
  },
  "zh-TW": {
    wechat: "微信",
    alipay: "支付寶",
    back: "返回設定",
    title: "支持作者",
    subtitle: "開源連結與聯絡方式",
    intro: "這個工具會一直免費。",
    praises: [
      "謝謝你把喜歡變成鼓勵。你的一點點支持，真的會讓我開心很久！💛",
      "能為你帶來一點快樂，我已經很滿足；還能收到你的支持，就更幸運了！✨",
      "會支持獨立作品的人，眼光和心意都很棒。謝謝你發現了這裡！🌟",
      "懂得給創作者一點鼓勵的人，真的又溫柔又酷。謝謝你！😎",
      "會為好玩的小工具鼓掌的人，品味和人品都很在線。祝你今天諸事順利！🎉",
      "能點開這個小視窗的人，一般都很有眼光。謝謝你讓我的好心情直接續杯！☕",
      "你不只會發現有趣的東西，還願意給它一點鼓勵——這件事本身就很可愛！🥰",
      "謝謝你給這個聊天小宇宙續航。願你發出的每條訊息，都能等到想要的回應！💬",
      "你的支持比咖啡更提神。謝謝你讓我有動力繼續寫梗、修細節、加新玩法！☕",
      "謝謝這位有品味的體驗官。願你聊天有梗、工作不卷、每天都有小驚喜！🎁",
      "願意支持這個小世界的人，自帶主角光環。謝謝你讓下一段故事更快發生！🎬",
      "謝謝你陪這個小工具繼續長大。願你靈感在線、需求少改、準時下班！🚀"
    ],
    request: "也歡迎提出想法，我會努力實現！",
    choosePayment: "選擇付款方式",
    qr: "收款碼",
    preparing: "收款碼準備中",
    openSource: "開源連結",
    copyOpenSource: "複製開源連結",
    wechatId: "作者微信號",
    copyWechat: "複製作者微信號",
    pendingWechat: "作者微信號待補充",
    homepage: "作者首頁"
  },
  en: {
    wechat: "WeChat",
    alipay: "Alipay",
    back: "Back to settings",
    title: "Support the creator",
    subtitle: "Open source and contact details",
    intro: "This tool will stay free.",
    praises: [
      "Thank you for turning your enjoyment into encouragement. Even a little support from you will make me happy for a long time! 💛",
      "Knowing this brought you a little joy is already enough; receiving your support makes me even luckier! ✨",
      "People who support independent creations have wonderful taste and kind hearts. Thank you for finding this little place! 🌟",
      "Anyone who knows how to encourage a creator is genuinely kind and cool. Thank you! 😎",
      "People who applaud fun little tools have excellent taste and great character. Hope everything goes smoothly today! 🎉",
      "Anyone who opens this little window clearly has a good eye. Thanks for refilling my good mood! ☕",
      "You not only spot fun things, but choose to encourage them too—that is pretty adorable! 🥰",
      "Thank you for powering this little chat universe. May every message you send receive the reply you hope for! 💬",
      "Your support is more energizing than coffee. Thank you for keeping me excited to write jokes, polish details, and add new ways to play! ☕",
      "Thank you, discerning playtester. May your chats stay witty, your work stay light, and every day bring a small surprise! 🎁",
      "Anyone who supports this little world comes with main-character energy. Thank you for bringing the next story closer! 🎬",
      "Thank you for helping this little tool grow. May inspiration stay online, revisions stay few, and work end on time! 🚀"
    ],
    request: "Feature ideas are welcome too.",
    choosePayment: "Choose payment method",
    qr: "payment QR code",
    preparing: "QR code coming soon",
    openSource: "Open-source link",
    copyOpenSource: "Copy open-source link",
    wechatId: "Creator WeChat ID",
    copyWechat: "Copy creator WeChat ID",
    pendingWechat: "WeChat ID not set",
    homepage: "Creator website"
  },
  ja: {
    wechat: "WeChat",
    alipay: "Alipay",
    back: "設定に戻る",
    title: "作者を応援",
    subtitle: "オープンソース・連絡先",
    intro: "このツールはこれからも無料です。",
    praises: [
      "好きを応援に変えてくれてありがとう。ほんの少しの応援でも、ずっと嬉しい気持ちになります！💛",
      "少しでも楽しんでもらえたなら、それだけで十分幸せです。さらに応援までいただけたら、もっと幸運です！✨",
      "個人制作を応援してくれる人は、センスも気持ちも素敵です。ここを見つけてくれてありがとう！🌟",
      "クリエイターに励ましを届けられる人は、本当に優しくてかっこいい。ありがとう！😎",
      "楽しい小さなツールに拍手をくれる人は、センスも人柄も最高です。今日が順調な一日になりますように！🎉",
      "この小さな画面を開いてくれたあなたは、きっと見る目があります。気分までおかわりさせてくれてありがとう！☕",
      "楽しいものを見つけるだけでなく、そっと応援までしてくれる——そんなあなたがとても素敵です！🥰",
      "この小さなチャット宇宙に力をくれてありがとう。送ったメッセージに、望んだ返事が届きますように！💬",
      "あなたの応援はコーヒー以上に元気をくれます。ネタを考え、細部を磨き、新しい遊びを増やす力をありがとう！☕",
      "センスのいい体験者さん、ありがとう。会話にはユーモアを、仕事にはゆとりを、毎日には小さな驚きを！🎁",
      "この小さな世界を応援してくれる人には、主人公のオーラがあります。次の物語を近づけてくれてありがとう！🎬",
      "この小さなツールの成長を見守ってくれてありがとう。ひらめきは好調、修正は少なく、定時で帰れますように！🚀"
    ],
    request: "機能のリクエストも歓迎です。",
    choosePayment: "支払い方法を選択",
    qr: "支払いQRコード",
    preparing: "QRコードを準備中",
    openSource: "オープンソース",
    copyOpenSource: "リンクをコピー",
    wechatId: "作者のWeChat ID",
    copyWechat: "WeChat IDをコピー",
    pendingWechat: "WeChat ID未設定",
    homepage: "作者サイト"
  }
};

export const supportAuthorPraiseCount = supportAuthorCopy["zh-CN"].praises.length;

export function segmentSupportPraise(text: string, language: AppLanguage) {
  const segments = Array.from(
    new Intl.Segmenter(language, { granularity: "word" }).segment(text),
    ({ segment }) => segment
  );
  const tokens: string[] = [];

  for (const segment of segments) {
    if (/^[\p{P}\p{S}]+$/u.test(segment)) {
      let previousIndex = tokens.length - 1;
      while (previousIndex >= 0 && /^\s+$/u.test(tokens[previousIndex])) previousIndex -= 1;
      if (previousIndex >= 0) {
        tokens[previousIndex] += segment;
        continue;
      }
    }
    tokens.push(segment);
  }

  return tokens;
}

export function nextSupportPraiseIndex(currentIndex: number, randomValue = Math.random()) {
  if (supportAuthorPraiseCount <= 1) return 0;
  const normalizedRandom = Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON);
  if (currentIndex < 0) return Math.floor(normalizedRandom * supportAuthorPraiseCount);
  const offset = 1 + Math.floor(normalizedRandom * (supportAuthorPraiseCount - 1));
  return (currentIndex + offset) % supportAuthorPraiseCount;
}
