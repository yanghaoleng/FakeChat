import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../../shared/i18n";
import { publicAsset } from "../../shared/publicPath";
import { ACTIVE_GLITCH, GlitchBadgeEngine, IDLE_GLITCH } from "./glitchBadgeEngine";

const GLITCH_LAYERS = 10;

const identities = [
  { name: "叫叫", icon: "/brand-icons/ququ-01-jiaojiao-shush.webp" },
  { name: "铃铛", icon: "/brand-icons/ququ-05-lingdang-giggle.webp" },
  { name: "猪小弟", icon: "/brand-icons/ququ-04-zhuxiaodi-kiss.webp" }
] as const;

type BetaAboutIdentityProps = {
  language: AppLanguage;
};

export function BetaAboutIdentity({ language }: BetaAboutIdentityProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlitchBadgeEngine | null>(null);
  const switchTimerRef = useRef<number[]>([]);
  const [identityIndex, setIdentityIndex] = useState(0);
  const identity = identities[identityIndex];
  const ariaLabel = {
    "zh-CN": `当前图标是${identity.name}，点击切换角色图标`,
    "zh-TW": `目前圖示是${identity.name}，點擊切換角色圖示`,
    en: `Current icon: ${identity.name}. Activate to switch character.`,
    ja: `現在のアイコンは${identity.name}です。押すとキャラクターが切り替わります。`
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
    const engine = new GlitchBadgeEngine(base, layers, null, reducedMotion);
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
    engineRef.current?.setOptions(ACTIVE_GLITCH);
    switchTimerRef.current.push(window.setTimeout(() => {
      setIdentityIndex(nextIndex);
    }, 82));
    switchTimerRef.current.push(window.setTimeout(() => {
      engineRef.current?.setOptions(IDLE_GLITCH);
    }, 390));
  }

  return (
    <div ref={hostRef} className="beta-about-icon-identity">
      <button
        className="beta-about-icon-button"
        type="button"
        aria-label={ariaLabel}
        data-uisfx="reaction"
        onClick={switchIdentity}
      >
        <span data-glitch-magnet className="beta-about-icon-magnet" aria-hidden="true">
          <span className="beta-about-icon-stack">
            <span data-glitch-base className="beta-about-icon-copy beta-about-icon-base">
              <img src={publicAsset(identity.icon)} alt="" width="112" height="112" decoding="async" />
            </span>
            {Array.from({ length: GLITCH_LAYERS }, (_, index) => (
              <span
                key={index}
                data-glitch-layer
                className="beta-about-icon-copy beta-about-icon-layer"
                style={{ opacity: 0 }}
              >
                <img src={publicAsset(identity.icon)} alt="" width="112" height="112" decoding="async" />
              </span>
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}
