const LOOKALIKE: Record<string, string> = {
  a: "eo", b: "hd", c: "eo", d: "bh", e: "ca", f: "tr", g: "qy",
  h: "bn", i: "lj", j: "il", k: "hx", l: "il", m: "nw", n: "mh",
  o: "ce", p: "qb", q: "pg", r: "nf", s: "z5", t: "fl", u: "vn",
  v: "uy", w: "vm", x: "kz", y: "vg", z: "sx"
};

type GlitchOptions = {
  duration: number;
  sliceCount: number;
  velocity: number;
  minHeight: number;
  maxHeight: number;
  maxOffset: number;
  shakeAmplitude: number;
  spanStart: number;
  spanEnd: number;
  peakAt: number;
  rogueMultiplier: number;
  cornerJitter: number;
  driftPx: number;
  scrambleRate: number;
  scrambleInterval: number;
};

export const IDLE_GLITCH: GlitchOptions = {
  duration: 1800,
  sliceCount: 7,
  velocity: 15,
  minHeight: 0.02,
  maxHeight: 0.18,
  maxOffset: 20,
  shakeAmplitude: 0.13,
  spanStart: 0.5,
  spanEnd: 0.84,
  peakAt: 0.3,
  rogueMultiplier: 3,
  cornerJitter: 4,
  driftPx: 0.5,
  scrambleRate: 0.06,
  scrambleInterval: 50
};

export const ACTIVE_GLITCH: GlitchOptions = {
  duration: 340,
  sliceCount: 10,
  velocity: 18,
  minHeight: 0.02,
  maxHeight: 0.2,
  maxOffset: 38,
  shakeAmplitude: 0.26,
  spanStart: 0.22,
  spanEnd: 0.9,
  peakAt: 0.3,
  rogueMultiplier: 3.5,
  cornerJitter: 6,
  driftPx: 0.5,
  scrambleRate: 0.14,
  scrambleInterval: 45
};

const REST_SHADOW = [
  "inset 0 1px 0 -0.5px rgba(255,255,255,0.42)",
  "inset 0 -1px 0 -0.5px rgba(10,22,70,0.34)",
  "inset 0 0 0 1px rgba(8,30,90,0.12)",
  "0 1px 2px rgba(9,26,68,0.2)",
  "0 5px 13px -5px rgba(9,26,68,0.34)"
].join(", ");

const DROP_EVERY = 8;
const DROP_JITTER = 5;
const SHADOW_LAG = 7;
const OVERSHOOT_SPAN = 0.14;
const OVERSHOOT_PEAK = 0.22;

function envelope(options: GlitchOptions, progress: number) {
  if (progress < options.spanStart) return 0;
  const span = options.spanEnd - options.spanStart;
  if (progress > options.spanEnd) {
    const tail = (progress - options.spanEnd) / (span * OVERSHOOT_SPAN);
    return tail < 1 ? -OVERSHOOT_PEAK * (1 - tail) : 0;
  }
  const peak = options.spanStart + span * options.peakAt;
  return progress < peak
    ? (progress - options.spanStart) / (peak - options.spanStart)
    : (options.spanEnd - progress) / (options.spanEnd - peak);
}

function jolt(options: GlitchOptions, progress: number) {
  return (Math.random() - 0.5) * 2 * envelope(options, progress);
}

function band(options: GlitchOptions) {
  const heightRatio = Math.random();
  const height = options.minHeight + heightRatio * (options.maxHeight - options.minHeight);
  const y = Math.random() * (1 - height);
  const top = (y * 100).toFixed(2);
  const bottom = ((y + height) * 100).toFixed(2);
  return {
    path: `polygon(0% ${top}%, 100% ${top}%, 100% ${bottom}%, 0% ${bottom}%)`,
    heightRatio
  };
}

function stepCount(options: GlitchOptions) {
  return Math.max(1, Math.floor((options.velocity * options.duration) / 1000) + 1);
}

function sliceFrames(options: GlitchOptions, index: number, rogue: number): Keyframe[] {
  const steps = stepCount(options);
  const threshold = ((index + 1) / (options.sliceCount + 1)) * 0.9;
  const push = index === rogue ? options.maxOffset * options.rogueMultiplier : options.maxOffset;
  const frames: Keyframe[] = [];

  for (let frame = 0; frame < steps; frame += 1) {
    const progress = frame / steps;
    const intensity = envelope(options, progress);
    if (Math.abs(intensity) < threshold) {
      const microGlitch = index === 0 && Math.random() < 0.035;
      if (!microGlitch) {
        frames.push({ opacity: "0", transform: "none", clipPath: "unset" });
        continue;
      }
      const microBand = band(options);
      frames.push({
        opacity: "1",
        transform: `translate3d(${((Math.random() - 0.5) * options.maxOffset * 0.3).toFixed(2)}%,0,0)`,
        clipPath: microBand.path
      });
      continue;
    }

    const activeBand = band(options);
    const physicalScale = 0.35 + activeBand.heightRatio * 0.65;
    frames.push({
      opacity: "1",
      transform: `translate3d(${(jolt(options, progress) * push * physicalScale).toFixed(2)}%,0,0)`,
      clipPath: activeBand.path
    });
  }
  return frames;
}

function dropFrames(options: GlitchOptions): Keyframe[] {
  const steps = stepCount(options);
  const peakStep = Math.round(steps * (options.spanStart + (options.spanEnd - options.spanStart) * options.peakAt));
  return Array.from({ length: steps }, (_, index) => ({ opacity: index === peakStep ? "0" : "1" }));
}

function badgeFrames(options: GlitchOptions, radius: number): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let frame = 0; frame < stepCount(options); frame += 1) {
    const progress = frame / stepCount(options);
    const intensity = envelope(options, progress);
    if (intensity === 0) {
      frames.push({ borderRadius: `${radius}px`, boxShadow: REST_SHADOW });
      continue;
    }
    const nextRadius = Math.max(0, radius + jolt(options, progress) * options.cornerJitter);
    const lag = (-jolt(options, progress) * SHADOW_LAG).toFixed(1);
    frames.push({
      borderRadius: `${nextRadius.toFixed(2)}px`,
      boxShadow: [
        "inset 0 1px 0 -0.5px rgba(255,255,255,0.42)",
        "inset 0 -1px 0 -0.5px rgba(10,22,70,0.34)",
        "inset 0 0 0 1px rgba(8,30,90,0.12)",
        `${lag}px 1px 2px rgba(9,26,68,0.2)`,
        `${lag}px 5px 13px -5px rgba(9,26,68,0.34)`
      ].join(", ")
    });
  }
  return frames;
}

function shakeFrames(options: GlitchOptions): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let frame = 0; frame < stepCount(options); frame += 1) {
    const progress = frame / stepCount(options);
    const x = jolt(options, progress) * options.shakeAmplitude * 100;
    const y = jolt(options, progress) * options.shakeAmplitude * 100;
    frames.push({ transform: `translate3d(${x.toFixed(2)}%,${y.toFixed(2)}%,0)` });
  }
  return frames;
}

function scrambledWord(word: string, rate: number) {
  return Array.from(word).map((character) => {
    const variants = LOOKALIKE[character.toLowerCase()];
    if (!variants || Math.random() >= rate) return character;
    return variants[Math.floor(Math.random() * variants.length)] ?? character;
  }).join("");
}

export class GlitchBadgeEngine {
  private base: HTMLElement;
  private layers: HTMLElement[];
  private unit: HTMLElement | null;
  private badge: HTMLElement | null;
  private badgeRadius = 10;
  private word: string | null;
  private options: GlitchOptions = IDLE_GLITCH;
  private animations: Animation[] = [];
  private drift: Animation | null = null;
  private scrambleTimer: number | null = null;
  private scrambleTick = 0;
  private cycleStart = 0;
  private sinceDrop = 0;
  private running = false;
  private reducedMotion: boolean;

  constructor(base: HTMLElement, layers: HTMLElement[], word: string | null, reducedMotion = false) {
    this.base = base;
    this.layers = layers;
    this.word = word;
    this.reducedMotion = reducedMotion;
    this.unit = base.closest<HTMLElement>("[data-glitch-magnet]");
    this.badge = base.querySelector<HTMLElement>("[data-glitch-badge]");
    if (this.badge) {
      const radius = Number.parseFloat(getComputedStyle(this.badge).borderTopLeftRadius);
      if (!Number.isNaN(radius)) this.badgeRadius = radius;
    }
    if (word !== null) this.setText(word);
  }

  setWord(word: string | null) {
    this.word = word;
    if (word !== null) this.setText(word);
  }

  setOptions(options: GlitchOptions) {
    this.options = options;
    if (!this.running) return;
    this.cancelAnimations();
    this.runCycle();
    if (this.word !== null) this.startScramble();
  }

  start() {
    if (this.running || this.reducedMotion) return;
    this.running = true;
    this.runCycle();
    if (this.word !== null) this.startScramble();
    this.startDrift();
  }

  stop() {
    this.running = false;
    this.cancelAnimations();
    this.stopScramble();
    this.stopDrift();
  }

  destroy() {
    this.stop();
  }

  private runCycle() {
    const options = this.options;
    const steps = stepCount(options);
    const timing: KeyframeAnimationOptions = {
      duration: options.duration,
      iterations: 1,
      easing: `steps(${steps}, jump-start)`,
      fill: "none"
    };
    const rogue = Math.floor(Math.random() * options.sliceCount);
    const nextAnimations: Animation[] = [
      this.base.animate(shakeFrames(options), timing),
      ...this.layers.slice(0, options.sliceCount).map((layer, index) => (
        layer.animate(sliceFrames(options, index, rogue), timing)
      ))
    ];

    if (this.unit && ++this.sinceDrop >= DROP_EVERY + Math.floor(Math.random() * DROP_JITTER)) {
      this.sinceDrop = 0;
      nextAnimations.push(this.unit.animate(dropFrames(options), timing));
    }
    if (this.badge) {
      nextAnimations.push(this.badge.animate(badgeFrames(options, this.badgeRadius), {
        duration: options.duration,
        iterations: 1,
        easing: "ease-in-out",
        fill: "none"
      }));
    }

    this.animations = nextAnimations;
    this.cycleStart = performance.now();
    this.animations[0]?.finished.then(() => {
      if (this.running) this.runCycle();
    }).catch(() => undefined);
  }

  private startDrift() {
    if (this.drift || this.reducedMotion) return;
    const amount = this.options.driftPx;
    this.drift = this.base.animate([
      { transform: "translate3d(0,0,0)" },
      { transform: `translate3d(${amount}px,${-amount * 0.6}px,0)` },
      { transform: `translate3d(${-amount * 0.8}px,${amount}px,0)` },
      { transform: `translate3d(${amount * 0.5}px,${amount * 0.7}px,0)` },
      { transform: "translate3d(0,0,0)" }
    ], {
      duration: 9400,
      iterations: Infinity,
      easing: "ease-in-out",
      composite: "add"
    });
  }

  private stopDrift() {
    this.drift?.cancel();
    this.drift = null;
  }

  private startScramble() {
    if (this.word === null) return;
    this.stopScramble();
    this.cycleStart = performance.now();
    const tick = () => {
      const word = this.word;
      if (word === null) return;
      const options = this.options;
      const phase = ((performance.now() - this.cycleStart) % options.duration) / options.duration;
      if (envelope(options, phase) === 0 || ++this.scrambleTick % 2 !== 0) {
        this.setText(word);
        return;
      }
      this.setText(scrambledWord(word, options.scrambleRate));
    };
    tick();
    this.scrambleTimer = window.setInterval(tick, this.options.scrambleInterval);
  }

  private stopScramble() {
    if (this.scrambleTimer !== null) window.clearInterval(this.scrambleTimer);
    this.scrambleTimer = null;
    if (this.word !== null) this.setText(this.word);
  }

  private setText(value: string) {
    const baseSlot = this.base.querySelector<HTMLElement>("[data-glitch-text]") ?? this.base;
    baseSlot.textContent = value;
    this.layers.forEach((layer) => {
      const slot = layer.querySelector<HTMLElement>("[data-glitch-text]") ?? layer;
      slot.textContent = value;
    });
  }

  private cancelAnimations() {
    this.animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Safari can throw while cancelling an animation that already detached.
      }
    });
    this.animations = [];
    this.layers.forEach((layer) => {
      layer.style.opacity = "0";
      layer.style.transform = "none";
      layer.style.clipPath = "none";
      layer.style.removeProperty("color");
      layer.style.removeProperty("filter");
    });
    this.base.style.transform = "none";
    this.unit?.style.removeProperty("opacity");
  }
}
