import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../../shared/i18n";
import { publicAsset } from "../../shared/publicPath";
import { ACTIVE_GLITCH, GlitchBadgeEngine, IDLE_GLITCH } from "./glitchBadgeEngine";

const GLITCH_LAYERS = 10;

const identities = [
  {
    name: "叫叫",
    glitchName: "叫叫 / JIAOJIAO",
    icon: "/brand-icons/ququ-01-jiaojiao-shush.webp",
    line: "嘘——脑洞已经混进群聊了。"
  },
  {
    name: "铃铛",
    glitchName: "铃铛 / LINGDANG",
    icon: "/brand-icons/ququ-05-lingdang-giggle.webp",
    line: "你先别急，我看这段还能再反转。"
  },
  {
    name: "猪小弟",
    glitchName: "猪小弟 / ZHUXIAODI",
    icon: "/brand-icons/ququ-04-zhuxiaodi-kiss.webp",
    line: "收到，但我决定先把它拍成职场短剧。"
  }
] as const;

type BetaAboutIdentityProps = {
  language: AppLanguage;
};

export function BetaAboutIdentity({ language }: BetaAboutIdentityProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlitchBadgeEngine | null>(null);
  const switchTimerRef = useRef<number[]>([]);
  const [identityIndex, setIdentityIndex] = useState(0);
  const [switching, setSwitching] = useState(false);
  const identity = identities[identityIndex];
  const labels = {
    "zh-CN": { instruction: "点一下，换个主演", aria: `当前主演是${identity.name}，点击切换` },
    "zh-TW": { instruction: "點一下，換個主演", aria: `目前主演是${identity.name}，點擊切換` },
    en: { instruction: "Tap to switch the lead", aria: `Current lead: ${identity.name}. Activate to switch.` },
    ja: { instruction: "タップで主役を交代", aria: `現在の主役は${identity.name}。押すと切り替わります。` }
  }[language];

  function clearSwitchTimers() {
    switchTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    switchTimerRef.current = [];
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const base = host.querySelector<HTMLElement>("[data-glitch-base]");
    const layers = Array.from(host.querySelectorAll<HTMLElement>("[data-glitch-layer]"));
    if (!base) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const engine = new GlitchBadgeEngine(base, layers, identities[0].glitchName, reducedMotion);
    engineRef.current = engine;
    let onScreen = false;
    let hidden = document.hidden;

    const sync = () => {
      if (onScreen && !hidden) engine.start();
      else engine.stop();
    };
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    }, { rootMargin: "120px" });
    observer.observe(host);
    const handleVisibility = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const magnet = host.querySelector<HTMLElement>("[data-glitch-magnet]");
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let animationFrame = 0;
    const handlePointerMove = (event: PointerEvent) => {
      if (!magnet || reducedMotion || animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        const rect = host.getBoundingClientRect();
        const deltaX = event.clientX - (rect.left + rect.width / 2);
        const deltaY = event.clientY - (rect.top + rect.height / 2);
        const reach = Math.hypot(rect.width, rect.height) / 2;
        const falloff = Math.max(0, 1 - Math.hypot(deltaX, deltaY) / reach);
        const pull = 0.18 * falloff * falloff;
        magnet.style.transition = "none";
        magnet.style.transform = `translate3d(${(deltaX * pull).toFixed(2)}px,${(deltaY * pull).toFixed(2)}px,0)`;
      });
    };
    const releaseMagnet = () => {
      if (!magnet) return;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      magnet.style.transition = "transform 620ms cubic-bezier(0.22, 1.25, 0.36, 1)";
      magnet.style.transform = "translate3d(0,0,0)";
    };
    const activate = () => engine.setOptions(ACTIVE_GLITCH);
    const idle = () => engine.setOptions(IDLE_GLITCH);
    if (finePointer && !reducedMotion) {
      host.addEventListener("pointerenter", activate);
      host.addEventListener("pointerleave", idle);
      host.addEventListener("pointermove", handlePointerMove);
      host.addEventListener("pointerleave", releaseMagnet);
    }

    return () => {
      clearSwitchTimers();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (finePointer && !reducedMotion) {
        host.removeEventListener("pointerenter", activate);
        host.removeEventListener("pointerleave", idle);
        host.removeEventListener("pointermove", handlePointerMove);
        host.removeEventListener("pointerleave", releaseMagnet);
      }
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  function switchIdentity() {
    clearSwitchTimers();
    const nextIndex = (identityIndex + 1) % identities.length;
    const nextIdentity = identities[nextIndex];
    setSwitching(true);
    engineRef.current?.setOptions(ACTIVE_GLITCH);
    switchTimerRef.current.push(window.setTimeout(() => {
      setIdentityIndex(nextIndex);
      engineRef.current?.setWord(nextIdentity.glitchName);
    }, 82));
    switchTimerRef.current.push(window.setTimeout(() => {
      setSwitching(false);
      engineRef.current?.setOptions(IDLE_GLITCH);
    }, 390));
  }

  return (
    <div ref={hostRef} className="beta-about-identity" data-switching={switching ? "true" : "false"}>
      <button
        className="beta-about-identity-button"
        type="button"
        aria-label={labels.aria}
        data-uisfx="reaction"
        onClick={switchIdentity}
      >
        <span className="beta-about-avatar-shell" aria-hidden="true">
          <img src={publicAsset(identity.icon)} alt="" width="96" height="96" decoding="async" />
          <span className="beta-about-avatar-pulse" />
        </span>
        <span data-glitch-magnet className="beta-about-glitch-magnet">
          <span className="beta-about-glitch-stack">
            <span className="beta-about-glitch-anchor" aria-hidden="true">猪小弟 / ZHUXIAODI</span>
            <span data-glitch-base className="beta-about-glitch-copy beta-about-glitch-base">
              <span data-glitch-badge className="beta-about-glitch-surface" />
              <span data-glitch-text className="beta-about-glitch-text">{identity.glitchName}</span>
            </span>
            {Array.from({ length: GLITCH_LAYERS }, (_, index) => (
              <span
                key={index}
                data-glitch-layer
                className="beta-about-glitch-copy beta-about-glitch-layer"
                style={{ opacity: 0 }}
                aria-hidden="true"
              >
                <span className="beta-about-glitch-surface" style={{ animationDelay: `${-(index * 2.4).toFixed(1)}s` }} />
                <span data-glitch-text className="beta-about-glitch-text">{identity.glitchName}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="beta-about-identity-hint">{labels.instruction}</span>
      </button>
      <p className="beta-about-character-line" key={identity.name}>{identity.line}</p>
    </div>
  );
}
