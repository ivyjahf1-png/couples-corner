"use client";

/**
 * whot/sensory.ts — the Touch + Sound dimensions of the 4D experience.
 *
 * Audio cues are synthesised with the Web Audio API (no asset downloads):
 *   draw   — band-passed noise whoosh + paper click
 *   slap   — heavy low thud + bright paper crack (card hits the table)
 *   call   — crown fanfare arpeggio for WHOT declarations
 *   tick   — 15 ms click for the last seconds of the turn clock
 *   win    — rising victory fanfare with a chord pad
 *   select / error — soft tap & buzz
 *
 * Haptics wrap navigator.vibrate with graceful no-ops on unsupported
 * devices. A global mute flag gates every channel (header 🔊 toggle).
 */

let audioCtx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

export function setWhotMuted(next: boolean): void { muted = next; }
export function isWhotMuted(): boolean { return muted; }

/** Match constants for the 4-player table. */
export const ENTRY = 100;
export const POT = ENTRY * 4;
export const TURN_SECONDS = 20;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || muted) return null;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Shared white-noise buffer for paper/whoosh layers. */
function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  peak: number,
  sweepTo?: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (sweepTo !== undefined) osc.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function noiseBurst(ctx: AudioContext, at: number, dur: number, peak: number, freq: number, q = 1.2): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, at);
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(at);
  src.stop(at + dur + 0.02);
}

/** Card sliding off the hand / market — airy whoosh + paper click. */
export function whotDraw(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    noiseBurst(ctx, t, 0.16, 0.10, 1900, 0.8);
    noiseBurst(ctx, t + 0.10, 0.05, 0.16, 3400, 2.4);
    tone(ctx, "triangle", 320, t + 0.09, 0.05, 0.05, 220);
  } catch { /* ignore */ }
}

/** Heavy slap of a card landing on the felt. */
export function whotSlap(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "sine", 140, t, 0.10, 0.34, 62);
    noiseBurst(ctx, t, 0.05, 0.30, 2600, 1.6);
    noiseBurst(ctx, t + 0.02, 0.12, 0.09, 900, 0.7);
  } catch { /* ignore */ }
}

/** Crown fanfare for WHOT declarations. */
export function whotCall(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      tone(ctx, "triangle", f, t + i * 0.07, 0.22, 0.16);
      tone(ctx, "sine", f * 2, t + i * 0.07, 0.16, 0.05);
    });
    noiseBurst(ctx, t + 0.26, 0.30, 0.05, 6200, 0.6);
  } catch { /* ignore */ }
}

/** Hold On chirp. */
export function whotHold(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "triangle", 880, t, 0.09, 0.14, 1174);
    tone(ctx, "triangle", 1174, t + 0.09, 0.12, 0.14, 1568);
  } catch { /* ignore */ }
}

/** Pick alarm. */
export function whotPick(count = 2): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const steps = Math.min(Math.max(count, 2), 8);
    for (let i = 0; i < steps; i++) { tone(ctx, "sawtooth", 300 + i * 90, t + i * 0.07, 0.09, 0.10); }
  } catch { /* ignore */ }
}

/** Skip zap. */
export function whotSkip(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "square", 740, t, 0.10, 0.12, 180);
  } catch { /* ignore */ }
}

/** Market wave. */
export function whotMarket(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    [392, 494, 587, 784].forEach((f, i) => { tone(ctx, "sine", f, t + i * 0.08, 0.20, 0.12); });
  } catch { /* ignore */ }
}

/** Declare chirp. */
export function whotDeclare(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "triangle", 659.25, t, 0.10, 0.15);
    tone(ctx, "triangle", 987.77, t + 0.09, 0.18, 0.16);
  } catch { /* ignore */ }
}

/** Turn-clock tick — sharp, quiet, urgent in the last seconds. */
export function whotTick(urgent = false): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "square", urgent ? 1180 : 880, t, 0.03, urgent ? 0.09 : 0.05);
  } catch { /* ignore */ }
}

/** Victory fanfare — rising lead + warm chord pad. */
export function whotWin(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const lead = [523.25, 587.33, 659.25, 783.99, 1046.5];
    lead.forEach((f, i) => tone(ctx, "triangle", f, t + i * 0.13, 0.30, 0.17));
    [261.63, 329.63, 392.0].forEach((f) => tone(ctx, "sine", f, t + 0.68, 0.9, 0.09));
    noiseBurst(ctx, t + 0.66, 0.5, 0.04, 5200, 0.5);
  } catch { /* ignore */ }
}

/** Soft tap when a card is selected in hand. */
export function whotSelect(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    tone(ctx, "triangle", 540, ctx.currentTime, 0.05, 0.10, 430);
  } catch { /* ignore */ }
}

/** Buzzer for illegal plays / missed declarations. */
export function whotError(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, "square", 160, t, 0.16, 0.10, 110);
  } catch { /* ignore */ }
}

/** Round-over sting that hands off to the win fanfare. */
export function whotWinSting(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    noiseBurst(ctx, t, 0.4, 0.06, 4800, 0.5);
    tone(ctx, "sine", 1046.5, t + 0.05, 0.4, 0.12);
  } catch { /* ignore */ }
}

/*HAPTICS*/

/* ── Touch dimension: navigator.vibrate with graceful no-ops ─────────── */

export type HapticKind =
  | "tap"        // button presses, card select
  | "select"     // card lifted from hand
  | "slap"       // heavy card lands on the table
  | "hold"       // Hold On extra turn
  | "pick"       // Pick Two/Three rattle
  | "skip"       // Skip buzz
  | "market"     // General Market wave
  | "call"       // WHOT crown declaration
  | "declare"    // WHOT called at one card
  | "error"      // illegal play buzz
  | "win";       // victory celebration

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  select: 8,
  slap: [18, 30, 12],
  hold: [24, 40, 24],
  pick: [20, 40, 20, 40, 34],
  skip: [46],
  market: [16, 30, 16, 30, 16, 30, 40],
  call: [30, 50, 90],
  declare: [26, 40, 60],
  error: [40, 60, 40],
  win: [60, 90, 140, 90, 200],
};

/** Pick-penalty rattle that grows with the pile. */
export function pickHaptic(count: number): number[] {
  const reps = Math.min(Math.max(Math.ceil(count / 2), 2), 5);
  const out: number[] = [];
  for (let i = 0; i < reps; i++) { out.push(18 + i * 4, 36); }
  out.push(34);
  return out;
}

/** Fire a haptic pulse — silently ignored where unsupported. */
export function haptic(kind: HapticKind, pattern?: number | number[]): void {
  if (typeof window === "undefined") return;
  try {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === "function") nav.vibrate(pattern ?? HAPTIC_PATTERNS[kind]);
  } catch { /* ignore */ }
}

/** One-timer parlay: haptic + matching sound in a single call. */
export function sensoryBurst(kind: HapticKind, sound?: () => void): void {
  haptic(kind);
  if (sound) sound();
}
