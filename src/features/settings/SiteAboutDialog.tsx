import {
  ArrowLeft,
  Clapperboard,
  GitBranch,
  HeartHandshake,
  MessageCircleMore,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Volume2,
  VolumeX
} from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { AppCopy, AppLanguage } from "../../shared/i18n";
import { publicAsset } from "../../shared/publicPath";
import { BetaAboutIdentity } from "./BetaAboutIdentity";

type SiteAboutDialogProps = {
  open: boolean;
  copy: AppCopy;
  language?: AppLanguage;
  betaHackathon?: boolean;
  uiSoundEnabled?: boolean;
  onToggleUiSound?: () => void;
  onClose: () => void;
};

const betaAboutText = {
  "zh-CN": {
    header: "关于蛐蛐模拟器",
    subtitle: "黑客松作品 · 钉钉版",
    soundOn: "界面音效已开启，点击关闭",
    soundOff: "界面音效已关闭，点击开启",
    badge: "钉钉版",
    title: "把一句脑洞，变成一场钉钉职场群聊短剧",
    lead: "它不只是在复刻聊天界面，而是把大家最熟悉的钉钉群聊变成故事舞台：你负责抛出一句脑洞，AI 负责安排角色、语气、节奏与反转。",
    features: [
      { title: "一句话开场", body: "不用写剧本、不用配角色，一句话就能让群聊开演。", icon: MessageSquareText },
      { title: "AI 多角色调度", body: "角色会接话、误会、圆场，也会把普通对话推向意外反转。", icon: UsersRound },
      { title: "故事卡可控续写", body: "每一段都是可回看的故事节点，能续写、回滚，也能换条支线。", icon: GitBranch },
      { title: "钉钉原生沉浸", body: "熟悉的群聊、状态与职场语境，让笑点几乎不需要解释。", icon: Clapperboard }
    ],
    pitchTitle: "让每个普通人，都当一次职场短剧导演",
    pitchBody: "从“早点走进会议室”这样一句普通的办公室提醒开始，几秒钟后，它可以变成一场有角色、有节奏、有包袱的群聊小剧场。熟悉感负责让人看懂，AI 负责把故事推远，而你始终保留导演权。",
    pathLabel: "最短体验路径",
    path: ["输入一句脑洞", "AI 群聊开演", "继续、回滚或改写"],
    coverTitle: "02f｜早点走进会议室",
    coverBody: "一眼是钉钉，下一秒是职场喜剧。宣传封面也来自产品真实页面与角色。",
    judgeTitle: "为什么大众评委容易记住它",
    judgePoints: [
      "第一眼就懂：每个人都见过群聊，但没见过群聊自己演戏。",
      "第一下就会：不需要学习提示词，输入一句话就能获得完整反馈。",
      "第一轮就想续：故事不是一次性生成，还能沿着自己的脑洞继续分支。"
    ]
  },
  "zh-TW": {
    header: "關於蛐蛐模擬器",
    subtitle: "黑客松作品 · 釘釘版",
    soundOn: "介面音效已開啟，點擊關閉",
    soundOff: "介面音效已關閉，點擊開啟",
    badge: "釘釘版",
    title: "把一句腦洞，變成一場釘釘職場群聊短劇",
    lead: "它不只是在複刻聊天介面，而是把熟悉的釘釘群聊變成故事舞台：你拋出一句腦洞，AI 安排角色、語氣、節奏與反轉。",
    features: [
      { title: "一句話開場", body: "不用寫劇本、不用配角色，一句話就能讓群聊開演。", icon: MessageSquareText },
      { title: "AI 多角色調度", body: "角色會接話、誤會、圓場，也會把普通對話推向反轉。", icon: UsersRound },
      { title: "故事卡可控續寫", body: "每段都是故事節點，可以續寫、回滾，也能切換支線。", icon: GitBranch },
      { title: "釘釘原生沉浸", body: "熟悉的群聊與職場語境，讓笑點幾乎不需要解釋。", icon: Clapperboard }
    ],
    pitchTitle: "讓每個普通人，都當一次職場短劇導演",
    pitchBody: "從一句普通的辦公室提醒開始，幾秒鐘後就能變成有角色、有節奏、有包袱的群聊小劇場。熟悉感讓人看懂，AI 把故事推遠，而你始終保留導演權。",
    pathLabel: "最短體驗路徑",
    path: ["輸入一句腦洞", "AI 群聊開演", "繼續、回滾或改寫"],
    coverTitle: "02f｜早點走進會議室",
    coverBody: "一眼是釘釘，下一秒是職場喜劇。宣傳封面也來自產品真實頁面與角色。",
    judgeTitle: "為什麼大眾評審容易記住它",
    judgePoints: ["第一眼就懂：每個人都看過群聊，但沒看過群聊自己演戲。", "第一下就會：不用學提示詞，一句話就有完整回饋。", "第一輪就想續：故事不是一次性生成，還能繼續分支。"]
  },
  en: {
    header: "About Ququ Simulator",
    subtitle: "Hackathon entry · DingTalk edition",
    soundOn: "Interface sound is on. Activate to mute.",
    soundOff: "Interface sound is off. Activate to unmute.",
    badge: "DingTalk edition",
    title: "Turn one idea into a DingTalk workplace group-chat short",
    lead: "This is more than a chat mockup. It turns a familiar DingTalk group into a story stage: you provide one idea; AI directs the cast, tone, rhythm, and twist.",
    features: [
      { title: "Start with one line", body: "No script or casting needed. One sentence puts the group chat on stage.", icon: MessageSquareText },
      { title: "AI ensemble direction", body: "Characters react, misread, recover, and push an ordinary exchange toward a twist.", icon: UsersRound },
      { title: "Controllable story cards", body: "Continue, roll back, or branch from any story beat.", icon: GitBranch },
      { title: "Native DingTalk feel", body: "A familiar workplace language makes every joke instantly legible.", icon: Clapperboard }
    ],
    pitchTitle: "A workplace short-film director for everyone",
    pitchBody: "A plain reminder such as “get to the meeting room early” becomes a paced group-chat scene with characters and punchlines. Familiarity makes it readable, AI takes it further, and you keep the director’s chair.",
    pathLabel: "Fastest demo path",
    path: ["Enter one idea", "Watch the AI chat perform", "Continue, rewind, or rewrite"],
    coverTitle: "02f · Get to the meeting room early",
    coverBody: "DingTalk at first glance; workplace comedy a second later. The campaign cover uses the real product and cast.",
    judgeTitle: "Why it sticks with public judges",
    judgePoints: ["Instantly familiar: everyone knows group chat, but not one that performs its own story.", "Instantly usable: no prompt craft is required.", "Instantly replayable: every generation can continue or branch."]
  },
  ja: {
    header: "蛐蛐シミュレーターについて",
    subtitle: "ハッカソン作品 · DingTalk版",
    soundOn: "操作音はオンです。押すとミュートします。",
    soundOff: "操作音はオフです。押すとオンになります。",
    badge: "DingTalk版",
    title: "ひと言のアイデアを、DingTalk職場グループ短編へ",
    lead: "チャット画面の再現だけではありません。見慣れたDingTalkグループを物語の舞台にし、ひと言からAIが登場人物、口調、テンポ、どんでん返しを演出します。",
    features: [
      { title: "ひと言で開演", body: "脚本も配役も不要。ひと言でグループチャットが動き出します。", icon: MessageSquareText },
      { title: "AIの群像演出", body: "人物同士の反応や誤解が、普通の会話を意外な展開へ運びます。", icon: UsersRound },
      { title: "制御できる物語カード", body: "続きを作る、巻き戻す、別の分岐へ進むことができます。", icon: GitBranch },
      { title: "DingTalkらしい没入感", body: "見慣れた職場の文脈だから、笑いどころがすぐ伝わります。", icon: Clapperboard }
    ],
    pitchTitle: "誰もが一度、職場ショートドラマの監督に",
    pitchBody: "普通の会議室リマインドが、数秒後には登場人物とテンポとオチのある小劇場に変わります。親しみやすさが理解を助け、AIが物語を広げ、監督権はあなたに残ります。",
    pathLabel: "最短の体験ルート",
    path: ["ひと言入力", "AI群聊が開演", "続ける・戻す・書き換える"],
    coverTitle: "02f｜早めに会議室へ",
    coverBody: "最初はDingTalk、次の瞬間は職場コメディ。宣伝画像も実際の画面とキャラクターで構成しています。",
    judgeTitle: "一般審査員の記憶に残る理由",
    judgePoints: ["一目で分かる：誰もが知る群聊が、自分で物語を演じます。", "一度で使える：プロンプトの勉強は不要です。", "一度で続けたくなる：生成後も続きを分岐できます。"]
  }
} as const;

export function SiteAboutDialog({
  open,
  copy,
  language = "zh-CN",
  betaHackathon = false,
  uiSoundEnabled = true,
  onToggleUiSound,
  onClose
}: SiteAboutDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []);
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
      : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  const betaText = betaAboutText[language];

  return (
    <div className="about-dialog-layer about-dialog-subview-layer">
      <div className="about-dialog-backdrop about-dialog-subview-backdrop" data-uisfx="close" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className={betaHackathon ? "about-dialog about-dialog-site about-dialog-site-beta" : "about-dialog about-dialog-site"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-about-dialog-title"
        aria-describedby="site-about-dialog-description"
        onKeyDown={handleKeyDown}
      >
        <header className="about-dialog-header">
          <button className="about-dialog-icon-button" type="button" data-uisfx="back" aria-label={copy.backToSettings} autoFocus onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 id="site-about-dialog-title">{betaHackathon ? betaText.header : copy.aboutSite}</h2>
            <p>{betaHackathon ? betaText.subtitle : copy.aboutSubtitle}</p>
          </div>
          {betaHackathon && onToggleUiSound ? (
            <button
              className="about-dialog-icon-button beta-about-sound-toggle"
              type="button"
              data-uisfx-silent="true"
              aria-pressed={uiSoundEnabled}
              aria-label={uiSoundEnabled ? betaText.soundOn : betaText.soundOff}
              title={uiSoundEnabled ? betaText.soundOn : betaText.soundOff}
              onClick={onToggleUiSound}
            >
              {uiSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          ) : <span />}
        </header>

        {betaHackathon ? (
          <div className="site-about-content site-about-content-beta">
            <section className="beta-about-hero" aria-labelledby="beta-about-pitch-title">
              <BetaAboutIdentity language={language} />
              <div className="beta-about-title-wrap">
                <span className="beta-about-edition-badge"><Sparkles size={13} aria-hidden="true" />{betaText.badge}</span>
                <h3 id="beta-about-pitch-title">{betaText.title}</h3>
                <p id="site-about-dialog-description">{betaText.lead}</p>
              </div>
            </section>

            <section className="beta-about-feature-grid" aria-label={betaText.pitchTitle}>
              {betaText.features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="beta-about-feature" key={feature.title}>
                    <span className="beta-about-feature-icon"><Icon size={18} aria-hidden="true" /></span>
                    <div><h4>{feature.title}</h4><p>{feature.body}</p></div>
                  </article>
                );
              })}
            </section>

            <section className="beta-about-pitch">
              <p className="beta-about-kicker">{betaText.pitchTitle}</p>
              <p>{betaText.pitchBody}</p>
              <div className="beta-about-path" aria-label={betaText.pathLabel}>
                <strong>{betaText.pathLabel}</strong>
                <ol>
                  {betaText.path.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
                </ol>
              </div>
            </section>

            <figure className="beta-about-cover">
              <img
                src={publicAsset("/hackathon/ququ-dingtalk-cover-02f.webp")}
                alt={betaText.coverTitle}
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
              />
              <figcaption><strong>{betaText.coverTitle}</strong><span>{betaText.coverBody}</span></figcaption>
            </figure>

            <section className="beta-about-judge-card">
              <h4>{betaText.judgeTitle}</h4>
              <ul>{betaText.judgePoints.map((point) => <li key={point}>{point}</li>)}</ul>
            </section>

            <div className="site-about-note">
              <ShieldCheck size={17} aria-hidden="true" />
              <p>{copy.aboutPrivacy}</p>
            </div>
            <p className="site-about-disclaimer">{copy.aboutDisclaimer}</p>
          </div>
        ) : (
          <div className="site-about-content">
            <div className="site-about-mark" aria-hidden="true"><Sparkles size={22} /></div>
            <p id="site-about-dialog-description" className="site-about-lead">{copy.aboutLead}</p>
            <div className="site-about-feature-grid">
              <div className="site-about-feature">
                <HeartHandshake size={19} aria-hidden="true" />
                <strong>{copy.aboutEmotional}</strong>
              </div>
              <div className="site-about-feature">
                <MessageCircleMore size={19} aria-hidden="true" />
                <strong>{copy.aboutCreative}</strong>
              </div>
            </div>
            <div className="site-about-note">
              <ShieldCheck size={17} aria-hidden="true" />
              <p>{copy.aboutPrivacy}</p>
            </div>
            <p className="site-about-disclaimer">{copy.aboutDisclaimer}</p>
          </div>
        )}
      </section>
    </div>
  );
}
