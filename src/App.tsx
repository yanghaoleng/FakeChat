import { Button } from "@heroui/react/button";
import { Card, CardContent, CardHeader } from "@heroui/react/card";
import { ScrollShadow } from "@heroui/react/scroll-shadow";
import { Player, type PlayerRef } from "@remotion/player";
import { Calligraph } from "calligraph";
import gsap from "gsap";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  FileAudio,
  FileDown,
  FileUp,
  Film,
  Hourglass,
  MessageSquarePlus,
  PenLine,
  Play,
  RefreshCcw,
  Save,
  Smartphone,
  Sparkles,
  Video
} from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { exportBrowserVideo, type VideoExportResult } from "./shared/browserVideo";
import { generateBackendStorySegment } from "./shared/deepseekBackend";
import { generateDeepSeekStorySegment, getBrowserDeepSeekStatusText, hasBrowserDeepSeekKey } from "./shared/deepseekBrowser";
import { synthesizeMessageClip, type TtsClipMap } from "./shared/edgeTts";
import {
  createInitialStaticProject,
  createInitialPlaybackProject,
  generateStorySegment,
  makeStoryArchive,
  parseStoryArchive,
  suggestNextStoryPrompt,
  type PromptCard,
  type StoryPackage
} from "./shared/linearStory";
import { ChatDrama } from "./remotion/ChatDrama";
import { imageNarrativeCopy, imageSourceForMessage } from "./shared/imageNarrative";
import { isJojoProject } from "./shared/jojoProject";
import { publicAsset, resolvePublicAssetPath } from "./shared/publicPath";
import { getCharacter, isVoiceMessage, type ChatMessage, type DramaProject } from "./shared/schema";
import { buildTimeline, getDurationInFrames } from "./shared/timing";

type ApiState = "idle" | "loading" | "error" | "done";
type PreviewMode = "wechat" | "video";
type PreviewDirection = "left" | "right";
type PreviewTransition = {
  direction: PreviewDirection;
  exiting: PreviewMode;
  id: number;
};
type PendingPromptCard = {
  id: string;
  prompt: string;
};
type PromptRestoreUndo = {
  before: string;
  after: string;
};

type AppProps = {
  storyPackage: StoryPackage;
};

const deepSeekServiceToast = "DeepSeek 服务暂时连不上，已改用本地续写";
const defaultJojoAppUrl = "https://jojodemos.mikeywa.icu/ququ/";
const defaultViralAppUrl = "https://ququ.mikeywa.icu/";
const defaultGithubRepositoryUrl = "https://github.com/yanghaoleng/FakeChat";
const generationProgressCap = 99;

const jojoGlassCardStyle: CSSProperties = {
  backdropFilter: "blur(24px) saturate(118%)",
  WebkitBackdropFilter: "blur(24px) saturate(118%)"
};

const jojoPromptCardGlassStyle: CSSProperties = {
  backdropFilter: "blur(14px) saturate(116%)",
  WebkitBackdropFilter: "blur(14px) saturate(116%)"
};

const jojoStoryToggleGlassStyle: CSSProperties = {
  backdropFilter: "blur(14px) saturate(118%)",
  WebkitBackdropFilter: "blur(14px) saturate(118%)"
};

function initialPromptFor(packageId: StoryPackage) {
  return packageId === "jojo"
    ? "老板说这个需求很简单，叫叫准备勇敢接下，铃铛开始冷静拆穿排期，猪小弟默默垫上会议室费用。"
    : "张阿姨给男主介绍相亲对象，聊了半天才发现对方是他小时候暗恋过的小学同学，女生用旧绰号和毕业照把回忆翻出来。";
}

function compactStatusText(value: string) {
  return value.length > 72 ? `${value.slice(0, 68)}...` : value;
}

function packageTitle(packageId: StoryPackage) {
  return packageId === "jojo" ? "蛐蛐模拟器" : "聊天记录生成器";
}

function packageReadyText(packageId: StoryPackage) {
  return packageId === "jojo" ? "JOJO 版已就绪：默认公司群剧情已载入" : "网红短剧版已就绪：默认相亲剧情已载入";
}

function packageSwitchLink(packageId: StoryPackage) {
  return packageId === "jojo"
    ? {
        href: import.meta.env.VITE_VIRAL_APP_URL || defaultViralAppUrl,
        label: "去微信版"
      }
    : {
        href: import.meta.env.VITE_JOJO_APP_URL || defaultJojoAppUrl,
        label: "钉钉版"
      };
}

function promptRiseAnimationMs(text: string) {
  return Math.min(3600, Math.max(1100, 700 + Array.from(text).length * 17));
}

function estimatedGenerationMs(project: DramaProject, packageId: StoryPackage) {
  if (!project.messages.length) return packageId === "jojo" ? 32000 : 36000;
  return packageId === "jojo" ? 22000 : 26000;
}

function estimateGenerationProgress(startedAt: number, estimateMs: number) {
  const elapsed = Math.max(0, Date.now() - startedAt);
  if (elapsed <= estimateMs) return Math.max(1, Math.floor((elapsed / estimateMs) * 90));
  const tailElapsed = elapsed - estimateMs;
  const tailProgress = 9 * (1 - Math.exp(-tailElapsed / 18000));
  return Math.min(generationProgressCap, Math.floor(90 + tailProgress));
}

function renderPromptRiseText(text: string) {
  return Array.from(text).map((character, index) => {
    if (character === "\n") return <br key={`prompt-rise-break-${index}`} />;
    return (
      <span
        key={`prompt-rise-${index}-${character}`}
        className="prompt-suggestion-character"
        style={{ "--prompt-character-index": index } as CSSProperties}
      >
        {character}
      </span>
    );
  });
}

function PendingPromptCardView({
  prompt,
  progress,
  onEdit,
  style
}: {
  prompt: string;
  progress: number;
  onEdit: () => void;
  style?: CSSProperties;
}) {
  return (
    <article className="prompt-card prompt-card-pending" style={style} aria-live="polite">
      <div className="prompt-card-progress" aria-label={`生成进度 ${progress}%`}>
        <Calligraph as="strong" variant="number" animation="snappy" className="prompt-card-progress-number">
          {`${progress}%`}
        </Calligraph>
      </div>
      <div className="prompt-card-pending-body">
        <p>{prompt}</p>
        <button className="prompt-card-edit-button" type="button" onClick={onEdit}>
          重新编辑
        </button>
      </div>
    </article>
  );
}

function shouldUseStoryModal() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    finished?: Promise<void>;
  };
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

type LayoutSnapshot = Map<string, { left: number; top: number }>;

function getLeftPanelLayoutKey(element: HTMLElement) {
  if (element.classList.contains("story-composer-card")) return "composer";
  if (element.classList.contains("prompt-history-card")) return "history";
  return "";
}

function getLeftPanelLayoutTargets(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(".left-panel-scroll > .story-composer-card, .left-panel-scroll > .prompt-history-card"));
}

function readLeftPanelLayoutSnapshot(root: HTMLElement): LayoutSnapshot {
  const snapshot: LayoutSnapshot = new Map();
  getLeftPanelLayoutTargets(root).forEach((element) => {
    const key = getLeftPanelLayoutKey(element);
    if (!key) return;
    const rect = element.getBoundingClientRect();
    snapshot.set(key, { left: rect.left, top: rect.top });
  });
  return snapshot;
}

function updateMessage(project: DramaProject, id: string, patch: Partial<ChatMessage>): DramaProject {
  return {
    ...project,
    messages: project.messages.map((message) => (message.id === id ? { ...message, ...patch } : message))
  };
}

function WechatAvatar({ project, message }: { project: DramaProject; message: ChatMessage }) {
  const character = getCharacter(project, message);
  if (character.avatarUrl) return <img className="wechat-avatar" src={resolvePublicAssetPath(character.avatarUrl)} alt="" />;
  return (
    <div className="wechat-avatar wechat-avatar-fallback" style={{ background: character.avatarGradient }}>
      {character.avatarInitial}
    </div>
  );
}

function WechatMessageContent({ project, message }: { project: DramaProject; message: ChatMessage }) {
  const src = resolvePublicAssetPath(imageSourceForMessage(project, message));
  const jojoMode = isJojoProject(project);
  if (message.type === "transfer") {
    return (
      <div className="wechat-transfer">
        <div className="wechat-transfer-main">
          <div className="wechat-transfer-icon">¥</div>
          <div>
            <strong>¥{(message.amount ?? 88).toFixed(2)}</strong>
            <span>{message.transferNote || message.text || "转账给你"}</span>
          </div>
        </div>
        <div className="wechat-transfer-footer">{jojoMode ? "钉钉转账" : "微信转账"}</div>
      </div>
    );
  }
  if (message.type === "image") {
    const copy = imageNarrativeCopy(project, message);
    return (
      <div className="wechat-image-card">
        {src ? <img src={src} alt={copy.alt} /> : (
          <div className="wechat-photo-placeholder">
            <p>{copy.description}</p>
          </div>
        )}
      </div>
    );
  }
  if (message.type === "meme") {
    return <div className="wechat-meme-card">{src ? <img src={src} alt={message.text || "表情"} /> : <div className="wechat-meme-fallback">表情</div>}<span>{message.text}</span></div>;
  }
  return <div className="wechat-bubble">{message.text || message.ttsText || " "}</div>;
}

function visualSideFor(project: DramaProject, message: ChatMessage) {
  if (!isJojoProject(project)) return message.side;
  if (message.roleId === "jiaojiao") return "right";
  if (message.side === "center") return "center";
  return "left";
}

function WechatStoryPreview({
  project,
  onReplay,
  showReplay
}: {
  project: DramaProject;
  onReplay?: () => void;
  showReplay?: boolean;
}) {
  const jojoMode = isJojoProject(project);
  const peer = project.characters.find((character) => character.side === "left") ?? project.characters[0];
  return (
    <div className="wechat-preview-shell">
      <div className={`wechat-phone ${jojoMode ? "dingtalk-phone" : ""}`} aria-label={jojoMode ? "钉钉手机版聊天预览" : "9:16 微信聊天预览"}>
        <div className={jojoMode ? "dingtalk-topbar" : "wechat-topbar"}>
          <img className={jojoMode ? "dingtalk-topbar-img" : "wechat-topbar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/topbar.png" : "/wechat-ui/topbar.png")} alt="" draggable={false} />
          {jojoMode ? <strong className="dingtalk-topbar-title">{project.title || "工位蛐蛐小队"}</strong> : <strong className="wechat-topbar-title">{peer?.name || project.title}</strong>}
        </div>
        <div className={`wechat-chat-scroll ${jojoMode ? "dingtalk-chat-scroll" : ""}`}>
          <div className="wechat-chat-date">{jojoMode ? "今天 09:27" : "今天 17:32"}</div>
          {project.messages.map((message) => {
            if (message.type === "system" || message.side === "center") {
              return <div key={message.id} className="wechat-system-row" data-message-id={message.id}>{message.text}</div>;
            }
            const character = getCharacter(project, message);
            const visualSide = visualSideFor(project, message);
            return (
              <div
                key={message.id}
                className={`wechat-row wechat-row-${visualSide} ${jojoMode ? `dingtalk-row ${message.roleId === "jiaojiao" ? "dingtalk-row-self" : "dingtalk-row-other"}` : ""}`}
                data-message-id={message.id}
              >
                {visualSide === "left" ? <WechatAvatar project={project} message={message} /> : null}
                <div className="wechat-message-stack">
                  {jojoMode ? <div className="wechat-speaker-name">{character.name}</div> : null}
                  <WechatMessageContent project={project} message={message} />
                </div>
                {visualSide === "right" ? <WechatAvatar project={project} message={message} /> : null}
              </div>
            );
          })}
          {showReplay ? (
            <div className="chat-replay-row">
              <button className="chat-replay-button" type="button" onClick={onReplay} aria-label="再来一遍">
                再来一遍
              </button>
            </div>
          ) : null}
        </div>
        <img className={jojoMode ? "dingtalk-inputbar-img" : "wechat-bottombar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/inputbar.png" : "/wechat-ui/bottombar.png")} alt="" draggable={false} />
      </div>
    </div>
  );
}

export default function App({ storyPackage }: AppProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<DramaProject>(() => createInitialPlaybackProject(storyPackage));
  const [promptCards, setPromptCards] = useState<PromptCard[]>([]);
  const [draftPrompt, setDraftPrompt] = useState(initialPromptFor(storyPackage));
  const [previewMode, setPreviewMode] = useState<PreviewMode>("wechat");
  const [status, setStatus] = useState<ApiState>("idle");
  const [statusText, setStatusText] = useState("正在检查 DeepSeek 配置...");
  const [clips, setClips] = useState<TtsClipMap>({});
  const [videoResult, setVideoResult] = useState<VideoExportResult | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [storyPanelOpen, setStoryPanelOpen] = useState(true);
  const [previewTransition, setPreviewTransition] = useState<PreviewTransition | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [promptSuggestionActive, setPromptSuggestionActive] = useState(false);
  const [promptSuggestionKey, setPromptSuggestionKey] = useState(0);
  const [pendingPromptCard, setPendingPromptCard] = useState<PendingPromptCard | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [focusedPromptCardId, setFocusedPromptCardId] = useState<string | null>(null);
  const [scrollTargetMessageId, setScrollTargetMessageId] = useState<string | null>(null);
  const scrollTargetMessageIdRef = useRef<string | null>(null);
  const leftPanelLayoutSnapshotRef = useRef<LayoutSnapshot>(new Map());
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number | undefined>(undefined);
  const previewTransitionTimerRef = useRef<number | undefined>(undefined);
  const promptSuggestionTimerRef = useRef<number | undefined>(undefined);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const generationAbortRef = useRef<AbortController | null>(null);
  const generationProgressTimerRef = useRef<number | undefined>(undefined);
  const generationRunRef = useRef(0);
  const promptRestoreUndoRef = useRef<PromptRestoreUndo | null>(null);
  const promptAnimationFocusGuardUntilRef = useRef(0);
  const playerRef = useRef<PlayerRef>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const jojoMode = storyPackage === "jojo";
  const durationInFrames = useMemo(() => getDurationInFrames(project), [project]);
  const previewInitialFrame = useMemo(() => buildTimeline(project)[0]?.startFrame ?? 0, [project]);
  const previewProject = useMemo(
    () => ({ ...project, messages: project.messages.slice(0, visibleMessageCount) }),
    [project, visibleMessageCount]
  );

  function updateScrollTargetMessageId(nextMessageId: string | null) {
    scrollTargetMessageIdRef.current = nextMessageId;
    setScrollTargetMessageId(nextMessageId);
  }

  useEffect(() => () => {
    if (revealTimerRef.current) window.clearInterval(revealTimerRef.current);
    if (previewTransitionTimerRef.current) window.clearTimeout(previewTransitionTimerRef.current);
    if (promptSuggestionTimerRef.current) window.clearTimeout(promptSuggestionTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    if (generationProgressTimerRef.current) window.clearInterval(generationProgressTimerRef.current);
    generationAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (settingsMenuRef.current?.contains(event.target as Node)) return;
      setSettingsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (project.messages.length) startMessageReveal(0, project.messages.length);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkDeepSeek() {
      const browserReadyText = await getBrowserDeepSeekStatusText(project);
      if (storyPackage === "jojo") {
        if (!cancelled) {
          setStatusText((current) => current === "正在检查 DeepSeek 配置..." ? browserReadyText : current);
        }
        return;
      }
      try {
        const response = await fetch("/api/settings/deepseek", { signal: AbortSignal.timeout(2500) });
        if (!response.ok) throw new Error(`settings ${response.status}`);
        const settings = await response.json() as { hasApiKey?: boolean; source?: string };
        const sourceLabel = settings.source === "env" ? "环境变量" : settings.source === "company" ? "公司中转" : "已保存";
        const nextText = settings.hasApiKey
          ? `DeepSeek 后端代理已就绪（${sourceLabel}）`
          : browserReadyText;
        if (!cancelled) {
          setStatusText((current) => current === "正在检查 DeepSeek 配置..." ? nextText : current);
        }
      } catch {
        if (!cancelled) {
          setStatusText((current) => current === "正在检查 DeepSeek 配置..." ? browserReadyText : current);
        }
      }
    }
    void checkDeepSeek();
    return () => {
      cancelled = true;
    };
  }, [project, storyPackage]);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    const root = rootRef.current;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".motion-in",
        { y: 18, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.55, stagger: 0.055, ease: "power3.out" }
      );
    }, root);

    const interactiveSelector = "button,a,textarea,.prompt-card";
    const findInteractive = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(interactiveSelector) : null;
    const isMovingInside = (event: PointerEvent, target: HTMLElement) => event.relatedTarget instanceof Node && target.contains(event.relatedTarget);
    const handleOver = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || isMovingInside(event, target) || target.matches("[disabled],[aria-disabled='true']")) return;
      gsap.to(target, { y: -2, scale: 1.01, duration: 0.18, ease: "power2.out" });
    };
    const handleOut = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || isMovingInside(event, target)) return;
      gsap.to(target, { y: 0, scale: 1, duration: 0.2, ease: "power2.out" });
    };
    const handleDown = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || target.matches("[disabled],[aria-disabled='true']")) return;
      gsap.to(target, { scale: 0.985, duration: 0.08, ease: "power2.out" });
    };
    const handleUp = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target) return;
      gsap.to(target, { scale: 1.01, duration: 0.12, ease: "power2.out" });
    };

    root.addEventListener("pointerover", handleOver);
    root.addEventListener("pointerout", handleOut);
    root.addEventListener("pointerdown", handleDown);
    root.addEventListener("pointerup", handleUp);
    root.addEventListener("pointercancel", handleOut);

    return () => {
      root.removeEventListener("pointerover", handleOver);
      root.removeEventListener("pointerout", handleOut);
      root.removeEventListener("pointerdown", handleDown);
      root.removeEventListener("pointerup", handleUp);
      root.removeEventListener("pointercancel", handleOut);
      context.revert();
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current || previewMode !== "wechat") return undefined;
    if (scrollTargetMessageId) return undefined;
    const root = rootRef.current;
    const chatScroll = root.querySelector<HTMLElement>(".wechat-chat-scroll");
    if (!chatScroll) return undefined;
    const messages = chatScroll.querySelectorAll<HTMLElement>(".wechat-row, .wechat-system-row");
    const replayRow = chatScroll.querySelector<HTMLElement>(".chat-replay-row");
    if (!messages.length && !replayRow) return undefined;
    const latest = replayRow ?? messages.item(messages.length - 1);
    if (latest) {
      if (latest.classList.contains("wechat-row")) {
        gsap.fromTo(latest, { y: 18, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: "power3.out" });
      }
      const exposeLatest = (behavior: ScrollBehavior) => {
        if (!chatScroll.isConnected || !latest.isConnected) return;
        const containerRect = chatScroll.getBoundingClientRect();
        const latestRect = latest.getBoundingClientRect();
        const bottomPadding = 18;
        if (latestRect.bottom <= containerRect.bottom - bottomPadding && latestRect.top >= containerRect.top) return;
        const nextTop = chatScroll.scrollTop + latestRect.bottom - containerRect.bottom + bottomPadding;
        chatScroll.scrollTo({
          top: Math.max(0, Math.min(nextTop, chatScroll.scrollHeight - chatScroll.clientHeight)),
          behavior
        });
      };
      window.requestAnimationFrame(() => exposeLatest("smooth"));
      const lateScroll = window.setTimeout(() => exposeLatest("smooth"), 260);
      return () => window.clearTimeout(lateScroll);
    }
    return undefined;
  }, [previewMode, previewProject.messages.length, visibleMessageCount, project.messages.length, scrollTargetMessageId]);

  useEffect(() => {
    if (!rootRef.current || previewMode !== "wechat" || !scrollTargetMessageId) return undefined;
    const root = rootRef.current;
    const chatScroll = root.querySelector<HTMLElement>(".wechat-chat-scroll");
    if (!chatScroll) return undefined;
    const target = Array.from(chatScroll.querySelectorAll<HTMLElement>("[data-message-id]"))
      .find((element) => element.dataset.messageId === scrollTargetMessageId);
    if (!target) return undefined;
    const exposeTarget = () => {
      if (!chatScroll.isConnected || !target.isConnected) return;
      const containerRect = chatScroll.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const topPadding = 16;
      const nextTop = chatScroll.scrollTop + targetRect.top - containerRect.top - topPadding;
      chatScroll.scrollTo({
        top: Math.max(0, Math.min(nextTop, chatScroll.scrollHeight - chatScroll.clientHeight)),
        behavior: "smooth"
      });
      target.classList.add("wechat-row-jump-target");
      gsap.fromTo(target, { scale: 0.985 }, { scale: 1, duration: 0.36, ease: "power3.out" });
    };
    const frame = window.requestAnimationFrame(exposeTarget);
    const cleanupHighlight = window.setTimeout(() => {
      target.classList.remove("wechat-row-jump-target");
    }, 1400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(cleanupHighlight);
      target.classList.remove("wechat-row-jump-target");
    };
  }, [previewMode, previewProject.messages.length, scrollTargetMessageId]);

  useEffect(() => {
    if (!rootRef.current || !promptCards.length) return;
    const latest = rootRef.current.querySelector(".prompt-card");
    if (latest) {
      gsap.fromTo(latest, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "power3.out" });
    }
  }, [promptCards.length]);

  useEffect(() => {
    if (!rootRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const targets = Array.from(rootRef.current.querySelectorAll<HTMLElement>(".preview-tilt-target"));
    if (!targets.length) return undefined;

    const cleanups = targets.map((target) => {
      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        if (window.matchMedia("(max-width: 1079px)").matches) {
          gsap.set(target, { rotateX: 0, rotateY: 0 });
          return;
        }
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(target, {
          rotateX: y * -6,
          rotateY: x * 6,
          transformPerspective: 900,
          transformOrigin: "center center",
          duration: 0.22,
          ease: "power3.out"
        });
      };
      const handleLeave = () => {
        gsap.to(target, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.42,
          ease: "power3.out"
        });
      };
      target.addEventListener("pointermove", handleMove);
      target.addEventListener("pointerleave", handleLeave);
      return () => {
        target.removeEventListener("pointermove", handleMove);
        target.removeEventListener("pointerleave", handleLeave);
        gsap.killTweensOf(target);
        gsap.set(target, { rotateX: 0, rotateY: 0 });
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  useEffect(() => {
    if (previewMode !== "video" || !project.messages.length) return undefined;
    const timer = window.setTimeout(() => {
      playerRef.current?.seekTo(previewInitialFrame);
      playerRef.current?.play();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [previewMode, project.messages.length, previewInitialFrame]);

  function handleError(label: string, error: unknown) {
    console.error(`[static-tool] ${label}`, error);
    setStatus("error");
    setStatusText(error instanceof Error ? error.message : `${label}失败`);
  }

  function showToast(message: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = undefined;
    }, 4200);
  }

  function isCurrentGeneration(runId: number, signal: AbortSignal) {
    return generationRunRef.current === runId && !signal.aborted;
  }

  function stopGenerationProgress() {
    if (generationProgressTimerRef.current) {
      window.clearInterval(generationProgressTimerRef.current);
      generationProgressTimerRef.current = undefined;
    }
  }

  function startGenerationProgress(estimateMs: number) {
    stopGenerationProgress();
    const startedAt = Date.now();
    setGenerationProgress(1);
    generationProgressTimerRef.current = window.setInterval(() => {
      setGenerationProgress(estimateGenerationProgress(startedAt, estimateMs));
    }, 320);
  }

  function stopStoryGeneration() {
    if (status !== "loading") return;
    const promptToEdit = pendingPromptCard?.prompt || "";
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    if (promptToEdit) restorePromptForEditing(promptToEdit);
    setPendingPromptCard(null);
    setGenerationProgress(0);
    setVideoProgress(0);
    setStatus("idle");
    setStatusText("已停止生成，可以重新编辑这张故事卡片");
  }

  function startMessageReveal(fromCount: number, toCount: number) {
    if (revealTimerRef.current) window.clearInterval(revealTimerRef.current);
    setVisibleMessageCount(fromCount);
    let nextCount = fromCount;
    revealTimerRef.current = window.setInterval(() => {
      nextCount += 1;
      setVisibleMessageCount(Math.min(nextCount, toCount));
      if (nextCount >= toCount && revealTimerRef.current) {
        window.clearInterval(revealTimerRef.current);
        revealTimerRef.current = undefined;
      }
    }, 1000);
  }

  function finishPromptSuggestionAnimation() {
    if (promptSuggestionTimerRef.current) {
      window.clearTimeout(promptSuggestionTimerRef.current);
      promptSuggestionTimerRef.current = undefined;
    }
    setPromptSuggestionActive(false);
  }

  function focusPromptTextareaAtEnd(text: string, preserveAnimation = false) {
    if (preserveAnimation) promptAnimationFocusGuardUntilRef.current = Date.now() + 600;
    window.requestAnimationFrame(() => {
      const textarea = promptTextareaRef.current;
      if (!textarea) {
        promptAnimationFocusGuardUntilRef.current = 0;
        return;
      }
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(text.length, text.length);
    });
  }

  function showSuggestedPrompt(nextPrompt: string, options: { preservePromptUndo?: boolean; focusAtEnd?: boolean } = {}) {
    if (promptSuggestionTimerRef.current) window.clearTimeout(promptSuggestionTimerRef.current);
    if (!options.preservePromptUndo) promptRestoreUndoRef.current = null;
    setDraftPrompt(nextPrompt);
    setPromptSuggestionKey((current) => current + 1);
    setPromptSuggestionActive(true);
    if (options.focusAtEnd) focusPromptTextareaAtEnd(nextPrompt, true);
    promptSuggestionTimerRef.current = window.setTimeout(() => {
      setPromptSuggestionActive(false);
      promptSuggestionTimerRef.current = undefined;
    }, promptRiseAnimationMs(nextPrompt));
  }

  function restorePromptForEditing(nextPrompt: string) {
    const previousPrompt = draftPrompt;
    promptRestoreUndoRef.current = previousPrompt === nextPrompt ? null : { before: previousPrompt, after: nextPrompt };
    showSuggestedPrompt(nextPrompt, { preservePromptUndo: true, focusAtEnd: true });
  }

  function undoPromptRestore() {
    const undo = promptRestoreUndoRef.current;
    if (!undo || draftPrompt !== undo.after) return false;
    promptRestoreUndoRef.current = null;
    finishPromptSuggestionAnimation();
    setDraftPrompt(undo.before);
    focusPromptTextareaAtEnd(undo.before);
    setStatus("idle");
    setStatusText("已撤回重新编辑填入的提示词");
    return true;
  }

  function handleDraftPromptChange(nextPrompt: string) {
    if (promptRestoreUndoRef.current && nextPrompt !== promptRestoreUndoRef.current.after) {
      promptRestoreUndoRef.current = null;
    }
    setDraftPrompt(nextPrompt);
    finishPromptSuggestionAnimation();
  }

  function handlePromptTextareaFocus() {
    if (!promptSuggestionActive) return;
    if (Date.now() < promptAnimationFocusGuardUntilRef.current) return;
    finishPromptSuggestionAnimation();
  }

  function applyStorySegment(result: { project: DramaProject; card: PromptCard; messages: ChatMessage[] }, nextStatusText: string) {
    const previousCount = project.messages.length;
    const nextPromptCards = [...promptCards, result.card];
    const nextPrompt = suggestNextStoryPrompt({
      project: result.project,
      prompt: result.card.prompt,
      promptCards: nextPromptCards,
      messages: result.messages
    });
    setProject(result.project);
    setPromptCards(nextPromptCards);
    stopGenerationProgress();
    setGenerationProgress(100);
    setPendingPromptCard(null);
    if (!scrollTargetMessageIdRef.current) {
      setFocusedPromptCardId(result.card.id);
    }
    generationAbortRef.current = null;
    showSuggestedPrompt(nextPrompt);
    setVideoResult(null);
    setStatus("done");
    setStatusText(nextStatusText);
    if (shouldUseStoryModal()) setStoryPanelOpenWithContinuity(false);
    startMessageReveal(previousCount, result.project.messages.length);
  }

  function closeSettingsMenu() {
    setSettingsMenuOpen(false);
  }

  function setStoryPanelOpenWithContinuity(next: boolean | ((current: boolean) => boolean)) {
    const update = () => setStoryPanelOpen(next);
    const doc = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shouldUseStoryModal() || !doc.startViewTransition || reduceMotion) {
      update();
      return;
    }
    doc.startViewTransition(() => flushSync(update));
  }

  async function continueStory() {
    const prompt = draftPrompt.trim();
    if (!prompt) {
      setStatus("error");
      setStatusText("先写一段要推进的故事");
      return;
    }
    promptRestoreUndoRef.current = null;
    finishPromptSuggestionAnimation();
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    generationAbortRef.current = controller;
    const signal = controller.signal;
    setStatus("loading");
    setVideoProgress(0);
    startGenerationProgress(estimatedGenerationMs(project, storyPackage));
    setPendingPromptCard({ id: `pending-${runId}-${Date.now()}`, prompt });
    setDraftPrompt("");
    if (!scrollTargetMessageIdRef.current) {
      setFocusedPromptCardId(null);
      updateScrollTargetMessageId(null);
    }
    setStatusText("正在请求后端 DeepSeek 续写...");

    try {
      let backendError: unknown;
      try {
        const result = await generateBackendStorySegment({ project, prompt, promptCards, signal });
        if (!isCurrentGeneration(runId, signal)) return;
        applyStorySegment(result, `DeepSeek 后端已追加 ${result.messages.length} 条消息`);
        return;
      } catch (error) {
        if (!isCurrentGeneration(runId, signal)) return;
        backendError = error;
        console.warn("[deepseek] backend unavailable", error);
      }

      if (hasBrowserDeepSeekKey()) {
        setStatusText("后端不可用，正在尝试浏览器公开配置...");
        try {
          const result = await generateDeepSeekStorySegment({ project, prompt, promptCards, signal });
          if (!isCurrentGeneration(runId, signal)) return;
          applyStorySegment(result, `DeepSeek 前端已追加 ${result.messages.length} 条消息`);
          return;
        } catch (browserError) {
          if (!isCurrentGeneration(runId, signal)) return;
          console.warn("[deepseek] browser direct unavailable", browserError);
          showToast(deepSeekServiceToast);
        }
      } else if (backendError) {
        showToast(deepSeekServiceToast);
      }

      setStatusText("DeepSeek 未连通，使用本地续写...");
      if (!isCurrentGeneration(runId, signal)) return;
      const result = generateStorySegment({ project, prompt, promptCards });
      applyStorySegment(result, `DeepSeek 未连通，已本地续写 ${result.messages.length} 条`);
    } catch (error) {
      if (!isCurrentGeneration(runId, signal)) return;
      console.error("[deepseek] fallback", error);
      showToast(deepSeekServiceToast);
      const result = generateStorySegment({ project, prompt, promptCards });
      applyStorySegment(result, `DeepSeek 异常，已本地续写 ${result.messages.length} 条`);
    } finally {
      if (generationRunRef.current === runId) {
        generationAbortRef.current = null;
        stopGenerationProgress();
        setGenerationProgress(0);
        setPendingPromptCard(null);
      }
    }
  }

  function clearLine() {
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    const nextProject = { ...createInitialStaticProject(storyPackage), messages: [] };
    setProject(nextProject);
    setPromptCards([]);
    setPendingPromptCard(null);
    setGenerationProgress(0);
    setFocusedPromptCardId(null);
    updateScrollTargetMessageId(null);
    promptRestoreUndoRef.current = null;
    setDraftPrompt(initialPromptFor(storyPackage));
    finishPromptSuggestionAnimation();
    setClips({});
    setVideoResult(null);
    setVisibleMessageCount(0);
    setStatus("idle");
    setStatusText("故事已重启，模拟界面已清空");
  }

  function replayConversation() {
    setVideoResult(null);
    setFocusedPromptCardId(null);
    updateScrollTargetMessageId(null);
    setStatus("done");
    setStatusText("聊天会话已重新播放入场");
    startMessageReveal(0, project.messages.length);
  }

  function changePreviewMode(nextMode: PreviewMode) {
    if (nextMode === previewMode) return;
    const transition: PreviewTransition = {
      direction: nextMode === "video" ? "right" : "left",
      exiting: previewMode,
      id: Date.now()
    };
    if (previewTransitionTimerRef.current) window.clearTimeout(previewTransitionTimerRef.current);
    setPreviewTransition(transition);
    setPreviewMode(nextMode);
    previewTransitionTimerRef.current = window.setTimeout(() => {
      setPreviewTransition((current) => current?.id === transition.id ? null : current);
    }, 360);
  }

  function choosePreviewMode(nextMode: PreviewMode) {
    closeSettingsMenu();
    changePreviewMode(nextMode);
    if (nextMode === "video" && !project.messages.length) {
      setStatus("idle");
      setStatusText("先生成对话，再播放视频版");
    }
  }

  function focusPromptCard(card: PromptCard, options: { focusButton?: boolean } = {}) {
    const firstMessageId = card.messageIds[0];
    if (!firstMessageId) {
      setStatus("error");
      setStatusText("这张故事卡片没有可定位的对话");
      return;
    }
    const targetIndex = project.messages.findIndex((message) => message.id === firstMessageId);
    if (targetIndex < 0) {
      setStatus("error");
      setStatusText("没有找到这张故事卡片对应的起始对话");
      return;
    }
    if (revealTimerRef.current) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    setVideoResult(null);
    setFocusedPromptCardId(card.id);
    updateScrollTargetMessageId(firstMessageId);
    setVisibleMessageCount((current) => Math.max(current, targetIndex + 1));
    changePreviewMode("wechat");
    setStatus("done");
    setStatusText("已定位到这张故事卡片的起始对话");
    if (options.focusButton) {
      window.requestAnimationFrame(() => {
        const targetButton = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-prompt-card-id]") || [])
          .find((button) => button.dataset.promptCardId === card.id);
        targetButton?.focus({ preventScroll: true });
      });
    }
  }

  function focusPromptCardByStep(direction: 1 | -1) {
    if (!promptCards.length) return false;
    const currentIndex = focusedPromptCardId ? promptCards.findIndex((card) => card.id === focusedPromptCardId) : -1;
    const nextIndex = currentIndex < 0
      ? direction > 0 ? 0 : promptCards.length - 1
      : (currentIndex + direction + promptCards.length) % promptCards.length;
    focusPromptCard(promptCards[nextIndex], { focusButton: true });
    return true;
  }

  function exportJson() {
    const archive = makeStoryArchive(project, promptCards);
    downloadBlob(new Blob([`${JSON.stringify(archive, null, 2)}\n`], { type: "application/json" }), `chat-line-${Date.now()}.json`);
    setStatus("done");
    setStatusText("存档已导出");
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const archive = parseStoryArchive(JSON.parse(await file.text()));
      const archivePackage: StoryPackage = isJojoProject(archive.project) ? "jojo" : "viral";
      if (archivePackage !== storyPackage) {
        setStatus("error");
        setStatusText(storyPackage === "jojo" ? "当前是 JOJO 版，请读取 JOJO 版存档" : "当前是网红短剧版，请读取网红短剧版存档");
        return;
      }
      setProject(archive.project);
      setPromptCards(archive.promptCards);
      setPendingPromptCard(null);
      setGenerationProgress(0);
      setFocusedPromptCardId(null);
      updateScrollTargetMessageId(null);
      promptRestoreUndoRef.current = null;
      setDraftPrompt("");
      finishPromptSuggestionAnimation();
      setVisibleMessageCount(archive.project.messages.length);
      setClips({});
      setVideoResult(null);
      setStatus("done");
      setStatusText(`已读档 ${archive.promptCards.length} 张故事卡片`);
    } catch (error) {
      handleError("读档", error);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function generateVoice() {
    if (!project.messages.length) {
      setStatus("error");
      setStatusText("先生成对话，再生成配音");
      return;
    }
    setStatus("loading");
    setStatusText("正在连接 Edge TTS 生成固定男女声...");
    try {
      const nextClips: TtsClipMap = { ...clips };
      let nextProject = project;
      const voiceMessages = project.messages.filter(isVoiceMessage);
      for (let index = 0; index < voiceMessages.length; index += 1) {
        const message = voiceMessages[index];
        if (!nextClips[message.id]) {
          console.info(`[edge-tts] -> ${message.id}`, message.text || message.ttsText);
          const clip = await synthesizeMessageClip(nextProject, message);
          if (clip) {
            nextClips[message.id] = clip;
            nextProject = updateMessage(nextProject, message.id, { audioUrl: clip.url, durationMs: clip.durationMs });
          }
        }
        setStatusText(`Edge TTS ${index + 1}/${voiceMessages.length}`);
      }
      setClips(nextClips);
      setProject(nextProject);
      setStatus("done");
      setStatusText("配音已生成，可导出视频");
    } catch (error) {
      handleError("Edge TTS", error);
    }
  }

  async function exportVideo() {
    if (!project.messages.length) {
      setStatus("error");
      setStatusText("先生成对话，再导出视频");
      return;
    }
    setStatus("loading");
    setStatusText("正在浏览器内录制 16:9 视频...");
    try {
      const result = await exportBrowserVideo(project, clips, (progress) => {
        setVideoProgress(progress.progress);
        setStatusText(progress.phase === "preparing" ? "正在准备音频轨..." : `正在录制视频 ${Math.round(progress.progress * 100)}%`);
      });
      setVideoResult(result);
      setStatus("done");
      setStatusText(`视频已生成：${result.extension.toUpperCase()}`);
    } catch (error) {
      handleError("视频导出", error);
    }
  }

  function renderVideoActions() {
    return (
      <div className="video-action-strip">
        <div className="action-grid">
          <Button variant="secondary" onPress={generateVoice} isDisabled={status === "loading" || !project.messages.length}>
            <FileAudio size={17} />
            生成语音（开发中）
          </Button>
          <Button variant="primary" onPress={exportVideo} isDisabled={status === "loading" || !project.messages.length}>
            <Film size={17} />
            导出视频
          </Button>
        </div>
        {status === "loading" && videoProgress > 0 ? <progress className="video-progress" max={1} value={videoProgress} /> : null}
        {videoResult ? (
          <a className="download-link" href={videoResult.url} download={`chat-drama-${Date.now()}.${videoResult.extension}`}>
            <Download size={16} />
            下载 {videoResult.extension.toUpperCase()}
          </a>
        ) : null}
      </div>
    );
  }

  function renderPreviewPane(mode: PreviewMode, isActive: boolean) {
    if (mode === "wechat") {
      return (
        <WechatStoryPreview
          project={previewProject}
          onReplay={replayConversation}
          showReplay={project.messages.length > 0 && visibleMessageCount >= project.messages.length}
        />
      );
    }
    if (!project.messages.length) {
      return (
        <div className="video-preview-stack">
          <div className="player-frame video-empty-frame" style={{ width: "100%", aspectRatio: `${project.canvas.width} / ${project.canvas.height}` }}>
            <div className="empty-state large-empty video-empty-state">
              <Play size={28} />
              等待第一段剧情
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="video-preview-stack">
        <div className="player-frame">
          <Player
            ref={isActive ? playerRef : undefined}
            component={ChatDrama}
            inputProps={{ project }}
            durationInFrames={durationInFrames}
            initialFrame={previewInitialFrame}
            compositionWidth={project.canvas.width}
            compositionHeight={project.canvas.height}
            fps={project.fps}
            controls
            autoPlay={isActive && previewMode === "video"}
            acknowledgeRemotionLicense
            style={{ width: "100%", aspectRatio: `${project.canvas.width} / ${project.canvas.height}` }}
          />
        </div>
        {renderVideoActions()}
      </div>
    );
  }

  const switchLink = packageSwitchLink(storyPackage);
  const githubRepositoryUrl = import.meta.env.VITE_GITHUB_REPO_URL || defaultGithubRepositoryUrl;
  const storyCardCount = promptCards.length + (pendingPromptCard ? 1 : 0);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;
    const targets = getLeftPanelLayoutTargets(root);
    gsap.killTweensOf(targets);
    targets.forEach((element) => {
      element.style.transform = "";
    });

    const nextSnapshot = readLeftPanelLayoutSnapshot(root);
    const previousSnapshot = leftPanelLayoutSnapshotRef.current;
    const shouldAnimate = previousSnapshot.size > 0
      && window.matchMedia("(min-width: 1080px)").matches
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (shouldAnimate) {
      targets.forEach((element) => {
        const key = getLeftPanelLayoutKey(element);
        const previousRect = previousSnapshot.get(key);
        const nextRect = nextSnapshot.get(key);
        if (!previousRect || !nextRect) return;
        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;
        gsap.fromTo(
          element,
          { x: deltaX, y: deltaY },
          { x: 0, y: 0, duration: 0.46, ease: "power3.out", overwrite: "auto", clearProps: "transform" }
        );
      });
    }

    leftPanelLayoutSnapshotRef.current = nextSnapshot;
  }, [storyCardCount, storyPanelOpen]);

  useEffect(() => {
    const isTextEditingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      if (target instanceof HTMLTextAreaElement) return true;
      if (!(target instanceof HTMLInputElement)) return false;
      return !["button", "checkbox", "file", "radio", "range", "reset", "submit"].includes(target.type);
    };
    const isButtonLikeTarget = (target: EventTarget | null) => (
      target instanceof Element && Boolean(target.closest("button,a,[role='button']"))
    );
    const handlePageShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const key = event.key;
      const isUndoKey = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key.toLowerCase() === "z";
      if (isUndoKey) {
        if (undoPromptRestore()) event.preventDefault();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (key === "Enter") {
        if (event.shiftKey || isButtonLikeTarget(event.target)) return;
        event.preventDefault();
        if (status !== "loading") void continueStory();
        return;
      }

      if (key === "Escape") {
        if (status === "loading" && pendingPromptCard) {
          event.preventDefault();
          stopStoryGeneration();
          return;
        }
        if (promptSuggestionActive) {
          event.preventDefault();
          finishPromptSuggestionAnimation();
        }
        return;
      }

      if (key === "Tab") {
        if (!promptCards.length) return;
        event.preventDefault();
        focusPromptCardByStep(event.shiftKey ? -1 : 1);
        return;
      }

      const arrowDirection = key === "ArrowDown" || key === "ArrowRight"
        ? 1
        : key === "ArrowUp" || key === "ArrowLeft"
          ? -1
          : 0;
      if (!arrowDirection || !promptCards.length || isTextEditingTarget(event.target)) return;
      event.preventDefault();
      focusPromptCardByStep(arrowDirection);
    };

    window.addEventListener("keydown", handlePageShortcut);
    return () => window.removeEventListener("keydown", handlePageShortcut);
  }, [draftPrompt, focusedPromptCardId, pendingPromptCard, promptCards, promptSuggestionActive, status]);

  return (
    <div ref={rootRef} className={`app-shell dark ${storyPackage === "jojo" ? "app-shell-jojo" : ""}`} data-theme="dark" data-vibrant-palette="true">
      <header className="topbar motion-in">
        <div className="brand-block">
          <h1>{packageTitle(storyPackage)}</h1>
          <div ref={settingsMenuRef} className="title-menu-wrap">
            <button
              className={settingsMenuOpen ? "title-menu-button title-menu-button-open" : "title-menu-button"}
              type="button"
              aria-haspopup="menu"
              aria-expanded={settingsMenuOpen}
              aria-label="打开设置菜单"
              onClick={() => setSettingsMenuOpen((current) => !current)}
            >
              <ChevronDown size={17} />
            </button>
            {settingsMenuOpen ? (
              <div className="title-menu-popover" role="menu">
                <button
                  className={previewMode === "wechat" ? "title-menu-item title-menu-item-active" : "title-menu-item"}
                  type="button"
                  role="menuitem"
                  aria-pressed={previewMode === "wechat"}
                  onClick={() => choosePreviewMode("wechat")}
                >
                  <Smartphone size={16} />
                  <span>界面版</span>
                  <small>{previewMode === "wechat" ? "当前" : "快速生成"}</small>
                </button>
                <button
                  className={previewMode === "video" ? "title-menu-item title-menu-item-active" : "title-menu-item"}
                  type="button"
                  role="menuitem"
                  aria-pressed={previewMode === "video"}
                  onClick={() => choosePreviewMode("video")}
                >
                  <Video size={16} />
                  <span>视频版</span>
                  <small>{previewMode === "video" ? "当前" : "直接播放"}</small>
                </button>
                <a className="title-menu-item" role="menuitem" href={switchLink.href} onClick={closeSettingsMenu}>
                  <ArrowUpRight size={16} />
                  <span>{switchLink.label}</span>
                  <small>切换版本</small>
                </a>
                <a className="title-menu-item" role="menuitem" href={githubRepositoryUrl} target="_blank" rel="noreferrer" onClick={closeSettingsMenu}>
                  <ArrowUpRight size={16} />
                  <span>Github</span>
                  <small>公开仓库</small>
                </a>
                <div className="title-menu-separator" />
                <button
                  className="title-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeSettingsMenu();
                    exportJson();
                  }}
                >
                  <FileDown size={16} />
                  <span>存档</span>
                  <small>导出当前存档</small>
                </button>
                <button
                  className="title-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeSettingsMenu();
                    importInputRef.current?.click();
                  }}
                >
                  <FileUp size={16} />
                  <span>读档</span>
                  <small>导入 JSON</small>
                </button>
              </div>
            ) : null}
          </div>
          <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importJson(event.currentTarget.files?.[0])} />
        </div>
      </header>
      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}

      <main className="workspace static-workspace">
        <div className={`left-panel ${storyPanelOpen ? "story-panel-open" : ""}`}>
          <div className="left-panel-scroll panel-scroll">
            <button
              className="story-panel-status"
              style={jojoMode ? jojoStoryToggleGlassStyle : undefined}
              type="button"
              onClick={() => setStoryPanelOpenWithContinuity((current) => !current)}
              aria-expanded={storyPanelOpen}
              aria-label={storyPanelOpen ? "收起编故事" : "展开编故事"}
            >
              <span className="story-panel-status-icon" aria-hidden="true">
                {storyPanelOpen ? <ChevronDown size={16} /> : <PenLine size={16} />}
              </span>
              <small>{storyCardCount ? `${storyCardCount} 张故事卡片` : "准备生成"}</small>
            </button>
            <Card className="surface-card story-composer-card motion-in" style={jojoMode ? jojoGlassCardStyle : undefined}>
              <CardHeader className="card-header">
                <div className="panel-title">
                  <Sparkles size={18} />
                  编故事
                </div>
              </CardHeader>
              <CardContent className="card-content">
                <div className={promptSuggestionActive ? "prompt-textarea-shell prompt-textarea-shell-animating" : "prompt-textarea-shell"}>
                  <textarea
                    ref={promptTextareaRef}
                    className="hero-textarea prompt-textarea"
                    value={draftPrompt}
                    onChange={(event) => handleDraftPromptChange(event.target.value)}
                    onFocus={handlePromptTextareaFocus}
                    placeholder="输入下一段要推进的剧情。它会结合此前故事卡片和现有对话继续往后写。"
                    rows={5}
                  />
                  {promptSuggestionActive ? (
                    <div key={promptSuggestionKey} className="prompt-suggestion-overlay" aria-hidden="true">
                      <span className="prompt-suggestion-rise">
                        {renderPromptRiseText(draftPrompt)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <Button
                  className="story-action-button"
                  fullWidth
                  variant="primary"
                  onPress={continueStory}
                  isDisabled={status === "loading"}
                >
                  {status === "loading" ? <Hourglass className="hourglass-spin" size={17} /> : <MessageSquarePlus size={17} />}
                  {status === "loading" ? "生成中" : "开始编"}
                </Button>
                <Button className="prompt-reset-button" fullWidth variant="secondary" onPress={clearLine} isDisabled={status === "loading"}>
                  <RefreshCcw size={16} />
                  重启故事
                </Button>
                {status === "error" ? (
                  <div className="deepseek-status deepseek-status-error" title={statusText}>
                    {compactStatusText(statusText)}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {storyCardCount ? (
              <Card className="surface-card prompt-history-card motion-in" style={jojoMode ? jojoGlassCardStyle : undefined}>
                <CardHeader className="card-header prompt-history-header">
                  <div className="panel-title">
                    <Save size={18} />
                    故事卡片
                  </div>
                </CardHeader>
                <CardContent className="card-content prompt-card-list">
                  {pendingPromptCard ? (
                    <PendingPromptCardView
                      prompt={pendingPromptCard.prompt}
                      progress={generationProgress}
                      onEdit={stopStoryGeneration}
                      style={jojoMode ? jojoPromptCardGlassStyle : undefined}
                    />
                  ) : null}
                  {[...promptCards].reverse().map((card, index) => {
                    const cardNumber = promptCards.length - index;
                    return (
                      <button
                        key={card.id}
                        className={focusedPromptCardId === card.id ? "prompt-card prompt-card-button prompt-card-active" : "prompt-card prompt-card-button"}
                        style={jojoMode ? jojoPromptCardGlassStyle : undefined}
                        type="button"
                        data-prompt-card-id={card.id}
                        aria-pressed={focusedPromptCardId === card.id}
                        aria-label={`定位到第 ${cardNumber} 张故事卡片`}
                        onClick={() => focusPromptCard(card)}
                      >
                        <div className="prompt-card-index">{String(cardNumber).padStart(2, "0")}</div>
                        <p>{card.prompt}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <ScrollShadow className="right-panel panel-scroll">
          <Card className="surface-card preview-wrap preview-tilt-target motion-in">
            <CardContent className="card-content">
              <div className={`preview-content-stage ${previewTransition ? `preview-content-stage-${previewTransition.direction}` : ""}`}>
                {previewTransition ? (
                  <div key={`exit-${previewTransition.id}-${previewTransition.exiting}`} className={`preview-pane preview-pane-exit preview-pane-exit-${previewTransition.direction}`}>
                    {renderPreviewPane(previewTransition.exiting, false)}
                  </div>
                ) : null}
                <div key={`enter-${previewTransition?.id ?? "steady"}-${previewMode}`} className={`preview-pane ${previewTransition ? `preview-pane-enter preview-pane-enter-${previewTransition.direction}` : ""}`}>
                  {renderPreviewPane(previewMode, true)}
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollShadow>
      </main>
    </div>
  );
}
