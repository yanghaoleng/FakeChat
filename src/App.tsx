import gsap from "gsap";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileAudio,
  Film,
  Lightbulb,
  MessageSquarePlus,
  MoreHorizontal,
  PenLine,
  Play,
  RefreshCcw,
  Save,
  Settings,
  Sparkles,
  X
} from "lucide-react";
import { lazy, Suspense, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { StatusAnnouncer, type StatusAnnouncerHandle, type StatusTextUpdate } from "./components/StatusAnnouncer";
import { ActionButton, SurfaceCard, SurfaceCardContent, SurfaceCardHeader } from "./components/UiPrimitives";
import { WechatStoryPreview } from "./features/chat-preview/WechatStoryPreview";
import { AboutDialog } from "./features/settings/AboutDialog";
import { SettingsDialog } from "./features/settings/SettingsDialog";
import { useEventCallback } from "./hooks/useEventCallback";
import type { VideoExportResult } from "./shared/browserVideo";
import { synthesizeMessageClip, type TtsClipMap } from "./shared/edgeTts";
import {
  makeStoryArchive,
  parseStoryArchive,
  suggestNextStoryPrompt,
  type PromptCard,
  type StoryPackage
} from "./shared/linearStory";
import {
  createPresetInitialArchive,
  isPresetPromptCard,
  nextPresetStoryIndex,
  normalizePresetRoleSelection,
  randomPresetStoryIndex,
  type JojoPresetRole,
  type PresetInitialArchive,
  type PresetRoleSelection,
  type ViralPresetRole
} from "./shared/presetStories";
import {
  chatSessionIdForMessage,
  getChatSessions,
  incomingMessageIdsForChatSession,
  projectForChatSession,
  unreadCountForChatSession
} from "./shared/chatSessions";
import { isJojoProject } from "./shared/jojoProject";
import { resolvePublicAssetPath } from "./shared/publicPath";
import { isVoiceMessage, type ChatMessage, type DramaProject } from "./shared/schema";
import { createStoryArchivePng, readArchiveFile } from "./shared/storyArchivePng";
import { attachStorySegment, restoreStoryBeforeCard, restoreStoryThroughCard } from "./shared/storySegments";
import { normalizeSuggestedPrompt } from "./shared/suggestedPrompt";
import { buildTimeline, getDurationInFrames, messageRevealDelayMs } from "./shared/timing";

const VideoPreviewPane = lazy(() => import("./features/video/VideoPreviewPane"));

type ApiState = "idle" | "loading" | "error" | "done";
type PreviewMode = "wechat" | "video";
type PreviewDirection = "left" | "right";
type PreviewTransition = {
  direction: PreviewDirection;
  exiting: PreviewMode;
  id: number;
};
type AmbientSkinId = "brown" | "grid" | "nightmeadow";
type AmbientFeedbackType = "idle" | "skin" | "queue" | "generating" | "story" | "preset" | "focus";
type AmbientFeedback = {
  id: number;
  type: Exclude<AmbientFeedbackType, "idle">;
  style: CSSProperties;
};
type AmbientSkinTransition = {
  id: number;
  direction: "left" | "right";
};
type PendingPromptCard = {
  id: string;
  prompt: string;
  status: "generating" | "queued" | "settling" | "removing";
  completedCardId?: string;
  completedCardNumber?: number;
};
type PromptRestoreUndo = {
  before: string;
  after: string;
};
type MobileStoryCoachPhase = "idle" | "press" | "start";
type AppProps = {
  storyPackage: StoryPackage;
};

const deepSeekServiceToast = "DeepSeek 服务暂时连不上，已停止生成";
const defaultJojoAppUrl = "https://ququ.mikeywa.icu/ding/";
const defaultViralAppUrl = "https://ququ.mikeywa.icu/";
const defaultGithubRepositoryUrl = "https://github.com/yanghaoleng/FakeChat";
const feedbackWechatPlaceholder = "微信号待补充";
const generationProgressCap = 99;
const generationProgressLoadingCap = 96;
const ambientThemeFadeMs = 1180;
const ambientThemeApplyDelayMs = 520;

const ambientSkins: Array<{ id: AmbientSkinId; label: string; hint: string }> = [
  { id: "brown", label: "棕砂", hint: "扫光" },
  { id: "grid", label: "暗网格", hint: "移光" },
  { id: "nightmeadow", label: "夜草地", hint: "流星" }
];

const defaultAmbientSkinByPackage: Record<StoryPackage, AmbientSkinId> = {
  viral: "nightmeadow",
  jojo: "grid"
};

const ambientParticles = Array.from({ length: 46 }, (_, index) => {
  const x = (index * 37 + 9) % 100;
  const y = (index * 53 + 17) % 100;
  const size = 2 + ((index * 7) % 8);
  const driftX = ((index % 9) - 4) * 12;
  const driftY = -22 - ((index * 11) % 68);
  const duration = 8.5 + ((index * 5) % 13) * 0.72;
  const delay = -((index * 3) % 17) * 0.58;
  return {
    id: `ambient-particle-${index}`,
    style: {
      "--particle-x": `${x}%`,
      "--particle-y": `${y}%`,
      "--particle-size": `${size}px`,
      "--particle-drift-x": `${driftX}px`,
      "--particle-drift-y": `${driftY}px`,
      "--particle-duration": `${duration}s`,
      "--particle-delay": `${delay}s`
    } as CSSProperties
  };
});

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

const viralRoleOptions: Array<{ id: ViralPresetRole; label: string }> = [
  { id: "any", label: "不限" },
  { id: "male", label: "男" },
  { id: "female", label: "女" }
];

const jojoRoleOptions: JojoPresetRole[] = ["jiaojiao", "npc"];

function packageTitle(_packageId: StoryPackage) {
  return "蛐蛐模拟器";
}

function packageSwitchLink(packageId: StoryPackage) {
  return packageId === "jojo"
    ? {
        href: import.meta.env.VITE_VIRAL_APP_URL || defaultViralAppUrl,
        label: "去微信版"
      }
    : {
        href: import.meta.env.VITE_JOJO_APP_URL || defaultJojoAppUrl,
        label: "去钉钉版"
      };
}

function ambientSkinStorageKey(packageId: StoryPackage) {
  const version = packageId === "viral" ? "v3" : "v2";
  return `ququ-ambient-skin-${version}-${packageId}`;
}

function isAmbientSkinId(value: string | null): value is AmbientSkinId {
  return ambientSkins.some((skin) => skin.id === value);
}

function readInitialAmbientSkin(packageId: StoryPackage) {
  if (typeof window === "undefined") return defaultAmbientSkinByPackage[packageId];
  const storedSkin = window.localStorage.getItem(ambientSkinStorageKey(packageId));
  return isAmbientSkinId(storedSkin) ? storedSkin : defaultAmbientSkinByPackage[packageId];
}

function ambientSkinLabel(skinId: AmbientSkinId) {
  return ambientSkins.find((skin) => skin.id === skinId)?.label ?? "背景";
}

function randomPercent(min: number, max: number) {
  return min + Math.random() * (max - min);
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
  if (elapsed <= estimateMs) {
    const progressRatio = Math.min(1, elapsed / estimateMs);
    const easedProgress = 1 - Math.pow(1 - progressRatio, 2.7);
    return Math.max(1, Math.floor(easedProgress * generationProgressLoadingCap));
  }
  const tailElapsed = elapsed - estimateMs;
  const tailProgress = 2 * (1 - Math.exp(-tailElapsed / 18000));
  return Math.min(generationProgressCap - 1, Math.floor(generationProgressLoadingCap + tailProgress));
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
  status,
  queuePosition,
  onEdit,
  onUpdate,
  onRemove,
  onJumpToBottom,
  onSelect,
  onStartEdit,
  onCancelEdit,
  isSelected,
  isEditing,
  cardId,
  style
}: {
  prompt: string;
  progress: number;
  status: PendingPromptCard["status"];
  queuePosition: number;
  onEdit: () => void;
  onUpdate?: (nextPrompt: string) => void;
  onRemove?: () => void;
  onJumpToBottom?: () => void;
  onSelect?: () => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  isSelected?: boolean;
  isEditing?: boolean;
  cardId?: string;
  style?: CSSProperties;
}) {
  const isGenerating = status === "generating";
  const isSettling = status === "settling";
  const isRemoving = status === "removing";
  const [draft, setDraft] = useState(prompt);
  useEffect(() => {
    if (!isEditing) setDraft(prompt);
  }, [isEditing, prompt]);
  const canJumpToBottom = isGenerating && Boolean(onJumpToBottom);
  const canSelect = !isGenerating && !isSettling && !isRemoving && Boolean(onSelect);
  const cardClassName = [
    "prompt-card",
    isGenerating
      ? "prompt-card-pending prompt-card-generating"
      : isSettling
        ? "prompt-card-queued prompt-card-settling prompt-card-active"
        : isRemoving
          ? "prompt-card-queued prompt-card-removing"
          : "prompt-card-queued prompt-card-selectable",
    isSelected ? "prompt-card-active" : "",
    isEditing ? "prompt-card-editing" : ""
  ].filter(Boolean).join(" ");
  const handleClick = () => {
    if (canJumpToBottom) {
      onJumpToBottom?.();
      return;
    }
    if (canSelect) onSelect?.();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (canJumpToBottom && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onJumpToBottom?.();
      return;
    }
    if (!canSelect) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onStartEdit?.();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      onSelect?.();
    }
  };
  const commitEdit = () => {
    const nextPrompt = draft.trim();
    if (!nextPrompt) return;
    onUpdate?.(nextPrompt);
  };
  const cancelEdit = () => {
    setDraft(prompt);
    onCancelEdit?.();
  };
  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    commitEdit();
  };
  return (
    <article
      className={cardClassName}
      style={style}
      aria-live="polite"
      aria-label={canJumpToBottom ? "滚动到当前对话底部" : canSelect ? `选中第 ${queuePosition} 张排队故事卡` : isSettling ? `第 ${queuePosition} 张故事卡已生成` : isRemoving ? `第 ${queuePosition} 张故事卡正在移除` : undefined}
      aria-pressed={canSelect ? Boolean(isSelected) : undefined}
      data-pending-prompt-card-id={cardId}
      data-prompt-list-card-key={cardId ? `pending-${cardId}` : undefined}
      role={canJumpToBottom || canSelect ? "button" : undefined}
      tabIndex={canJumpToBottom || canSelect ? 0 : undefined}
      onClick={handleClick}
      onDoubleClick={() => {
        if (canSelect) onStartEdit?.();
      }}
      onFocus={() => {
        if (canSelect) onSelect?.();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="prompt-card-progress" aria-label={isGenerating ? `生成进度 ${progress}%` : `第 ${queuePosition} 张故事卡`}>
        {isGenerating ? (
          <div className="prompt-card-generating-progress">
            <strong className="prompt-card-progress-number">{`${progress}%`}</strong>
          </div>
        ) : (
          <div className="prompt-card-index">{queuePosition}</div>
        )}
      </div>
      <div className="prompt-card-pending-body">
        {isEditing ? (
          <textarea
            className="prompt-card-edit-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleEditKeyDown}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            rows={3}
            autoFocus
          />
        ) : (
          <p>{prompt}</p>
        )}
        {isGenerating ? (
          <button
            className="prompt-card-edit-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            重新编辑
          </button>
        ) : isSettling ? (
          <div className="prompt-card-queue-actions prompt-card-settling-actions">
            <span className="prompt-card-queue-status">已生成</span>
          </div>
        ) : isRemoving ? (
          <div className="prompt-card-queue-actions">
            <span className="prompt-card-queue-status">移除中</span>
          </div>
        ) : isEditing ? (
          <div className="prompt-card-queue-actions">
            <span className="prompt-card-queue-status">编辑中</span>
            <div className="prompt-card-queue-controls">
              <button
                className="prompt-card-icon-button prompt-card-confirm-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  commitEdit();
                }}
                aria-label="确认编辑"
                disabled={!draft.trim()}
              >
                <Check size={14} />
                <span>确认</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="prompt-card-queue-actions">
            <span className="prompt-card-queue-status">排队中</span>
            <div className="prompt-card-queue-controls">
              {onUpdate ? (
                <button
                  className="prompt-card-icon-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartEdit?.();
                  }}
                  aria-label="编辑排队中的故事卡"
                >
                  <PenLine size={14} />
                </button>
              ) : null}
              {onRemove ? (
                <button
                  className="prompt-card-icon-button prompt-card-remove-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                  }}
                  aria-label="删除排队中的故事卡"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function AmbientLayer({
  feedback,
  transition
}: {
  feedback: AmbientFeedback | null;
  transition: AmbientSkinTransition | null;
}) {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="ambient-backdrop" />
      <div className="ambient-texture" />
      <div className="ambient-lines" />
      <div className="ambient-wash ambient-wash-primary" />
      <div className="ambient-wash ambient-wash-secondary" />
      <div className="ambient-wash ambient-wash-tertiary" />
      <div className="ambient-ribbons" />
      <div className="ambient-particle-field">
        {ambientParticles.map((particle, index) => (
          <span
            key={particle.id}
            className={`ambient-particle ambient-particle-${index % 3}`}
            style={particle.style}
          />
        ))}
      </div>
      <div className="ambient-meteor-field">
        <span className="ambient-meteor ambient-meteor-a" />
        <span className="ambient-meteor ambient-meteor-b" />
      </div>
      {feedback ? (
        <div key={feedback.id} className={`ambient-feedback-layer ambient-feedback-${feedback.type}`} style={feedback.style}>
          <span className="ambient-feedback-meteor" />
          <span className="ambient-feedback-grid-glow" />
          <span className="ambient-feedback-brown-sweep" />
        </div>
      ) : null}
      {transition ? (
        <div key={transition.id} className={`ambient-theme-swipe ambient-theme-swipe-${transition.direction}`}>
          <span />
        </div>
      ) : null}
      <div className="ambient-figure" />
      <div className="ambient-entry-blackout" />
    </div>
  );
}

function StoryPromptCardView({
  card,
  cardNumber,
  isSelected,
  isCompletingFromPending,
  isMenuOpen,
  layoutKey,
  onFocusCard,
  onToggleMenu,
  onRestartFromHere,
  onCopyPrompt,
  style
}: {
  card: PromptCard;
  cardNumber: number;
  isSelected: boolean;
  isCompletingFromPending?: boolean;
  isMenuOpen: boolean;
  layoutKey?: string;
  onFocusCard: () => void;
  onToggleMenu: () => void;
  onRestartFromHere: () => void;
  onCopyPrompt: () => void;
  style?: CSSProperties;
}) {
  const cardClassName = [
    "prompt-card",
    "prompt-card-button",
    isSelected ? "prompt-card-active" : "",
    isCompletingFromPending ? "prompt-card-completed-settling" : "",
    isMenuOpen ? "prompt-card-menu-open" : ""
  ].filter(Boolean).join(" ");
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onFocusCard();
  };
  return (
    <article
      className={cardClassName}
      style={style}
      role="button"
      tabIndex={0}
      data-prompt-list-card-key={layoutKey ?? `prompt-${card.id}`}
      data-prompt-card-id={card.id}
      aria-pressed={isSelected}
      aria-label={`定位到第 ${cardNumber} 张故事卡`}
      onClick={onFocusCard}
      onKeyDown={handleKeyDown}
    >
      <div className="prompt-card-index">{cardNumber}</div>
      <p>{card.prompt}</p>
      <div className="prompt-card-menu-root">
        <button
          className="prompt-card-menu-trigger"
          type="button"
          aria-label="打开故事卡菜单"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu();
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {isMenuOpen ? (
          <div className="prompt-card-menu" role="menu" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                onRestartFromHere();
              }}
            >
              <RefreshCcw size={14} />
              <span>从这里重新开始</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                onCopyPrompt();
              }}
            >
              <Copy size={14} />
              <span>复制</span>
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function shouldUseStoryModal() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1079px)").matches;
}

function resizeTextareaToContent(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "0px";
  const styles = window.getComputedStyle(textarea);
  const borderHeight = Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
  const minHeight = Number.parseFloat(styles.minHeight) || 0;
  const contentHeight = textarea.value ? textarea.scrollHeight + borderHeight : minHeight;
  textarea.style.height = `${Math.max(minHeight, contentHeight)}px`;
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

function disposeVideoResult(result: VideoExportResult | null | undefined) {
  if (!result) return;
  if (result.dispose) result.dispose();
  else URL.revokeObjectURL(result.url);
}

function disposeReplacedTtsClips(current: TtsClipMap, next: TtsClipMap) {
  for (const [messageId, clip] of Object.entries(current)) {
    if (next[messageId]?.url === clip.url) continue;
    URL.revokeObjectURL(clip.url);
  }
}

function archiveTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getFullYear() % 100)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function archiveFilename(date = new Date()) {
  return `存档-ququ-${archiveTimestamp(date)}.png`;
}

function videoFilename(extension: VideoExportResult["extension"], date = new Date()) {
  return `聊天录屏-${archiveTimestamp(date)}.${extension}`;
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
    snapshot.set(key, { left: element.offsetLeft, top: element.offsetTop });
  });
  return snapshot;
}

function getPromptCardLayoutKey(element: HTMLElement) {
  return element.dataset.promptListCardKey || "";
}

function getPromptCardLayoutTargets(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(".prompt-card-list > [data-prompt-list-card-key]"));
}

function readPromptCardLayoutSnapshot(root: HTMLElement): LayoutSnapshot {
  const snapshot: LayoutSnapshot = new Map();
  getPromptCardLayoutTargets(root).forEach((element) => {
    const key = getPromptCardLayoutKey(element);
    if (!key) return;
    snapshot.set(key, { left: element.offsetLeft, top: element.offsetTop });
  });
  return snapshot;
}

function updateMessage(project: DramaProject, id: string, patch: Partial<ChatMessage>): DramaProject {
  return {
    ...project,
    messages: project.messages.map((message) => (message.id === id ? { ...message, ...patch } : message))
  };
}

export default function App({ storyPackage }: AppProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const archiveExportingRef = useRef(false);
  const initialPresetArchiveRef = useRef<PresetInitialArchive | null>(null);
  if (!initialPresetArchiveRef.current) {
    initialPresetArchiveRef.current = createPresetInitialArchive(storyPackage);
  }
  const [activePresetIndex, setActivePresetIndex] = useState(initialPresetArchiveRef.current.presetIndex);
  const [activePresetRole, setActivePresetRole] = useState<PresetRoleSelection>(() => initialPresetArchiveRef.current!.roleSelection);
  const [project, setProject] = useState<DramaProject>(() => initialPresetArchiveRef.current!.project);
  const [promptCards, setPromptCards] = useState<PromptCard[]>(() => initialPresetArchiveRef.current!.promptCards);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("wechat");
  const [status, setStatus] = useState<ApiState>("idle");
  const statusAnnouncerRef = useRef<StatusAnnouncerHandle>(null);
  const setStatusText = (next: StatusTextUpdate) => statusAnnouncerRef.current?.announce(next);
  const [clips, setClipState] = useState<TtsClipMap>({});
  const [videoResult, setVideoResult] = useState<VideoExportResult | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [activeChatSessionId, setActiveChatSessionId] = useState(() => getChatSessions(initialPresetArchiveRef.current!.project)[0].id);
  const [readChatMessageIds, setReadChatMessageIds] = useState<Set<string>>(() => new Set());
  const [storyPanelOpen, setStoryPanelOpen] = useState(() => !shouldUseStoryModal());
  const [mobileStoryCoachPhase, setMobileStoryCoachPhase] = useState<MobileStoryCoachPhase>("idle");
  const [previewTransition, setPreviewTransition] = useState<PreviewTransition | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsMenuClosing, setSettingsMenuClosing] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [ambientSkin, setAmbientSkin] = useState<AmbientSkinId>(() => readInitialAmbientSkin(storyPackage));
  const [visibleAmbientSkin, setVisibleAmbientSkin] = useState<AmbientSkinId>(() => readInitialAmbientSkin(storyPackage));
  const [ambientFeedback, setAmbientFeedback] = useState<AmbientFeedback | null>(null);
  const [ambientTransition, setAmbientTransition] = useState<AmbientSkinTransition | null>(null);
  const [promptSuggestionActive, setPromptSuggestionActive] = useState(false);
  const [promptSuggestionKey, setPromptSuggestionKey] = useState(0);
  const [deferredSuggestedPrompt, setDeferredSuggestedPrompt] = useState<string | null>(null);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [pendingPromptCards, setPendingPromptCards] = useState<PendingPromptCard[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [focusedPromptCardId, setFocusedPromptCardId] = useState<string | null>(null);
  const [focusedPendingPromptCardId, setFocusedPendingPromptCardId] = useState<string | null>(null);
  const [editingPendingPromptCardId, setEditingPendingPromptCardId] = useState<string | null>(null);
  const [openPromptCardMenuId, setOpenPromptCardMenuId] = useState<string | null>(null);
  const [scrollTargetMessageId, setScrollTargetMessageId] = useState<string | null>(null);
  const [leftPanelScrolling, setLeftPanelScrolling] = useState(false);
  const clipsRef = useRef(clips);
  const scrollTargetMessageIdRef = useRef<string | null>(null);
  const projectRef = useRef(project);
  const promptCardsRef = useRef(promptCards);
  const draftPromptRef = useRef(draftPrompt);
  const pendingPromptCardsRef = useRef<PendingPromptCard[]>([]);
  const leftPanelLayoutSnapshotRef = useRef<LayoutSnapshot>(new Map());
  const promptCardLayoutSnapshotRef = useRef<LayoutSnapshot>(new Map());
  const pendingLeftPanelLayoutSnapshotRef = useRef<LayoutSnapshot | null>(null);
  const pendingPromptCardLayoutSnapshotRef = useRef<LayoutSnapshot | null>(null);
  const storyLayoutSnapshotLockedRef = useRef(false);
  const storyLayoutUnlockTimerRef = useRef<number | undefined>(undefined);
  const mobileStoryCoachTimersRef = useRef<number[]>([]);
  const mobileStoryCoachInteractedRef = useRef(false);
  const settledPromptCardIdsRef = useRef<Set<string>>(new Set());
  const completedPromptCardLayoutKeysRef = useRef<Map<string, string>>(new Map());
  const previousStoryPanelOpenRef = useRef(storyPanelOpen);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDialogRef = useRef<HTMLElement>(null);
  const settingsMenuCloseTimerRef = useRef<number | undefined>(undefined);
  const revealTimerRef = useRef<number | undefined>(undefined);
  const previewTransitionTimerRef = useRef<number | undefined>(undefined);
  const ambientFeedbackTimerRef = useRef<number | undefined>(undefined);
  const ambientTransitionTimerRef = useRef<number | undefined>(undefined);
  const ambientSkinApplyTimerRef = useRef<number | undefined>(undefined);
  const promptSuggestionTimerRef = useRef<number | undefined>(undefined);
  const leftPanelScrollTimerRef = useRef<number | undefined>(undefined);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const generationAbortRef = useRef<AbortController | null>(null);
  const generationProgressRef = useRef(0);
  const generationProgressTimerRef = useRef<number | undefined>(undefined);
  const pendingPromptRemovalTimersRef = useRef<Map<string, number>>(new Map());
  const generationRunRef = useRef(0);
  const queueProcessingRef = useRef(false);
  const activePromptCardIdRef = useRef<string | null>(null);
  const promptRestoreUndoRef = useRef<PromptRestoreUndo | null>(null);
  const promptAnimationFocusGuardUntilRef = useRef(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const jojoMode = storyPackage === "jojo";
  const chatSessions = useMemo(() => getChatSessions(project), [project]);
  const resolvedActiveChatSessionId = chatSessions.some((session) => session.id === activeChatSessionId)
    ? activeChatSessionId
    : chatSessions[0].id;
  const activeChatProject = useMemo(
    () => projectForChatSession(project, resolvedActiveChatSessionId),
    [project, resolvedActiveChatSessionId]
  );
  const durationInFrames = useMemo(() => getDurationInFrames(activeChatProject), [activeChatProject]);
  const previewInitialFrame = useMemo(() => buildTimeline(activeChatProject)[0]?.startFrame ?? 0, [activeChatProject]);
  const previewProject = useMemo(
    () => ({ ...project, messages: project.messages.slice(0, visibleMessageCount) }),
    [project, visibleMessageCount]
  );
  const unreadCounts = useMemo(() => Object.fromEntries(chatSessions.map((session) => [
    session.id,
    session.id === resolvedActiveChatSessionId
      ? 0
      : unreadCountForChatSession(previewProject, session.id, readChatMessageIds)
  ])), [chatSessions, previewProject, readChatMessageIds, resolvedActiveChatSessionId]);

  function replaceClips(nextValue: TtsClipMap | ((current: TtsClipMap) => TtsClipMap)) {
    setClipState((current) => {
      const next = typeof nextValue === "function" ? nextValue(current) : nextValue;
      disposeReplacedTtsClips(current, next);
      clipsRef.current = next;
      return next;
    });
  }

  function captureCurrentStoryLayoutSnapshot() {
    if (storyLayoutSnapshotLockedRef.current) return;
    const root = rootRef.current;
    if (!root) return;
    if (storyLayoutUnlockTimerRef.current) {
      window.clearTimeout(storyLayoutUnlockTimerRef.current);
      storyLayoutUnlockTimerRef.current = undefined;
    }
    pendingLeftPanelLayoutSnapshotRef.current = readLeftPanelLayoutSnapshot(root);
    pendingPromptCardLayoutSnapshotRef.current = readPromptCardLayoutSnapshot(root);
    storyLayoutSnapshotLockedRef.current = true;
  }

  function updateScrollTargetMessageId(nextMessageId: string | null) {
    scrollTargetMessageIdRef.current = nextMessageId;
    setScrollTargetMessageId(nextMessageId);
  }

  function markChatSessionRead(projectSnapshot: DramaProject, sessionId: string) {
    const messageIds = incomingMessageIdsForChatSession(projectSnapshot, sessionId);
    if (!messageIds.length) return;
    setReadChatMessageIds((current) => {
      if (messageIds.every((messageId) => current.has(messageId))) return current;
      const next = new Set(current);
      messageIds.forEach((messageId) => next.add(messageId));
      return next;
    });
  }

  function selectChatSession(sessionId: string) {
    if (!getChatSessions(projectRef.current).some((session) => session.id === sessionId)) return;
    const visibleProjectSnapshot = {
      ...projectRef.current,
      messages: projectRef.current.messages.slice(0, visibleMessageCount)
    };
    markChatSessionRead(visibleProjectSnapshot, sessionId);
    setActiveChatSessionId(sessionId);
    setVideoResult(null);
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    updateScrollTargetMessageId(null);
  }

  function resetChatSessionState(nextProject: DramaProject) {
    setActiveChatSessionId(getChatSessions(nextProject)[0].id);
    setReadChatMessageIds(new Set());
  }

  function handleLeftPanelScroll() {
    setLeftPanelScrolling(true);
    if (leftPanelScrollTimerRef.current) window.clearTimeout(leftPanelScrollTimerRef.current);
    leftPanelScrollTimerRef.current = window.setTimeout(() => {
      setLeftPanelScrolling(false);
      leftPanelScrollTimerRef.current = undefined;
    }, 720);
  }

  function updatePendingPromptCards(updater: (current: PendingPromptCard[]) => PendingPromptCard[]) {
    const currentCards = pendingPromptCardsRef.current;
    const nextCards = updater(currentCards);
    if (nextCards === currentCards) return currentCards;
    captureCurrentStoryLayoutSnapshot();
    pendingPromptCardsRef.current = nextCards;
    setPendingPromptCards(nextCards);
    return nextCards;
  }

  function canGeneratePendingPromptCard(card: PendingPromptCard) {
    return card.status === "queued" || card.status === "generating";
  }

  function clearPendingPromptRemovalTimers() {
    pendingPromptRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingPromptRemovalTimersRef.current.clear();
  }

  function finalizePendingPromptCardRemoval(cardId: string) {
    const existingTimer = pendingPromptRemovalTimersRef.current.get(cardId);
    if (existingTimer) window.clearTimeout(existingTimer);
    const timer = window.setTimeout(() => {
      pendingPromptRemovalTimersRef.current.delete(cardId);
      updatePendingPromptCards((cards) => cards.filter((card) => card.id !== cardId));
    }, 280);
    pendingPromptRemovalTimersRef.current.set(cardId, timer);
  }

  function markPendingPromptCardRemoving(cardId: string) {
    const nextCards = updatePendingPromptCards((cards) => cards.map((card) => (
      card.id === cardId ? { ...card, status: "removing" } : card
    )));
    finalizePendingPromptCardRemoval(cardId);
    return nextCards;
  }

  function updateGenerationProgress(nextProgress: number | ((current: number) => number)) {
    const rawProgress = typeof nextProgress === "function" ? nextProgress(generationProgressRef.current) : nextProgress;
    const roundedProgress = Math.round(Math.max(0, Math.min(generationProgressCap, rawProgress)));
    generationProgressRef.current = roundedProgress;
    setGenerationProgress(roundedProgress);
    return roundedProgress;
  }

  function triggerAmbientFeedback(type: AmbientFeedbackType, feedbackSkin: AmbientSkinId = ambientSkin) {
    if (ambientFeedbackTimerRef.current) {
      window.clearTimeout(ambientFeedbackTimerRef.current);
      ambientFeedbackTimerRef.current = undefined;
    }

    if (type === "idle") {
      setAmbientFeedback(null);
      return;
    }

    const targetX = randomPercent(18, 82);
    const targetY = randomPercent(16, type === "focus" ? 54 : 70);
    const driftX = randomPercent(-24, 24);
    const driftY = randomPercent(-16, 16);
    const meteorAngle = randomPercent(-29, -17);
    const nextFeedback: AmbientFeedback = {
      id: Date.now(),
      type,
      style: {
        "--feedback-x": `${targetX.toFixed(1)}%`,
        "--feedback-y": `${targetY.toFixed(1)}%`,
        "--feedback-dx": `${driftX.toFixed(1)}vw`,
        "--feedback-dy": `${driftY.toFixed(1)}vh`,
        "--feedback-angle": `${meteorAngle.toFixed(1)}deg`
      } as CSSProperties
    };

    setAmbientFeedback(nextFeedback);
    const feedbackDuration = feedbackSkin === "brown" ? 3600 : 1800;
    ambientFeedbackTimerRef.current = window.setTimeout(() => {
      setAmbientFeedback(null);
      ambientFeedbackTimerRef.current = undefined;
    }, feedbackDuration);
  }

  function selectAmbientSkin(nextSkin: AmbientSkinId) {
    if (nextSkin !== visibleAmbientSkin) {
      if (ambientTransitionTimerRef.current) {
        window.clearTimeout(ambientTransitionTimerRef.current);
        ambientTransitionTimerRef.current = undefined;
      }
      if (ambientSkinApplyTimerRef.current) {
        window.clearTimeout(ambientSkinApplyTimerRef.current);
        ambientSkinApplyTimerRef.current = undefined;
      }
      const currentIndex = ambientSkins.findIndex((skin) => skin.id === visibleAmbientSkin);
      const nextIndex = ambientSkins.findIndex((skin) => skin.id === nextSkin);
      setAmbientSkin(nextSkin);
      setAmbientTransition({
        id: Date.now(),
        direction: nextIndex >= currentIndex ? "right" : "left"
      });
      ambientSkinApplyTimerRef.current = window.setTimeout(() => {
        setVisibleAmbientSkin(nextSkin);
        window.localStorage.setItem(ambientSkinStorageKey(storyPackage), nextSkin);
        triggerAmbientFeedback("skin", nextSkin);
        setStatus("done");
        setStatusText(`背景已切换：${ambientSkinLabel(nextSkin)}`);
        ambientSkinApplyTimerRef.current = undefined;
      }, ambientThemeApplyDelayMs);
      ambientTransitionTimerRef.current = window.setTimeout(() => {
        setAmbientTransition(null);
        ambientTransitionTimerRef.current = undefined;
      }, ambientThemeFadeMs);
      return;
    }
    setAmbientSkin(nextSkin);
    setVisibleAmbientSkin(nextSkin);
    window.localStorage.setItem(ambientSkinStorageKey(storyPackage), nextSkin);
    triggerAmbientFeedback("skin", nextSkin);
    setStatus("done");
    setStatusText(`背景已切换：${ambientSkinLabel(nextSkin)}`);
  }

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (activeChatSessionId !== resolvedActiveChatSessionId) {
      setActiveChatSessionId(resolvedActiveChatSessionId);
    }
  }, [activeChatSessionId, resolvedActiveChatSessionId]);

  useEffect(() => {
    const messageIds = incomingMessageIdsForChatSession(previewProject, resolvedActiveChatSessionId);
    if (!messageIds.length) return;
    setReadChatMessageIds((current) => {
      if (messageIds.every((messageId) => current.has(messageId))) return current;
      const next = new Set(current);
      messageIds.forEach((messageId) => next.add(messageId));
      return next;
    });
  }, [previewProject, resolvedActiveChatSessionId]);

  useEffect(() => {
    promptCardsRef.current = promptCards;
  }, [promptCards]);

  useEffect(() => {
    draftPromptRef.current = draftPrompt;
  }, [draftPrompt]);

  useEffect(() => () => {
    disposeVideoResult(videoResult);
  }, [videoResult]);

  useEffect(() => () => {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    if (previewTransitionTimerRef.current) window.clearTimeout(previewTransitionTimerRef.current);
    if (ambientFeedbackTimerRef.current) window.clearTimeout(ambientFeedbackTimerRef.current);
    if (ambientTransitionTimerRef.current) window.clearTimeout(ambientTransitionTimerRef.current);
    if (ambientSkinApplyTimerRef.current) window.clearTimeout(ambientSkinApplyTimerRef.current);
    if (promptSuggestionTimerRef.current) window.clearTimeout(promptSuggestionTimerRef.current);
    if (leftPanelScrollTimerRef.current) window.clearTimeout(leftPanelScrollTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    if (generationProgressTimerRef.current) window.clearInterval(generationProgressTimerRef.current);
    if (storyLayoutUnlockTimerRef.current) window.clearTimeout(storyLayoutUnlockTimerRef.current);
    if (settingsMenuCloseTimerRef.current) window.clearTimeout(settingsMenuCloseTimerRef.current);
    mobileStoryCoachTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    mobileStoryCoachTimersRef.current = [];
    clearPendingPromptRemovalTimers();
    generationAbortRef.current?.abort();
    disposeReplacedTtsClips(clipsRef.current, {});
    clipsRef.current = {};
  }, []);

  useEffect(() => {
    if (!settingsMenuOpen || settingsMenuClosing) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = settingsDialogRef.current;
      const selectedControl = dialog?.querySelector<HTMLElement>("[aria-selected='true']");
      const firstControl = dialog?.querySelector<HTMLElement>("button:not(:disabled), a[href]");
      (selectedControl ?? firstControl)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [settingsMenuClosing, settingsMenuOpen]);

  useEffect(() => {
    if (!openPromptCardMenuId) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".prompt-card-menu-root")) return;
      setOpenPromptCardMenuId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPromptCardMenuId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPromptCardMenuId]);

  useEffect(() => {
    if (project.messages.length) startMessageReveal(0, project.messages.length);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftPromptRef.current.trim()) return;
      const nextPrompt = initialPresetArchiveRef.current?.nextPrompt || "";
      if (nextPrompt) showSuggestedPrompt(nextPrompt);
      setStatusText((current) => current === "正在检查 DeepSeek 配置..." ? "预设提示词已载入" : current);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [storyPackage]);

  useEffect(() => {
    if (!shouldUseStoryModal() || projectRef.current.messages.length || promptCardsRef.current.length) return undefined;
    mobileStoryCoachInteractedRef.current = false;
    const pressTimer = window.setTimeout(() => {
      if (!mobileStoryCoachInteractedRef.current) setMobileStoryCoachPhase("press");
    }, 760);
    const openTimer = window.setTimeout(() => {
      if (mobileStoryCoachInteractedRef.current) return;
      setMobileStoryCoachPhase("start");
      setStoryPanelOpenWithContinuity(true);
    }, 1320);
    const finishTimer = window.setTimeout(() => {
      setMobileStoryCoachPhase("idle");
    }, 4600);
    mobileStoryCoachTimersRef.current = [pressTimer, openTimer, finishTimer];
    return () => {
      mobileStoryCoachTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      mobileStoryCoachTimersRef.current = [];
    };
  }, [storyPackage]);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    const root = rootRef.current;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".motion-in",
        { y: 18, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.55,
          stagger: 0.055,
          ease: "power3.out"
        }
      );
    }, root);

    const interactiveSelector = "button,a,textarea,.prompt-card";
    const findInteractive = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(interactiveSelector) : null;
    const isMovingInside = (event: PointerEvent, target: HTMLElement) => event.relatedTarget instanceof Node && target.contains(event.relatedTarget);
    const usesOwnMotion = (target: HTMLElement) => target.classList.contains("story-action-button");
    const handleOver = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || isMovingInside(event, target) || target.matches("[disabled],[aria-disabled='true']")) return;
      if (usesOwnMotion(target)) return;
      gsap.to(target, { y: -2, scale: 1.01, duration: 0.18, ease: "power2.out" });
    };
    const handleOut = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || isMovingInside(event, target)) return;
      if (usesOwnMotion(target)) return;
      gsap.to(target, { y: 0, scale: 1, duration: 0.2, ease: "power2.out" });
    };
    const handleDown = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target || target.matches("[disabled],[aria-disabled='true']")) return;
      if (usesOwnMotion(target)) return;
      gsap.to(target, { scale: 0.985, duration: 0.08, ease: "power2.out" });
    };
    const handleUp = (event: PointerEvent) => {
      const target = findInteractive(event.target);
      if (!target) return;
      if (usesOwnMotion(target)) return;
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
  }, [previewMode, previewProject.messages.length, visibleMessageCount, project.messages.length, resolvedActiveChatSessionId, scrollTargetMessageId]);

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
      const musicDockHeight = root.querySelector<HTMLElement>(".wechat-music-dock")?.offsetHeight ?? 0;
      const topPadding = 16 + (musicDockHeight ? musicDockHeight + 8 : 0);
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
  }, [previewMode, previewProject.messages.length, resolvedActiveChatSessionId, scrollTargetMessageId]);

  useEffect(() => {
    if (!rootRef.current || !promptCards.length) return;
    const latestCardId = promptCards[promptCards.length - 1]?.id;
    if (latestCardId && settledPromptCardIdsRef.current.has(latestCardId)) {
      settledPromptCardIdsRef.current.delete(latestCardId);
      return;
    }
    const latest = Array.from(rootRef.current.querySelectorAll<HTMLElement>("[data-prompt-card-id]"))
      .find((element) => element.dataset.promptCardId === latestCardId);
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

  async function copyFeedbackWechatId() {
    if (!hasFeedbackWechatId) {
      showToast("请先补充微信号");
      return;
    }
    try {
      let copied = false;
      if (typeof document.execCommand === "function") {
        const textarea = document.createElement("textarea");
        textarea.value = feedbackWechatId;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        textarea.remove();
      }
      if (!copied && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedbackWechatId);
        copied = true;
      }
      if (!copied) throw new Error("copy command failed");
      showToast("复制微信号成功");
    } catch (error) {
      console.error("[about] copy wechat id failed", error);
      showToast("复制失败，请手动复制");
    }
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
    updateGenerationProgress(1);
    generationProgressTimerRef.current = window.setInterval(() => {
      updateGenerationProgress(estimateGenerationProgress(startedAt, estimateMs));
    }, 320);
  }

  async function completeGenerationProgress(runId: number, signal: AbortSignal) {
    stopGenerationProgress();
    const startProgress = Math.min(generationProgressRef.current || 1, generationProgressCap - 1);
    const startedAt = performance.now();
    const durationMs = Math.max(260, Math.min(520, (generationProgressCap - startProgress) * 18));

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        if (!isCurrentGeneration(runId, signal)) {
          resolve();
          return;
        }
        const progressRatio = Math.min(1, (now - startedAt) / durationMs);
        const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
        updateGenerationProgress(startProgress + (generationProgressCap - startProgress) * easedProgress);
        if (progressRatio < 1) {
          window.requestAnimationFrame(tick);
          return;
        }
        updateGenerationProgress(generationProgressCap);
        resolve();
      };
      window.requestAnimationFrame(tick);
    });

    if (!isCurrentGeneration(runId, signal)) return false;
    await new Promise((resolve) => window.setTimeout(resolve, 90));
    return isCurrentGeneration(runId, signal);
  }

  function stopStoryGeneration() {
    if (status !== "loading") return;
    const activeCardId = activePromptCardIdRef.current;
    const activeCard = pendingPromptCardsRef.current.find((card) => card.id === activeCardId && card.status === "generating");
    const promptToEdit = activeCard?.prompt || "";
    if (!activeCard) return;
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    if (promptToEdit) restorePromptForEditing(promptToEdit);
    activePromptCardIdRef.current = null;
    const remainingCards = markPendingPromptCardRemoving(activeCard.id);
    updateGenerationProgress(0);
    setVideoProgress(0);
    if (remainingCards.some(canGeneratePendingPromptCard)) {
      setStatus("loading");
      setStatusText("已取回当前卡片，继续处理排队中的故事");
    } else {
      setStatus("idle");
      setStatusText("已停止生成，可以重新编辑这张故事卡");
    }
  }

  function startMessageReveal(fromCount: number, toCount: number) {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    setVisibleMessageCount(fromCount);
    let nextCount = fromCount;
    if (nextCount >= toCount) {
      revealTimerRef.current = undefined;
      return;
    }

    const revealNextMessage = () => {
      const nextMessage = projectRef.current.messages[nextCount];
      const delay = nextMessage ? messageRevealDelayMs(nextMessage) : 1500;
      revealTimerRef.current = window.setTimeout(() => {
        nextCount += 1;
        setVisibleMessageCount(Math.min(nextCount, toCount));
        if (nextCount >= toCount) {
          revealTimerRef.current = undefined;
          return;
        }
        revealNextMessage();
      }, delay);
    };

    revealNextMessage();
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
    const animationMs = promptRiseAnimationMs(nextPrompt);
    setDraftPrompt(nextPrompt);
    setPromptSuggestionKey((current) => current + 1);
    setPromptSuggestionActive(true);
    if (options.focusAtEnd) focusPromptTextareaAtEnd(nextPrompt, true);
    promptSuggestionTimerRef.current = window.setTimeout(() => {
      setPromptSuggestionActive(false);
      promptSuggestionTimerRef.current = undefined;
    }, animationMs);
  }

  function dismissDeferredSuggestion() {
    setSuggestionDialogOpen(false);
  }

  function adoptDeferredSuggestion() {
    const suggestedPrompt = deferredSuggestedPrompt?.trim();
    if (!suggestedPrompt) return;
    const previousPrompt = draftPromptRef.current;
    promptRestoreUndoRef.current = previousPrompt === suggestedPrompt ? null : { before: previousPrompt, after: suggestedPrompt };
    setSuggestionDialogOpen(false);
    setDeferredSuggestedPrompt(null);
    showSuggestedPrompt(suggestedPrompt, { preservePromptUndo: true, focusAtEnd: true });
  }

  function offerSuggestedPrompt(nextPrompt: string) {
    const suggestedPrompt = normalizeSuggestedPrompt(nextPrompt);
    if (!suggestedPrompt) return;
    if (draftPromptRef.current.trim()) {
      setDeferredSuggestedPrompt(suggestedPrompt);
      setSuggestionDialogOpen(false);
      return;
    }
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    showSuggestedPrompt(suggestedPrompt);
  }

  function suggestedPromptForSegment(
    result: { project: DramaProject; card: PromptCard; messages: ChatMessage[]; suggestedPrompt?: string },
    nextPromptCards: PromptCard[]
  ) {
    const deepseekSuggestion = normalizeSuggestedPrompt(result.suggestedPrompt);
    if (deepseekSuggestion) return deepseekSuggestion;
    const isFirstGeneratedAfterPreset = nextPromptCards.length === 2 && isPresetPromptCard(nextPromptCards[0]);
    if (nextPromptCards.length !== 1 && !isFirstGeneratedAfterPreset) return "";
    return normalizeSuggestedPrompt(suggestNextStoryPrompt({
      project: result.project,
      prompt: result.card.prompt,
      promptCards: nextPromptCards,
      messages: result.messages
    }));
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

  function loadInitialPresetArchive(archive: PresetInitialArchive, statusText: string) {
    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    clearPendingPromptRemovalTimers();
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    captureCurrentStoryLayoutSnapshot();
    initialPresetArchiveRef.current = archive;
    projectRef.current = archive.project;
    promptCardsRef.current = archive.promptCards;
    pendingPromptCardsRef.current = [];
    queueProcessingRef.current = false;
    activePromptCardIdRef.current = null;
    settledPromptCardIdsRef.current.clear();
    completedPromptCardLayoutKeysRef.current.clear();
    setActivePresetIndex(archive.presetIndex);
    setActivePresetRole(archive.roleSelection);
    setProject(archive.project);
    setPromptCards(archive.promptCards);
    resetChatSessionState(archive.project);
    updatePendingPromptCards(() => []);
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    setOpenPromptCardMenuId(null);
    updateScrollTargetMessageId(null);
    promptRestoreUndoRef.current = null;
    replaceClips({});
    setVideoResult(null);
    setVideoProgress(0);
    updateGenerationProgress(0);
    setVisibleMessageCount(0);
    setStatus("done");
    setStatusText(statusText);
    showSuggestedPrompt(archive.nextPrompt);
    triggerAmbientFeedback("preset");
    window.requestAnimationFrame(() => startMessageReveal(0, archive.project.messages.length));
  }

  function switchInitialPreset() {
    const nextIndex = nextPresetStoryIndex(storyPackage, activePresetIndex, activePresetRole);
    const archive = createPresetInitialArchive(storyPackage, nextIndex, activePresetRole);
    loadInitialPresetArchive(archive, `已切换预设：${archive.preset.title}`);
  }

  function roleStatusLabel(roleSelection: PresetRoleSelection) {
    if (storyPackage !== "jojo") {
      if (roleSelection.viralRole === "any") return "不限";
      return roleSelection.viralRole === "female" ? "女性视角" : "男性视角";
    }
    if (roleSelection.jojoRole === "npc") return "NPC";
    const character = projectRef.current.characters.find((item) => item.id === roleSelection.jojoRole);
    return character?.name || "叫叫";
  }

  function switchPresetRole(nextRoleSelection: Partial<PresetRoleSelection>) {
    const roleSelection = normalizePresetRoleSelection({ ...activePresetRole, ...nextRoleSelection });
    if (roleSelection.viralRole === activePresetRole.viralRole && roleSelection.jojoRole === activePresetRole.jojoRole) return;
    const archive = createPresetInitialArchive(storyPackage, randomPresetStoryIndex(storyPackage, roleSelection), roleSelection);
    closeSettingsMenu();
    loadInitialPresetArchive(archive, `已切换角色：${roleStatusLabel(roleSelection)}`);
  }

  function applyStorySegment(
    result: { project: DramaProject; card: PromptCard; messages: ChatMessage[]; suggestedPrompt?: string },
    nextStatusText: string,
    options: {
      baseProject?: DramaProject;
      basePromptCards?: PromptCard[];
      queueWillContinue?: boolean;
    } = {}
  ) {
    const baseProject = options.baseProject ?? projectRef.current;
    const basePromptCards = options.basePromptCards ?? promptCardsRef.current;
    const previousCount = baseProject.messages.length;
    const resultMessageIds = result.messages.map((message) => message.id);
    let nextCard = attachStorySegment({
      ...result.card,
      messageIds: resultMessageIds.length ? resultMessageIds : result.card.messageIds
    }, baseProject, result.project);
    const suggestedPrompt = suggestedPromptForSegment(result, [...basePromptCards, nextCard]);
    if (suggestedPrompt) nextCard = { ...nextCard, suggestedPrompt };
    const nextPromptCards = [...basePromptCards, nextCard];
    captureCurrentStoryLayoutSnapshot();
    projectRef.current = result.project;
    promptCardsRef.current = nextPromptCards;
    setProject(result.project);
    setPromptCards(nextPromptCards);
    stopGenerationProgress();
    if (!scrollTargetMessageIdRef.current) {
      setFocusedPromptCardId(nextCard.id);
    }
    generationAbortRef.current = null;
    if (!options.queueWillContinue) offerSuggestedPrompt(suggestedPrompt);
    setVideoResult(null);
    setStatus(options.queueWillContinue ? "loading" : "done");
    setStatusText(options.queueWillContinue ? `${nextStatusText}，继续生成下一张...` : nextStatusText);
    if (!options.queueWillContinue && shouldUseStoryModal()) setStoryPanelOpenWithContinuity(false);
    startMessageReveal(previousCount, result.project.messages.length);
    triggerAmbientFeedback("story");
  }

  function openSettingsMenu() {
    if (settingsMenuCloseTimerRef.current) window.clearTimeout(settingsMenuCloseTimerRef.current);
    settingsMenuCloseTimerRef.current = undefined;
    setAboutDialogOpen(false);
    setOpenPromptCardMenuId(null);
    setSettingsMenuClosing(false);
    setSettingsMenuOpen(true);
  }

  function closeSettingsMenu() {
    if (!settingsMenuOpen || settingsMenuClosing) return;
    setAboutDialogOpen(false);
    setSettingsMenuClosing(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    settingsMenuCloseTimerRef.current = window.setTimeout(() => {
      setSettingsMenuOpen(false);
      setSettingsMenuClosing(false);
      settingsMenuCloseTimerRef.current = undefined;
      window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
    }, reduceMotion ? 0 : 180);
  }

  function toggleSettingsMenu() {
    if (settingsMenuOpen) {
      closeSettingsMenu();
      return;
    }
    openSettingsMenu();
  }

  function handleSettingsDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSettingsMenu();
      return;
    }

    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
    if (!controls.length) return;
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement);

    if (event.key === "Tab") {
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
        : (currentIndex >= controls.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      controls[nextIndex]?.focus();
      return;
    }

    const direction = event.key === "ArrowUp" || event.key === "ArrowLeft"
      ? -1
      : event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : 0;
    if (!direction) return;
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + controls.length) % controls.length;
    event.preventDefault();
    controls[nextIndex]?.focus();
  }

  function openAboutDialog() {
    setAboutDialogOpen(true);
  }

  function closeAboutDialog() {
    setAboutDialogOpen(false);
    window.requestAnimationFrame(() => {
      settingsDialogRef.current?.querySelector<HTMLElement>("[data-settings-about]")?.focus();
    });
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

  function completeMobileStoryCoach() {
    mobileStoryCoachInteractedRef.current = true;
    mobileStoryCoachTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    mobileStoryCoachTimersRef.current = [];
    setMobileStoryCoachPhase("idle");
  }

  async function generateStoryForPrompt({
    prompt,
    projectSnapshot,
    promptCardsSnapshot,
    runId,
    signal
  }: {
    prompt: string;
    projectSnapshot: DramaProject;
    promptCardsSnapshot: PromptCard[];
    runId: number;
    signal: AbortSignal;
  }) {
    let backendError: unknown;
    setStatusText("正在请求后端 DeepSeek 续写...");
    try {
      const { generateBackendStorySegment } = await import("./shared/deepseekBackend");
      const result = await generateBackendStorySegment({ project: projectSnapshot, prompt, promptCards: promptCardsSnapshot, signal });
      if (!isCurrentGeneration(runId, signal)) throw new Error("generation cancelled");
      return { result, statusText: `DeepSeek 后端已追加 ${result.messages.length} 条消息` };
    } catch (error) {
      if (!isCurrentGeneration(runId, signal)) throw error;
      backendError = error;
      console.warn("[deepseek] backend unavailable", error);
    }

    const { generateDeepSeekStorySegment, hasBrowserDeepSeekKey } = await import("./shared/deepseekBrowser");
    if (hasBrowserDeepSeekKey()) {
      setStatusText("后端不可用，正在尝试浏览器公开配置...");
      try {
        const result = await generateDeepSeekStorySegment({ project: projectSnapshot, prompt, promptCards: promptCardsSnapshot, signal });
        if (!isCurrentGeneration(runId, signal)) throw new Error("generation cancelled");
        return { result, statusText: `DeepSeek 前端已追加 ${result.messages.length} 条消息` };
      } catch (browserError) {
        if (!isCurrentGeneration(runId, signal)) throw browserError;
        console.warn("[deepseek] browser direct unavailable", browserError);
        setStatusText("DeepSeek 未连通，已停止生成");
        throw browserError;
      }
    }

    setStatusText("DeepSeek 未连通，已停止生成");
    throw backendError instanceof Error ? backendError : new Error("DeepSeek 未连通");
  }

  async function drainPromptQueue() {
    if (queueProcessingRef.current) return;
    queueProcessingRef.current = true;

    try {
      while (pendingPromptCardsRef.current.some(canGeneratePendingPromptCard)) {
        const activeCard = pendingPromptCardsRef.current.find(canGeneratePendingPromptCard);
        if (!activeCard) break;
        activePromptCardIdRef.current = activeCard.id;
        setFocusedPendingPromptCardId((current) => current === activeCard.id ? null : current);
        setEditingPendingPromptCardId((current) => current === activeCard.id ? null : current);
        updatePendingPromptCards((cards) => {
          let changed = false;
          const nextCards = cards.map((card) => {
            const nextStatus: PendingPromptCard["status"] = card.id === activeCard.id ? "generating" : card.status === "generating" ? "queued" : card.status;
            if (nextStatus === card.status) return card;
            changed = true;
            return { ...card, status: nextStatus };
          });
          return changed ? nextCards : cards;
        });

        const projectSnapshot = projectRef.current;
        const promptCardsSnapshot = promptCardsRef.current;
        const controller = new AbortController();
        const runId = generationRunRef.current + 1;
        generationRunRef.current = runId;
        generationAbortRef.current = controller;
        const signal = controller.signal;

        setStatus("loading");
        setVideoProgress(0);
        startGenerationProgress(estimatedGenerationMs(projectSnapshot, storyPackage));
        triggerAmbientFeedback("generating");

        try {
          const { result, statusText } = await generateStoryForPrompt({
            prompt: activeCard.prompt,
            projectSnapshot,
            promptCardsSnapshot,
            runId,
            signal
          });
          if (!isCurrentGeneration(runId, signal)) continue;
          if (!await completeGenerationProgress(runId, signal)) continue;

          updatePendingPromptCards((cards) => cards.map((card) => (
            card.id === activeCard.id
              ? {
                  ...card,
                  status: "settling",
                  completedCardId: result.card.id,
                  completedCardNumber: promptCardsSnapshot.length + 1
                }
              : card
          )));
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          if (!isCurrentGeneration(runId, signal)) continue;

          const queueWillContinue = pendingPromptCardsRef.current.some((card) => card.id !== activeCard.id && canGeneratePendingPromptCard(card));
          settledPromptCardIdsRef.current.add(result.card.id);
          completedPromptCardLayoutKeysRef.current.set(result.card.id, `pending-${activeCard.id}`);
          applyStorySegment(result, statusText, {
            baseProject: projectSnapshot,
            basePromptCards: promptCardsSnapshot,
            queueWillContinue
          });
          updatePendingPromptCards((cards) => cards.filter((card) => card.id !== activeCard.id));
        } catch (error) {
          if (!isCurrentGeneration(runId, signal)) continue;
          console.error("[deepseek] queue failed", error);
          showToast(deepSeekServiceToast);
          const message = error instanceof Error ? error.message : "DeepSeek 续写失败";
          restorePromptForEditing(activeCard.prompt);
          setStatus("error");
          setStatusText(message);
          markPendingPromptCardRemoving(activeCard.id);
          break;
        } finally {
          if (generationRunRef.current === runId) {
            generationAbortRef.current = null;
            stopGenerationProgress();
            updateGenerationProgress(0);
          }
        }
      }
    } finally {
      queueProcessingRef.current = false;
      activePromptCardIdRef.current = null;
      if (!pendingPromptCardsRef.current.some(canGeneratePendingPromptCard)) {
        generationAbortRef.current = null;
        stopGenerationProgress();
        updateGenerationProgress(0);
      }
    }
  }

  function removeQueuedPromptCard(cardId: string) {
    const targetCard = pendingPromptCardsRef.current.find((card) => card.id === cardId);
    if (!targetCard || targetCard.status !== "queued") return;
    markPendingPromptCardRemoving(cardId);
    setFocusedPendingPromptCardId((current) => current === cardId ? null : current);
    setEditingPendingPromptCardId((current) => current === cardId ? null : current);
    setStatusText("已移除排队中的故事卡");
  }

  function updateQueuedPromptCard(cardId: string, nextPrompt: string) {
    const targetCard = pendingPromptCardsRef.current.find((card) => card.id === cardId);
    const prompt = nextPrompt.trim();
    if (!targetCard || targetCard.status === "generating" || !prompt) return;
    updatePendingPromptCards((cards) => cards.map((card) => (
      card.id === cardId ? { ...card, prompt } : card
    )));
    setFocusedPendingPromptCardId(cardId);
    setEditingPendingPromptCardId(null);
    setStatusText("已更新排队中的故事卡");
    triggerAmbientFeedback("queue");
  }

  function selectPendingPromptCard(cardId: string, options: { focusElement?: boolean } = {}) {
    const targetCard = pendingPromptCardsRef.current.find((card) => card.id === cardId && card.status === "queued");
    if (!targetCard) return false;
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(cardId);
    setEditingPendingPromptCardId((current) => current && current !== cardId ? null : current);
    triggerAmbientFeedback("focus");
    if (options.focusElement) {
      window.requestAnimationFrame(() => {
        const targetCardElement = rootRef.current?.querySelector<HTMLElement>(`[data-pending-prompt-card-id="${cardId}"]`);
        targetCardElement?.focus({ preventScroll: true });
      });
    }
    return true;
  }

  function startPendingPromptCardEdit(cardId: string) {
    const targetCard = pendingPromptCardsRef.current.find((card) => card.id === cardId && card.status === "queued");
    if (!targetCard) return false;
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(cardId);
    setEditingPendingPromptCardId(cardId);
    return true;
  }

  function cancelPendingPromptCardEdit() {
    if (!editingPendingPromptCardId) return false;
    setEditingPendingPromptCardId(null);
    setStatusText("已取消编辑排队中的故事卡");
    return true;
  }

  function editFocusedPendingPromptCard() {
    if (!focusedPendingPromptCardId) return false;
    return startPendingPromptCardEdit(focusedPendingPromptCardId);
  }

  function removeFocusedPendingPromptCard() {
    if (!focusedPendingPromptCardId) return false;
    const targetCard = pendingPromptCardsRef.current.find((card) => card.id === focusedPendingPromptCardId && card.status === "queued");
    if (!targetCard) return false;
    removeQueuedPromptCard(targetCard.id);
    return true;
  }

  function removeCompletedPromptCard(card: PromptCard) {
    const currentPromptCards = promptCardsRef.current;
    const cardIndex = currentPromptCards.findIndex((item) => item.id === card.id);
    if (cardIndex < 0) {
      setStatus("error");
      setStatusText("没有找到这张故事卡");
      return false;
    }

    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    pendingPromptRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingPromptRemovalTimersRef.current.clear();
    queueProcessingRef.current = false;
    activePromptCardIdRef.current = null;

    const currentProject = projectRef.current;
    const restoredStory = restoreStoryBeforeCard(currentProject, currentPromptCards, cardIndex);
    const nextPromptCards = restoredStory.promptCards;
    const previousCard = nextPromptCards.at(-1);
    const nextProject = restoredStory.project;
    const nextMessages = nextProject.messages;
    const nextMessageIds = new Set(nextMessages.map((message) => message.id));
    const removedCount = currentPromptCards.length - cardIndex;

    captureCurrentStoryLayoutSnapshot();
    projectRef.current = nextProject;
    promptCardsRef.current = nextPromptCards;
    settledPromptCardIdsRef.current.clear();
    completedPromptCardLayoutKeysRef.current.clear();
    setProject(nextProject);
    setPromptCards(nextPromptCards);
    updatePendingPromptCards(() => []);
    setFocusedPromptCardId(previousCard?.id ?? null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    setOpenPromptCardMenuId(null);
    updateScrollTargetMessageId(null);
    updateGenerationProgress(0);
    setVideoProgress(0);
    setVideoResult(null);
    setVisibleMessageCount(nextMessages.length);
    replaceClips((current) => Object.fromEntries(
      Object.entries(current).filter(([messageId]) => nextMessageIds.has(messageId))
    ) as TtsClipMap);
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    restorePromptForEditing(card.prompt);
    setStatus("done");
    setStatusText(removedCount > 1 ? `已删除第 ${cardIndex + 1} 张故事卡及后续内容` : `已删除第 ${cardIndex + 1} 张故事卡`);
    return true;
  }

  function removeFocusedStoryCard() {
    if (focusedPendingPromptCardId) return removeFocusedPendingPromptCard();
    if (!focusedPromptCardId) return false;
    const targetCard = promptCardsRef.current.find((card) => card.id === focusedPromptCardId);
    if (!targetCard) return false;
    return removeCompletedPromptCard(targetCard);
  }

  function applyCachedInitialPresetSegment(prompt: string) {
    const archive = initialPresetArchiveRef.current;
    const cachedFirstSegment = archive?.cachedFirstSegment;
    if (!archive || !cachedFirstSegment) return false;
    if (projectRef.current.messages.length || promptCardsRef.current.length || pendingPromptCardsRef.current.length) return false;
    if (prompt.trim() !== archive.preset.prompt.trim()) return false;

    promptRestoreUndoRef.current = null;
    finishPromptSuggestionAnimation();
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    draftPromptRef.current = "";
    setDraftPrompt("");
    setVideoProgress(0);
    updateGenerationProgress(0);
    applyStorySegment(cachedFirstSegment, `已载入预设开场 ${cachedFirstSegment.messages.length} 条消息`, {
      baseProject: projectRef.current,
      basePromptCards: []
    });
    return true;
  }

  function continueStory() {
    const prompt = draftPrompt.trim();
    if (!prompt) return;
    if (applyCachedInitialPresetSegment(prompt)) return;
    promptRestoreUndoRef.current = null;
    finishPromptSuggestionAnimation();
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    const card: PendingPromptCard = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      prompt,
      status: pendingPromptCardsRef.current.some(canGeneratePendingPromptCard) || queueProcessingRef.current ? "queued" : "generating"
    };
    const nextQueue = updatePendingPromptCards((cards) => [...cards, card]);
    const cardsAhead = nextQueue.filter((item) => item.id !== card.id && canGeneratePendingPromptCard(item)).length;
    setStatus("loading");
    setVideoProgress(0);
    setDraftPrompt("");
    if (!scrollTargetMessageIdRef.current) {
      setFocusedPromptCardId(null);
      updateScrollTargetMessageId(null);
    }
    setStatusText(cardsAhead ? `已加入队列，前面还有 ${cardsAhead} 张` : "已加入队列，准备生成...");
    triggerAmbientFeedback(card.status === "queued" ? "queue" : "generating");
  }

  function suggestPromptAfterCard(card: PromptCard, nextProject: DramaProject, nextPromptCards: PromptCard[]) {
    const storedSuggestion = normalizeSuggestedPrompt(card.suggestedPrompt);
    if (storedSuggestion) return storedSuggestion;
    const cardMessageIdSet = new Set(card.messageIds);
    const segmentMessages = nextProject.messages.filter((message) => cardMessageIdSet.has(message.id));
    return normalizeSuggestedPrompt(suggestNextStoryPrompt({
      project: nextProject,
      prompt: card.prompt,
      promptCards: nextPromptCards,
      messages: segmentMessages.length ? segmentMessages : nextProject.messages
    }));
  }

  function restartFromPromptCard(card: PromptCard) {
    const currentPromptCards = promptCardsRef.current;
    const cardIndex = currentPromptCards.findIndex((item) => item.id === card.id);
    if (cardIndex < 0) {
      setStatus("error");
      setStatusText("没有找到这张故事卡");
      return;
    }

    generationRunRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    stopGenerationProgress();
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    pendingPromptRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingPromptRemovalTimersRef.current.clear();
    queueProcessingRef.current = false;
    activePromptCardIdRef.current = null;

    const currentProject = projectRef.current;
    const restoredStory = restoreStoryThroughCard(currentProject, currentPromptCards, cardIndex);
    const nextPromptCards = restoredStory.promptCards;
    const nextProject = restoredStory.project;
    const nextMessages = nextProject.messages;
    const nextMessageIds = new Set(nextMessages.map((message) => message.id));
    const nextSuggestedPrompt = suggestPromptAfterCard(card, nextProject, nextPromptCards);

    captureCurrentStoryLayoutSnapshot();
    projectRef.current = nextProject;
    promptCardsRef.current = nextPromptCards;
    settledPromptCardIdsRef.current.clear();
    completedPromptCardLayoutKeysRef.current.clear();
    setProject(nextProject);
    setPromptCards(nextPromptCards);
    updatePendingPromptCards(() => []);
    setFocusedPromptCardId(card.id);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    setOpenPromptCardMenuId(null);
    updateScrollTargetMessageId(null);
    updateGenerationProgress(0);
    setVideoProgress(0);
    setVideoResult(null);
    setVisibleMessageCount(nextMessages.length);
    replaceClips((current) => Object.fromEntries(
      Object.entries(current).filter(([messageId]) => nextMessageIds.has(messageId))
    ) as TtsClipMap);
    offerSuggestedPrompt(nextSuggestedPrompt);
    setStatus("done");
    setStatusText(`已从第 ${cardIndex + 1} 张故事卡重新开始`);
  }

  function copyTextWithHiddenTextarea(text: string) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  async function copyPromptCardText(card: PromptCard) {
    setOpenPromptCardMenuId(null);
    if (copyTextWithHiddenTextarea(card.prompt)) {
      setStatus("done");
      setStatusText("已复制当前故事卡文本");
      return;
    }
    try {
      await navigator.clipboard.writeText(card.prompt);
      setStatus("done");
      setStatusText("已复制当前故事卡文本");
    } catch {
      setStatus("error");
      setStatusText("复制失败，请手动复制故事卡文本");
    }
  }

  function clearLine() {
    const archive = createPresetInitialArchive(storyPackage, randomPresetStoryIndex(storyPackage, activePresetRole), activePresetRole);
    loadInitialPresetArchive(archive, `故事已重新开始：${archive.preset.title}`);
  }

  function replayConversation() {
    setVideoResult(null);
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
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
    changePreviewMode(nextMode);
    if (nextMode === "video" && !activeChatProject.messages.length) {
      setStatus("idle");
      setStatusText("先生成对话，再播放视频版");
    }
  }

  function scrollConversationToBottom() {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    setVideoResult(null);
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    updateScrollTargetMessageId(null);
    const latestMessage = projectRef.current.messages.at(-1);
    if (latestMessage) selectChatSession(chatSessionIdForMessage(projectRef.current, latestMessage));
    setVisibleMessageCount(projectRef.current.messages.length);
    changePreviewMode("wechat");

    const exposeBottom = () => {
      const chatScroll = rootRef.current?.querySelector<HTMLElement>(".wechat-chat-scroll");
      if (!chatScroll?.isConnected) return;
      chatScroll.scrollTo({
        top: Math.max(0, chatScroll.scrollHeight - chatScroll.clientHeight),
        behavior: "smooth"
      });
    };

    window.requestAnimationFrame(exposeBottom);
    window.setTimeout(exposeBottom, 140);
    window.setTimeout(exposeBottom, 380);
  }

  function focusPromptCard(card: PromptCard, options: { focusButton?: boolean } = {}) {
    const firstMessageId = card.messageIds[0];
    if (!firstMessageId) {
      setStatus("error");
      setStatusText("这张故事卡没有可定位的对话");
      return;
    }
    const targetIndex = project.messages.findIndex((message) => message.id === firstMessageId);
    if (targetIndex < 0) {
      setStatus("error");
      setStatusText("没有找到这张故事卡对应的起始对话");
      return;
    }
    const targetMessage = project.messages[targetIndex];
    selectChatSession(chatSessionIdForMessage(project, targetMessage));
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }
    setVideoResult(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    setOpenPromptCardMenuId(null);
    setFocusedPromptCardId(card.id);
    updateScrollTargetMessageId(firstMessageId);
    setVisibleMessageCount((current) => Math.max(current, targetIndex + 1));
    changePreviewMode("wechat");
    setStatus("done");
    setStatusText("已定位到这张故事卡的起始对话");
    triggerAmbientFeedback("focus");
    if (options.focusButton) {
      window.requestAnimationFrame(() => {
        const targetCard = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-prompt-card-id]") || [])
          .find((element) => element.dataset.promptCardId === card.id);
        targetCard?.focus({ preventScroll: true });
      });
    }
  }

  function focusPromptCardByStep(directionToLatest: 1 | -1) {
    const queuedItems = pendingPromptCards
      .filter((card) => card.status === "queued")
      .map((card) => ({ type: "pending" as const, id: card.id }))
      .reverse();
    const promptItems = [...promptCards].reverse().map((card) => ({ type: "prompt" as const, id: card.id, card }));
    const navigationItems = [...queuedItems, ...promptItems];
    if (!navigationItems.length) return false;
    const currentIndex = focusedPendingPromptCardId
      ? navigationItems.findIndex((item) => item.type === "pending" && item.id === focusedPendingPromptCardId)
      : focusedPromptCardId
        ? navigationItems.findIndex((item) => item.type === "prompt" && item.id === focusedPromptCardId)
        : -1;
    const nextIndex = currentIndex < 0
      ? directionToLatest > 0 ? 0 : navigationItems.length - 1
      : (currentIndex - directionToLatest + navigationItems.length) % navigationItems.length;
    const nextItem = navigationItems[nextIndex];
    if (nextItem.type === "pending") return selectPendingPromptCard(nextItem.id, { focusElement: true });
    focusPromptCard(nextItem.card, { focusButton: true });
    return true;
  }

  async function exportArchive() {
    if (archiveExportingRef.current) {
      showToast("正在生成 PNG 存档");
      return;
    }
    archiveExportingRef.current = true;
    try {
      setStatusText("正在生成 PNG 存档...");
      const archive = makeStoryArchive(projectRef.current, promptCardsRef.current);
      const png = await createStoryArchivePng(archive);
      downloadBlob(png, archiveFilename());
      setStatus("done");
      setStatusText("PNG 存档已导出，对话数据已写入图片");
      showToast("PNG 存档已保存");
    } catch (error) {
      handleError("存档导出", error);
      showToast(error instanceof Error ? error.message : "存档导出失败");
    } finally {
      archiveExportingRef.current = false;
    }
  }

  async function importArchive(file: File | undefined) {
    if (!file) return;
    try {
      generationRunRef.current += 1;
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
      stopGenerationProgress();
      clearPendingPromptRemovalTimers();
      const archive = parseStoryArchive(await readArchiveFile(file));
      const archivePackage: StoryPackage = isJojoProject(archive.project) ? "jojo" : "viral";
      if (archivePackage !== storyPackage) {
        setStatus("error");
        setStatusText(storyPackage === "jojo" ? "当前是 JOJO 版，请读取 JOJO 版存档" : "当前是网红短剧版，请读取网红短剧版存档");
        return;
      }
      captureCurrentStoryLayoutSnapshot();
      projectRef.current = archive.project;
      promptCardsRef.current = archive.promptCards;
      settledPromptCardIdsRef.current.clear();
      completedPromptCardLayoutKeysRef.current.clear();
      setProject(archive.project);
      setPromptCards(archive.promptCards);
      resetChatSessionState(archive.project);
      updatePendingPromptCards(() => []);
      setDeferredSuggestedPrompt(null);
      setSuggestionDialogOpen(false);
      activePromptCardIdRef.current = null;
      setFocusedPendingPromptCardId(null);
      setEditingPendingPromptCardId(null);
      updateGenerationProgress(0);
      setFocusedPromptCardId(null);
      updateScrollTargetMessageId(null);
      promptRestoreUndoRef.current = null;
      setDraftPrompt("");
      finishPromptSuggestionAnimation();
      setVisibleMessageCount(archive.project.messages.length);
      replaceClips({});
      setVideoResult(null);
      setStatus("done");
      setStatusText(`已读档 ${archive.promptCards.length} 张故事卡`);
      triggerAmbientFeedback("story");
    } catch (error) {
      handleError("读档", error);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function generateVoice() {
    if (!activeChatProject.messages.length) {
      setStatus("error");
      setStatusText("先生成对话，再生成配音");
      return;
    }
    setStatus("loading");
    setStatusText("正在连接 Edge TTS 生成固定男女声...");
    try {
      const nextClips: TtsClipMap = { ...clips };
      let nextProject = project;
      const voiceMessages = activeChatProject.messages.filter(isVoiceMessage);
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
      replaceClips(nextClips);
      setProject(nextProject);
      setStatus("done");
      setStatusText("配音已生成，可导出视频");
    } catch (error) {
      handleError("Edge TTS", error);
    }
  }

  async function exportVideo() {
    if (!activeChatProject.messages.length) {
      setStatus("error");
      setStatusText("先生成对话，再导出视频");
      return;
    }
    setStatus("loading");
    setStatusText("正在浏览器内录制 16:9 视频...");
    try {
      const { exportBrowserVideo } = await import("./shared/browserVideo");
      const result = await exportBrowserVideo(activeChatProject, clips, (progress) => {
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
          <ActionButton variant="secondary" onClick={generateVoice} disabled={status === "loading" || !activeChatProject.messages.length}>
            <FileAudio size={17} />
            生成语音（开发中）
          </ActionButton>
          <ActionButton variant="primary" onClick={exportVideo} disabled={status === "loading" || !activeChatProject.messages.length}>
            <Film size={17} />
            导出视频
          </ActionButton>
        </div>
        {status === "loading" && videoProgress > 0 ? <progress className="video-progress" max={1} value={videoProgress} /> : null}
        {videoResult ? (
          <a className="download-link" href={videoResult.url} download={videoFilename(videoResult.extension)}>
            <Download size={16} />
            下载 {videoResult.extension.toUpperCase()}
          </a>
        ) : null}
      </div>
    );
  }

  const selectChatSessionForPreview = useEventCallback(selectChatSession);
  const replayConversationForPreview = useEventCallback(replayConversation);

  function renderPreviewPane(mode: PreviewMode, isActive: boolean) {
    if (mode === "wechat") {
      return (
        <WechatStoryPreview
          key={resolvedActiveChatSessionId}
          project={previewProject}
          activeSessionId={resolvedActiveChatSessionId}
          unreadCounts={unreadCounts}
          onSelectSession={selectChatSessionForPreview}
          showPeerName={promptCards.length > 0}
          onReplay={replayConversationForPreview}
          showReplay={project.messages.length > 0 && visibleMessageCount >= project.messages.length}
        />
      );
    }
    if (!activeChatProject.messages.length) {
      return (
        <div className="video-preview-stack">
          <div className="player-frame video-empty-frame" style={{ width: "100%", aspectRatio: `${activeChatProject.canvas.width} / ${activeChatProject.canvas.height}` }}>
            <div className="empty-state large-empty video-empty-state">
              <Play size={28} />
              等待第一段剧情
            </div>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="video-preview-stack"><div className="player-frame video-loading-frame" aria-label="正在加载视频预览" /></div>}>
        <VideoPreviewPane
          project={activeChatProject}
          durationInFrames={durationInFrames}
          initialFrame={previewInitialFrame}
          isActive={isActive && previewMode === "video"}
        >
          {renderVideoActions()}
        </VideoPreviewPane>
      </Suspense>
    );
  }

  const switchLink = packageSwitchLink(storyPackage);
  const githubRepositoryUrl = import.meta.env.VITE_GITHUB_REPO_URL || defaultGithubRepositoryUrl;
  const feedbackWechatId = import.meta.env.VITE_FEEDBACK_WECHAT_ID?.trim() || feedbackWechatPlaceholder;
  const hasFeedbackWechatId = feedbackWechatId !== feedbackWechatPlaceholder;
  const alipayQrCodeUrl = resolvePublicAssetPath(import.meta.env.VITE_ALIPAY_QR_CODE_URL?.trim());
  const jojoRoleChoices = jojoRoleOptions
    .flatMap((roleId): Array<{ roleId: JojoPresetRole; label: string; avatarInitial: string; avatarUrl?: string }> => {
      const character = project.characters.find((character) => character.id === roleId);
      if (!character) return [];
      return [{
        roleId,
        label: roleId === "npc" ? "NPC" : character.name,
        avatarInitial: roleId === "npc" ? "N" : character.avatarInitial,
        avatarUrl: character.avatarUrl
      }];
    });
  const viralRoleChoices = useMemo(
    () => viralRoleOptions.map((option) => ({
      ...option,
      symbol: option.id === "any" ? "＊" : option.id === "male" ? "♂" : "♀"
    })),
    []
  );
  const storyCardCount = promptCards.length + pendingPromptCards.length;
  const canSubmitStory = Boolean(draftPrompt.trim());
  const storyActionButtonClassName = [
    "button button--full-width button--md button--primary story-action-button",
    "story-action-button-visible",
    canSubmitStory && status !== "loading" ? "story-action-button-ready" : "",
    mobileStoryCoachPhase === "start" ? "story-action-button-coach" : ""
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (status !== "loading" || !pendingPromptCards.length || queueProcessingRef.current) return;
    void drainPromptQueue();
  }, [pendingPromptCards.length, status]);
  const deferredSuggestionText = deferredSuggestedPrompt?.trim() || "";
  const canSwitchInitialPreset = status !== "loading"
    && pendingPromptCards.length === 0
    && promptCards.length === 0
    && project.messages.length === 0;
  const promptTextareaShellClassName = [
    "prompt-textarea-shell",
    promptSuggestionActive ? "prompt-textarea-shell-animating" : "",
    deferredSuggestionText ? "prompt-textarea-shell-has-suggestion" : "",
    canSwitchInitialPreset ? "prompt-textarea-shell-has-preset-switch" : ""
  ].filter(Boolean).join(" ");

  useLayoutEffect(() => {
    resizeTextareaToContent(promptTextareaRef.current);
  }, [canSwitchInitialPreset, deferredSuggestionText, draftPrompt, storyPanelOpen]);

  useEffect(() => {
    let resizeFrame: number | undefined;
    const textarea = promptTextareaRef.current;
    const shell = textarea?.parentElement;
    let shellWidth = shell?.getBoundingClientRect().width ?? 0;
    const scheduleResize = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeTextareaToContent(promptTextareaRef.current);
        resizeFrame = undefined;
      });
    };
    const resizeObserver = shell && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(([entry]) => {
          const nextWidth = entry?.contentRect.width ?? shell.getBoundingClientRect().width;
          if (Math.abs(nextWidth - shellWidth) < 0.5) return;
          shellWidth = nextWidth;
          scheduleResize();
        })
      : null;
    if (shell && resizeObserver) resizeObserver.observe(shell);
    window.addEventListener("resize", scheduleResize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;
    const panelVisibilityChanged = previousStoryPanelOpenRef.current !== storyPanelOpen;
    const pendingPreviousSnapshot = pendingLeftPanelLayoutSnapshotRef.current;
    if (storyLayoutSnapshotLockedRef.current && !pendingPreviousSnapshot) {
      previousStoryPanelOpenRef.current = storyPanelOpen;
      return;
    }
    const targets = getLeftPanelLayoutTargets(root);
    gsap.killTweensOf(targets);
    targets.forEach((element) => {
      element.style.transform = "";
    });

    const nextSnapshot = readLeftPanelLayoutSnapshot(root);
    const previousSnapshot = pendingPreviousSnapshot ?? leftPanelLayoutSnapshotRef.current;
    const shouldAnimate = previousSnapshot.size > 0
      && storyPanelOpen
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimatePanelVisibility = panelVisibilityChanged && window.matchMedia("(min-width: 1080px)").matches;
    const shouldAnimateContentShift = !panelVisibilityChanged;

    let didAnimateLayoutShift = false;
    if (shouldAnimate && (shouldAnimatePanelVisibility || shouldAnimateContentShift)) {
      targets.forEach((element) => {
        const key = getLeftPanelLayoutKey(element);
        const previousRect = previousSnapshot.get(key);
        const nextRect = nextSnapshot.get(key);
        if (!previousRect || !nextRect) return;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaY) < 0.5) return;
        didAnimateLayoutShift = true;
        gsap.fromTo(
          element,
          { y: deltaY },
          { y: 0, duration: 0.46, ease: "power3.out", overwrite: "auto", clearProps: "transform" }
        );
      });
    }

    leftPanelLayoutSnapshotRef.current = nextSnapshot;
    pendingLeftPanelLayoutSnapshotRef.current = null;
    previousStoryPanelOpenRef.current = storyPanelOpen;
    if (storyLayoutUnlockTimerRef.current) {
      window.clearTimeout(storyLayoutUnlockTimerRef.current);
      storyLayoutUnlockTimerRef.current = undefined;
    }
    if (didAnimateLayoutShift) {
      storyLayoutUnlockTimerRef.current = window.setTimeout(() => {
        storyLayoutSnapshotLockedRef.current = false;
        storyLayoutUnlockTimerRef.current = undefined;
      }, 500);
    } else {
      storyLayoutSnapshotLockedRef.current = false;
    }
  }, [storyPanelOpen, pendingPromptCards, promptCards, editingPendingPromptCardId]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;
    const targets = getPromptCardLayoutTargets(root);
    gsap.killTweensOf(targets);
    targets.forEach((element) => {
      element.style.transform = "";
    });

    const nextSnapshot = readPromptCardLayoutSnapshot(root);
    const previousSnapshot = pendingPromptCardLayoutSnapshotRef.current ?? promptCardLayoutSnapshotRef.current;
    const shouldAnimate = previousSnapshot.size > 0
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (shouldAnimate) {
      targets.forEach((element) => {
        const key = getPromptCardLayoutKey(element);
        const previousRect = previousSnapshot.get(key);
        const nextRect = nextSnapshot.get(key);
        if (!previousRect || !nextRect) return;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaY) < 0.5) return;
        gsap.fromTo(
          element,
          { y: deltaY },
          { y: 0, duration: 0.34, ease: "power3.out", overwrite: "auto", clearProps: "transform" }
        );
      });
    }

    promptCardLayoutSnapshotRef.current = nextSnapshot;
    pendingPromptCardLayoutSnapshotRef.current = null;
  }, [pendingPromptCards, promptCards, editingPendingPromptCardId]);

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
    const isPendingCardEditorTarget = (target: EventTarget | null) => (
      target instanceof Element && Boolean(target.closest(".prompt-card-edit-textarea"))
    );
    const handlePageShortcut = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const key = event.key;
      const primaryShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
      if (primaryShortcut && key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) toggleSettingsMenu();
        return;
      }
      if (primaryShortcut && key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) void exportArchive();
        return;
      }
      if (primaryShortcut && key.toLowerCase() === "i") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) importInputRef.current?.click();
        return;
      }
      if (event.defaultPrevented) return;
      if (aboutDialogOpen) return;
      if (settingsMenuOpen) {
        if (key === "Escape") {
          event.preventDefault();
          closeSettingsMenu();
        }
        return;
      }
      const isUndoKey = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key.toLowerCase() === "z";
      if (isUndoKey) {
        if (undoPromptRestore()) event.preventDefault();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (key === "Enter") {
        if (isPendingCardEditorTarget(event.target)) return;
        if (!event.shiftKey && !isButtonLikeTarget(event.target) && editFocusedPendingPromptCard()) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey || isButtonLikeTarget(event.target)) return;
        event.preventDefault();
        continueStory();
        return;
      }

      if (key === "Escape") {
        if (openPromptCardMenuId) {
          event.preventDefault();
          setOpenPromptCardMenuId(null);
          return;
        }
        if (cancelPendingPromptCardEdit()) {
          event.preventDefault();
          return;
        }
        if (suggestionDialogOpen) {
          event.preventDefault();
          setSuggestionDialogOpen(false);
          return;
        }
        if (status === "loading" && pendingPromptCards.some((card) => card.status === "generating")) {
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

      if ((key === "Backspace" || key === "Delete") && !isTextEditingTarget(event.target) && removeFocusedStoryCard()) {
        event.preventDefault();
        return;
      }

      if (key === "Tab") {
        if (!promptCards.length && !pendingPromptCards.some((card) => card.status === "queued")) return;
        event.preventDefault();
        focusPromptCardByStep(event.shiftKey ? -1 : 1);
        return;
      }

      const arrowDirection = key === "ArrowUp" || key === "ArrowLeft"
        ? 1
        : key === "ArrowDown" || key === "ArrowRight"
          ? -1
          : 0;
      if (!arrowDirection || isTextEditingTarget(event.target) || (!promptCards.length && !pendingPromptCards.some((card) => card.status === "queued"))) return;
      event.preventDefault();
      focusPromptCardByStep(arrowDirection);
    };

    window.addEventListener("keydown", handlePageShortcut, true);
    return () => window.removeEventListener("keydown", handlePageShortcut, true);
  }, [aboutDialogOpen, draftPrompt, editingPendingPromptCardId, focusedPendingPromptCardId, focusedPromptCardId, openPromptCardMenuId, pendingPromptCards, previewMode, promptCards, promptSuggestionActive, settingsMenuClosing, settingsMenuOpen, status, suggestionDialogOpen]);

  return (
    <div
      ref={rootRef}
      className={`app-shell dark ${storyPackage === "jojo" ? "app-shell-jojo" : ""}`}
      data-theme="dark"
      data-vibrant-palette="true"
      data-ambient-skin={visibleAmbientSkin}
    >
      <AmbientLayer feedback={ambientFeedback} transition={ambientTransition} />
      <header className="topbar motion-in">
        <div className="brand-block">
          <h1>{packageTitle(storyPackage)}</h1>
        </div>
        <div className="settings-trigger-group">
          <kbd className="settings-trigger-shortcut">⌘K</kbd>
          <button
            ref={settingsButtonRef}
            className={settingsMenuOpen ? "title-menu-button title-menu-button-open" : "title-menu-button"}
            type="button"
            aria-haspopup="dialog"
            aria-controls="settings-dialog"
            aria-expanded={settingsMenuOpen}
            aria-label="打开设置"
            title="设置 (⌘K)"
            onClick={toggleSettingsMenu}
          >
            <Settings size={18} />
          </button>
        </div>
        <input ref={importInputRef} hidden type="file" accept="image/png,.png,application/json,.json" onChange={(event) => importArchive(event.currentTarget.files?.[0])} />
      </header>
      <StatusAnnouncer ref={statusAnnouncerRef} initialText="正在检查 DeepSeek 配置..." />
      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
      <SettingsDialog
        open={settingsMenuOpen}
        closing={settingsMenuClosing}
        dialogRef={settingsDialogRef}
        previewMode={previewMode}
        storyPackage={storyPackage}
        activePresetRole={activePresetRole}
        jojoRoleChoices={jojoRoleChoices}
        viralRoleChoices={viralRoleChoices}
        ambientSkins={ambientSkins}
        ambientSkin={ambientSkin}
        switchLink={switchLink}
        onClose={closeSettingsMenu}
        onKeyDown={handleSettingsDialogKeyDown}
        onChoosePreviewMode={choosePreviewMode}
        onSwitchPresetRole={switchPresetRole}
        onSelectAmbientSkin={selectAmbientSkin}
        onOpenAbout={openAboutDialog}
        onExportArchive={() => {
          closeSettingsMenu();
          void exportArchive();
        }}
        onImportArchive={() => {
          closeSettingsMenu();
          importInputRef.current?.click();
        }}
      />
      {aboutDialogOpen ? (
        <AboutDialog
          open
          githubRepositoryUrl={githubRepositoryUrl}
          alipayQrCodeUrl={alipayQrCodeUrl}
          feedbackWechatId={feedbackWechatId}
          hasFeedbackWechatId={hasFeedbackWechatId}
          onClose={closeAboutDialog}
          onCopyFeedbackWechatId={copyFeedbackWechatId}
        />
      ) : null}

      <main className={`workspace static-workspace ${storyCardCount ? "workspace-has-story-cards" : ""}`}>
        {storyPanelOpen ? (
          <button
            className="story-panel-backdrop"
            type="button"
            aria-label="收起编故事"
            onClick={() => {
              completeMobileStoryCoach();
              setStoryPanelOpenWithContinuity(false);
            }}
          />
        ) : null}
        <div className={`left-panel ${storyPanelOpen ? "story-panel-open" : ""}`}>
          <div
            className={leftPanelScrolling ? "left-panel-scroll panel-scroll left-panel-scroll-scrolling" : "left-panel-scroll panel-scroll"}
            onScroll={handleLeftPanelScroll}
          >
            <button
              className={mobileStoryCoachPhase === "press" ? "story-panel-status story-panel-status-coach" : "story-panel-status"}
              style={jojoMode ? jojoStoryToggleGlassStyle : undefined}
              type="button"
              onClick={() => {
                completeMobileStoryCoach();
                setStoryPanelOpenWithContinuity((current) => !current);
              }}
              aria-expanded={storyPanelOpen}
              aria-label={storyPanelOpen ? "收起编故事" : "展开编故事"}
            >
              <span className="story-panel-status-icon" aria-hidden="true">
                {storyPanelOpen ? <ChevronDown size={16} /> : <PenLine size={16} />}
              </span>
              <small>{storyCardCount ? `${storyCardCount} 张故事卡` : "准备生成"}</small>
            </button>
            <SurfaceCard className="surface-card story-composer-card motion-in" style={jojoMode ? jojoGlassCardStyle : undefined}>
              <SurfaceCardHeader className="card-header">
                <div className="panel-title">
                  <Sparkles size={18} />
                  编故事
                </div>
              </SurfaceCardHeader>
              <SurfaceCardContent className="card-content">
                <div className={promptTextareaShellClassName}>
                  <textarea
                    ref={promptTextareaRef}
                    className="hero-textarea prompt-textarea"
                    value={draftPrompt}
                    onChange={(event) => handleDraftPromptChange(event.target.value)}
                    onFocus={handlePromptTextareaFocus}
                    placeholder="输入下一段要推进的剧情。它会结合此前故事卡和现有对话继续往后写。"
                    rows={1}
                  />
                  {promptSuggestionActive ? (
                    <div key={promptSuggestionKey} className="prompt-suggestion-overlay" aria-hidden="true">
                      <span className="prompt-suggestion-rise">
                        {renderPromptRiseText(draftPrompt)}
                      </span>
                    </div>
                  ) : null}
                  {canSwitchInitialPreset ? (
                    <button
                      className="preset-switch-button"
                      type="button"
                      aria-label="切换一套预制存档"
                      title="切换预制存档"
                      onClick={switchInitialPreset}
                    >
                      <RefreshCcw size={16} />
                    </button>
                  ) : null}
                  {deferredSuggestionText ? (
                    <button
                      className="prompt-suggestion-trigger"
                      type="button"
                      aria-label="查看建议提示词"
                      aria-expanded={suggestionDialogOpen}
                      onClick={() => setSuggestionDialogOpen(true)}
                    >
                      <Lightbulb size={16} />
                    </button>
                  ) : null}
                  {deferredSuggestionText && suggestionDialogOpen ? (
                    <div className="prompt-suggestion-popover" role="dialog" aria-label="建议提示词">
                      <div className="prompt-suggestion-popover-header">
                        <strong>建议提示词</strong>
                        <button type="button" onClick={dismissDeferredSuggestion} aria-label="关闭建议提示词">
                          <X size={14} />
                        </button>
                      </div>
                      <p>{deferredSuggestionText}</p>
                      <div className="prompt-suggestion-popover-actions">
                        <button type="button" className="prompt-suggestion-secondary" onClick={dismissDeferredSuggestion}>
                          关闭
                        </button>
                        <button type="button" className="prompt-suggestion-primary" onClick={adoptDeferredSuggestion}>
                          采用
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  className={storyActionButtonClassName}
                  type="button"
                  onClick={() => {
                    completeMobileStoryCoach();
                    continueStory();
                  }}
                  disabled={!canSubmitStory}
                >
                  {status === "loading" ? <MessageSquarePlus size={17} /> : <MessageSquarePlus size={17} />}
                  {status === "loading" ? "加入队列" : "开始编"}
                </button>
              </SurfaceCardContent>
            </SurfaceCard>

            {storyCardCount ? (
              <section className="prompt-history-card motion-in" aria-label="故事卡">
                <div className="card-header prompt-history-header">
                  <div className="panel-title">
                    <Save size={18} />
                    故事卡
                  </div>
                </div>
                <div className="card-content prompt-card-list">
                  {pendingPromptCards.map((card, index) => ({
                    card,
                    cardNumber: card.completedCardNumber ?? promptCards.length + index + 1
                  })).reverse().map(({ card, cardNumber }) => (
                    <PendingPromptCardView
                      key={card.id}
                      cardId={card.id}
                      prompt={card.prompt}
                      progress={card.status === "generating" ? generationProgress : 0}
                      status={card.status}
                      queuePosition={cardNumber}
                      onEdit={stopStoryGeneration}
                      onUpdate={card.status === "queued" ? (nextPrompt) => updateQueuedPromptCard(card.id, nextPrompt) : undefined}
                      onRemove={card.status === "queued" ? () => removeQueuedPromptCard(card.id) : undefined}
                      onJumpToBottom={scrollConversationToBottom}
                      onSelect={card.status === "queued" ? () => selectPendingPromptCard(card.id) : undefined}
                      onStartEdit={card.status === "queued" ? () => startPendingPromptCardEdit(card.id) : undefined}
                      onCancelEdit={card.status === "queued" ? cancelPendingPromptCardEdit : undefined}
                      isSelected={focusedPendingPromptCardId === card.id}
                      isEditing={editingPendingPromptCardId === card.id}
                      style={jojoMode ? jojoPromptCardGlassStyle : undefined}
                    />
                  ))}
                  {[...promptCards].reverse().map((card, index) => {
                    const cardNumber = promptCards.length - index;
                    const isCompletingFromPending = settledPromptCardIdsRef.current.has(card.id);
                    return (
                      <StoryPromptCardView
                        key={card.id}
                        card={card}
                        cardNumber={cardNumber}
                        isSelected={focusedPromptCardId === card.id}
                        isCompletingFromPending={isCompletingFromPending}
                        isMenuOpen={openPromptCardMenuId === card.id}
                        layoutKey={completedPromptCardLayoutKeysRef.current.get(card.id) ?? `prompt-${card.id}`}
                        style={jojoMode ? jojoPromptCardGlassStyle : undefined}
                        onFocusCard={() => focusPromptCard(card)}
                        onToggleMenu={() => setOpenPromptCardMenuId((current) => current === card.id ? null : card.id)}
                        onRestartFromHere={() => restartFromPromptCard(card)}
                        onCopyPrompt={() => void copyPromptCardText(card)}
                      />
                    );
                  })}
                  <ActionButton className="prompt-reset-button prompt-history-reset-button" fullWidth variant="secondary" onClick={clearLine}>
                    <RefreshCcw size={16} />
                    重新开始
                  </ActionButton>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="right-panel panel-scroll">
          <SurfaceCard className="surface-card preview-wrap preview-tilt-target motion-in">
            <SurfaceCardContent className="card-content">
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
            </SurfaceCardContent>
          </SurfaceCard>
        </div>
      </main>
    </div>
  );
}
