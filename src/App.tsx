import { Button } from "@heroui/react/button";
import { Card, CardContent, CardHeader } from "@heroui/react/card";
import { Player, type PlayerRef } from "@remotion/player";
import { Calligraph } from "calligraph";
import gsap from "gsap";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileAudio,
  FileDown,
  FileUp,
  Film,
  GitBranch,
  Heart,
  Info,
  Lightbulb,
  MessageCircle,
  MessageSquarePlus,
  MoreHorizontal,
  Pause,
  PenLine,
  Play,
  QrCode,
  RefreshCcw,
  Save,
  SkipBack,
  SkipForward,
  Smartphone,
  Sparkles,
  Video,
  X
} from "lucide-react";
import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type Ref, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { exportBrowserVideo, type VideoExportResult } from "./shared/browserVideo";
import { generateBackendStorySegment } from "./shared/deepseekBackend";
import { generateDeepSeekStorySegment, getBrowserDeepSeekStatusText, hasBrowserDeepSeekKey } from "./shared/deepseekBrowser";
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
import { ChatDrama } from "./remotion/ChatDrama";
import { defaultAvatars, genderMatchedAvatarUrl } from "./shared/avatarLibrary";
import { imageNarrativeCopy, imageSourceForMessage } from "./shared/imageNarrative";
import { jojoCssMemeCardForMessage, type JojoCssMemeCard } from "./shared/jojoMemeCards";
import { isJojoProject } from "./shared/jojoProject";
import { musicTrackForMessage } from "./shared/musicLibrary";
import { publicAsset, resolvePublicAssetPath } from "./shared/publicPath";
import { getCharacter, isVoiceMessage, type ChatMessage, type DramaProject } from "./shared/schema";
import { createStoryArchivePng, readArchiveFile } from "./shared/storyArchivePng";
import { normalizeSuggestedPrompt } from "./shared/suggestedPrompt";
import { buildTimeline, getDurationInFrames, messageRevealDelayMs } from "./shared/timing";

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
type AboutDialogView = "main" | "support" | "feedback";

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
  { id: "male", label: "扮演男生" },
  { id: "female", label: "扮演女生" }
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
            <Calligraph as="strong" variant="number" animation="snappy" className="prompt-card-progress-number">
              {`${progress}%`}
            </Calligraph>
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

function WechatAvatar({ project, message }: { project: DramaProject; message: ChatMessage }) {
  const character = getCharacter(project, message);
  const avatarUrl = genderMatchedAvatarUrl(character);
  if (avatarUrl) return <img className="wechat-avatar" src={resolvePublicAssetPath(avatarUrl)} alt="" />;
  return (
    <div className="wechat-avatar wechat-avatar-fallback" style={{ background: character.avatarGradient }}>
      {character.avatarInitial}
    </div>
  );
}

function JojoCssMemeCardView({ card }: { card: JojoCssMemeCard }) {
  return (
    <div className={`jojo-css-meme-card jojo-css-meme-card-${card.tone}`}>
      <div className="jojo-css-meme-mark" aria-hidden="true">
        <span>{card.mark}</span>
      </div>
      <strong>{card.title}</strong>
      <small>{card.subtitle}</small>
    </div>
  );
}

function formatMusicCommentCount(value?: number) {
  if (!value) return "很多人听过";
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万热评`;
  return `${value.toLocaleString("zh-CN")} 条热评`;
}

function musicDetails(message: ChatMessage) {
  const track = musicTrackForMessage(message);
  const directPreviewUrl = message.musicPreviewUrl || track.previewUrl;
  return {
    artist: message.musicArtist || track.artist,
    commentCount: message.musicCommentCount || track.commentCount,
    coverUrl: message.musicCoverUrl || track.coverUrl,
    lyric: message.musicLyric || track.lyric,
    previewUrl: import.meta.env.PROD ? `/api/music/preview?id=${encodeURIComponent(track.id)}` : directPreviewUrl,
    title: message.musicTitle || track.title
  };
}

type MusicPlaybackController = {
  activeMessageId: string | null;
  audioError: boolean;
  playing: boolean;
  progress: number;
  toggle: (message: ChatMessage) => void;
};

function WechatMusicBubble({ message, playback }: { message: ChatMessage; playback: MusicPlaybackController }) {
  const details = musicDetails(message);
  const active = playback.activeMessageId === message.id;
  const playing = active && playback.playing;
  const audioError = active && playback.audioError;
  const progress = active ? playback.progress : 0;

  return (
    <button
      className={`wechat-music-card ${active ? "wechat-music-card-active" : ""} ${playing ? "wechat-music-card-playing" : ""} ${audioError ? "wechat-music-card-error" : ""}`}
      type="button"
      data-music-message-id={message.id}
      onClick={() => playback.toggle(message)}
      aria-label={audioError ? `${details.title} 试听暂时不可用` : `${playing ? "暂停" : "播放"} ${details.title}`}
      aria-pressed={playing}
      style={{ "--music-progress": `${progress * 100}%` } as CSSProperties}
    >
      <span className="wechat-music-main">
        <span className="wechat-music-copy">
          <strong>{details.title}</strong>
          <span className="wechat-music-artist">{details.artist}</span>
          <span className="wechat-music-lyric">{details.lyric}</span>
        </span>
        <span className="wechat-music-cover-wrap">
          <img className="wechat-music-cover" src={details.coverUrl} alt={`${details.title} 专辑封面`} />
          <span className="wechat-music-play" aria-hidden="true">
            <span className="wechat-music-play-icon" />
          </span>
        </span>
      </span>
      <span className="wechat-music-footer">
        <span className="wechat-music-source"><i aria-hidden="true">♪</i>网易云音乐</span>
        <span>{audioError ? "试听暂时不可用" : formatMusicCommentCount(details.commentCount)}</span>
      </span>
      <span className="wechat-music-progress" aria-hidden="true" />
    </button>
  );
}

function WechatMusicDock({
  message,
  playing,
  progress,
  audioError,
  canGoPrevious,
  canGoNext,
  onToggle,
  onPrevious,
  onNext
}: {
  message: ChatMessage;
  playing: boolean;
  progress: number;
  audioError: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const details = musicDetails(message);
  return (
    <div
      className={`wechat-music-dock ${audioError ? "wechat-music-dock-error" : ""}`}
      role="region"
      aria-label={`正在播放 ${details.title}`}
      style={{ "--music-progress": `${progress * 100}%` } as CSSProperties}
    >
      <img src={details.coverUrl} alt="" />
      <span className="wechat-music-dock-copy">
        <strong>{details.title}</strong>
        <small>{audioError ? "试听暂时不可用" : details.artist}</small>
      </span>
      <span className="wechat-music-dock-controls">
        <button type="button" onClick={onPrevious} disabled={!canGoPrevious} aria-label="上一首">
          <SkipBack size={15} fill="currentColor" />
        </button>
        <button type="button" className="wechat-music-dock-toggle" onClick={onToggle} aria-label={playing ? "暂停" : "继续播放"} disabled={audioError}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" onClick={onNext} disabled={!canGoNext} aria-label="下一首">
          <SkipForward size={15} fill="currentColor" />
        </button>
      </span>
      <span className="wechat-music-dock-progress" aria-hidden="true" />
    </div>
  );
}

function WechatMessageContent({ project, message, musicPlayback }: { project: DramaProject; message: ChatMessage; musicPlayback: MusicPlaybackController }) {
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
    const src = resolvePublicAssetPath(imageSourceForMessage(project, message));
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
    const cssCard = jojoCssMemeCardForMessage(message);
    const src = cssCard ? undefined : resolvePublicAssetPath(imageSourceForMessage(project, message));
    return (
      <div className={cssCard ? "wechat-meme-card wechat-meme-card-css" : "wechat-meme-card"}>
        {cssCard ? <JojoCssMemeCardView card={cssCard} /> : src ? <img src={src} alt={message.text || "表情"} /> : <div className="wechat-meme-fallback">表情</div>}
        {!cssCard && message.text ? <span>{message.text}</span> : null}
      </div>
    );
  }
  if (message.type === "music" && !jojoMode) return <WechatMusicBubble message={message} playback={musicPlayback} />;
  return <div className="wechat-bubble">{message.text || message.ttsText || " "}</div>;
}

function visualSideFor(project: DramaProject, message: ChatMessage) {
  if (!isJojoProject(project)) return message.side;
  if (message.side === "center") return "center";
  const character = message.roleId ? project.characters.find((item) => item.id === message.roleId) : undefined;
  return character?.side || message.side;
}

function WechatStoryPreview({
  project,
  showPeerName,
  onReplay,
  showReplay,
  phoneRef
}: {
  project: DramaProject;
  showPeerName?: boolean;
  onReplay?: () => void;
  showReplay?: boolean;
  phoneRef?: Ref<HTMLDivElement>;
}) {
  const jojoMode = isJojoProject(project);
  const peer = project.characters.find((character) => character.side === "left") ?? project.characters[0];
  const musicMessages = useMemo(() => project.messages.filter((message) => message.type === "music" && !jojoMode), [jojoMode, project.messages]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeMusicMessageId, setActiveMusicMessageId] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicAudioError, setMusicAudioError] = useState(false);
  const [showMusicDock, setShowMusicDock] = useState(false);
  const activeMusicMessage = musicMessages.find((message) => message.id === activeMusicMessageId);
  const activeMusicIndex = activeMusicMessage ? musicMessages.findIndex((message) => message.id === activeMusicMessage.id) : -1;

  function updateMusicDockVisibility() {
    const chatScroll = chatScrollRef.current;
    if (!chatScroll || !activeMusicMessageId) {
      setShowMusicDock(false);
      return;
    }
    const activeCard = Array.from(chatScroll.querySelectorAll<HTMLElement>("[data-music-message-id]"))
      .find((element) => element.dataset.musicMessageId === activeMusicMessageId);
    if (!activeCard) {
      setShowMusicDock(false);
      return;
    }
    const scrollRect = chatScroll.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();
    setShowMusicDock(cardRect.bottom <= scrollRect.top + 1);
  }

  function playMusic(message: ChatMessage) {
    const audio = audioRef.current;
    if (!audio) return;
    const nextDetails = musicDetails(message);
    if (activeMusicMessageId === message.id) {
      if (!audio.paused) {
        audio.pause();
        return;
      }
      setMusicAudioError(false);
      void audio.play().catch(() => {
        setMusicPlaying(false);
        setMusicAudioError(true);
      });
      return;
    }

    audio.pause();
    audio.src = nextDetails.previewUrl;
    audio.load();
    setActiveMusicMessageId(message.id);
    setMusicProgress(0);
    setMusicAudioError(false);
    void audio.play().catch(() => {
      setMusicPlaying(false);
      setMusicAudioError(true);
    });
  }

  function playMusicByStep(step: -1 | 1) {
    const nextIndex = activeMusicIndex + step;
    const nextMessage = musicMessages[nextIndex];
    if (nextMessage) playMusic(nextMessage);
  }

  useEffect(() => () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  useEffect(() => {
    if (!activeMusicMessageId || activeMusicMessage) return;
    const audio = audioRef.current;
    audio?.pause();
    audio?.removeAttribute("src");
    audio?.load();
    setActiveMusicMessageId(null);
    setMusicPlaying(false);
    setMusicProgress(0);
    setMusicAudioError(false);
    setShowMusicDock(false);
  }, [activeMusicMessage, activeMusicMessageId]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateMusicDockVisibility);
    const chatScroll = chatScrollRef.current;
    const observer = chatScroll && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateMusicDockVisibility) : null;
    if (chatScroll && observer) observer.observe(chatScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [activeMusicMessageId, project.messages.length]);

  const musicPlayback: MusicPlaybackController = {
    activeMessageId: activeMusicMessageId,
    audioError: musicAudioError,
    playing: musicPlaying,
    progress: musicProgress,
    toggle: playMusic
  };

  return (
    <div className="wechat-preview-shell">
      <div ref={phoneRef} className={`wechat-phone ${jojoMode ? "dingtalk-phone" : ""}`} aria-label={jojoMode ? "钉钉手机版聊天预览" : "9:16 微信聊天预览"}>
        <div className={jojoMode ? "dingtalk-topbar" : "wechat-topbar"}>
          <img className={jojoMode ? "dingtalk-topbar-img" : "wechat-topbar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/topbar.webp" : "/wechat-ui/topbar.webp")} alt="" draggable={false} />
          {jojoMode ? <strong className="dingtalk-topbar-title">{project.title || "工位蛐蛐小队"}</strong> : <strong className="wechat-topbar-title">{showPeerName ? (peer?.name || project.title) : "？"}</strong>}
        </div>
        <div className={`wechat-chat-viewport ${jojoMode ? "dingtalk-chat-viewport" : ""}`}>
          <div
            ref={chatScrollRef}
            className={`wechat-chat-scroll ${jojoMode ? "dingtalk-chat-scroll" : ""}`}
            aria-label={jojoMode ? "钉钉聊天消息" : "微信聊天消息"}
            tabIndex={0}
            onScroll={updateMusicDockVisibility}
          >
            <div className="wechat-chat-content">
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
                    className={`wechat-row wechat-row-${visualSide} ${jojoMode ? `dingtalk-row ${visualSide === "right" ? "dingtalk-row-self" : "dingtalk-row-other"}` : ""}`}
                    data-message-id={message.id}
                  >
                    {visualSide === "left" ? <WechatAvatar project={project} message={message} /> : null}
                    <div className="wechat-message-stack">
                      {jojoMode ? <div className="wechat-speaker-name">{character.name}</div> : null}
                      <WechatMessageContent project={project} message={message} musicPlayback={musicPlayback} />
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
          </div>
          {showMusicDock && activeMusicMessage ? (
            <WechatMusicDock
              message={activeMusicMessage}
              playing={musicPlaying}
              progress={musicProgress}
              audioError={musicAudioError}
              canGoPrevious={activeMusicIndex > 0}
              canGoNext={activeMusicIndex >= 0 && activeMusicIndex < musicMessages.length - 1}
              onToggle={() => playMusic(activeMusicMessage)}
              onPrevious={() => playMusicByStep(-1)}
              onNext={() => playMusicByStep(1)}
            />
          ) : null}
        </div>
        <audio
          ref={audioRef}
          preload="metadata"
          onPlay={() => setMusicPlaying(true)}
          onPause={() => setMusicPlaying(false)}
          onEnded={() => {
            setMusicPlaying(false);
            setMusicProgress(0);
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            setMusicProgress(audio.duration ? audio.currentTime / audio.duration : 0);
          }}
          onError={() => {
            setMusicAudioError(true);
            setMusicPlaying(false);
          }}
        />
        <img className={jojoMode ? "dingtalk-inputbar-img" : "wechat-bottombar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/inputbar.webp" : "/wechat-ui/bottombar.webp")} alt="" draggable={false} />
      </div>
    </div>
  );
}

export default function App({ storyPackage }: AppProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const archivePhoneRef = useRef<HTMLDivElement>(null);
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
  const [statusText, setStatusText] = useState("正在检查 DeepSeek 配置...");
  const [clips, setClips] = useState<TtsClipMap>({});
  const [videoResult, setVideoResult] = useState<VideoExportResult | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [storyPanelOpen, setStoryPanelOpen] = useState(() => !shouldUseStoryModal());
  const [mobileStoryCoachPhase, setMobileStoryCoachPhase] = useState<MobileStoryCoachPhase>("idle");
  const [previewTransition, setPreviewTransition] = useState<PreviewTransition | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [aboutDialogView, setAboutDialogView] = useState<AboutDialogView | null>(null);
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
  const settingsMenuRef = useRef<HTMLDivElement>(null);
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
  const playerRef = useRef<PlayerRef>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const jojoMode = storyPackage === "jojo";
  const durationInFrames = useMemo(() => getDurationInFrames(project), [project]);
  const previewInitialFrame = useMemo(() => buildTimeline(project)[0]?.startFrame ?? 0, [project]);
  const previewProject = useMemo(
    () => ({ ...project, messages: project.messages.slice(0, visibleMessageCount) }),
    [project, visibleMessageCount]
  );

  function syncCurrentStoryLayoutSnapshot() {
    const root = rootRef.current;
    if (!root) return;
    leftPanelLayoutSnapshotRef.current = readLeftPanelLayoutSnapshot(root);
    promptCardLayoutSnapshotRef.current = readPromptCardLayoutSnapshot(root);
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
    promptCardsRef.current = promptCards;
  }, [promptCards]);

  useEffect(() => {
    draftPromptRef.current = draftPrompt;
  }, [draftPrompt]);

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
    mobileStoryCoachTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    mobileStoryCoachTimersRef.current = [];
    clearPendingPromptRemovalTimers();
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
  }, [previewMode, previewProject.messages.length, scrollTargetMessageId]);

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
    updatePendingPromptCards(() => []);
    setDeferredSuggestedPrompt(null);
    setSuggestionDialogOpen(false);
    setFocusedPromptCardId(null);
    setFocusedPendingPromptCardId(null);
    setEditingPendingPromptCardId(null);
    setOpenPromptCardMenuId(null);
    updateScrollTargetMessageId(null);
    promptRestoreUndoRef.current = null;
    setClips({});
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
    if (storyPackage !== "jojo") return roleSelection.viralRole === "female" ? "女性视角" : "男性视角";
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
    let nextCard = result.card;
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

  function closeSettingsMenu() {
    setSettingsMenuOpen(false);
  }

  function openAboutDialog() {
    closeSettingsMenu();
    setAboutDialogView("main");
  }

  function closeAboutDialog() {
    setAboutDialogView(null);
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
      const result = await generateBackendStorySegment({ project: projectSnapshot, prompt, promptCards: promptCardsSnapshot, signal });
      if (!isCurrentGeneration(runId, signal)) throw new Error("generation cancelled");
      return { result, statusText: `DeepSeek 后端已追加 ${result.messages.length} 条消息` };
    } catch (error) {
      if (!isCurrentGeneration(runId, signal)) throw error;
      backendError = error;
      console.warn("[deepseek] backend unavailable", error);
    }

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

    const nextPromptCards = currentPromptCards.slice(0, cardIndex);
    const previousCard = nextPromptCards.at(-1);
    const currentProject = projectRef.current;
    const previousLastMessageId = previousCard
      ? [...previousCard.messageIds].reverse().find((messageId) => (
          currentProject.messages.some((message) => message.id === messageId)
        ))
      : undefined;
    const previousLastMessageIndex = previousLastMessageId
      ? currentProject.messages.findIndex((message) => message.id === previousLastMessageId)
      : -1;
    const nextMessages = previousCard
      ? previousLastMessageIndex >= 0
        ? currentProject.messages.slice(0, previousLastMessageIndex + 1)
        : currentProject.messages.filter((message) => nextPromptCards.some((item) => item.messageIds.includes(message.id)))
      : [];
    const nextMessageIds = new Set(nextMessages.map((message) => message.id));
    const nextProject: DramaProject = {
      ...currentProject,
      brief: nextPromptCards.map((item) => item.prompt).join("\n") || initialPresetArchiveRef.current?.preset.prompt || currentProject.brief,
      messages: nextMessages
    };
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
    setClips((current) => Object.fromEntries(
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
    const nextPromptCards = currentPromptCards.slice(0, cardIndex + 1);
    const lastMessageId = [...card.messageIds].reverse().find((messageId) => (
      currentProject.messages.some((message) => message.id === messageId)
    ));
    const lastMessageIndex = lastMessageId
      ? currentProject.messages.findIndex((message) => message.id === lastMessageId)
      : -1;
    const nextMessages = lastMessageIndex >= 0
      ? currentProject.messages.slice(0, lastMessageIndex + 1)
      : currentProject.messages.filter((message) => nextPromptCards.some((item) => item.messageIds.includes(message.id)));
    const nextMessageIds = new Set(nextMessages.map((message) => message.id));
    const nextProject: DramaProject = {
      ...currentProject,
      brief: nextPromptCards.map((item) => item.prompt).join("\n") || currentProject.brief,
      messages: nextMessages
    };
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
    setClips((current) => Object.fromEntries(
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
    if (nextMode === "video" && !project.messages.length) {
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
      if (previewMode !== "wechat") {
        changePreviewMode("wechat");
        await new Promise((resolve) => window.setTimeout(resolve, 440));
      }
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const phone = archivePhoneRef.current;
      if (!phone) throw new Error("聊天预览还没有准备好");
      const archive = makeStoryArchive(projectRef.current, promptCardsRef.current);
      const png = await createStoryArchivePng(phone, archive);
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
      setClips({});
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
          <a className="download-link" href={videoResult.url} download={videoFilename(videoResult.extension)}>
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
          showPeerName={promptCards.length > 0}
          onReplay={replayConversation}
          showReplay={project.messages.length > 0 && visibleMessageCount >= project.messages.length}
          phoneRef={isActive ? archivePhoneRef : undefined}
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
      symbol: option.id === "male" ? "♂" : "♀"
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
      if (primaryShortcut && key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) void exportArchive();
        return;
      }
      if (primaryShortcut && key.toLowerCase() === "l") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) importInputRef.current?.click();
        return;
      }
      if (event.defaultPrevented) return;
      if (aboutDialogView) {
        if (key === "Escape") {
          event.preventDefault();
          closeAboutDialog();
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
  }, [aboutDialogView, draftPrompt, editingPendingPromptCardId, focusedPendingPromptCardId, focusedPromptCardId, openPromptCardMenuId, pendingPromptCards, previewMode, promptCards, promptSuggestionActive, status, suggestionDialogOpen]);

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
                <div className="title-menu-tabs" role="tablist" aria-label="预览模式">
                  <button
                    className={previewMode === "wechat" ? "title-menu-tab title-menu-tab-active" : "title-menu-tab"}
                    type="button"
                    role="tab"
                    aria-selected={previewMode === "wechat"}
                    onClick={() => choosePreviewMode("wechat")}
                  >
                    <Smartphone size={15} />
                    <span>界面版</span>
                  </button>
                  <button
                    className={previewMode === "video" ? "title-menu-tab title-menu-tab-active" : "title-menu-tab"}
                    type="button"
                    role="tab"
                    aria-selected={previewMode === "video"}
                    onClick={() => choosePreviewMode("video")}
                  >
                    <Video size={15} />
                    <span>视频版</span>
                  </button>
                </div>
                <div className="title-menu-panel" role="group" aria-label="选择角色">
                  {storyPackage === "jojo" ? (
                    <div className="title-role-avatar-grid">
                      {jojoRoleChoices.map((character) => (
                        <button
                          key={character.roleId}
                          className={activePresetRole.jojoRole === character.roleId ? "title-role-avatar title-role-avatar-active" : "title-role-avatar"}
                          type="button"
                          onClick={() => switchPresetRole({ jojoRole: character.roleId })}
                          aria-pressed={activePresetRole.jojoRole === character.roleId}
                        >
                          {character.avatarUrl ? <img src={resolvePublicAssetPath(character.avatarUrl)} alt="" /> : <span className="title-role-avatar-fallback">{character.avatarInitial}</span>}
                          <strong>{character.label}</strong>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="title-role-avatar-grid title-role-avatar-grid-two title-role-symbol-grid">
                      {viralRoleChoices.map((option) => (
                        <button
                          key={option.id}
                          className={activePresetRole.viralRole === option.id ? "title-role-avatar title-role-avatar-active" : "title-role-avatar"}
                          type="button"
                          onClick={() => switchPresetRole({ viralRole: option.id })}
                          aria-pressed={activePresetRole.viralRole === option.id}
                        >
                          <span className="title-role-symbol" aria-hidden="true">{option.symbol}</span>
                          <strong>{option.label}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="title-menu-panel title-ambient-panel" role="group" aria-label="切换背景">
                  <div className="title-menu-section-label">
                    <Sparkles size={14} />
                    <span>背景</span>
                  </div>
                  <div className="title-ambient-grid">
                    {ambientSkins.map((skin) => (
                      <button
                        key={skin.id}
                        className={ambientSkin === skin.id ? "title-ambient-option title-ambient-option-active" : "title-ambient-option"}
                        type="button"
                        aria-pressed={ambientSkin === skin.id}
                        onClick={() => selectAmbientSkin(skin.id)}
                      >
                        <span>{skin.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <a className="title-menu-item" role="menuitem" href={switchLink.href} target="_blank" rel="noreferrer" onClick={closeSettingsMenu}>
                  <ArrowUpRight size={16} />
                  <span>{switchLink.label}</span>
                  <small>切换版本</small>
                </a>
                <button className="title-menu-item" type="button" role="menuitem" onClick={openAboutDialog}>
                  <Info size={16} />
                  <span>关于</span>
                  <small>联系与支持</small>
                </button>
                <div className="title-menu-separator" />
                <button
                  className="title-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeSettingsMenu();
                    void exportArchive();
                  }}
                >
                  <FileDown size={16} />
                  <span>存档</span>
                  <small>PNG 存档 · ⌘/Ctrl S</small>
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
                  <small>PNG / JSON · ⌘/Ctrl L</small>
                </button>
              </div>
            ) : null}
          </div>
          <input ref={importInputRef} hidden type="file" accept="image/png,.png,application/json,.json" onChange={(event) => importArchive(event.currentTarget.files?.[0])} />
        </div>
      </header>
      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
      {aboutDialogView ? (
        <div className="about-dialog-layer">
          <div className="about-dialog-backdrop" aria-hidden="true" onClick={closeAboutDialog} />
          <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
            <header className="about-dialog-header">
              {aboutDialogView === "main" ? (
                <span className="about-dialog-heading-icon" aria-hidden="true"><Info size={18} /></span>
              ) : (
                <button className="about-dialog-icon-button" type="button" aria-label="返回关于" onClick={() => setAboutDialogView("main")}>
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h2 id="about-dialog-title">
                  {aboutDialogView === "main" ? "关于" : aboutDialogView === "support" ? "支持鼓励" : "意见反馈"}
                </h2>
                <p>
                  {aboutDialogView === "main" ? "蛐蛐模拟器" : aboutDialogView === "support" ? "谢谢你让这个小工具继续长大" : "欢迎告诉我你的想法"}
                </p>
              </div>
              <button className="about-dialog-icon-button about-dialog-close" type="button" aria-label="关闭关于" autoFocus onClick={closeAboutDialog}>
                <X size={18} />
              </button>
            </header>

            {aboutDialogView === "main" ? (
              <div className="about-dialog-list">
                <a className="about-dialog-item" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
                  <span className="about-dialog-item-icon"><GitBranch size={19} /></span>
                  <span><strong>GitHub</strong><small>查看源码和项目更新</small></span>
                  <ArrowUpRight size={17} />
                </a>
                <button className="about-dialog-item" type="button" onClick={() => setAboutDialogView("support")}>
                  <span className="about-dialog-item-icon"><Heart size={19} /></span>
                  <span><strong>支持鼓励</strong><small>请我喝杯奶茶</small></span>
                  <ChevronDown className="about-dialog-item-chevron" size={17} />
                </button>
                <button className="about-dialog-item" type="button" onClick={() => setAboutDialogView("feedback")}>
                  <span className="about-dialog-item-icon"><MessageCircle size={19} /></span>
                  <span><strong>意见反馈</strong><small>通过微信联系我</small></span>
                  <ChevronDown className="about-dialog-item-chevron" size={17} />
                </button>
              </div>
            ) : aboutDialogView === "support" ? (
              <div className="about-dialog-content about-support-content">
                {alipayQrCodeUrl ? (
                  <img className="about-support-qr" src={alipayQrCodeUrl} alt="支付宝收款码" />
                ) : (
                  <div className="about-support-placeholder">
                    <QrCode size={44} />
                    <strong>收款码准备中</strong>
                    <small>之后会在这里补充支付宝收款码</small>
                  </div>
                )}
                <p>你的支持会用于继续完善蛐蛐模拟器。</p>
              </div>
            ) : (
              <div className="about-dialog-content about-feedback-content">
                <div className="about-feedback-wechat">
                  <span>微信号</span>
                  <strong>{feedbackWechatId}</strong>
                </div>
                <button className="about-feedback-copy" type="button" disabled={!hasFeedbackWechatId} onClick={copyFeedbackWechatId}>
                  <Copy size={17} />
                  <span>{hasFeedbackWechatId ? "复制微信号" : "微信号待补充"}</span>
                </button>
                <p>反馈问题时，如果能附上截图和操作步骤，会更容易定位。</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      <main className="workspace static-workspace">
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
            <Card className="surface-card story-composer-card motion-in" style={jojoMode ? jojoGlassCardStyle : undefined}>
              <CardHeader className="card-header">
                <div className="panel-title">
                  <Sparkles size={18} />
                  编故事
                </div>
              </CardHeader>
              <CardContent className="card-content">
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
              </CardContent>
            </Card>

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
                  <Button className="prompt-reset-button prompt-history-reset-button" fullWidth variant="secondary" onPress={clearLine}>
                    <RefreshCcw size={16} />
                    重新开始
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="right-panel panel-scroll">
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
        </div>
      </main>
    </div>
  );
}
