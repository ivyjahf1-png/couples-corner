"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LudoDice } from "./LudoDice";

/**
 * LudoSplash — a 10-second "4D/5D" opening cinematic shown once before the
 * hub. Two tumbling 3D dice (reusing {@link LudoDice}) float over a dynamic
 * particle-glow field while a WebAudio "tumble" loop rattles in the
 * background. A countdown ring drains over `SECONDS` and the whole thing
 * auto-advances to the hub — or the player can "Tap to skip" at any time.
 *
 * Audio is best-effort: browsers block autoplay until a user gesture, so we
 * try to resume the context and never throw if it stays suspended.
 */
const SECONDS = 10;

/** Lightweight WebAudio dice-tumble: a looping filtered-noise rattle. */
function useTumbleAudio(active: boolean) {
  const ref = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    let ctx: AudioContext;
    try {
      ctx = new AudioCtx();
    } catch {
      return;
    }
    ref.current = ctx;
    void ctx.resume().catch(() => undefined);

    // White-noise buffer (2s) reused by the loop.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900;
    bandpass.Q.value = 0.7;

    // Slow LFO sweeping the filter gives the "tumbling" character.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6.5;
    lfoGain.gain.value = 550;
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.6);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    lfo.start();

    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        source.stop(ctx.currentTime + 0.35);
        lfo.stop(ctx.currentTime + 0.35);
      } catch {
        /* noop */
      }
      ref.current = null;
      window.setTimeout(() => void ctx.close().catch(() => undefined), 400);
    };
  }, [active]);

  useEffect(() => {
    if (ref.current && ref.current.state === "suspended") void ref.current.resume().catch(() => undefined);
  });
}


/** A field of glowing particles drifting upward behind the dice. */
function ParticleGlow() {
  const particles = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 9,
        duration: 6 + Math.random() * 9,
        delay: -Math.random() * 12,
        hue: [45, 190, 265, 320][i % 4]!,
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-[-12%] rounded-full"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, hsla(${p.hue},95%,70%,.95), hsla(${p.hue},95%,60%,0) 70%)`,
              boxShadow: `0 0 ${p.size * 2.4}px hsla(${p.hue},95%,65%,.85)`,
              animation: `ludo-float ${p.duration}s linear ${p.delay}s infinite`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function LudoSplash({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(SECONDS);
  const [muted, setMuted] = useState(false);
  const doneRef = useRef(false);

  useTumbleAudio(!muted);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = left / SECONDS;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          finish();
        }
      }}
      className="relative grid h-full w-full place-items-center overflow-hidden rounded-3xl bg-[#05060f] text-white"
      aria-label="Ludo Superstar intro — tap to skip"
    >
      <ParticleGlow />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(99,102,241,.35), transparent 55%), radial-gradient(circle at 50% 60%, rgba(244,114,182,.22), transparent 60%)",
        }}
        aria-hidden
      />
      <style>{`
        @keyframes ludo-float {
          0% {
            transform: translate3d(0, 0, 0) scale(0.6);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          80% {
            opacity: 0.85;
          }
          100% {
            transform: translate3d(var(--drift), -118vh, 0) scale(1.15);
            opacity: 0;
          }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <div className="flex items-end gap-6">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.1 }}
          >
            <LudoDice value={5} rolling size={84} active />
          </motion.div>
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.25 }}
          >
            <LudoDice value={2} rolling size={84} active />
          </motion.div>
        </div>

        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="text-4xl font-black tracking-tight sm:text-5xl"
            style={{ textShadow: "0 0 28px rgba(129,140,248,.85)" }}
          >
            LUDO SUPERSTAR
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-2 text-sm font-bold uppercase tracking-[0.4em] text-indigo-200/80"
          >
            4D · 5D Sensory Hub
          </motion.p>
        </div>

        <div className="flex items-center gap-3">
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={(1 - progress) * 2 * Math.PI * 22}
              transform="rotate(-90 26 26)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
            <text x="26" y="31" textAnchor="middle" className="fill-white text-[15px] font-black">
              {left}
            </text>
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest text-white/60">Tap to skip</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80"
      >
        {muted ? "Sound off" : "Sound on"}
      </button>
    </div>
  );
}
