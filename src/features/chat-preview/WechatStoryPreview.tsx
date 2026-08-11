import { ImagePlus, Pause, Pencil, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import { memo, type CSSProperties, type Ref, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  chatSessionParticipants,
  chatSessionPeer,
  chatSessionTitle,
  getChatSessions,
  isGroupChatSession,
  messagesForChatSession,
  projectForChatSession
} from "../../shared/chatSessions";
import {
  applyConversationCustomization,
  isConversationCustomizationEmpty,
  normalizeConversationCustomization,
  readConversationCustomizations,
  saveConversationCustomization,
  type ConversationCustomization,
  type ConversationCustomizationMap
} from "../../shared/conversationCustomization";
import type { JojoCssMemeCard } from "../../shared/jojoMemeCards";
import type { AppLanguage } from "../../shared/i18n";
import { isJojoProject } from "../../shared/jojoProject";
import {
  avatarPresentationForCharacter,
  mediaPresentationForMessage,
  messagePresentationFor,
  type MessageAvatarPresentation,
  type MessagePresentation
} from "../../shared/messagePresentation";
import { musicTrackForMessage } from "../../shared/musicLibrary";
import { publicAsset, resolvePublicAssetPath } from "../../shared/publicPath";
import { type ChatMessage, type ChatSession, type DramaProject } from "../../shared/schema";
import { avatarPreviewPath, messageImagePreviewPath } from "../../shared/visualAssetVariants";

const avatarPreviewPixelSize = 96;
const localAvatarMaxFileBytes = 20 * 1024 * 1024;
const localAvatarPixelSize = 420;

const previewCopy = {
  "zh-CN": { editTitle: "自定义会话标题", editName: "自定义昵称", editAvatar: "自定义头像", closePanel: "关闭自定义面板", close: "关闭", processing: "正在处理", chooseImage: "选择本地图片", localOnly: "图片只保存在这台设备的当前会话中", sessionTitle: "会话标题", nickname: "昵称", restore: "恢复默认", cancel: "取消", save: "保存", replay: "再来一遍", today: "今天", preview: "聊天预览", messages: "聊天消息", switchChat: "切换会话" },
  "zh-TW": { editTitle: "自訂會話標題", editName: "自訂暱稱", editAvatar: "自訂頭像", closePanel: "關閉自訂面板", close: "關閉", processing: "處理中", chooseImage: "選擇本機圖片", localOnly: "圖片只保存在這台裝置的目前會話中", sessionTitle: "會話標題", nickname: "暱稱", restore: "恢復預設", cancel: "取消", save: "儲存", replay: "再看一次", today: "今天", preview: "聊天預覽", messages: "聊天訊息", switchChat: "切換會話" },
  en: { editTitle: "Customize chat title", editName: "Customize name", editAvatar: "Customize avatar", closePanel: "Close customization panel", close: "Close", processing: "Processing", chooseImage: "Choose local image", localOnly: "The image stays in this chat on this device", sessionTitle: "Chat title", nickname: "Name", restore: "Restore default", cancel: "Cancel", save: "Save", replay: "Replay", today: "Today", preview: "Chat preview", messages: "Chat messages", switchChat: "Switch chat" },
  ja: { editTitle: "チャット名を変更", editName: "表示名を変更", editAvatar: "アバターを変更", closePanel: "カスタマイズ画面を閉じる", close: "閉じる", processing: "処理中", chooseImage: "端末の画像を選択", localOnly: "画像はこの端末の現在のチャットにのみ保存されます", sessionTitle: "チャット名", nickname: "表示名", restore: "初期設定に戻す", cancel: "キャンセル", save: "保存", replay: "もう一度", today: "今日", preview: "チャットプレビュー", messages: "チャットメッセージ", switchChat: "チャットを切り替え" }
} as const;

async function localAvatarDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > localAvatarMaxFileBytes) throw new Error("图片不能超过 20 MB");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("这张图片暂时无法读取，请换一张试试"));
    });

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (!sourceSize) throw new Error("这张图片没有可用尺寸");
    const outputSize = Math.min(localAvatarPixelSize, sourceSize);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器暂时无法处理这张图片");
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.fillStyle = "#f2f2f2";
    context.fillRect(0, 0, outputSize, outputSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function useDecodedImageReady(src: string | undefined) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!src) {
      setReady(false);
      return undefined;
    }
    if (typeof Image === "undefined") {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    setReady(false);

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    if (image.complete && image.naturalWidth > 0) {
      markReady();
      return () => {
        cancelled = true;
      };
    }

    if (image.decode) {
      void image.decode().then(markReady, () => {
        if (image.complete && image.naturalWidth > 0) markReady();
      });
    } else {
      image.onload = markReady;
    }

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [src]);

  return ready;
}

function WechatDecodedAvatar({ avatar, className }: { avatar: MessageAvatarPresentation; className: string }) {
  const src = resolvePublicAssetPath(avatarPreviewPath(avatar.source));
  const ready = useDecodedImageReady(src);
  if (!src) {
    return (
      <span className={`${className} wechat-contact-avatar-fallback`} style={{ background: avatar.gradient }} aria-hidden="true">
        {avatar.initial}
      </span>
    );
  }
  return (
    <span className={`${className} wechat-decoded-avatar`} style={{ background: avatar.gradient }} aria-hidden="true">
      <span className="wechat-decoded-avatar-initial">{avatar.initial}</span>
      <img
        className={`wechat-decoded-avatar-img ${ready ? "wechat-decoded-avatar-img-ready" : ""}`}
        src={src}
        alt=""
        width={avatarPreviewPixelSize}
        height={avatarPreviewPixelSize}
        decoding="async"
        loading="eager"
        fetchPriority="high"
        draggable={false}
      />
    </span>
  );
}

function WechatAvatar({ avatar, onEdit }: { avatar: MessageAvatarPresentation; onEdit?: () => void }) {
  const avatarView = avatar.source ? (
    <WechatDecodedAvatar avatar={avatar} className="wechat-avatar" />
  ) : (
    <span className="wechat-avatar wechat-avatar-fallback" style={{ background: avatar.gradient }}>
      {avatar.initial}
    </span>
  );
  if (!onEdit) return avatarView;
  return (
    <button className="wechat-avatar-edit-target" type="button" onClick={onEdit} aria-label={`自定义${avatar.name}的头像`} title="自定义头像">
      {avatarView}
      <span className="wechat-edit-pencil wechat-avatar-edit-pencil" aria-hidden="true"><Pencil size={11} strokeWidth={2.4} /></span>
    </button>
  );
}

function EditableSpeakerName({ name, onEdit }: { name: string; onEdit: () => void }) {
  return (
    <button className="wechat-speaker-name wechat-speaker-name-edit-target" type="button" onClick={onEdit} aria-label={`自定义${name}的昵称`} title="自定义昵称">
      <span>{name}</span>
      <span className="wechat-edit-pencil" aria-hidden="true"><Pencil size={9} strokeWidth={2.4} /></span>
    </button>
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

function musicDetails(project: DramaProject, message: ChatMessage) {
  const track = musicTrackForMessage(message);
  const media = mediaPresentationForMessage(project, message);
  if (media.kind !== "music") throw new Error(`消息 ${message.id} 不是音乐消息`);
  return {
    artist: media.artist,
    commentCount: media.commentCount,
    coverUrl: media.source,
    lyric: media.lyric,
    previewUrl: import.meta.env.PROD ? `/api/music/preview?id=${encodeURIComponent(track.id)}` : media.previewUrl,
    title: media.title
  };
}

type MusicPlaybackController = {
  activeMessageId: string | null;
  audioError: boolean;
  playing: boolean;
  progress: number;
  toggle: (message: ChatMessage) => void;
};

function WechatMusicBubble({ project, message, playback }: { project: DramaProject; message: ChatMessage; playback: MusicPlaybackController }) {
  const details = musicDetails(project, message);
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
          <img className="wechat-music-cover" src={details.coverUrl} alt={`${details.title} 专辑封面`} width={164} height={164} decoding="async" loading="eager" />
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
  project,
  message,
  playing,
  progress,
  audioError,
  canGoPrevious,
  canGoNext,
  onToggle,
  onPrevious,
  onNext,
  onDismiss
}: {
  project: DramaProject;
  message: ChatMessage;
  playing: boolean;
  progress: number;
  audioError: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDismiss: () => void;
}) {
  const details = musicDetails(project, message);
  const [closeControlPinned, setCloseControlPinned] = useState(false);
  return (
    <div
      className={`wechat-music-dock ${audioError ? "wechat-music-dock-error" : ""} ${closeControlPinned ? "wechat-music-dock-close-visible" : ""}`}
      role="region"
      aria-label={`正在播放 ${details.title}`}
      style={{ "--music-progress": `${progress * 100}%` } as CSSProperties}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        setCloseControlPinned(true);
      }}
    >
      <button
        type="button"
        className="wechat-music-dock-close"
        aria-label="关闭悬浮播放器"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
      >
        <X size={13} strokeWidth={2.2} />
      </button>
      <img src={details.coverUrl} alt="" width={76} height={76} decoding="async" loading="eager" />
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

function WechatMessageContent({
  project,
  message,
  presentation,
  musicPlayback
}: {
  project: DramaProject;
  message: ChatMessage;
  presentation: MessagePresentation;
  musicPlayback: MusicPlaybackController;
}) {
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
  if (presentation.media.kind === "image") {
    const src = resolvePublicAssetPath(messageImagePreviewPath(presentation.media.source));
    return (
      <div className="wechat-image-card">
        {src ? <img src={src} alt={presentation.media.alt} decoding="async" loading="eager" /> : (
          <div className="wechat-photo-placeholder">
            <p>{presentation.media.description}</p>
          </div>
        )}
      </div>
    );
  }
  if (presentation.media.kind === "meme") {
    const { cssCard } = presentation.media;
    const src = cssCard ? undefined : resolvePublicAssetPath(presentation.media.source);
    return (
      <div className={cssCard ? "wechat-meme-card wechat-meme-card-css" : "wechat-meme-card"}>
        {cssCard ? <JojoCssMemeCardView card={cssCard} /> : src ? <img src={src} alt={presentation.media.caption || "表情"} width={224} height={224} decoding="async" loading="eager" /> : <div className="wechat-meme-fallback">表情</div>}
        {!cssCard && presentation.media.caption ? <span>{presentation.media.caption}</span> : null}
      </div>
    );
  }
  if (presentation.media.kind === "music" && !jojoMode) {
    return <WechatMusicBubble project={project} message={message} playback={musicPlayback} />;
  }
  return <div className="wechat-bubble">{message.text || message.ttsText || " "}</div>;
}

function WechatPendingSpeechRow({
  project,
  message,
  jojoMode,
  wechatGroupMode
}: {
  project: DramaProject;
  message: ChatMessage;
  jojoMode: boolean;
  wechatGroupMode: boolean;
}) {
  const presentation = messagePresentationFor(project, message, "interactive");
  if (presentation.isSystem) return null;
  const { visualSide } = presentation;
  return (
    <div
      className={`wechat-row wechat-row-${visualSide} wechat-row-pending-speech ${jojoMode ? `dingtalk-row ${visualSide === "right" ? "dingtalk-row-self" : "dingtalk-row-other"}` : ""} ${wechatGroupMode ? "wechat-group-row" : ""}`}
      data-pending-message-id={message.id}
      aria-hidden="true"
    >
      {visualSide === "left" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} /> : null}
      <div className="wechat-message-stack">
        {presentation.speakerName ? <div className="wechat-speaker-name">{presentation.speakerName}</div> : null}
        <div className="wechat-bubble wechat-bubble-pending-speech">
          <span />
          <span />
          <span />
        </div>
      </div>
      {visualSide === "right" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} /> : null}
    </div>
  );
}

function WechatContactAvatar({ project, session, className }: { project: DramaProject; session: ChatSession; className: string }) {
  if (isGroupChatSession(project, session)) {
    const participants = chatSessionParticipants(project, session).slice(0, 4);
    return (
      <span className={`${className} wechat-group-avatar`} data-member-count={participants.length} aria-hidden="true">
        {participants.map((participant) => {
          const avatar = avatarPresentationForCharacter(participant);
          return avatar.source ? (
            <WechatDecodedAvatar key={participant.id} avatar={avatar} className="wechat-group-avatar-cell" />
          ) : (
            <span key={participant.id} className="wechat-group-avatar-cell wechat-group-avatar-fallback" style={{ background: avatar.gradient }}>
              {avatar.initial}
            </span>
          );
        })}
      </span>
    );
  }
  const character = chatSessionPeer(project, session);
  const avatar = avatarPresentationForCharacter(character);
  if (avatar.source) return <WechatDecodedAvatar className={className} avatar={avatar} />;
  return (
    <span className={`${className} wechat-contact-avatar-fallback`} style={{ background: avatar.gradient }} aria-hidden="true">
      {avatar.initial}
    </span>
  );
}

function unreadBadgeText(value: number) {
  return value > 99 ? "99+" : String(value);
}

function sessionMessagePreview(message: ChatMessage | undefined) {
  if (!message) return "等待剧情开始";
  if (message.type === "image") return `[图片] ${message.text}`;
  if (message.type === "meme") return `[表情] ${message.text}`;
  if (message.type === "transfer") return `[转账] ${message.transferNote || message.text}`;
  if (message.type === "music") return `[音乐] ${message.musicTitle || message.text}`;
  return message.text || message.ttsText || "新消息";
}

interface SessionPreviewModel {
  project: DramaProject;
  session: ChatSession;
  sourceSession: ChatSession;
}

function WechatSessionList({
  sessionViews,
  unreadCounts,
  onSelect
}: {
  sessionViews: SessionPreviewModel[];
  unreadCounts: Record<string, number>;
  onSelect: (sessionId: string) => void;
}) {
  return (
    <nav className="wechat-session-list-screen" aria-label="消息列表">
      {sessionViews.map(({ project, session }) => {
        const messages = messagesForChatSession(project, session.id);
        const lastMessage = messages.at(-1);
        const unreadCount = unreadCounts[session.id] || 0;
        return (
          <button
            key={session.id}
            className="wechat-session-list-item"
            type="button"
            onClick={() => onSelect(session.id)}
            aria-label={`打开${chatSessionTitle(project, session)}${unreadCount ? `，${unreadCount} 条未读` : ""}`}
          >
            <WechatContactAvatar project={project} session={session} className="wechat-session-list-avatar" />
            <span className="wechat-session-list-copy">
              <strong>{chatSessionTitle(project, session)}</strong>
              <small>{sessionMessagePreview(lastMessage)}</small>
            </span>
            <span className="wechat-session-list-meta">
              {lastMessage ? <time>刚刚</time> : null}
              {unreadCount ? <span className="wechat-session-list-badge" aria-hidden="true">{unreadBadgeText(unreadCount)}</span> : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

type TextProfileEditor = {
  kind: "title" | "name";
  sessionId: string;
  characterId?: string;
  value: string;
  defaultValue: string;
  hasOverride: boolean;
};

type AvatarProfileEditor = {
  kind: "avatar";
  sessionId: string;
  characterId: string;
  avatar: MessageAvatarPresentation;
  selectedAvatarUrl?: string;
  hasOverride: boolean;
};

type ChatProfileEditor = TextProfileEditor | AvatarProfileEditor;

function ChatProfileEditorDialog({
  editor,
  error,
  avatarProcessing,
  onChangeText,
  onSelectAvatar,
  onClose,
  onReset,
  onSave,
  language
}: {
  editor: ChatProfileEditor;
  error: string;
  avatarProcessing: boolean;
  onChangeText: (value: string) => void;
  onSelectAvatar: (file: File) => void;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
  language: AppLanguage;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const text = previewCopy[language];
  const title = editor.kind === "title" ? text.editTitle : editor.kind === "name" ? text.editName : text.editAvatar;
  const avatar = editor.kind === "avatar"
    ? { ...editor.avatar, source: editor.selectedAvatarUrl || editor.avatar.source }
    : undefined;

  return (
    <div
      className="chat-profile-editor-layer"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <button className="chat-profile-editor-backdrop" type="button" onClick={onClose} aria-label={text.closePanel} />
      <form
        className="chat-profile-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-profile-editor-title"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <header className="chat-profile-editor-header">
          <strong id="chat-profile-editor-title">{title}</strong>
          <button type="button" onClick={onClose} aria-label={text.close}><X size={16} /></button>
        </header>
        {editor.kind === "avatar" && avatar ? (
          <div className="chat-profile-avatar-editor">
            {avatar.source ? (
              <WechatDecodedAvatar avatar={avatar} className="chat-profile-avatar-preview" />
            ) : (
              <span className="chat-profile-avatar-preview wechat-avatar-fallback" style={{ background: avatar.gradient }}>{avatar.initial}</span>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) onSelectAvatar(file);
              }}
            />
            <button className="chat-profile-select-avatar" type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarProcessing}>
              <ImagePlus size={15} />
              {avatarProcessing ? text.processing : text.chooseImage}
            </button>
            <small>{text.localOnly}</small>
          </div>
        ) : editor.kind !== "avatar" ? (
          <label className="chat-profile-text-field">
            <span>{editor.kind === "title" ? text.sessionTitle : text.nickname}</span>
            <input
              autoFocus
              value={editor.value}
              maxLength={editor.kind === "title" ? 48 : 32}
              onChange={(event) => onChangeText(event.currentTarget.value)}
              enterKeyHint="done"
            />
          </label>
        ) : null}
        {error ? <p className="chat-profile-editor-error" role="alert">{error}</p> : null}
        <footer className="chat-profile-editor-actions">
          {editor.hasOverride ? (
            <button className="chat-profile-reset-button" type="button" onClick={onReset}>
              <RotateCcw size={14} />
              {text.restore}
            </button>
          ) : <span />}
          <span className="chat-profile-editor-confirm-actions">
            <button type="button" onClick={onClose}>{text.cancel}</button>
            <button className="chat-profile-save-button" type="submit" disabled={avatarProcessing}>{text.save}</button>
          </span>
        </footer>
      </form>
    </div>
  );
}

function WechatStoryPreviewComponent({
  project,
  allowMultiSession = false,
  activeSessionId,
  unreadCounts = {},
  onSelectSession,
  showPeerName,
  onReplay,
  showReplay,
  pendingSpeechMessage,
  language = "zh-CN",
  phoneRef
}: {
  project: DramaProject;
  allowMultiSession?: boolean;
  activeSessionId?: string;
  unreadCounts?: Record<string, number>;
  onSelectSession?: (sessionId: string) => void;
  showPeerName?: boolean;
  onReplay?: () => void;
  showReplay?: boolean;
  pendingSpeechMessage?: ChatMessage | null;
  language?: AppLanguage;
  phoneRef?: Ref<HTMLDivElement>;
}) {
  const jojoMode = isJojoProject(project);
  const text = previewCopy[language];
  const sessions = useMemo(() => getChatSessions(project), [project]);
  const customizationScope = `${project.stylePreset}:${project.id}:${sessions.map((session) => session.id).join(",")}`;
  const [customizationState, setCustomizationState] = useState<{ scope: string; values: ConversationCustomizationMap }>(() => ({
    scope: customizationScope,
    values: readConversationCustomizations(project)
  }));
  const customizations = customizationState.scope === customizationScope
    ? customizationState.values
    : readConversationCustomizations(project);
  const sessionViews = useMemo<SessionPreviewModel[]>(() => sessions.map((sourceSession) => {
    const displayProject = applyConversationCustomization(project, sourceSession.id, customizations[sourceSession.id]);
    const displaySession = getChatSessions(displayProject).find((session) => session.id === sourceSession.id) ?? sourceSession;
    return { project: displayProject, session: displaySession, sourceSession };
  }), [customizations, project, sessions]);
  const activeSessionView = sessionViews.find(({ session }) => session.id === activeSessionId) ?? sessionViews[0];
  const activeSession = activeSessionView.session;
  const activeDisplayProject = activeSessionView.project;
  const activeCustomization = customizations[activeSession.id];
  const wechatGroupMode = !jojoMode && isGroupChatSession(activeDisplayProject, activeSession);
  const conversationProject = useMemo(
    () => projectForChatSession(activeDisplayProject, activeSession.id),
    [activeDisplayProject, activeSession.id]
  );
  const peer = chatSessionPeer(activeDisplayProject, activeSession);
  const multiSessionMode = allowMultiSession && !jojoMode && sessions.length > 1;
  const totalUnread = sessions.reduce((total, session) => total + (session.id === activeSession.id ? 0 : unreadCounts[session.id] || 0), 0);
  const musicMessages = useMemo(() => conversationProject.messages.filter((message) => message.type === "music" && !jojoMode), [conversationProject.messages, jojoMode]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeMusicMessageId, setActiveMusicMessageId] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicAudioError, setMusicAudioError] = useState(false);
  const [showMusicDock, setShowMusicDock] = useState(false);
  const [musicDockDismissed, setMusicDockDismissed] = useState(false);
  const [mobileSessionListOpen, setMobileSessionListOpen] = useState(false);
  const [profileEditor, setProfileEditor] = useState<ChatProfileEditor | null>(null);
  const [profileEditorError, setProfileEditorError] = useState("");
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const mobileSessionListVisible = multiSessionMode && mobileSessionListOpen;
  const activeMusicMessage = musicMessages.find((message) => message.id === activeMusicMessageId);
  const activeMusicIndex = activeMusicMessage ? musicMessages.findIndex((message) => message.id === activeMusicMessage.id) : -1;

  function selectSession(sessionId: string) {
    onSelectSession?.(sessionId);
    setMobileSessionListOpen(false);
  }

  function closeProfileEditor() {
    setProfileEditor(null);
    setProfileEditorError("");
    setAvatarProcessing(false);
  }

  function commitCustomization(sessionId: string, value: ConversationCustomization) {
    const customization = normalizeConversationCustomization(value);
    if (!saveConversationCustomization(project, sessionId, customization)) {
      setProfileEditorError("本地存储空间不足，请清理一些浏览器网站数据后重试");
      return false;
    }
    const nextValues = { ...customizations };
    if (isConversationCustomizationEmpty(customization)) delete nextValues[sessionId];
    else nextValues[sessionId] = customization;
    setCustomizationState({ scope: customizationScope, values: nextValues });
    return true;
  }

  function updateTitleCustomization(sessionId: string, title: string | undefined) {
    const current = customizations[sessionId] ?? {};
    const next = { ...current };
    if (title) next.title = title;
    else delete next.title;
    return commitCustomization(sessionId, next);
  }

  function updateCharacterCustomization(
    sessionId: string,
    characterId: string,
    field: "name" | "avatarUrl",
    value: string | undefined
  ) {
    const current = customizations[sessionId] ?? {};
    const characters = { ...(current.characters ?? {}) };
    const character = { ...(characters[characterId] ?? {}) };
    if (value) character[field] = value;
    else delete character[field];
    if (character.name || character.avatarUrl) characters[characterId] = character;
    else delete characters[characterId];
    const next: ConversationCustomization = { ...current };
    if (Object.keys(characters).length) next.characters = characters;
    else delete next.characters;
    return commitCustomization(sessionId, next);
  }

  function openTitleEditor() {
    const defaultValue = jojoMode
      ? project.title || activeSessionView.sourceSession.title || "聊天"
      : activeSessionView.sourceSession.title || project.title || "聊天";
    setProfileEditor({
      kind: "title",
      sessionId: activeSession.id,
      value: activeCustomization?.title || defaultValue,
      defaultValue,
      hasOverride: Boolean(activeCustomization?.title)
    });
    setProfileEditorError("");
  }

  function openNameEditor(characterId: string) {
    const sourceCharacter = project.characters.find((character) => character.id === characterId);
    const displayCharacter = activeDisplayProject.characters.find((character) => character.id === characterId);
    if (!sourceCharacter || !displayCharacter) return;
    const nameOverride = activeCustomization?.characters?.[characterId]?.name;
    setProfileEditor({
      kind: "name",
      sessionId: activeSession.id,
      characterId,
      value: nameOverride || displayCharacter.name,
      defaultValue: sourceCharacter.name,
      hasOverride: Boolean(nameOverride)
    });
    setProfileEditorError("");
  }

  function openAvatarEditor(characterId: string) {
    const displayCharacter = activeDisplayProject.characters.find((character) => character.id === characterId);
    if (!displayCharacter) return;
    const avatarOverride = activeCustomization?.characters?.[characterId]?.avatarUrl;
    setProfileEditor({
      kind: "avatar",
      sessionId: activeSession.id,
      characterId,
      avatar: avatarPresentationForCharacter(displayCharacter),
      hasOverride: Boolean(avatarOverride)
    });
    setProfileEditorError("");
  }

  function saveProfileEditor() {
    if (!profileEditor) return;
    if (profileEditor.kind === "title") {
      const title = profileEditor.value.trim();
      if (!title) {
        setProfileEditorError("会话标题不能为空");
        return;
      }
      if (updateTitleCustomization(profileEditor.sessionId, title === profileEditor.defaultValue ? undefined : title)) closeProfileEditor();
      return;
    }
    if (profileEditor.kind === "name") {
      const name = profileEditor.value.trim();
      if (!name) {
        setProfileEditorError("昵称不能为空");
        return;
      }
      if (updateCharacterCustomization(profileEditor.sessionId, profileEditor.characterId!, "name", name === profileEditor.defaultValue ? undefined : name)) closeProfileEditor();
      return;
    }
    if (profileEditor.kind !== "avatar") return;
    if (!profileEditor.selectedAvatarUrl) {
      closeProfileEditor();
      return;
    }
    if (updateCharacterCustomization(profileEditor.sessionId, profileEditor.characterId, "avatarUrl", profileEditor.selectedAvatarUrl)) closeProfileEditor();
  }

  function resetProfileEditor() {
    if (!profileEditor) return;
    const saved = profileEditor.kind === "title"
      ? updateTitleCustomization(profileEditor.sessionId, undefined)
      : updateCharacterCustomization(
        profileEditor.sessionId,
        profileEditor.characterId!,
        profileEditor.kind === "name" ? "name" : "avatarUrl",
        undefined
      );
    if (saved) closeProfileEditor();
  }

  async function selectLocalAvatar(file: File) {
    setAvatarProcessing(true);
    setProfileEditorError("");
    try {
      const avatarUrl = await localAvatarDataUrl(file);
      setProfileEditor((current) => current?.kind === "avatar" ? { ...current, selectedAvatarUrl: avatarUrl } : current);
    } catch (error) {
      setProfileEditorError(error instanceof Error ? error.message : "头像处理失败，请换一张图片试试");
    } finally {
      setAvatarProcessing(false);
    }
  }

  function updateMusicDockVisibility() {
    const chatScroll = chatScrollRef.current;
    if (!chatScroll || !activeMusicMessageId || musicDockDismissed) {
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
    const nextDetails = musicDetails(conversationProject, message);
    if (activeMusicMessageId === message.id) {
      if (!audio.paused) {
        audio.pause();
        return;
      }
      setMusicDockDismissed(false);
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
    setMusicDockDismissed(false);
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

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  useEffect(() => {
    if (customizationState.scope === customizationScope) return;
    setCustomizationState({ scope: customizationScope, values: readConversationCustomizations(project) });
    setProfileEditor(null);
    setProfileEditorError("");
    setAvatarProcessing(false);
  }, [customizationScope, customizationState.scope]);

  useEffect(() => {
    if (!multiSessionMode) setMobileSessionListOpen(false);
  }, [multiSessionMode]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1080px)");
    const closeListOnDesktop = () => {
      if (desktopQuery.matches) setMobileSessionListOpen(false);
    };
    closeListOnDesktop();
    desktopQuery.addEventListener("change", closeListOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeListOnDesktop);
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
    setMusicDockDismissed(false);
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
  }, [activeMusicMessageId, conversationProject.messages.length, musicDockDismissed]);

  const musicPlayback: MusicPlaybackController = {
    activeMessageId: activeMusicMessageId,
    audioError: musicAudioError,
    playing: musicPlaying,
    progress: musicProgress,
    toggle: playMusic
  };

  return (
    <div className="wechat-preview-shell">
      <div
        ref={phoneRef}
        className={`wechat-phone ${jojoMode ? "dingtalk-phone" : ""} ${wechatGroupMode ? "wechat-group-phone" : ""} ${mobileSessionListVisible ? "wechat-phone-session-list" : ""}`}
        aria-label={language === "zh-CN"
          ? jojoMode ? "钉钉手机版聊天预览" : wechatGroupMode ? "9:16 微信群聊预览" : "9:16 微信聊天预览"
          : `${jojoMode ? "DingTalk" : "WeChat"} ${text.preview}`}
      >
        <div className={jojoMode ? "dingtalk-topbar" : `wechat-topbar ${mobileSessionListVisible ? "wechat-topbar-session-list" : ""}`}>
          <img
            className={jojoMode ? "dingtalk-topbar-img" : "wechat-topbar-img"}
            src={publicAsset(jojoMode ? "/dingtalk-ui/topbar.webp" : "/wechat-ui/topbar.webp")}
            alt=""
            width={1206}
            height={jojoMode ? 302 : 300}
            decoding="async"
            loading="eager"
            draggable={false}
          />
          {jojoMode ? (
            <button className="dingtalk-topbar-title chat-title-edit-target" type="button" onClick={openTitleEditor} aria-label={text.editTitle} title={text.editTitle}>
              <span className="chat-title-edit-label">{activeCustomization?.title || project.title || "工位蛐蛐小队"}</span>
              <span className="wechat-edit-pencil" aria-hidden="true"><Pencil size={12} strokeWidth={2.4} /></span>
            </button>
          ) : mobileSessionListVisible ? (
            <strong className="wechat-topbar-title">微信</strong>
          ) : (
            <button className={`wechat-topbar-title chat-title-edit-target ${wechatGroupMode ? "wechat-topbar-title-group" : ""}`} type="button" onClick={openTitleEditor} aria-label={text.editTitle} title={text.editTitle}>
              {wechatGroupMode ? (
                <>
                  <WechatContactAvatar project={activeDisplayProject} session={activeSession} className="wechat-topbar-group-avatar" />
                  <span className="wechat-topbar-group-copy">
                    {activeSession.title || activeDisplayProject.title} ({chatSessionParticipants(activeDisplayProject, activeSession).length})
                  </span>
                </>
              ) : (
                <span className="chat-title-edit-label">
                  {showPeerName || activeCustomization?.title ? (chatSessionTitle(activeDisplayProject, activeSession) || peer?.name || activeDisplayProject.title) : "？"}
                </span>
              )}
              <span className="wechat-edit-pencil" aria-hidden="true"><Pencil size={12} strokeWidth={2.4} /></span>
            </button>
          )}
          {multiSessionMode && !mobileSessionListVisible ? (
            <button
              className="wechat-mobile-session-back"
              type="button"
              onClick={() => setMobileSessionListOpen(true)}
              aria-label={`返回消息列表${totalUnread ? `，${totalUnread} 条未读` : ""}`}
            >
              {totalUnread ? <span className="wechat-mobile-session-dot" aria-hidden="true" /> : null}
            </button>
          ) : null}
        </div>
        {mobileSessionListVisible ? (
          <WechatSessionList sessionViews={sessionViews} unreadCounts={unreadCounts} onSelect={selectSession} />
        ) : (
          <div className={`wechat-chat-viewport ${jojoMode ? "dingtalk-chat-viewport" : ""}`}>
            <div
              ref={chatScrollRef}
              className={`wechat-chat-scroll ${jojoMode ? "dingtalk-chat-scroll" : ""}`}
              aria-label={`${chatSessionTitle(activeDisplayProject, activeSession)} ${text.messages}`}
              tabIndex={0}
              onScroll={updateMusicDockVisibility}
            >
              <div className="wechat-chat-content">
                <div className="wechat-chat-date">{text.today} {jojoMode ? "09:27" : "17:32"}</div>
                {conversationProject.messages.map((message) => {
                  const presentation = messagePresentationFor(conversationProject, message, "interactive");
                  if (presentation.isSystem) {
                    return <div key={message.id} className="wechat-system-row" data-message-id={message.id}>{message.text}</div>;
                  }
                  const { visualSide } = presentation;
                  return (
                    <div
                      key={message.id}
                      className={`wechat-row wechat-row-${visualSide} ${jojoMode ? `dingtalk-row ${visualSide === "right" ? "dingtalk-row-self" : "dingtalk-row-other"}` : ""} ${wechatGroupMode ? "wechat-group-row" : ""}`}
                      data-message-id={message.id}
                    >
                      {visualSide === "left" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} onEdit={() => openAvatarEditor(presentation.character.id)} /> : null}
                      <div className="wechat-message-stack">
                        {presentation.speakerName ? <EditableSpeakerName name={presentation.speakerName} onEdit={() => openNameEditor(presentation.character.id)} /> : null}
                        <WechatMessageContent project={conversationProject} message={message} presentation={presentation} musicPlayback={musicPlayback} />
                      </div>
                      {visualSide === "right" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} onEdit={() => openAvatarEditor(presentation.character.id)} /> : null}
                    </div>
                  );
                })}
                {pendingSpeechMessage ? (
                  <WechatPendingSpeechRow
                    project={activeDisplayProject}
                    message={pendingSpeechMessage}
                    jojoMode={jojoMode}
                    wechatGroupMode={wechatGroupMode}
                  />
                ) : null}
                {showReplay ? (
                  <div className="chat-replay-row">
                    <button className="chat-replay-button" type="button" onClick={onReplay} aria-label={text.replay}>
                      {text.replay}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            {showMusicDock && !musicDockDismissed && activeMusicMessage ? (
              <WechatMusicDock
                project={conversationProject}
                message={activeMusicMessage}
                playing={musicPlaying}
                progress={musicProgress}
                audioError={musicAudioError}
                canGoPrevious={activeMusicIndex > 0}
                canGoNext={activeMusicIndex >= 0 && activeMusicIndex < musicMessages.length - 1}
                onToggle={() => playMusic(activeMusicMessage)}
                onPrevious={() => playMusicByStep(-1)}
                onNext={() => playMusicByStep(1)}
                onDismiss={() => {
                  setMusicDockDismissed(true);
                  setShowMusicDock(false);
                }}
              />
            ) : null}
          </div>
        )}
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
        {mobileSessionListVisible ? null : (
          <img
            className={jojoMode ? "dingtalk-inputbar-img" : "wechat-bottombar-img"}
            src={publicAsset(jojoMode ? "/dingtalk-ui/inputbar.webp" : "/wechat-ui/bottombar.webp")}
            alt=""
            width={1206}
            height={jojoMode ? 376 : 270}
            decoding="async"
            loading="eager"
            draggable={false}
          />
        )}
        {profileEditor ? (
          <ChatProfileEditorDialog
            editor={profileEditor}
            error={profileEditorError}
            avatarProcessing={avatarProcessing}
            onChangeText={(value) => {
              setProfileEditor((current) => current && current.kind !== "avatar" ? { ...current, value } : current);
              setProfileEditorError("");
            }}
            onSelectAvatar={(file) => void selectLocalAvatar(file)}
            onClose={closeProfileEditor}
            onReset={resetProfileEditor}
            onSave={saveProfileEditor}
            language={language}
          />
        ) : null}
      </div>
      {multiSessionMode ? (
        <nav className="wechat-session-rail" aria-label={text.switchChat}>
          {sessionViews.map(({ project: sessionProject, session }) => {
            const unreadCount = unreadCounts[session.id] || 0;
            const selected = session.id === activeSession.id;
            return (
              <button
                key={session.id}
                className={`wechat-session-rail-button ${selected ? "wechat-session-rail-button-active" : ""}`}
                type="button"
                onClick={() => selectSession(session.id)}
                aria-pressed={selected}
                aria-label={`切换到${chatSessionTitle(sessionProject, session)}${unreadCount ? `，${unreadCount} 条未读` : ""}`}
                title={chatSessionTitle(sessionProject, session)}
              >
                <WechatContactAvatar project={sessionProject} session={session} className="wechat-session-rail-avatar" />
                {unreadCount ? <span className="wechat-session-rail-badge" aria-hidden="true">{unreadBadgeText(unreadCount)}</span> : null}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}


export const WechatStoryPreview = memo(WechatStoryPreviewComponent);
