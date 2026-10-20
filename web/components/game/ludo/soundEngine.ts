"use client";

/**
 * soundEngine — the Ludo commentator.
 *
 * Every effect is SYNTHESISED in-browser with the Web Audio API (AudioContext +
 * oscillators / filtered noise), and every line of commentary is spoken with the
 * Web Speech API (speechSynthesis). There are NO external audio files to fetch or
 * preload, so it loads instantly, works offline and never touches the network.
 *
 * Both channels (SFX + voice) share a single mute flag, and the AudioContext is
 * created lazily on the first play so mobile autoplay policies are respected.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private isMuted = false;

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /** Lazily create (and resume) the shared AudioContext; null when muted/absent. */
  private getCtx(): AudioContext | null {
    if (typeof window === "undefined" || this.isMuted) return null;
    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      if (!this.ctx) this.ctx = new Ctor();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Shared white-noise buffer (built once) for clatter / whoosh effects. */
  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const len = Math.max(1, Math.ceil(ctx.sampleRate * 0.7));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    return this.noise;
  }

  /** Enveloped oscillator tone; frequency glides f0 -> f1 over `dur` seconds. */
  private tone(
    ctx: AudioContext,
    type: OscillatorType,
    f0: number,
    f1: number,
    at: number,
    dur: number,
    peak: number,
  ): void {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** Short band-passed noise burst (clap / clatter / dice impact layer). */
  private noiseBurst(
    ctx: AudioContext,
    at: number,
    dur: number,
    freq: number,
    q: number,
    peak: number,
    sweepTo?: number,
  ): void {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(Math.max(40, freq), t);
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + dur);
    bp.Q.setValueAtTime(Math.max(0.0001, q), t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  /** Synthesised sound effect for a reaction / milestone key. */
  public playSFX(key: string): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      switch (key) {
        case "laugh": {
          // Four quick descending "ha-ha-ha-ha" blips.
          [460, 415, 380, 330].forEach((f, i) => this.tone(ctx, "sine", f * 1.15, f, i * 0.09, 0.12, 0.16));
          break;
        }
        case "cry": {
          // A falling, wavering wail.
          this.tone(ctx, "sine", 560, 200, 0, 0.5, 0.15);
          this.tone(ctx, "triangle", 430, 170, 0.05, 0.46, 0.08);
          break;
        }
        case "applause": {
          // Staggered band-passed claps.
          for (let i = 0; i < 9; i += 1) {
            this.noiseBurst(ctx, i * 0.05 + Math.random() * 0.03, 0.06, 1300 + Math.random() * 1700, 1.6, 0.14);
          }
          break;
        }
        case "fire": {
          // Rising whoosh: noise sweep up + a bright rising saw.
          this.noiseBurst(ctx, 0, 0.5, 500, 0.9, 0.16, 3200);
          this.tone(ctx, "sawtooth", 180, 720, 0, 0.45, 0.1);
          break;
        }
        case "six_roll": {
          // Wooden knock + a bright ascending arpeggio.
          this.noiseBurst(ctx, 0, 0.12, 900, 1.2, 0.22);
          [523.25, 659.25, 783.99].forEach((f, i) => this.tone(ctx, "triangle", f, f, 0.05 + i * 0.07, 0.2, 0.14));
          break;
        }
        case "knockout": {
          // Descending impact + low boom.
          this.tone(ctx, "sawtooth", 520, 90, 0, 0.3, 0.16);
          this.tone(ctx, "sine", 170, 50, 0.18, 0.34, 0.2);
          break;
        }
        case "home": {
          // Short ascending fanfare.
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(ctx, "triangle", f, f, i * 0.08, 0.3, 0.13));
          break;
        }
        default: {
          this.tone(ctx, "sine", 660, 660, 0, 0.15, 0.12);
        }
      }
    } catch {
      /* ignore synthesis errors on unsupported params */
    }
  }

  /** Live voice commentary via the Web Speech API. */
  public speakCommentary(text: string): void {
    if (this.isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.1;
      u.pitch = 1.0;
      u.volume = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => v.lang.startsWith("en"));
      if (en) u.voice = en;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  /** Plays synthesised FX + speaks a reaction for the tapped emoji. */
  public playEmojiAudio(emoji: string): void {
    switch (emoji) {
      case "\u{1F602}":
        this.playSFX("laugh");
        this.speakCommentary("Hilarious!");
        break;
      case "\u{1F62D}":
        this.playSFX("cry");
        this.speakCommentary("Oh, what a pity!");
        break;
      case "\u{1F44F}":
        this.playSFX("applause");
        this.speakCommentary("Sensational move!");
        break;
      case "\u{1F60D}":
        this.playSFX("applause");
        this.speakCommentary("Absolutely lovely!");
        break;
      case "\u{1F340}":
        this.playSFX("home");
        this.speakCommentary("Good luck!");
        break;
      case "\u{1F525}":
        this.playSFX("fire");
        this.speakCommentary("Pure fire!");
        break;
      case "\u{1F621}":
        this.playSFX("fire");
        this.speakCommentary("So furious!");
        break;
      case "\u{1F44D}":
        this.playSFX("applause");
        this.speakCommentary("Great job!");
        break;
      default:
        this.playSFX("applause");
        this.speakCommentary("Nice!");
        break;
    }
  }

  /** Commentator trigger for a dice roll (a 6 gets the big call). */
  public announceDiceRoll(val: number): void {
    if (val === 6) {
      this.playSFX("six_roll");
      this.speakCommentary("Boom! A massive Six! Roll again!");
    }
  }

  /** Commentator trigger for capturing an opponent's pawn. */
  public announceCapture(): void {
    this.playSFX("knockout");
    this.speakCommentary("Brutal Knockout! Back to base!");
  }

  /** Commentator trigger for bringing a pawn home. */
  public announceHome(): void {
    this.playSFX("home");
    this.speakCommentary("Touchdown into the center!");
  }
}

export const soundEngine = new SoundEngine();