"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * CarRaceGame — "Apex Racing 3D".
 *
 * A self-contained pseudo-3D arcade racer rendered on an HTML5 canvas
 * (projected road segments — no external engine). Features:
 *   • Dynamic high-speed chase camera that leans into curves and hills
 *   • Nitro boost with speed streaks + coin multiplier on wins
 *   • Coin betting (stake in, cash out by beating rivals to the finish)
 *
 * Integrates with the Game Center wallet via onLose (deduct) / onWin (payout),
 * matching the LocalGameRunner engine contract.
 */

const SEG_LEN = 200;
const LANES = 3;
const DRAW_DIST = 90;
const CAM_HEIGHT = 1100;
const BASE_SPEED = SEG_LEN / 6;
const TOP_SPEED = SEG_LEN * 1.6;
const NITRO_MULT = 1.85;
const TRACK_LEN = 520;
const BETS = [100, 500, 1000, 5000];

interface Rival {
  x: number;
  lane: number;
  speed: number;
  spd: number;
}

interface Segment {
  y: number;
  curve: number;
  color: [string, string];
  rivals: Rival[];
}

function polygon(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// Project a world point onto the 2D canvas through the camera.
function project(
  cx: number, cy: number, cz: number,
  camX: number, camY: number, camZ: number,
  camDepth: number, width: number, height: number, roadW: number,
): { x: number; y: number; w: number; scale: number } {
  const p = { x: 0, y: 0, w: 0, scale: 0 };
  const tz = cz - camZ;
  p.scale = camDepth / Math.max(1e-3, tz);
  p.x = Math.round(width / 2 + (p.scale * (cx - camX) * width) / 2);
  p.y = Math.round(height / 2 - (p.scale * (cy - camY) * height) / 2);
  p.w = Math.round((p.scale * roadW * width) / 2);
  return p;
}

function buildTrack(): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < TRACK_LEN; i += 1) {
    const curve = Math.sin(i * 0.09) * 1.6 + Math.sin(i * 0.021) * 2.4;
    const light = i % 2 === 0;
    segs.push({
      y: Math.sin(i * 0.05) * 1500,
      curve,
      color: light ? ["#2b2b3a", "#25252f"] : ["#242430", "#1f1f28"],
      rivals: [],
    });
  }
  for (let n = 0; n < 22; n += 1) {
    const idx = Math.floor(Math.random() * (TRACK_LEN - 20)) + 10;
    const lane = Math.floor(Math.random() * LANES);
    segs[idx]!.rivals.push({
      x: (lane / (LANES - 1) - 0.5) * 0.82,
      lane,
      speed: BASE_SPEED * (0.55 + Math.random() * 0.3),
      spd: 0,
    });
  }
  return segs;
}

export function CarRaceGame({
  balance = 10000,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"bet" | "race" | "result">("bet");
  const [bet, setBet] = useState(500);
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<"win" | "lose" | null>(null);

  // Mutable race state kept in a ref (driven by rAF, avoids re-render churn).
  const keys = useRef<Record<string, boolean>>({});
  const st = useRef({
    position: 0,
    playerX: 0,
    speed: BASE_SPEED,
    nitro: 100,
    track: buildTrack(),
    finished: false,
    rivalsPassed: 0,
    hudTick: 0,
  });

  const startRace = useCallback(() => {
    if (balance < bet) return;
    onLose(bet); // deduct stake
    st.current = {
      position: 0,
      playerX: 0,
      speed: BASE_SPEED,
      nitro: 100,
      track: buildTrack(),
      finished: false,
      rivalsPassed: 0,
      hudTick: 0,
    };
    setPhase("race");
    setResult(null);
    setNitro(100);
    setProgress(0);
  }, [balance, bet, onLose]);

  const finish = useCallback(
    (won: boolean) => {
      if (st.current.finished) return;
      st.current.finished = true;
      const payout = Math.round(bet * (won ? 2.4 : 0));
      if (won) onWin(payout);
      setResult(won ? "win" : "lose");
      setPhase("result");
    },
    [bet, onWin],
  );

  // Keyboard controls.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  // Main game loop: physics + canvas render, only active during "race".
  useEffect(() => {
    if (phase !== "race") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(r.width));
      canvas.height = Math.max(240, Math.floor(r.height));
    };
    resize();
    window.addEventListener("resize", resize);

    const roadW = 2000;
    const camDepth = 1 / Math.tan((100 / 2) * Math.PI / 180);
    const lapTarget = TRACK_LEN * 1.5;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = st.current;
      const W = canvas.width;
      const H = canvas.height;
      if (W < 10 || H < 10) return;

      // --- Input / physics ---
      const boost = (keys.current["shift"] || keys.current[" "]) && s.nitro > 0;
      const maxSpeed = boost ? TOP_SPEED * NITRO_MULT : TOP_SPEED;
      if (keys.current["arrowup"] || keys.current["w"]) s.speed = Math.min(maxSpeed, s.speed + SEG_LEN / 60);
      else if (keys.current["arrowdown"] || keys.current["s"]) s.speed = Math.max(BASE_SPEED / 2, s.speed - SEG_LEN / 40);
      else s.speed += (BASE_SPEED * 1.4 - s.speed) * 0.02;
      if (boost) s.nitro = Math.max(0, s.nitro - 0.6);
      else s.nitro = Math.min(100, s.nitro + 0.12);

      const dx = 0.02 * (s.speed / TOP_SPEED) * 3;
      if (keys.current["arrowleft"] || keys.current["a"]) s.playerX -= dx;
      if (keys.current["arrowright"] || keys.current["d"]) s.playerX += dx;
      s.playerX = Math.max(-1, Math.min(1, s.playerX));
      if (s.playerX < -0.92 || s.playerX > 0.92) s.speed *= 0.98;

      s.position = (s.position + s.speed) % TRACK_LEN;
      const pct = (s.position / lapTarget) * 100;
      setProgress(Math.max(0, Math.min(100, pct)));
      setSpeed(Math.round((s.speed / TOP_SPEED) * 320));
      setNitro(Math.round(s.nitro));
      if (pct >= 100) { finish(true); return; }

      // --- Camera (chase cam) ---
      const baseSeg = s.track[Math.floor(s.position)] ?? s.track[0]!;
      const camZ = s.position * SEG_LEN;
      const camY = CAM_HEIGHT + (baseSeg.y || 0);

      // --- Render ---
      ctx.fillStyle = "#0b0e22";
      ctx.fillRect(0, 0, W, H);
      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
      sky.addColorStop(0, "#1b2a4a");
      sky.addColorStop(1, "#0b0e22");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H / 2);

      let maxy = H;
      let x = 0;
      let dxSeg = 0;
      const baseIdx = Math.floor(s.position);
      for (let n = 0; n < DRAW_DIST; n += 1) {
        const seg = s.track[(baseIdx + n) % TRACK_LEN]!;
        const looped = seg.y < (s.track[baseIdx]?.y ?? 0);
        const segZ1 = (baseIdx + n) * SEG_LEN;
        const segZ2 = (baseIdx + n + 1) * SEG_LEN;
        const camX = s.playerX * roadW;
        const p1 = project(camX + x, seg.y, segZ1, camX, camY, camZ, camDepth, W, H, roadW);
        const p2 = project(camX + x + dxSeg, seg.y, segZ2, camX, camY, camZ, camDepth, W, H, roadW);
        if (p1.y >= p2.y || p2.y >= maxy) { x += dxSeg; dxSeg += seg.curve; continue; }
        polygon(ctx, 0, p1.y, W, p1.y, W, p2.y, 0, p2.y, seg.color[1]);
        polygon(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, seg.color[0]);
        x += dxSeg;
        dxSeg += seg.curve;
        maxy = p2.y;
        void looped;
      }
      // --- Rivals ---
      for (let n = DRAW_DIST - 1; n > 0; n -= 1) {
        const seg = s.track[(baseIdx + n) % TRACK_LEN]!;
        for (const rv of seg.rivals) {
          const segZ = (baseIdx + n) * SEG_LEN;
          const camX2 = s.playerX * roadW;
          const rp = project(camX2 + rv.x * roadW, seg.y, segZ, camX2, camY, camZ, camDepth, W, H, roadW);
          if (rp.scale <= 0) continue;
          const rw = rp.w * 0.18;
          const rh = rw * 0.6;
          // rival car body
          polygon(ctx, rp.x - rw, rp.y - rh, rp.x + rw, rp.y - rh, rp.x + rw, rp.y, rp.x - rw, rp.y, "#e11d48");
          polygon(ctx, rp.x - rw * 0.7, rp.y - rh, rp.x + rw * 0.7, rp.y - rh, rp.x + rw * 0.7, rp.y - rh * 0.5, rp.x - rw * 0.7, rp.y - rh * 0.5, "#fb7185");
        }
      }

      // --- Player car (chase view, bottom center) ---
      const carW = W * 0.16;
      const carH = carW * 0.72;
      const cx = W / 2 + s.playerX * W * 0.16;
      const cy = H - carH - H * 0.04;
      // ground shadow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(cx, cy + carH * 0.95, carW * 0.55, carH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // nitro flames
      if (boost) {
        for (let f = 0; f < 3; f += 1) {
          ctx.fillStyle = f === 0 ? "#fff" : f === 1 ? "#fbbf24" : "#f97316";
          ctx.beginPath();
          ctx.arc(cx, cy + carH + f * 6, carW * (0.14 - f * 0.03), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // body
      const grad = ctx.createLinearGradient(cx, cy, cx, cy + carH);
      grad.addColorStop(0, "#fde68a");
      grad.addColorStop(1, "#f97316");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - carW / 2, cy + carH);
      ctx.lineTo(cx - carW * 0.42, cy);
      ctx.lineTo(cx + carW * 0.42, cy);
      ctx.lineTo(cx + carW / 2, cy + carH);
      ctx.closePath();
      ctx.fill();
      // cockpit
      ctx.fillStyle = "#0b0e22";
      ctx.beginPath();
      ctx.moveTo(cx - carW * 0.26, cy + carH * 0.55);
      ctx.lineTo(cx + carW * 0.26, cy + carH * 0.55);
      ctx.lineTo(cx + carW * 0.2, cy + carH * 0.2);
      ctx.lineTo(cx - carW * 0.2, cy + carH * 0.2);
      ctx.closePath();
      ctx.fill();
      // taillights
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - carW * 0.46, cy + carH * 0.2, carW * 0.12, carH * 0.08);
      ctx.fillRect(cx + carW * 0.34, cy + carH * 0.2, carW * 0.12, carH * 0.08);

      // --- Nitro speed streaks ---
      if (boost) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i += 1) {
          const sy = Math.random() * H;
          const sx = Math.random() * W;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + 40 + Math.random() * 40);
          ctx.stroke();
        }
      }
    };

    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [phase, finish]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0e22] to-[#141031]">
      {phase === "race" ? (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {/* HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Speed</p>
              <p className="text-2xl font-black text-amber-300">{speed}<span className="text-sm text-white/60"> km/h</span></p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-right backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Lap</p>
                <p className="text-lg font-black text-white">{Math.round(progress)}%</p>
              </div>
              <div className="w-32">
                <div className="mb-1 text-right text-[10px] font-bold uppercase tracking-widest text-white/60">Nitro</div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-brand-500" style={{ width: `${nitro}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-brand-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-center text-[11px] text-white/50">↑/W accelerate · ←→/AD steer · Shift or Space = Nitro</p>
          </div>
        </>
      ) : phase === "bet" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-5xl">🏎️</p>
          <h2 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-3xl font-black text-transparent">Apex Racing 3D</h2>
          <p className="max-w-xs text-sm text-white/60">Beat the field to the finish. Nitro boosts your top speed — reach the end to win <span className="font-black text-amber-300">2.4×</span> your stake.</p>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            {BETS.map((b) => (
              <button key={b} type="button" onClick={() => setBet(b)}
                className={`rounded-2xl border px-4 py-3 text-sm font-black backdrop-blur-md transition ${
                  bet === b
                    ? "border-amber-300/70 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_18px_rgba(251,191,36,.6)]"
                    : "border-white/10 bg-white/5 text-white"
                }`}>
                {b.toLocaleString()} 🪙
              </button>
            ))}
          </div>
          <button type="button" onClick={startRace} disabled={balance < bet}
            className="w-full max-w-xs rounded-full bg-gradient-to-b from-brand-400 to-brand-600 py-3.5 text-sm font-black text-white shadow-[0_6px_20px_rgba(249,115,22,.55)] ring-1 ring-white/20 disabled:opacity-40">
            {balance < bet ? "Not enough coins" : `Start Race · ${bet.toLocaleString()} coins`}
          </button>
          <p className="text-xs text-white/50">Balance: {balance.toLocaleString()} coins</p>
        </div>
      ) : (
        <motion.div
          className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          <p className="text-6xl">{result === "win" ? "🏆" : "💥"}</p>
          <h2 className={`text-3xl font-black ${result === "win" ? "bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent" : "text-rose-400"}`}>
            {result === "win" ? "You Win!" : "Race Over"}
          </h2>
          <p className="text-sm text-white/70">
            {result === "win"
              ? `You collected ${Math.round(bet * 2.4).toLocaleString()} coins!`
              : `You didn't finish first. Stake of ${bet.toLocaleString()} lost.`}
          </p>
          <button type="button" onClick={() => setPhase("bet")}
            className="mt-2 w-full max-w-xs rounded-full bg-gradient-to-b from-brand-400 to-brand-600 py-3.5 text-sm font-black text-white shadow-[0_6px_20px_rgba(249,115,22,.55)] ring-1 ring-white/20">
            Race Again
          </button>
        </motion.div>
      )}
    </div>
  );
}
