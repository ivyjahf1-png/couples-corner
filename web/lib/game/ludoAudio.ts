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
