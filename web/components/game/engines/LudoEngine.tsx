"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Sparkles, Undo2, Dice5, TrendingUp, Coins, X } from "lucide-react";
import type { LudoMatchConfig } from "../LudoHub";
import { POWER_COSTS } from "../LudoHub";
import { LudoDice } from "../ludo/LudoDice";
import { LudoMeetHereCard, LudoPlayerCard, LudoRollPedestal, LudoStatusPill } from "../ludo/LudoHud";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const COLORS = ["#EF4444", "#10B981", "#F59E0B", "#3B82F6"]; // Red, Green, Yellow, Blue

const SEATS = [
  { name: "YOU (David)", short: "David", flag: "🇳🇬", avatar: "👨‍💻", level: 9, neon: "#22D3EE" },
  { name: "Tunde", short: "Tunde", flag: "🇳🇬", avatar: "🧔", level: 5, neon: "#34D399" },
  { name: "Bella", short: "Bella", flag: "🇬🇧", avatar: "👩", level: 7, neon: "#E879F9" },
  { name: "Aisha", short: "Aisha", flag: "🇨🇦", avatar: "👧", level: 10, neon: "#FBBF24" },
];

// ── 5D Spatial Audio & Haptic Synthesizer ───────────────────────────
class Sensory4DEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
  }

  public playSensoryDiceRoll() {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  public playSensoryVictory() {
    if (this.isMuted || !this.ctx) return;
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.6);
    });
  }

  public playSkyrocketWarp() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.15);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch { /* ignore */ }
  }

  public playSensoryDefeat() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

const sensoryEngine = new Sensory4DEngine();

const ARROW_JUMPS: Record<number, number> = {
  15: 33, 33: 42, 42: 47, 10: 22, 38: 48, 47: 57,
};

/** Decision window per turn: the countdown ring depletes over this many seconds. */
const TURN_SECONDS = 15;

/** 3D bevelled wooden/composite frame around the board canvas (layered CSS). */
const WOOD_FRAME: React.CSSProperties = {
  background:
    "repeating-linear-gradient(93deg, rgba(0,0,0,.16) 0 3px, rgba(255,255,255,.05) 3px 7px), linear-gradient(150deg,#7c5a31 0%,#5a3d1d 45%,#3f2a12 100%)",
  boxShadow:
    "inset 0 3px 0 rgba(255,224,170,.35), inset 0 -6px 12px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.4), 0 22px 48px rgba(0,0,0,.55)",
};

/** Neon base-zone glows (Red TL · Green TR · Yellow BR · Blue BL) over the canvas. */
const ZONE_GLOWS =
  "radial-gradient(circle at 20% 20%, rgba(239,68,68,.3), transparent 34%), radial-gradient(circle at 80% 20%, rgba(16,185,129,.3), transparent 34%), radial-gradient(circle at 80% 80%, rgba(245,158,11,.3), transparent 34%), radial-gradient(circle at 20% 80%, rgba(59,130,246,.3), transparent 34%)";

/** Glossy lacquer sheen across the playing surface. */
const BOARD_SHEEN =
  "linear-gradient(158deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.04) 34%, transparent 52%)";

export function LudoEngine({
  config,
  onWin,
  onLose,
}: {
  config: LudoMatchConfig;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seats = config.players === 2 ? 2 : 4;
  const humanSeat = 0;

  const [pos, setPos] = useState<number[]>(() => Array(seats).fill(0));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(6);
  const [msg, setMsg] = useState("Couple's ⭐ Ludo Matrix Active. Tap your gate to roll.");
  const [started, setStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);

  // ── Coin economy & tactical power-ups ──
  const [coins, setCoins] = useState(config.bet);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [captureStreak, setCaptureStreak] = useState(0);
  const [doubleRoll, setDoubleRoll] = useState(false);
  const [hiloPending, setHiloPending] = useState<"high" | "low" | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<number[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  /** Consecutive 6s rolled by the current seat; 3 in a row forfeits the turn. */
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);

  // ── Custom photo avatar for the local player (seat 0) ──
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    let alive = true;
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (!alive || !uid) return;
      sb.from("profiles").select("avatar_url").eq("id", uid).maybeSingle().then(({ data: row }) => {
        const r = row as { avatar_url?: string | null } | null;
        if (alive && typeof r?.avatar_url === "string" && r.avatar_url.trim()) {
          setPhotoUrl(r.avatar_url);
        }
      });
    });
    return () => { alive = false; };
  }, []);

  // ── Turn countdown (15 s) driving the avatar ring + auto-play fallback ──
  const [clock, setClock] = useState(TURN_SECONDS);

  const aiLevel = config.aiLevel;
  const isHumanTurn = turn === humanSeat;
  const aiSeats = config.matchType === "cpu" ? [1, 2, 3].slice(0, seats - 1) : [];
  const isAiSeat = (s: number) => aiSeats.includes(s);

  // Render 15x15 AAA 3D wood board: bevelled tiles, panel seams, giant seeds
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cell = size / 15;

    /** Darken/lighten a hex colour by amt (-255..255) for gradient faces. */
    const shade = (hex: string, amt: number) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
      const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
      const b = Math.max(0, Math.min(255, (n & 255) + amt));
      return `rgb(${r},${g},${b})`;
    };

    /** Bevelled tile: light top/left lip, dark bottom/right lip over a face. */
    const bevelTile = (x: number, y: number, w: number, h: number, face: string | CanvasGradient, inset = 1.4) => {
      ctx.fillStyle = face;
      ctx.fillRect(x, y, w, h);
      ctx.lineWidth = inset;
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.beginPath();
      ctx.moveTo(x, y + inset / 2); ctx.lineTo(x + w, y + inset / 2);
      ctx.moveTo(x + inset / 2, y); ctx.lineTo(x + inset / 2, y + h);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      ctx.beginPath();
      ctx.moveTo(x, y + h - inset / 2); ctx.lineTo(x + w, y + h - inset / 2);
      ctx.moveTo(x + w - inset / 2, y); ctx.lineTo(x + w - inset / 2, y + h);
      ctx.stroke();
    };

    ctx.clearRect(0, 0, size, size);

    // ── 1. Rich wood-grain base (the 3D board body) ──
    const wood = ctx.createLinearGradient(0, 0, size, size);
    wood.addColorStop(0, "#74512A"); wood.addColorStop(0.5, "#5C3F1E"); wood.addColorStop(1, "#412B11");
    ctx.fillStyle = wood;
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#241606";
    ctx.lineWidth = 1.1;
    for (let g = -size; g < size * 2; g += 6) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g + size * 0.4, size); ctx.stroke();
    }
    ctx.restore();

    // ── 2. Four colour base panels (bevelled + dark seams) with white yards ──
    const quadrant = (qx: number, qy: number, color: string) => {
      const grad = ctx.createLinearGradient(qx, qy, qx + cell * 6, qy + cell * 6);
      grad.addColorStop(0, shade(color, 36));
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, shade(color, -74));
      bevelTile(qx, qy, cell * 6, cell * 6, grad, 2.2);
      ctx.strokeStyle = "#160D05"; ctx.lineWidth = 1.6;
      ctx.strokeRect(qx + 0.8, qy + 0.8, cell * 6 - 1.6, cell * 6 - 1.6);

      // White yard: rounded inset panel with an ambient-occlusion rim
      const ix = qx + cell; const iy = qy + cell;
      const yard = ctx.createLinearGradient(ix, iy, ix, iy + cell * 4);
      yard.addColorStop(0, "#F7F3EA"); yard.addColorStop(1, "#D8D1BE");
      ctx.save();
      ctx.fillStyle = yard;
      const r = cell * 0.5;
      ctx.beginPath();
      ctx.moveTo(ix + r, iy);
      ctx.arcTo(ix + cell * 4, iy, ix + cell * 4, iy + cell * 4, r);
      ctx.arcTo(ix + cell * 4, iy + cell * 4, ix, iy + cell * 4, r);
      ctx.arcTo(ix, iy + cell * 4, ix, iy, r);
      ctx.arcTo(ix, iy, ix + cell * 4, iy, r);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.16)"; ctx.lineWidth = cell * 0.34;
      ctx.beginPath(); ctx.rect(ix + cell * 0.24, iy + cell * 0.24, cell * 3.52, cell * 3.52); ctx.stroke();
      ctx.restore();
    };
    quadrant(0, 0, COLORS[0]);                 // Red    — top-left
    quadrant(cell * 9, 0, COLORS[1]);           // Green  — top-right
    quadrant(cell * 9, cell * 9, COLORS[2]);    // Yellow — bottom-right
    quadrant(0, cell * 9, COLORS[3]);           // Blue   — bottom-left

    // ── 3. Bevelled ivory track tiles with dark panel lines ──
    const isCorridor = (c: number, r: number) =>
      (r === 7 && ((c >= 1 && c <= 5) || (c >= 9 && c <= 13))) ||
      (c === 7 && ((r >= 1 && r <= 5) || (r >= 9 && r <= 13)));
    const isCenter = (c: number, r: number) => c >= 6 && c <= 8 && r >= 6 && r <= 8;
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const inBand = (r >= 6 && r <= 8) || (c >= 6 && c <= 8);
        if (!inBand || isCenter(c, r) || isCorridor(c, r)) continue;
        const face = ctx.createLinearGradient(c * cell, r * cell, c * cell, (r + 1) * cell);
        face.addColorStop(0, "#FBF7EE"); face.addColorStop(1, "#DED6C2");
        bevelTile(c * cell, r * cell, cell, cell, face);
        ctx.strokeStyle = "#1C1108"; ctx.lineWidth = 0.8;
        ctx.strokeRect(c * cell + 0.4, r * cell + 0.4, cell - 0.8, cell - 0.8);
      }
    }

    // ── 4. Coloured home corridors (bevelled) + entry direction arrows ──
    const corridors: Array<{ color: string; arrow: "right" | "down" | "left" | "up"; cells: Array<[number, number]> }> = [
      { color: COLORS[0], arrow: "right", cells: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]] },
      { color: COLORS[1], arrow: "down", cells: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]] },
      { color: COLORS[2], arrow: "left", cells: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]] },
      { color: COLORS[3], arrow: "up", cells: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]] },
    ];
    for (const path of corridors) {
      for (const [c, r] of path.cells) {
        const face = ctx.createLinearGradient(c * cell, r * cell, (c + 1) * cell, (r + 1) * cell);
        face.addColorStop(0, shade(path.color, 28)); face.addColorStop(1, shade(path.color, -48));
        bevelTile(c * cell, r * cell, cell, cell, face);
        ctx.strokeStyle = "#1C1108"; ctx.lineWidth = 0.8;
        ctx.strokeRect(c * cell + 0.4, r * cell + 0.4, cell - 0.8, cell - 0.8);
      }
      // Entry chevron on the corridor head, pointing toward the centre goal
      const [hc, hr] = path.cells[0]!;
      const mx = (hc + 0.5) * cell; const my = (hr + 0.5) * cell;
      const a = cell * 0.26;
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.beginPath();
      if (path.arrow === "right") { ctx.moveTo(mx - a * 0.6, my - a); ctx.lineTo(mx + a * 0.8, my); ctx.lineTo(mx - a * 0.6, my + a); }
      else if (path.arrow === "left") { ctx.moveTo(mx + a * 0.6, my - a); ctx.lineTo(mx - a * 0.8, my); ctx.lineTo(mx + a * 0.6, my + a); }
      else if (path.arrow === "down") { ctx.moveTo(mx - a, my - a * 0.6); ctx.lineTo(mx, my + a * 0.8); ctx.lineTo(mx + a, my - a * 0.6); }
      else { ctx.moveTo(mx - a, my + a * 0.6); ctx.lineTo(mx, my - a * 0.8); ctx.lineTo(mx + a, my + a * 0.6); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // ── 5. Centre finish matrix triangles ──
    ctx.fillStyle = COLORS[0];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 6, cell * 9); ctx.fill();
    ctx.fillStyle = COLORS[1];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 6); ctx.fill();
    ctx.fillStyle = COLORS[2];
    ctx.beginPath(); ctx.moveTo(cell * 9, cell * 6); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 9); ctx.fill();
    ctx.fillStyle = COLORS[3];
    ctx.beginPath(); ctx.moveTo(cell * 6, cell * 9); ctx.lineTo(cell * 7.5, cell * 7.5); ctx.lineTo(cell * 9, cell * 9); ctx.fill();

    /** Glossy 5-point star with a metallic gradient + specular glint. */
    const star = (sc: number, sr: number, fill: string) => {
      const cx = (sc + 0.5) * cell; const cy = (sr + 0.5) * cell;
      const R = cell * 0.34;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : R * 0.44;
        const x = cx + rad * Math.cos(ang); const y = cy + rad * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.45, fill); g.addColorStop(1, shade(fill, -70));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.ellipse(cx - R * 0.2, cy - R * 0.34, R * 0.22, R * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    // ── 6. Star safe spots on the track (Yellow & Green quadrant arms + the
    //       other two) and a gold star on each colour's start tile ──
    star(12, 8, COLORS[2]); // Yellow quadrant arm
    star(8, 2, COLORS[1]);  // Green quadrant arm
    star(2, 6, COLORS[0]);  // Red arm
    star(6, 12, COLORS[3]); // Blue arm

    const starts: Array<[number, number, string]> = [
      [1, 8, COLORS[0]], [6, 1, COLORS[1]], [13, 6, COLORS[2]], [8, 13, COLORS[3]],
    ];
    for (const [sc, sr, col] of starts) {
      const face = ctx.createLinearGradient(sc * cell, sr * cell, (sc + 1) * cell, (sr + 1) * cell);
      face.addColorStop(0, shade(col, 30)); face.addColorStop(1, shade(col, -52));
      bevelTile(sc * cell, sr * cell, cell, cell, face);
      ctx.strokeStyle = "#1C1108"; ctx.lineWidth = 0.8;
      ctx.strokeRect(sc * cell + 0.4, sr * cell + 0.4, cell - 0.8, cell - 0.8);
      star(sc, sr, "#FFE9A8");
    }

    // ── 7. Giant seeds: 4 glossy 3D pawns per yard ──
    const drawGiantPawn = (px: number, py: number, r: number, color: string) => {
      ctx.save();
      // Grounding drop shadow (contact AO)
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(px, py + r * 1.5, r * 1.18, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      // Flared acrylic base
      const base = ctx.createLinearGradient(px - r, py, px + r, py + r * 1.5);
      base.addColorStop(0, shade(color, 44)); base.addColorStop(0.55, color); base.addColorStop(1, shade(color, -84));
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(px - r * 0.95, py + r * 1.32);
      ctx.quadraticCurveTo(px - r * 0.6, py + r * 0.55, px - r * 0.34, py + r * 0.25);
      ctx.lineTo(px + r * 0.34, py + r * 0.25);
      ctx.quadraticCurveTo(px + r * 0.6, py + r * 0.55, px + r * 0.95, py + r * 1.32);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1; ctx.stroke();
      // Marble/acrylic head with subsurface highlight
      const head = ctx.createRadialGradient(px - r * 0.34, py - r * 0.4, r * 0.12, px, py, r * 0.78);
      head.addColorStop(0, "#FFFFFF");
      head.addColorStop(0.32, shade(color, 74));
      head.addColorStop(0.75, color);
      head.addColorStop(1, shade(color, -74));
      ctx.fillStyle = head;
      ctx.beginPath(); ctx.arc(px, py, r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.stroke();
      // Crisp specular dot
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath(); ctx.ellipse(px - r * 0.2, py - r * 0.26, r * 0.15, r * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const yards: Array<[number, number, string]> = [
      [0, 0, COLORS[0]], [cell * 9, 0, COLORS[1]], [cell * 9, cell * 9, COLORS[2]], [0, cell * 9, COLORS[3]],
    ];
    for (const [qx, qy, color] of yards) {
      for (const [ox, oy] of [[2, 2], [4, 2], [2, 4], [4, 4]] as Array<[number, number]>) {
        const px = qx + ox * cell; const py = qy + oy * cell;
        // Dark socket cup under each seed
        ctx.fillStyle = "rgba(0,0,0,.26)";
        ctx.beginPath(); ctx.ellipse(px, py + cell * 0.7, cell * 0.76, cell * 0.26, 0, 0, Math.PI * 2); ctx.fill();
        drawGiantPawn(px, py, cell * 0.6, color);
      }
    }

    // ── 8. Centre emblem star (gold) ──
    const mcx = cell * 7.5; const mcy = cell * 7.5; const SR = cell * 0.92;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? SR : SR * 0.44;
      const x = mcx + rad * Math.cos(ang); const y = mcy + rad * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const starG = ctx.createLinearGradient(mcx, mcy - SR, mcx, mcy + SR);
    starG.addColorStop(0, "#FFFDF4"); starG.addColorStop(0.5, "#FFE9A8"); starG.addColorStop(1, "#DEA236");
    ctx.fillStyle = starG; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.42)"; ctx.lineWidth = 1.2; ctx.stroke();

    // ── 9. Board edge vignette for depth ──
    const vig = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.34)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, size, size);
  }, [seats]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sensoryEngine.toggleMute(next);
  };

  function resolveMove(cur: number[], seat: number, roll: number) {
    const start = cur[seat]!;
    const target = Math.min(57, start + roll);
    const next = [...cur];
    next[seat] = target;
    let jumped = false;
    let jumpedTo = 0;
    if (target < 57 && ARROW_JUMPS[target] != null) {
      jumpedTo = ARROW_JUMPS[target]!;
      next[seat] = Math.min(57, jumpedTo);
      jumped = true;
    }
    let captured = 0;
    const land = next[seat]!;
    if (land > 0 && land < 57) {
      for (let o = 0; o < seats; o++) {
        if (o === seat) continue;
        if (next[o] === land) { next[o] = 0; captured++; }
      }
    }
    return { next, land, jumped, jumpedTo, captured, home: land >= 57 };
  }

  function doRoll(seat: number, opts?: { boosted?: boolean; double?: boolean; hilo?: "high" | "low" | null; timedOut?: boolean }) {
    if (isRolling || winner !== null) return;
    if (!started) { setStarted(true); onLose(config.bet); }
    setIsRolling(true);
    // Re-arm the 15 s countdown for the decision window this roll will open
    // (frozen while the dice tumbles, so the next seat starts at a full ring).
    setClock(TURN_SECONDS);
    if (opts?.timedOut) setMsg(`⏰ Time up — ${SEATS[seat]!.name} auto-rolls!`);
    sensoryEngine.playSensoryDiceRoll();
    if (window.navigator?.vibrate) window.navigator.vibrate([40, 20, 40, 20, 60]);

    const boosted = opts?.boosted ?? false;
    const useDouble = opts?.double ?? false;
    const hilo = opts?.hilo ?? null;

    setTimeout(() => {
      setIsRolling(false);
      let roll = 1 + Math.floor(Math.random() * 6);
      if (boosted && roll < 5) roll = 5 + Math.floor(Math.random() * 2);
      let move = roll;
      if (useDouble) { const extra = 1 + Math.floor(Math.random() * 6); move = roll + extra; setDoubleRoll(false); }
      setDice(roll);

      if (hilo) {
        const high = roll >= 4;
        const correct = (hilo === "high") === high;
        if (correct) { setBonusCoins((b) => b + 1200); setMsg(`HI-LO WIN! Rolled ${roll} (${high ? "HIGH" : "LOW"}). +1200 coins 🎯`); }
        else { setMsg(`HI-LO miss. Rolled ${roll} (${high ? "HIGH" : "LOW"}). No bonus.`); }
        setHiloPending(null);
      }

      if (seat === humanSeat) { setLastSnapshot([...pos]); setCanUndo(true); }

      const r = resolveMove(pos, seat, move);
      setPos(r.next);

      let comboMsg = "";
      if (r.captured > 0 && seat === humanSeat) {
        const streak = captureStreak + r.captured;
        setCaptureStreak(streak);
        const capCoins = 150 * r.captured;
        setBonusCoins((b) => b + capCoins);
        comboMsg = ` · ${r.captured} CAPTURE! +${capCoins} coins`;
        if (streak % 3 === 0) {
          setBonusCoins((b) => b + 500);
          sensoryEngine.playSensoryVictory();
          comboMsg += " · TACTICAL COMBO ×3! +500 🎉";
        }
      }

      if (r.jumped) sensoryEngine.playSkyrocketWarp();

      if (r.home) {
        setWinner(seat);
        if (seat === humanSeat) {
          sensoryEngine.playSensoryVictory();
          onWin(500 + bonusCoins);
          setMsg(`COUPLE'S ⭐ VICTORY! Reached home. +${500 + bonusCoins} coins 🏆`);
        } else {
          sensoryEngine.playSensoryDefeat();
          onLose(100);
          setMsg(`${SEATS[seat]!.name} warped home first.`);
        }
        return;
      }

      const base = r.jumped
        ? `${SEATS[seat]!.name} rolled ${move} → SKYFLARE warp!`
        : `${SEATS[seat]!.name} rolled ${move}.`;
      if (!hilo) setMsg(base + comboMsg);

      if (roll === 6) {
        const nextSixes = consecutiveSixes + 1;
        setConsecutiveSixes(nextSixes);
        if (nextSixes >= 3) {
          setMsg(`Three sixes in a row — ${SEATS[seat]!.name} forfeits the turn!`);
          setConsecutiveSixes(0);
          setTurn((t) => (t + 1) % seats);
          return;
        }
        setMsg(`${hilo ? "" : base + comboMsg} Rolled a 6 — extra turn!`);
        return;
      }
      setConsecutiveSixes(0);
      setTurn((t) => (t + 1) % seats);
    }, 500);
  }

  function buyRoll2() {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.roll2) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.roll2);
    setDoubleRoll(true);
    setMsg("ROLL 2 armed — your next roll moves double dice!");
  }

  function buyHilo(pick: "high" | "low") {
    if (isRolling || winner !== null || !isHumanTurn) return;
    if (coins < POWER_COSTS.hilo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.hilo);
    setHiloPending(pick);
    setMsg(`HI-LO locked: guessing ${pick.toUpperCase()}. Roll to settle!`);
  }

  function buyUndo() {
    if (!canUndo || lastSnapshot === null || isRolling || winner !== null) return;
    if (coins < POWER_COSTS.undo) { setRechargeModal(true); return; }
    setCoins((c) => c - POWER_COSTS.undo);
    setPos(lastSnapshot);
    setCanUndo(false);
    setLastSnapshot(null);
    setMsg("UNDO — pawn restored to previous tile.");
  }

  const clockLive = clock > 0;
  /* Tick only while a decision is genuinely pending. */
  useEffect(() => {
    if (winner !== null || isRolling || !clockLive) return;
    const id = window.setInterval(() => {
      setClock((c) => Math.max(0, Math.round((c - 0.1) * 10) / 10));
    }, 100);
    return () => window.clearInterval(id);
  }, [winner, isRolling, clockLive]);

  /* ── AI auto-play fallback: clock hits 0 → act immediately so no seat can
        stall the match. This engine resolves the move INSIDE doRoll (the
        "best pawn" selection is implicit — there is exactly one seed per
        seat), so one doRoll call both rolls and moves, then the turn
        advances. doRoll re-arms the clock and its isRolling guard makes
        double-fires impossible. */
  const timeoutFiredRef = useRef(false);
  useEffect(() => {
    if (clock > 0 || winner !== null || isRolling) {
      if (clock > 0) timeoutFiredRef.current = false; // ready for the next window
      return;
    }
    if (timeoutFiredRef.current) return;
    timeoutFiredRef.current = true;
    doRoll(isHumanTurn ? humanSeat : turn, {
      double: doubleRoll,
      hilo: hiloPending,
      timedOut: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, winner, isRolling]);

  useEffect(() => {
    if (winner !== null || isRolling) return;
    if (!isAiSeat(turn)) return;
    const t = window.setTimeout(() => {
      const boostChance = aiLevel === "hard" ? 0.7 : aiLevel === "mid" ? 0.4 : 0.12;
      const boosted = Math.random() < boostChance;
      doRoll(turn, { boosted });
    }, aiLevel === "hard" ? 550 : aiLevel === "mid" ? 800 : 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, isRolling, aiLevel]);

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-screen flex-col justify-between overflow-hidden bg-[#0F172A] p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white select-none">
      {/* Header Bar */}
      <div className="flex w-full shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-slate-900/90 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <span className="text-xs font-black tracking-widest text-amber-300">COUPLE&rsquo;S ⭐ LUDO</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/40 px-3 py-1">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-black text-amber-300">{coins.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Top base cards — TL David (cyan) · Meet Here (No Drop) · TR Bella (magenta) */}
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <LudoPlayerCard
          align="left"
          name={SEATS[0]!.short}
          flag={SEATS[0]!.flag}
          avatar={SEATS[0]!.avatar}
          level={SEATS[0]!.level}
          neon={SEATS[0]!.neon}
          timer={turn === 0 && winner === null ? { remaining: clock, total: TURN_SECONDS } : undefined}
          isYou
          active={turn === 0 && winner === null}
          showDice={turn === 0 && winner === null}
          diceValue={dice}
          rolling={isRolling}
          photoUrl={photoUrl}
        />
        <LudoMeetHereCard />
        {seats > 2 ? (
          <LudoPlayerCard
            align="right"
            name={SEATS[2]!.short}
            flag={SEATS[2]!.flag}
            avatar={SEATS[2]!.avatar}
            level={SEATS[2]!.level}
            neon={SEATS[2]!.neon}
            timer={turn === 2 && winner === null ? { remaining: clock, total: TURN_SECONDS } : undefined}
            active={turn === 2 && winner === null}
            showDice={turn === 2 && winner === null}
            diceValue={dice}
            rolling={isRolling}
          />
        ) : (
          <span aria-hidden />
        )}
      </div>

      {/* 3D bevelled board — scroll-restricted flex cell, strictly above the dock */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-1.5">
        <div
          className="relative aspect-square w-full max-w-[min(340px,38vh)] rounded-[7%] p-[3%]"
          style={WOOD_FRAME}
        >
          <div className="relative overflow-hidden rounded-[5%] shadow-[inset_0_2px_14px_rgba(0,0,0,.65)] ring-1 ring-black/60">
            <canvas ref={canvasRef} width={360} height={360} className="block h-auto w-full" />
            {/* Neon base-zone glows (Red TL · Green TR · Yellow BR · Blue BL) */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-screen"
              style={{ background: ZONE_GLOWS }}
            />
            {/* Glossy lacquer sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: BOARD_SHEEN }}
            />
            {/* Central 5D dice pedestal — translucent glass die on the finish star */}
            <button
              type="button"
              onClick={() => doRoll(humanSeat, { double: doubleRoll, hilo: hiloPending })}
              disabled={isRolling || winner !== null || !isHumanTurn}
              aria-label="Roll the dice"
              className={`absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-2 p-2 backdrop-blur-md transition active:scale-95 ${
                isHumanTurn && !isRolling && winner === null
                  ? "cursor-pointer border-amber-300/80 bg-slate-950/70 animate-[cc-ludo-halo_2s_ease-in-out_infinite]"
                  : "cursor-default border-white/20 bg-slate-950/60 shadow-[inset_0_0_18px_rgba(0,0,0,.6)]"
              }`}
            >
              <LudoDice
                value={dice}
                rolling={isRolling}
                active={isHumanTurn && !isRolling && winner === null}
                size={40}
              />
              <span
                className={`text-[7px] font-black uppercase leading-none tracking-[.14em] ${
                  isHumanTurn && !isRolling && winner === null ? "text-amber-200" : "text-white/70"
                }`}
              >
                {isRolling ? "ROLLING..." : !isHumanTurn ? `${SEATS[turn]!.name}...` : "TAP TO ROLL"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom base row — BL Tunde (green) · AAA Tap-to-Roll pedestal · BR Aisha (gold) */}
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <LudoPlayerCard
          align="left"
          name={SEATS[1]!.short}
          flag={SEATS[1]!.flag}
          avatar={SEATS[1]!.avatar}
          level={SEATS[1]!.level}
          neon={SEATS[1]!.neon}
          timer={turn === 1 && winner === null ? { remaining: clock, total: TURN_SECONDS } : undefined}
          active={turn === 1 && winner === null}
          showDice={turn === 1 && winner === null}
          diceValue={dice}
          rolling={isRolling}
        />
        <LudoRollPedestal
          diceValue={dice}
          rolling={isRolling}
          canRoll={isHumanTurn && !isRolling && winner === null}
          label={
            isRolling ? "ROLLING..." : !isHumanTurn ? `${SEATS[turn]!.name}...` : "TAP TO ROLL"
          }
          onClick={() => doRoll(humanSeat, { double: doubleRoll, hilo: hiloPending })}
        />
        {seats > 3 ? (
          <LudoPlayerCard
            align="right"
            name={SEATS[3]!.short}
            flag={SEATS[3]!.flag}
            avatar={SEATS[3]!.avatar}
            level={SEATS[3]!.level}
            neon={SEATS[3]!.neon}
            timer={turn === 3 && winner === null ? { remaining: clock, total: TURN_SECONDS } : undefined}
            active={turn === 3 && winner === null}
            showDice={turn === 3 && winner === null}
            diceValue={dice}
            rolling={isRolling}
          />
        ) : (
          <span aria-hidden />
        )}
      </div>

      {/* Tactical Coin Power-Ups */}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <button
          type="button"
          onClick={buyRoll2}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border p-2 ${
            doubleRoll ? "border-amber-400 bg-amber-500/20 text-amber-300" : "border-white/10 bg-slate-900/60 text-slate-300"
          }`}
        >
          <div className="flex items-center gap-1">
            <Dice5 className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase">Roll 2</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.roll2} coins</span>
        </button>

        <button
          type="button"
          onClick={() => buyHilo("high")}
          disabled={isRolling || winner !== null || !isHumanTurn}
          className="flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-slate-900/60 p-2 text-slate-300"
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase">Hi-Lo</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.hilo} coins</span>
        </button>

        <button
          type="button"
          onClick={buyUndo}
          disabled={!canUndo || isRolling || winner !== null}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border p-2 ${
            canUndo ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-white/10 bg-slate-900/60 text-slate-300 opacity-50"
          }`}
        >
          <div className="flex items-center gap-1">
            <Undo2 className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-black uppercase">Undo</span>
          </div>
          <span className="text-[9px] text-slate-400">{POWER_COSTS.undo} coins</span>
        </button>
      </div>

      {/* Status pill — breathing indicator pinned right above the fixed bottom nav */}
      <LudoStatusPill
        text={msg}
        thinking={!isHumanTurn && winner === null && !isRolling}
      />

      {/* Recharge Modal */}
      {rechargeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border border-amber-500/40 bg-slate-950 p-6 text-center shadow-2xl">
            <Coins className="h-12 w-12 text-amber-400 animate-bounce" />
            <h3 className="mt-3 text-base font-black text-white">INSUFFICIENT COINS</h3>
            <p className="mt-1 text-xs text-slate-400">Claim free bonus coins to activate this power-up.</p>
            <button
              type="button"
              onClick={() => {
                setCoins((c) => c + 2000);
                setRechargeModal(false);
                setMsg("Claimed +2,000 Bonus Coins! 🎯");
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-xs font-black text-white"
            >
              CLAIM +2,000 FREE COINS
            </button>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {winner !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg">
          <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border-2 border-amber-400 bg-slate-950 p-6 text-center shadow-2xl">
            <span className="text-5xl">{winner === humanSeat ? "🏆" : "💀"}</span>
            <h2 className="mt-4 text-2xl font-black text-white">{winner === humanSeat ? "VICTORY!" : "DEFEAT"}</h2>
            <button
              type="button"
              onClick={() => {
                setWinner(null);
                setPos(Array(seats).fill(0));
                setTurn(0);
                setClock(TURN_SECONDS);
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-xs font-black text-white"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
      {/* Pause Modal */}
      {pauseModalOpen && (
        <div className="absolute inset-0">
          <div className="w-full max-w-xs flex-col items-center rounded border bg-slate-900 p-6 text-center">
            <span className="text-4xl">⏸️</span>
            <h3 className="mt-2 text-xl font-black text-white">Pause Match</h3>
            <p className="mt-1 text-sm text-slate-400">You have paused the game. Pickup where you left off.</p>
            <div className="mt-5 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => setPauseModalOpen(false)}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-xs font-black text-white"
              >
                Continue Game
              </button>
              <button
                type="button"
                onClick={() => setPauseModalOpen(false)}
                className="w-full rounded-2xl border border-white/10 bg-slate-800 py-3 text-xs font-black text-slate-300"
              >
                Audio Settings
              </button>
              <button
                type="button"
                onClick={() => { setPauseModalOpen(false); setQuitConfirm(true); }}
                className="w-full rounded-2xl border border-white/10 bg-slate-800 py-3 text-xs font-black text-slate-300"
              >
                Quit Match
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPauseModalOpen(false)}
              className="absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-slate-800"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {quitConfirm && (
        <div className="absolute inset-0 z-[90]">
          <div className="w-full max-w-xs flex-col items-center rounded border border-rose-400/30 bg-slate-900 p-6 text-center">
            <span className="text-5xl">⚠️</span>
            <h3 className="mt-3 text-lg font-black text-white">Quit Match?</h3>
            <p className="mt-1 text-sm text-slate-400">You'll return to the lobby.</p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuitConfirm(false);
                  setPauseModalOpen(false);
                  setWinner(null);
                  setPos(Array(seats).fill(0));
                  setTurn(0);
                  setConsecutiveSixes(0);
                  setClock(TURN_SECONDS);
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-xs font-black text-white"
              >
                Confirm Quit
              </button>
              <button
                type="button"
                onClick={() => setQuitConfirm(false)}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-800 py-3 text-xs font-black text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
