"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const QUESTIONS = [
  { q: "Where was your first date?", options: ["Cinema", "Restaurant", "Park", "Beach"], answer: 1 },
  { q: "Perfect date night?", options: ["Movie marathon", "Fancy dinner", "Stargazing", "Game night"], answer: 2 },
  { q: "Who says sorry first?", options: ["Me", "My partner", "Nobody", "Both at once"], answer: 3 },
  { q: "Dream getaway?", options: ["Paris", "Maldives", "Kyoto", "Santorini"], answer: 0 },
  { q: "Best gift?", options: ["Flowers", "Jewelry", "Trip", "Love letter"], answer: 3 },
  { q: "Who cooks better?", options: ["Me", "My partner", "Takeaway wins", "Learning"], answer: 1 },
  { q: "Ideal Sunday?", options: ["Brunch out", "Sleep in", "Long walk", "Gym together"], answer: 2 },
  { q: "Love language?", options: ["Words", "Touch", "Gifts", "Quality time"], answer: 3 },
];
function shuffled<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c;
}
export function TriviaGame({ muted, onGameOver }: { muted: boolean; onGameOver: (won: boolean) => void }) {
  const [rounds, setRounds] = useState(() => shuffled(QUESTIONS).slice(0, 5));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [scores, setScores] = useState({ you: 0, bot: 0 });
  const [done, setDone] = useState<string | null>(null);
  const [secs, setSecs] = useState(15);
  const reportedRef = useRef(false);
  const blip = useCallback((f: number) => {
    if (muted) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.16);
      o.onended = () => void ctx.close();
    } catch { /* best-effort */ }
  }, [muted]);
  const cur = rounds[index];
  const answer = useCallback((choice: number | null) => {
    if (picked !== null || done) return;
    setPicked(choice ?? -1);
    const ok = choice === cur.answer;
    const botOk = Math.random() < 0.55;
    blip(ok ? 760 : 220);
    window.setTimeout(() => {
      const y = scores.you + (ok ? 1 : 0); const b = scores.bot + (botOk ? 1 : 0);
      setScores({ you: y, bot: b });
      if (index + 1 >= rounds.length) {
        const won = y > b; const tied = y === b;
        setDone(tied ? `Draw ${y}-${b}!` : won ? `You win ${y}-${b}!` : `Bot wins ${b}-${y}.`);
        if (!reportedRef.current) { reportedRef.current = true; window.setTimeout(() => onGameOver(won && !tied), 1000); }
      } else { setIndex((i) => i + 1); setPicked(null); setSecs(15); }
    }, 900);
  }, [picked, done, cur, index, rounds.length, scores, onGameOver, blip]);
  useEffect(() => {
    if (picked !== null || done) return;
    if (secs <= 0) { answer(null); return; }
    const id = window.setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secs, picked, done, answer]);
  const restart = useCallback(() => {
    setRounds(shuffled(QUESTIONS).slice(0, 5)); setIndex(0); setPicked(null);
    setScores({ you: 0, bot: 0 }); setDone(null); setSecs(15); reportedRef.current = false;
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">You {scores.you} · Bot {scores.bot}</span>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">Round {Math.min(index + 1, rounds.length)}/{rounds.length} · {secs}s</span>
        <button type="button" onClick={restart} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold hover:border-orange-400/60">Restart</button>
      </div>
      {done ? (<p role="status" className="text-lg font-bold">{done}</p>) : (
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-base font-bold sm:text-lg">{cur.q}</p>
          <div className="mt-4 grid gap-2">
            {cur.options.map((opt, i) => {
              const rev = picked !== null; const isAns = i === cur.answer; const isPick = i === picked;
              return (
                <button key={opt} type="button" onClick={() => answer(i)} disabled={rev}
                  className={`min-h-[48px] touch-manipulation rounded-xl border px-4 py-3 text-left text-sm font-semibold active:scale-[0.98] ${rev && isAns ? "border-emerald-400/60 bg-emerald-500/20" : rev && isPick ? "border-red-400/60 bg-red-500/20" : "border-white/10 bg-slate-950/50 hover:border-orange-400/50"}`}>{opt}</button>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-white/50">Best of 5 — outscore the bot before the 15s timer ends.</p>
    </div>
  );
}
