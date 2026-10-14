"use client";
import { useEffect, useState } from "react";

export type RaceCar = { id: string; name: string; color: string; pos: number };
export type RaceTrack = { id: number; city: string; length: number };

const TRACKS: RaceTrack[] = [
  { id: 0, city: "Tokyo", length: 1000 },
  { id: 1, city: "Paris", length: 1200 },
  { id: 2, city: "Singapore", length: 900 },
  { id: 3, city: "Dubai", length: 1500 },
  { id: 4, city: "Lagos", length: 850 },
];

const GARAGE: RaceCar[] = [
  { id: "gw", name: "G-Wagon", color: "#FFD700", pos: 0 },
  { id: "gle", name: "Benz GLE 65", color: "#38BDF8", pos: 0 },
  { id: "rx", name: "Lexus RX", color: "#22C55E", pos: 0 },
  { id: "bmw", name: "BMW M", color: "#EF4444", pos: 0 },
];

export function RacingEngine() {
  const [cars, setCars] = useState<RaceCar[]>(GARAGE);
  const [track, setTrack] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [lap, setLap] = useState(1);
  const [nitro, setNitro] = useState(false);
  const [dist, setDist] = useState(0);
  const [msg, setMsg] = useState("3...2...1...GO!");

  useEffect(() => {
    const iv = setInterval(() => {
      const boost = nitro ? 14 : 6;
      setSpeed((s) => Math.min(320, s + boost - 2));
      setDist((d) => d + 4 + (nitro ? 8 : 0));
      setCars((prev) =>
        prev.map((c, i) => ({ ...c, pos: (c.pos + 3 + (i === 0 ? 2 : 0) + (nitro && i === 0 ? 6 : 0)) % TRACKS[track].length }))
      );
    }, 120);
    return () => clearInterval(iv);
  }, [nitro, track]);

  function fireNitro() {
    if (nitro) return;
    setNitro(true);
    setMsg("N2O ACTIVATED!");
    setTimeout(() => { setNitro(false); setMsg("Nitro cooling..."); }, 2200);
  }

  const order = [...cars].sort((a, b) => b.pos - a.pos);
  const t = TRACKS[track];

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-slate-950 to-black p-4">
      <div className="mb-3 text-center">
        <h3 className="text-2xl font-black text-cyan-300">APEX RACING</h3>
        <p className="text-xs text-white/60">{t.city} NIGHT CITY</p>
        <p className="mt-1 text-5xl font-black text-white">{Math.round(speed)}<span className="text-sm text-white/60"> KM/H</span></p>
        <p className="text-xs text-white/50">Lap {lap} - {(dist % t.length).toFixed(0)}m / {t.length}m</p>
      </div>
      <div className="relative mb-3 h-36 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="absolute top-0 h-full w-0.5 bg-cyan-300/30" style={{ left: (i / 12) * 100 + "%" }} />
        ))}
        <div className="absolute inset-x-4 bottom-6 h-1 rounded bg-white/20" />
        <div className="absolute inset-x-4 bottom-6 flex justify-between">
          {order.map((c) => (
            <div key={c.id} className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-black" style={{ backgroundColor: c.color }}>
                {order.indexOf(c) + 1}
              </div>
              <span className="mt-1 text-[10px] font-black text-white">{c.name}</span>
            </div>
          ))}
        </div>
        {nitro && <div className="absolute inset-0 bg-cyan-400/10" />}
      </div>
      <div className="mb-3 flex justify-center gap-2">
        {order.map((c, i) => (
          <span key={c.id} className={i === 0 ? "rounded bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-black" : "rounded bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70"}>{i + 1}. {c.name}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={fireNitro} disabled={nitro} className="flex-1 rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50">{nitro ? "N2O BURNING" : "N2O NITRO"}</button>
        <button onClick={() => setLap((l) => l + 1)} className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white">LAP</button>
        <button onClick={() => setTrack((x) => (x + 1) % TRACKS.length)} className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white">TRACK</button>
      </div>
      <p className="mt-2 text-center text-xs text-white/60">{msg}</p>
      <div className="mt-3 rounded-lg bg-black/60 p-2 text-center text-[10px] text-white/50">MINI-MAP: {t.city} loop - Tuning: Engine Lv3 / Turbo Lv2 / Tires Lv2 / Nitro Lv4</div>
    </div>
  );
}
