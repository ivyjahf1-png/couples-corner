"use client";

/**
 * ludoAudio — human-voice step counting + pawn-step audio cues.
 *
 * Commercial Ludo narrates each pawn hop with a spoken count ("1", "2", ...).
 * We reproduce that with a layered approach:
 *
 *  1. Optional real voice clips under /games/audio/steps/<n>.mp3 — used when
 *     present (highest fidelity).
 *  2. Fallback to the Web Speech API (SpeechSynthesis) speaking the number,
 *     which gives a natural human-sounding count on all modern devices.
 *  3. A short synthesised "tick" click via WebAudio for every individual step,
 *     so movement feels tactile even if speech is unavailable/muted.
 *
 * Everything is guarded so it no-ops safely during SSR / unsupported browsers.
 */

const VOICE_CLIP_BASE = "/games/audio/steps";
let audioCtx: AudioContext | null = null;
let clipAvailable: boolean | null = null; // unknown until first probe

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** A short, soft "tick" — one per step of a pawn move. */
export function playStepTick(freq = 520): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    /* ignore */
  }
}

/** Play a bundled voice clip if it exists; returns false if unavailable. */
function playClip(n: number): Promise<boolean> {
  if (clipAvailable === false) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const el = new Audio(`${VOICE_CLIP_BASE}/${n}.mp3`);
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      el.addEventListener("loadeddata", () => done(true), { once: true });
      el.addEventListener("error", () => done(false), { once: true });
      // If nothing loads quickly, fall back to TTS.
      window.setTimeout(() => done(false), 1200);
      void el.play().catch(() => done(false));
    } catch {
      resolve(false);
    }
  });
}

function speak(n: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(String(n));
    u.rate = 1.05;
    u.pitch = 1.1;
    u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * Announce a single spoken step number ("1".."6"). Prefers a bundled clip,
 * then falls back to text-to-speech.
 */
export async function speakStep(n: number): Promise<void> {
  const clamped = Math.max(1, Math.min(6, Math.round(n)));
  const ok = await playClip(clamped);
  if (!ok) speak(clamped);
}

/**
 * Narrate a whole pawn move: fires a synthesised tick per step and speaks the
 * numbers in sequence, matching the commercial Ludo count-down feel.
 *
 * @param steps  total number of cells the pawn travels (>=1)
 * @param stepMs duration of one hop in ms (used to pace the counting)
 */
export function narrateMove(steps: number, stepMs = 260): void {
  const total = Math.max(1, Math.min(6, Math.round(steps)));
  // Kick off the ticks immediately for tactile feedback.
  playStepTick(520);
  // Speak each number, spaced by the hop duration.
  for (let i = 1; i <= total; i += 1) {
    window.setTimeout(() => {
      playStepTick(460 + i * 30);
      void speakStep(i);
    }, (i - 1) * stepMs);
  }
  // Record that clips are (un)available after the first probe to avoid retries.
  void playClip(total).then((ok) => {
    clipAvailable = ok;
  });
}

/**
 * Dice roll rattle — a quick cluster of wooden clicks, like shaking a die in
 * a cup before it lands. ~0.6s, matching the dice tumble animation.
 */
export function playDiceRoll(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (let i = 0; i < 9; i += 1) {
      const t = now + i * 0.06 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160 + Math.random() * 420, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  } catch {
    /* ignore */
  }
}

/** Capture: a descending "woosh" as the token is knocked homeward, then a thud. */
export function playCapture(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = "sine";
    o2.frequency.setValueAtTime(140, now + 0.22);
    o2.frequency.exponentialRampToValueAtTime(50, now + 0.42);
    g2.gain.setValueAtTime(0.0001, now + 0.22);
    g2.gain.exponentialRampToValueAtTime(0.2, now + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o2.connect(g2).connect(ctx.destination);
    o2.start(now + 0.22);
    o2.stop(now + 0.52);
  } catch {
    /* ignore */
  }
}

/** Safe-tile entry: a gentle two-note bell chime (E→B). */
export function playSafeChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    ([659.25, 987.77] as const).forEach((f, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Home / victory fanfare — a bright ascending arpeggio. `full` adds extra
 * notes and longer sustain for winning the whole match.
 */
export function playHomeFanfare(full = false): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = full ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const t = now + i * 0.11;
      (["triangle", "sine"] as const).forEach((type) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(type === "sine" ? 0.09 : 0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + (full ? 0.7 : 0.45));
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + (full ? 0.75 : 0.5));
      });
    });
  } catch {
    /* ignore */
  }
}

/** Unlock audio on the first user gesture (required by mobile browsers). */
export function primeAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      // Warm up the synthesiser with a silent utterance.
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}
