import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
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
import type { JojoCssMemeCard } from "../../shared/jojoMemeCards";
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

function WechatAvatar({ avatar }: { avatar: MessageAvatarPresentation }) {
  if (avatar.source) return <img className="wechat-avatar" src={resolvePublicAssetPath(avatar.source)} alt="" />;
  return (
    <div className="wechat-avatar wechat-avatar-fallback" style={{ background: avatar.gradient }}>
      {avatar.initial}
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
    const src = resolvePublicAssetPath(presentation.media.source);
    return (
      <div className="wechat-image-card">
        {src ? <img src={src} alt={presentation.media.alt} /> : (
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
        {cssCard ? <JojoCssMemeCardView card={cssCard} /> : src ? <img src={src} alt={presentation.media.caption || "表情"} /> : <div className="wechat-meme-fallback">表情</div>}
        {!cssCard && presentation.media.caption ? <span>{presentation.media.caption}</span> : null}
      </div>
    );
  }
  if (presentation.media.kind === "music" && !jojoMode) {
    return <WechatMusicBubble project={project} message={message} playback={musicPlayback} />;
  }
  return <div className="wechat-bubble">{message.text || message.ttsText || " "}</div>;
}

function WechatContactAvatar({ project, session, className }: { project: DramaProject; session: ChatSession; className: string }) {
  if (isGroupChatSession(project, session)) {
    const participants = chatSessionParticipants(project, session).slice(0, 4);
    return (
      <span className={`${className} wechat-group-avatar`} data-member-count={participants.length} aria-hidden="true">
        {participants.map((participant) => {
          const avatar = avatarPresentationForCharacter(participant);
          return avatar.source ? (
            <img key={participant.id} className="wechat-group-avatar-cell" src={resolvePublicAssetPath(avatar.source)} alt="" />
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
  if (avatar.source) return <img className={className} src={resolvePublicAssetPath(avatar.source)} alt="" />;
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

function WechatSessionList({
  project,
  sessions,
  unreadCounts,
  onSelect
}: {
  project: DramaProject;
  sessions: ChatSession[];
  unreadCounts: Record<string, number>;
  onSelect: (sessionId: string) => void;
}) {
  return (
    <nav className="wechat-session-list-screen" aria-label="消息列表">
      {sessions.map((session) => {
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

function WechatStoryPreviewComponent({
  project,
  activeSessionId,
  unreadCounts = {},
  onSelectSession,
  showPeerName,
  onReplay,
  showReplay,
  phoneRef
}: {
  project: DramaProject;
  activeSessionId?: string;
  unreadCounts?: Record<string, number>;
  onSelectSession?: (sessionId: string) => void;
  showPeerName?: boolean;
  onReplay?: () => void;
  showReplay?: boolean;
  phoneRef?: Ref<HTMLDivElement>;
}) {
  const jojoMode = isJojoProject(project);
  const sessions = useMemo(() => getChatSessions(project), [project]);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const wechatGroupMode = !jojoMode && isGroupChatSession(project, activeSession);
  const conversationProject = useMemo(() => projectForChatSession(project, activeSession.id), [activeSession.id, project]);
  const peer = chatSessionPeer(project, activeSession);
  const multiSessionMode = !jojoMode && sessions.length > 1;
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
  const activeMusicMessage = musicMessages.find((message) => message.id === activeMusicMessageId);
  const activeMusicIndex = activeMusicMessage ? musicMessages.findIndex((message) => message.id === activeMusicMessage.id) : -1;

  function selectSession(sessionId: string) {
    onSelectSession?.(sessionId);
    setMobileSessionListOpen(false);
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
        className={`wechat-phone ${jojoMode ? "dingtalk-phone" : ""} ${wechatGroupMode ? "wechat-group-phone" : ""} ${mobileSessionListOpen ? "wechat-phone-session-list" : ""}`}
        aria-label={jojoMode ? "钉钉手机版聊天预览" : wechatGroupMode ? "9:16 微信群聊预览" : "9:16 微信聊天预览"}
      >
        <div className={jojoMode ? "dingtalk-topbar" : `wechat-topbar ${mobileSessionListOpen ? "wechat-topbar-session-list" : ""}`}>
          <img className={jojoMode ? "dingtalk-topbar-img" : "wechat-topbar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/topbar.webp" : "/wechat-ui/topbar.webp")} alt="" draggable={false} />
          {jojoMode ? (
            <strong className="dingtalk-topbar-title">{project.title || "工位蛐蛐小队"}</strong>
          ) : (
            <strong className={`wechat-topbar-title ${wechatGroupMode ? "wechat-topbar-title-group" : ""}`}>
              {mobileSessionListOpen ? "微信" : wechatGroupMode ? (
                <>
                  <WechatContactAvatar project={project} session={activeSession} className="wechat-topbar-group-avatar" />
                  <span className="wechat-topbar-group-copy">
                    {activeSession.title || project.title} ({chatSessionParticipants(project, activeSession).length})
                  </span>
                </>
              ) : showPeerName ? (chatSessionTitle(project, activeSession) || peer?.name || project.title) : "？"}
            </strong>
          )}
          {multiSessionMode && !mobileSessionListOpen ? (
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
        {mobileSessionListOpen && multiSessionMode ? (
          <WechatSessionList project={project} sessions={sessions} unreadCounts={unreadCounts} onSelect={selectSession} />
        ) : (
          <div className={`wechat-chat-viewport ${jojoMode ? "dingtalk-chat-viewport" : ""}`}>
            <div
              ref={chatScrollRef}
              className={`wechat-chat-scroll ${jojoMode ? "dingtalk-chat-scroll" : ""}`}
              aria-label={jojoMode ? "钉钉聊天消息" : `${chatSessionTitle(project, activeSession)}聊天消息`}
              tabIndex={0}
              onScroll={updateMusicDockVisibility}
            >
              <div className="wechat-chat-content">
                <div className="wechat-chat-date">{jojoMode ? "今天 09:27" : "今天 17:32"}</div>
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
                      {visualSide === "left" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} /> : null}
                      <div className="wechat-message-stack">
                        {presentation.speakerName ? <div className="wechat-speaker-name">{presentation.speakerName}</div> : null}
                        <WechatMessageContent project={conversationProject} message={message} presentation={presentation} musicPlayback={musicPlayback} />
                      </div>
                      {visualSide === "right" && presentation.avatar ? <WechatAvatar avatar={presentation.avatar} /> : null}
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
        {mobileSessionListOpen && multiSessionMode ? null : (
          <img className={jojoMode ? "dingtalk-inputbar-img" : "wechat-bottombar-img"} src={publicAsset(jojoMode ? "/dingtalk-ui/inputbar.webp" : "/wechat-ui/bottombar.webp")} alt="" draggable={false} />
        )}
      </div>
      {multiSessionMode ? (
        <nav className="wechat-session-rail" aria-label="切换会话">
          {sessions.map((session) => {
            const unreadCount = unreadCounts[session.id] || 0;
            const selected = session.id === activeSession.id;
            return (
              <button
                key={session.id}
                className={`wechat-session-rail-button ${selected ? "wechat-session-rail-button-active" : ""}`}
                type="button"
                onClick={() => selectSession(session.id)}
                aria-pressed={selected}
                aria-label={`切换到${chatSessionTitle(project, session)}${unreadCount ? `，${unreadCount} 条未读` : ""}`}
                title={chatSessionTitle(project, session)}
              >
                <WechatContactAvatar project={project} session={session} className="wechat-session-rail-avatar" />
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
