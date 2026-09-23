"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const WORDS = ["LOVE", "HEART", "COUPLE", "KISS", "DATE", "SWEET", "CHARM", "ADORE", "BLOOM", "HONEY"];
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export function WordGame({ onGameOver }: { muted: boolean; onGameOver: (won: boolean) => void }) {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState<boolean | null>(null);
  const reportedRef = useRef(false);
  const MAX_WRONG = 6;
  const masked = word.split("").map((c) => (guessed.has(c) ? c : "_")).join(" ");
  const guess = useCallback((letter: string) => {
    if (done !== null || guessed.has(letter)) return;
    const next = new Set(guessed); next.add(letter); setGuessed(next);
    if (!word.includes(letter)) setWrong((w) => w + 1);
  }, [done, guessed, word]);
  useEffect(() => {
    const wonGame = word.split("").every((c) => guessed.has(c));
    const lostGame = wrong >= MAX_WRONG;
    if ((wonGame || lostGame) && done === null) {
      setDone(wonGame);
      if (!reportedRef.current) { reportedRef.current = true; window.setTimeout(() => onGameOver(wonGame), 900); }
    }
  }, [guessed, wrong, word, done, onGameOver]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) guess(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess]);
  const restart = useCallback(() => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuessed(new Set()); setWrong(0); setDone(null); reportedRef.current = false;
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold" aria-live="polite">Wrong {wrong}/{MAX_WRONG}</span>
        <button type="button" onClick={restart} className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold hover:border-orange-400/60">Restart</button>
      </div>
      {done !== null ? (<p role="status" className="text-lg font-bold">{done ? `You guessed ${word}!` : `It was ${word}.`}</p>) : null}
      <p className="text-3xl font-extrabold tracking-[0.3em] sm:text-4xl" aria-label={`Word: ${masked}`}>{masked}</p>
      <div className="grid w-full max-w-xl grid-cols-6 gap-1.5 sm:grid-cols-9" role="group" aria-label="Letters">
        {ALPHA.map((l) => {
          const used = guessed.has(l);
          const good = used && word.includes(l);
          return (
            <button key={l} type="button" onClick={() => guess(l)} disabled={used || done !== null} aria-label={`Guess ${l}`}
              className={`flex min-h-[44px] touch-manipulation items-center justify-center rounded-lg border text-sm font-bold active:scale-95 ${used ? (good ? "border-emerald-400/60 bg-emerald-500/20" : "border-red-400/40 bg-red-500/10 opacity-60") : "border-white/10 bg-white/5 hover:border-orange-400/50"}`}>{l}</button>
          );
        })}
      </div>
      <p className="text-xs text-white/50">Tap letters or type on your keyboard. 6 wrong guesses and it is over.</p>
    </div>
  );
}
