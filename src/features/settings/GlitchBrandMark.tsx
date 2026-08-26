import { useEffect, useRef } from "react";
import type { AppLanguage } from "../../shared/i18n";
import { ACTIVE_GLITCH, GlitchBadgeEngine } from "./glitchBadgeEngine";

const GLITCH_LAYERS = 10;

type GlitchBrandMarkProps = {
  brandIconSrc: string;
  brandName: string;
  language: AppLanguage;
  onCycle: () => void;
};

export function GlitchBrandMark({ brandIconSrc, brandName, language, onCycle }: GlitchBrandMarkProps) {
  const hostRef = useRef<HTMLHeadingElement>(null);
  const engineRef = useRef<GlitchBadgeEngine | null>(null);
  const switchTimerRef = useRef<number[]>([]);
  const ariaLabel = {
    "zh-CN": brandName + "，点击切换品牌图标",
    "zh-TW": brandName + "，點擊切換品牌圖示",
    en: brandName + ". Activate to switch the brand icon.",
    ja: brandName + "。押すとブランドアイコンが切り替わります。"
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
    const handleVisibility = () => {
      if (document.hidden) engine.stop();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const activate = () => engine.trigger(ACTIVE_GLITCH);
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer && !reducedMotion) {
      host.addEventListener("pointerenter", activate);
    }

    return () => {
      clearSwitchTimers();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (finePointer && !reducedMotion) {
        host.removeEventListener("pointerenter", activate);
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  function switchBrandIcon() {
    clearSwitchTimers();
    engineRef.current?.trigger(ACTIVE_GLITCH);
    switchTimerRef.current.push(window.setTimeout(onCycle, 82));
  }

  const brandUnit = () => (
    <>
      <img className="beta-menu-brand-icon" src={brandIconSrc} alt="" aria-hidden="true" />
      <span className="beta-menu-brand-text">{brandName}</span>
    </>
  );

  return (
    <h1 ref={hostRef} className="beta-menu-brand beta-menu-brand-glitch">
      <button
        className="beta-menu-brand-button"
        type="button"
        aria-label={ariaLabel}
        data-uisfx="reaction"
        onClick={switchBrandIcon}
      >
        <span data-glitch-magnet className="beta-menu-brand-magnet">
          <span className="beta-menu-brand-stack">
            <span data-glitch-base className="beta-menu-brand-copy beta-menu-brand-base">
              {brandUnit()}
            </span>
            {Array.from({ length: GLITCH_LAYERS }, (_, index) => (
              <span
                key={index}
                data-glitch-layer
                className="beta-menu-brand-copy beta-menu-brand-layer"
                style={{ opacity: 0 }}
                aria-hidden="true"
              >
                {brandUnit()}
              </span>
            ))}
          </span>
        </span>
      </button>
    </h1>
  );
}
