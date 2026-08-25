import {
  ArrowLeft,
  HeartHandshake,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
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
    soundOn: "界面音效已开启，点击关闭",
    soundOff: "界面音效已关闭，点击开启",
    title: "把一句脑洞，变成一场会自己演下去的群聊",
    lead: "你不用写剧本，也不用先想好每个人怎么说话。输入一句你想看的场面，叫叫、铃铛和猪小弟就会接住这个开头，把它演成一段有来有回的群聊故事。",
    sections: [
      {
        title: "先从一句想看的话开始",
        body: "可以是一句办公室提醒，也可以是一件突然发生的小事。比如“早点走进会议室”“群里突然多了一位陌生人”。开头越具体，角色越容易马上接住。"
      },
      {
        title: "生成以后，先看他们怎么接",
        body: "三个角色不是轮流念台词，而会按照各自的语气接话、误会、圆场和拱火。先完整看完第一段，你会更容易发现下一步想推谁，或者想把哪句话放大。"
      },
      {
        title: "想让故事更好玩，就继续加料",
        body: "续写时不要只说“继续”。试着补一个变化：让铃铛突然认真，让猪小弟理解错重点，或者让叫叫丢出一条新消息。变化越具体，越容易长出新的包袱。"
      },
      {
        title: "走偏了，就从上一张故事卡回来",
        body: "每次生成都会留下一张故事卡。你可以沿着它继续，也可以回到前一段换个方向，不用为了救一条不喜欢的剧情从头再来。"
      },
      {
        title: "它为什么会让人想再玩一轮",
        body: "熟悉的群聊界面让你几乎不用学习规则，不同角色的性格又会让同一句开场长出完全不同的反应。好笑的地方，往往就藏在“我以为他会这么说，结果他偏偏没这么说”里。"
      },
      {
        title: "你才是这场群聊的导演",
        body: "AI 负责即兴和接戏，你负责决定场景、冲突和下一次转弯。多试几种开头，多给角色一点明确的变化，最好玩的版本通常不是一次生成出来的，而是被你一步步带出来的。"
      }
    ],
    coverAlt: "早点走进会议室的群聊故事宣传图",
    privacyTitle: "关于你的内容"
  },
  "zh-TW": {
    header: "關於蛐蛐模擬器",
    soundOn: "介面音效已開啟，點擊關閉",
    soundOff: "介面音效已關閉，點擊開啟",
    title: "把一句腦洞，變成一場會自己演下去的群聊",
    lead: "你不用寫劇本，也不用先想好每個人怎麼說話。輸入一句想看的場面，叫叫、鈴鐺和豬小弟就會接住這個開頭，把它演成一段有來有回的群聊故事。",
    sections: [
      { title: "先從一句想看的話開始", body: "可以是一句辦公室提醒，也可以是一件突然發生的小事。像是「早點走進會議室」或「群裡突然多了一位陌生人」。開頭越具體，角色越容易接住。" },
      { title: "生成以後，先看他們怎麼接", body: "三個角色不是輪流念台詞，而會依照自己的語氣接話、誤會、圓場和拱火。先看完整段，你會更容易發現下一步想推誰，或想把哪句話放大。" },
      { title: "想讓故事更好玩，就繼續加料", body: "續寫時不要只說「繼續」。試著補一個變化：讓鈴鐺突然認真、讓豬小弟理解錯重點，或讓叫叫丟出一條新消息。變化越具體，越容易長出新的包袱。" },
      { title: "走偏了，就從上一張故事卡回來", body: "每次生成都會留下一張故事卡。你可以沿著它繼續，也可以回到前一段換個方向，不必為了救一條不喜歡的劇情從頭再來。" },
      { title: "它為什麼會讓人想再玩一輪", body: "熟悉的群聊介面讓你幾乎不用學規則，不同角色的性格又會讓同一句開場長出完全不同的反應。笑點常常就藏在意料之外的接話裡。" },
      { title: "你才是這場群聊的導演", body: "AI 負責即興和接戲，你負責決定場景、衝突和下一次轉彎。多試幾種開頭，多給角色明確的變化，最好玩的版本通常是被你一步步帶出來的。" }
    ],
    coverAlt: "早點走進會議室的群聊故事宣傳圖",
    privacyTitle: "關於你的內容"
  },
  en: {
    header: "About Ququ Simulator",
    soundOn: "Interface sound is on. Activate to mute.",
    soundOff: "Interface sound is off. Activate to unmute.",
    title: "Turn one idea into a group chat that keeps performing",
    lead: "You do not need a script or a line for every character. Describe one scene you want to watch, and Jiao Jiao, Ling Dang, and Zhu Xiaodi will pick it up and turn it into a back-and-forth chat story.",
    sections: [
      { title: "Start with one thing you want to see", body: "Use a workplace reminder or a small surprise, such as “get to the meeting room early” or “a stranger just joined the group.” A specific opening gives the cast more to play with." },
      { title: "Watch how the cast picks it up", body: "The characters do not simply take turns. They react in their own voices, misunderstand one another, smooth things over, and stir things up. Let the first scene finish, then choose whose reaction you want to push further." },
      { title: "Add a change to make the next scene funnier", body: "Instead of only saying “continue,” add a turn: make Ling Dang suddenly serious, let Zhu Xiaodi miss the point, or have Jiao Jiao drop a new message. A concrete change creates better surprises." },
      { title: "If it drifts, return to the previous story card", body: "Every generation leaves a story card. Continue from it or step back and take another direction, without restarting the whole story just to escape a branch you do not like." },
      { title: "Why it is worth another round", body: "The familiar chat interface makes the rules effortless, while the cast can give the same opening completely different reactions. Much of the fun comes from expecting one reply and getting something else." },
      { title: "You are still the director", body: "AI improvises and keeps the scene moving; you choose the setup, tension, and next turn. Try several openings and give the cast clear changes—the funniest version is usually guided into being, one step at a time." }
    ],
    coverAlt: "A group-chat story about getting to the meeting room early",
    privacyTitle: "About your content"
  },
  ja: {
    header: "蛐蛐シミュレーターについて",
    soundOn: "操作音はオンです。押すとミュートします。",
    soundOff: "操作音はオフです。押すとオンになります。",
    title: "ひと言のアイデアを、勝手に続くグループチャットへ",
    lead: "脚本も、全員分のセリフも必要ありません。見たい場面をひと言入力すると、叫叫、鈴鐺、豬小弟がその始まりを受け取り、掛け合いのあるチャット物語にします。",
    sections: [
      { title: "まずは見たいひと言から", body: "「早めに会議室へ」のような仕事の連絡でも、「知らない人がグループに入った」のような小さな事件でも構いません。始まりが具体的なほど、登場人物は動きやすくなります。" },
      { title: "生成されたら、まず掛け合いを見る", body: "3人は順番にセリフを読むのではなく、それぞれの口調で反応し、勘違いし、取りなし、ときには煽ります。最初の場面を見終えてから、次に誰を動かすか決めてみてください。" },
      { title: "もっと面白くするなら、変化を足す", body: "「続けて」だけでなく、鈴鐺を急に真面目にする、豬小弟に要点を勘違いさせる、叫叫に新しい知らせを投げさせるなど、具体的な変化を加えると次の笑いが生まれやすくなります。" },
      { title: "ずれたら、前のストーリーカードへ", body: "生成するたびにストーリーカードが残ります。そのまま続けることも、ひとつ前へ戻って別の方向へ進むこともでき、最初からやり直す必要はありません。" },
      { title: "もう一度遊びたくなる理由", body: "見慣れたチャットなのでルールを覚える必要がなく、同じ始まりでも人物の性格によって反応が大きく変わります。予想と違う返事が来る瞬間に面白さがあります。" },
      { title: "監督はあなたです", body: "AIは即興と掛け合いを担当し、あなたは場面、対立、次の曲がり角を決めます。いくつかの始まりと具体的な変化を試すと、面白い物語を一歩ずつ引き出せます。" }
    ],
    coverAlt: "早めに会議室へ向かうグループチャット物語の宣伝画像",
    privacyTitle: "あなたのコンテンツについて"
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
            {!betaHackathon ? <p>{copy.aboutSubtitle}</p> : null}
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
            <section className="beta-about-player-hero" aria-labelledby="beta-about-pitch-title">
              <BetaAboutIdentity language={language} />
              <h3 id="beta-about-pitch-title">{betaText.title}</h3>
              <p id="site-about-dialog-description">{betaText.lead}</p>
            </section>

            <div className="beta-about-player-guide">
              {betaText.sections.map((section, index) => (
                <div key={section.title}>
                  <section className="beta-about-player-section">
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </section>
                  {index === 2 ? (
                    <figure className="beta-about-player-cover">
                      <img
                        src={publicAsset("/hackathon/ququ-dingtalk-cover-02f.webp")}
                        alt={betaText.coverAlt}
                        width="1536"
                        height="1024"
                        loading="lazy"
                        decoding="async"
                      />
                    </figure>
                  ) : null}
                </div>
              ))}
            </div>

            <section className="beta-about-player-section beta-about-player-privacy">
              <h3>{betaText.privacyTitle}</h3>
              <p>{copy.aboutPrivacy}</p>
              <p>{copy.aboutDisclaimer}</p>
            </section>
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
