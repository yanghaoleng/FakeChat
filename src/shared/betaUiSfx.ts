import { createUISFX, cueNames, type CueName, type UISFXPlayer } from "uisfx";

const preferenceKey = "ququ:beta-ui-sfx";
const commonCues: CueName[] = [
  "press", "select", "toggle-on", "toggle-off", "open", "close", "back",
  "copy", "delete", "send", "play", "retry", "reaction", "success"
];
const cueSet = new Set<string>(cueNames);

let sharedPlayer: UISFXPlayer | null = null;

function getPlayer() {
  if (!sharedPlayer) {
    sharedPlayer = createUISFX({
      pack: "cinematic",
      volume: 0.38,
      maxVoices: 5,
      cooldownMs: 36,
      preferences: { key: preferenceKey }
    });
  }
  return sharedPlayer;
}

function explicitCue(control: Element) {
  const value = control.closest<HTMLElement>("[data-uisfx]")?.dataset.uisfx;
  return value && cueSet.has(value) ? value as CueName : null;
}

function semanticCue(control: HTMLElement): CueName {
  const text = [
    control.getAttribute("aria-label"),
    control.getAttribute("title"),
    control.textContent,
    control.className
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();

  if (/删除|移除|清空|delete|remove/.test(text)) return "delete";
  if (/复制|copy/.test(text)) return "copy";
  if (/发送|生成|提交|send|generate|submit/.test(text)) return "send";
  if (/重试|再来|retry|refresh/.test(text)) return "retry";
  if (/播放|预览|play|preview/.test(text)) return "play";
  if (/返回|后退|back|arrowleft/.test(text)) return "back";
  if (/关闭|取消|close|cancel|backdrop/.test(text)) return "close";
  if (/保存|导出|下载|save|export|download/.test(text)) return "success";
  if (control instanceof HTMLAnchorElement) return "forward";
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) return "focus";
  if (control.getAttribute("aria-haspopup")) {
    return control.getAttribute("aria-expanded") === "true" ? "open" : "close";
  }
  if (control.hasAttribute("aria-checked") || control.hasAttribute("aria-pressed")) return "select";
  return "press";
}

function interactiveControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>([
    "button",
    "a[href]",
    "summary",
    "input",
    "select",
    "textarea",
    "[role='button']",
    "[role='menuitem']",
    "[role='menuitemradio']",
    "[role='tab']",
    "[class*='backdrop']",
    "[data-uisfx]"
  ].join(","));
}

export type BetaUiSfxController = {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean, announce?: boolean) => void;
  play: (cue: CueName) => void;
  dispose: () => void;
};

export function installBetaUiSfx(onEnabledChange?: (enabled: boolean) => void): BetaUiSfxController {
  const player = getPlayer();
  let disposed = false;
  let preloadStarted = false;

  const unlock = () => {
    if (disposed || !player.isEnabled()) return;
    void player.unlock().then((unlocked) => {
      if (!unlocked || preloadStarted || disposed) return;
      preloadStarted = true;
      void player.preload(commonCues);
    });
  };
  const handleTrustedInteraction = () => unlock();
  const handleClick = (event: MouseEvent) => {
    const control = interactiveControl(event.target);
    if (!control || control.matches(":disabled, [aria-disabled='true']") || control.closest("[data-uisfx-silent='true']")) return;
    const cue = explicitCue(control) ?? semanticCue(control);
    player.play(cue);
  };

  document.addEventListener("pointerdown", handleTrustedInteraction, true);
  document.addEventListener("keydown", handleTrustedInteraction, true);
  document.addEventListener("click", handleClick);
  onEnabledChange?.(player.isEnabled());

  return {
    isEnabled: () => player.isEnabled(),
    setEnabled(enabled, announce = true) {
      if (enabled === player.isEnabled()) return;
      if (!enabled && announce) player.play("toggle-off");
      player.setEnabled(enabled);
      if (enabled) {
        unlock();
        if (announce) player.play("toggle-on");
      }
      onEnabledChange?.(enabled);
    },
    play(cue) {
      unlock();
      player.play(cue);
    },
    dispose() {
      disposed = true;
      document.removeEventListener("pointerdown", handleTrustedInteraction, true);
      document.removeEventListener("keydown", handleTrustedInteraction, true);
      document.removeEventListener("click", handleClick);
    }
  };
}
