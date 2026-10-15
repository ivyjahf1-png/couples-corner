"use client";
import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Flame, Zap, ShieldAlert, Trophy, RotateCcw } from "lucide-react";
import type { SelectedCar, SelectedTrack } from "@/components/game/racing/RacingHub";

// ── Track surface palettes (asphalt / wet / cyber) ────────────────────
const SURFACE_STYLES: Record<"asphalt" | "wet" | "cyber", { sky: string; road: string; lane: string }> = {
  asphalt: { sky: "#020617", road: "#0f172a", lane: "#06b6d4" },
  wet: { sky: "#050d1a", road: "#0b1e33", lane: "#7dd3fc" },
  cyber: { sky: "#070316", road: "#1a0b3d", lane: "#e879f9" },
};

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(34,211,238,${alpha})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

// ── 4D/5D Spatial Audio Synthesizer for Racing Engine ─────────────────
class Racing4DAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public startEngineSound() {
    if (this.isMuted || !this.ctx || this.engineOsc) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    // Spatial lane panning: the engine drone follows the car across the road
    if (typeof this.ctx.createStereoPanner === "function") {
      this.panner = this.ctx.createStereoPanner();
      this.panner.pan.setValueAtTime(0, this.ctx.currentTime);
      this.engineOsc.connect(filter);
      filter.connect(this.panner);
      this.panner.connect(this.engineGain);
    } else {
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
    }
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  public updateRPM(speedRatio: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc) return;
    const freq = 80 + speedRatio * 320; // 80Hz to 400Hz idle-to-max engine pitch
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  }

  /** Pans the engine drone with the car's lane for 4D spatial presence. */
  public updateSpatialPan(pan: number) {
    if (this.isMuted || !this.ctx || !this.panner) return;
    this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.08);
  }

  public playNitroWarpSound() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playCrashImpact() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public stopEngineSound() {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.panner) {
      this.panner.disconnect();
      this.panner = null;
    }
  }
}

const audioEngine = new Racing4DAudio();

export function RacingEngine({
  onWin,
  onLose,
  car,
  track,
  upgrades,
}: {
  onWin?: (coins: number) => void;
  onLose?: (coins: number) => void;
  car?: SelectedCar;
  track?: SelectedTrack;
  upgrades?: { nitro: number; armor: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(120); // KM/H
  const [nitro, setNitro] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [msg, setMsg] = useState("4D Apex Velocity Engine. Tap Accelerate to Launch.");

  const playerLaneRef = useRef(1); // 0: Left, 1: Center, 2: Right
  const obstaclesRef = useRef<Array<{ lane: number; y: number; speed: number; color: string }>>([]);
  const roadOffsetRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const armorChargesRef = useRef(0);
  const crashedRef = useRef(false);
  // ── AAA FX state (refs to avoid re-renders at 60fps) ──────────────
  const boostRef = useRef(0); // counts down while Nitro warp is active
  const shakeRef = useRef(0); // screen-shake trauma, decays per frame
  const sparksRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const leanRef = useRef(0); // steering lean for player chassis tilt
  const starsRef = useRef<Array<{ x: number; y: number; s: number }>>(
    Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.42, s: Math.random() * 1.6 + 0.4 })),
  );
  const smoothXRef = useRef<number | null>(null); // eased lateral car position

  const [armorLeft, setArmorLeft] = useState(0);

  // Showroom loadout: dealership paint, top speed, tank upgrades, track theme
  const maxSpeed = car?.speed ?? 320;
  const maxNitro = 100 + (upgrades?.nitro ?? 0) * 25;
  const surfaceStyle = SURFACE_STYLES[track?.surface ?? "asphalt"];
  const bodyColor = car?.color ?? "#22d3ee";

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.toggleMute(next);
  };

  const handleStart = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setSpeed(140);
    setNitro(maxNitro);
    playerLaneRef.current = 1;
    obstaclesRef.current = [];
    armorChargesRef.current = upgrades?.armor ?? 0;
    setArmorLeft(upgrades?.armor ?? 0);
    crashedRef.current = false;
    audioEngine.startEngineSound();
    setMsg(
      track
        ? `Race active on ${track.name}! Dodge traffic and engage Nitro warp!`
        : "Race Active! Dodge traffic and engage Nitro warp!",
    );
  };

  const triggerNitro = () => {
    if (nitro < 20 || !isPlaying || isGameOver) return;

    setNitro((n) => Math.max(0, n - 35));
    setSpeed((s) => Math.min(maxSpeed, s + 60));
    boostRef.current = 90; // ~1.5s of warp at 60fps
    audioEngine.playNitroWarpSound();

    if (window.navigator?.vibrate) {
      window.navigator.vibrate([60, 30, 60, 30, 100]);
    }
  };

  const moveLane = (dir: -1 | 1) => {
    if (!isPlaying || isGameOver) return;
    const next = Math.max(0, Math.min(2, playerLaneRef.current + dir));
    if (next === playerLaneRef.current) return;
    playerLaneRef.current = next;
    leanRef.current = dir; // chassis tilt, eased back each frame

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(30);
    }
  };

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Update Road Speed & Progression
      roadOffsetRef.current = (roadOffsetRef.current + speed * dt * 4) % 80;
      leanRef.current += (0 - leanRef.current) * Math.min(1, dt * 8); // ease tilt back to center
      setScore((s) => s + Math.floor(speed * dt * 0.5));
      audioEngine.updateRPM(speed / maxSpeed);
      audioEngine.updateSpatialPan((playerLaneRef.current - 1) * 0.6);

      // Spawn Obstacles
      if (Math.random() < 0.035) {
        const lane = Math.floor(Math.random() * 3);
        const exists = obstaclesRef.current.some((o) => o.lane === lane && o.y < 150);
        if (!exists) {
          obstaclesRef.current.push({
            lane,
            y: -100,
            speed: 60 + Math.random() * 40,
            color: ["#FF1744", "#00E676", "#FFEA00", "#E040FB"][Math.floor(Math.random() * 4)]!,
          });
        }
      }

      // Update Obstacles & Collision Check
      const laneX = [canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75];
      const playerY = canvas.height - 110;
      const pX = laneX[playerLaneRef.current]!;

      obstaclesRef.current.forEach((obs, idx) => {
        obs.y += (speed - obs.speed) * dt * 4;

        const oX = laneX[obs.lane]!;
        // Collision Detection Box
        if (Math.abs(obs.y - playerY) < 65 && Math.abs(oX - pX) < 40) {
          if (armorChargesRef.current > 0) {
            // ARMOR PLATE absorbs the impact — glancing blow, race continues
            armorChargesRef.current -= 1;
            setArmorLeft(armorChargesRef.current);
            shakeRef.current = Math.min(1, shakeRef.current + 0.55);
            for (let i = 0; i < 22; i++) {
              sparksRef.current.push({
                x: pX + (Math.random() - 0.5) * 40,
                y: playerY + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 320,
                vy: -Math.random() * 260 - 60,
                life: 0.6 + Math.random() * 0.4,
              });
            }
            obs.y = canvas.height + 500; // shunt the traffic car off-screen
            setSpeed((s) => Math.max(80, s - 40));
            audioEngine.playCrashImpact();
            if (window.navigator?.vibrate) window.navigator.vibrate(80);
            setMsg(`ARMOR PLATE ABSORBED IMPACT! ${armorChargesRef.current} plate(s) remaining.`);
          } else if (!crashedRef.current) {
            // CRASH HIT (guarded so a multi-car pile-up only settles once)
            crashedRef.current = true;
            shakeRef.current = 1; // full trauma on fatal impact
            for (let i = 0; i < 46; i++) {
              sparksRef.current.push({
                x: pX + (Math.random() - 0.5) * 50,
                y: playerY + (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 460,
                vy: -Math.random() * 380 - 80,
                life: 0.8 + Math.random() * 0.6,
              });
            }
            audioEngine.playCrashImpact();
            audioEngine.stopEngineSound();
            if (window.navigator?.vibrate) window.navigator.vibrate([150, 50, 200]);

            setIsGameOver(true);
            setIsPlaying(false);
            onLose?.(100);
            setMsg("CRASH DETECTED! 4D Chassis Structural Failure.");
          }
        }
      });

      // Filter out offscreen traffic
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.y < canvas.height + 100);

      // ── DRAW CANVAS FRAME (AAA pseudo-3D) ─────────────────────────
      const W = canvas.width;
      const H = canvas.height;
      const horizonY = H * 0.24;
      const warp = boostRef.current > 0;
      if (boostRef.current > 0) boostRef.current -= 1;
      shakeRef.current = Math.max(0, shakeRef.current - dt * 1.6);
      const shakeMag = shakeRef.current * shakeRef.current * 9;
      ctx.save();
      ctx.translate((Math.random() - 0.5) * 2 * shakeMag, (Math.random() - 0.5) * 2 * shakeMag);
      ctx.clearRect(-12, -12, W + 24, H + 24);

      // Sky gradient + parallax starfield + neon skyline + horizon glow
      const vpX = W / 2;
      const topHalf = W * 0.075;
      const botHalf = W * 0.46;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, "#010409");
      skyGrad.addColorStop(0.7, surfaceStyle.sky);
      skyGrad.addColorStop(1, hexToRgba(surfaceStyle.lane, 0.25));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-12, -12, W + 24, horizonY + 12);
      ctx.fillStyle = "#e2f4ff";
      for (const st of starsRef.current) {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * 0.0016 + st.x * 40));
        ctx.globalAlpha = tw * (warp ? 0.95 : 0.6);
        const sx = (((st.x * W + time * 0.004 * (speed / 200)) % W) + W) % W;
        ctx.fillRect(sx, st.y * H, st.s + (warp ? 1 : 0), st.s * (warp ? 4 : 1.4));
      }
      ctx.globalAlpha = 1;
      const skyline = (amp: number, color: string, seed: number, off: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-12, horizonY);
        for (let x = -12; x <= W + 24; x += 24) {
          const hgt = 14 + amp * Math.abs(Math.sin((x + off + seed * 97) * 0.021) * Math.sin((x + off) * 0.008 + seed));
          ctx.lineTo(x, horizonY - hgt);
          ctx.lineTo(x + 12, horizonY - hgt);
          ctx.lineTo(x + 12, horizonY);
        }
        ctx.lineTo(W + 12, horizonY);
        ctx.closePath();
        ctx.fill();
      };
      const cityOff = roadOffsetRef.current * 0.6;
      skyline(26, "rgba(8,12,28,0.9)", 1, cityOff);
      skyline(15, hexToRgba(surfaceStyle.lane, 0.28), 7, cityOff * 1.7);
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 14, 0, horizonY + 10);
      horizonGlow.addColorStop(0, "transparent");
      horizonGlow.addColorStop(0.55, hexToRgba(surfaceStyle.lane, 0.55));
      horizonGlow.addColorStop(1, "transparent");
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(-12, horizonY - 14, W + 24, 24);

      // Perspective road trapezoid + neon edges + rumble + dividers + grid
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      roadGrad.addColorStop(0, hexToRgba(surfaceStyle.lane, 0.35));
      roadGrad.addColorStop(0.25, surfaceStyle.road);
      roadGrad.addColorStop(1, "#020617");
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(vpX - topHalf, horizonY);
      ctx.lineTo(vpX + topHalf, horizonY);
      ctx.lineTo(vpX + botHalf, H + 12);
      ctx.lineTo(vpX - botHalf, H + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = surfaceStyle.lane;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = warp ? 5 : 3;
      ctx.shadowColor = surfaceStyle.lane;
      ctx.shadowBlur = warp ? 26 : 14;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(vpX + side * topHalf, horizonY);
        ctx.lineTo(vpX + side * botHalf, H + 12);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Rumble chevrons + converging divider dashes + cyber ground grid
      const SEGMENTS = 9;
      const segPhase = roadOffsetRef.current / 80 - Math.floor(roadOffsetRef.current / 80);
      for (let i = 0; i < SEGMENTS; i++) {
        const t = ((((i + segPhase) % SEGMENTS) + SEGMENTS) % SEGMENTS) / SEGMENTS;
        const y = horizonY + (H - horizonY) * t * t;
        const hw = topHalf + (botHalf - topHalf) * t * t;
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.10)" : hexToRgba(surfaceStyle.lane, 0.16);
        for (const lx of [-hw, hw]) {
          ctx.beginPath();
          ctx.moveTo(vpX + lx - Math.sign(lx) * 10 * t, y);
          ctx.lineTo(vpX + lx, y);
          ctx.lineTo(vpX + lx, y + 5 + 22 * t * t);
          ctx.lineTo(vpX + lx - Math.sign(lx) * 10 * t, y + 5 + 22 * t * t);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.strokeStyle = surfaceStyle.lane;
      ctx.globalAlpha = 0.85;
      ctx.lineCap = "round";
      for (const frac of [1 / 3, 2 / 3]) {
        const topX = vpX + (frac - 0.5) * 2 * topHalf;
        const botX = vpX - botHalf + 2 * botHalf * frac;
        ctx.beginPath();
        for (let i = 0; i < SEGMENTS; i++) {
          const t0 = ((((i + segPhase) % SEGMENTS) + SEGMENTS) % SEGMENTS) / SEGMENTS;
          const t1 = Math.min(1, t0 + 0.055);
          ctx.lineWidth = 1 + 4 * t0;
          ctx.moveTo(topX + (botX - topX) * t0, horizonY + (H - horizonY) * t0 * t0);
          ctx.lineTo(topX + (botX - topX) * t1, horizonY + (H - horizonY) * t1 * t1);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hexToRgba(surfaceStyle.lane, 0.3);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const y = horizonY + (H - horizonY) * t * t;
        const hw = topHalf + (botHalf - topHalf) * t * t;
        ctx.globalAlpha = 0.1 + 0.3 * t;
        ctx.beginPath();
        ctx.moveTo(-12, y);
        ctx.lineTo(vpX - hw, y);
        ctx.moveTo(vpX + hw, y);
        ctx.lineTo(W + 12, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35;
      for (const gx of [0.06, 0.16, 0.28, 0.72, 0.84, 0.94]) {
        ctx.beginPath();
        ctx.moveTo(vpX + (gx - 0.5) * 2 * topHalf * 0.6, horizonY);
        ctx.lineTo(vpX + (gx - 0.5) * 2 * W * 0.75, H + 12);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nitro warp speed-lines + vignette
      if (warp) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.8, 0.35 + boostRef.current / 160);
        ctx.strokeStyle = "#a5f3fc";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + time * 0.004;
          const r0 = 60 + ((time * 0.9 + i * 47) % 220);
          const cx = vpX + Math.cos(a) * r0 * 1.6;
          const cy = horizonY + (H - horizonY) * 0.55 + Math.sin(a) * r0 * 0.8;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
          ctx.stroke();
        }
        ctx.restore();
        const vig = ctx.createRadialGradient(vpX, H * 0.6, H * 0.25, vpX, H * 0.6, H * 0.75);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, "rgba(34,211,238,0.28)");
        ctx.fillStyle = vig;
        ctx.fillRect(-12, -12, W + 24, H + 24);
      }

      // Depth helpers shared by traffic + player
      const depthOf = (y: number) => Math.max(0, Math.min(1, (y - horizonY) / Math.max(1, H - horizonY)));
      const laneXat = (lane: number, depth: number) => {
        const frac = [1 / 6, 1 / 2, 5 / 6][lane] ?? 0.5;
        const topX = vpX + (frac - 0.5) * 2 * topHalf;
        const botX = vpX - botHalf + 2 * botHalf * frac;
        return topX + (botX - topX) * depth;
      };

      // 2. Render Traffic Vehicles (perspective-scaled, depth-sorted)
      const ordered = [...obstaclesRef.current].sort((a, b) => a.y - b.y);
      for (const obs of ordered) {
        const d = depthOf(obs.y);
        const oX = laneXat(obs.lane, d);
        const s = 0.35 + 0.95 * d * d + 0.25 * d;
        const cw = 40 * s;
        const ch = 65 * s;
        ctx.save();
        ctx.translate(oX, obs.y);
        ctx.globalAlpha = 0.35 + 0.65 * d;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-cw / 2 - 2 * s, 10 * s, cw + 4 * s, ch);
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 16 * d + 4;
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.roundRect(-cw / 2, 0, cw, ch, 8 * s);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(2,6,23,0.9)";
        ctx.fillRect(-cw * 0.36, ch * 0.26, cw * 0.72, ch * 0.28);
        ctx.fillStyle = "rgba(125,211,252,0.55)";
        ctx.fillRect(-cw * 0.36, ch * 0.26, cw * 0.72, ch * 0.1);
        ctx.fillStyle = "rgba(2,6,23,0.95)";
        ctx.fillRect(-cw * 0.5, -4 * s, cw, 7 * s);
        ctx.fillStyle = "#ff1744";
        ctx.shadowColor = "#ff1744";
        ctx.shadowBlur = 10 * d;
        ctx.fillRect(-cw * 0.42, ch - 6 * s, cw * 0.26, 5 * s);
        ctx.fillRect(cw * 0.16, ch - 6 * s, cw * 0.26, 5 * s);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 3. Render 4D Player Cyber-Racer (lean + underglow + exhaust flames)
      const speedRatio = Math.min(1, speed / 240);
      ctx.save();
      ctx.translate(pX, playerY);
      ctx.rotate(Math.max(-1, Math.min(1, leanRef.current)) * 0.09);
      const pulse = 0.55 + 0.25 * Math.sin(time * 0.008) + (warp ? 0.35 : speedRatio * 0.2);
      const glowGrad2 = ctx.createRadialGradient(0, 30, 5, 0, 30, 52);
      glowGrad2.addColorStop(0, hexToRgba(bodyColor, Math.min(0.95, pulse)));
      glowGrad2.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(-48, -12, 96, 84);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, 34, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      const flameLen = (warp ? 34 : 12) + Math.random() * (warp ? 16 : 7);
      for (const fx of [-9, 9]) {
        const fg = ctx.createLinearGradient(0, 38, 0, 38 + flameLen);
        fg.addColorStop(0, "#fef08a");
        fg.addColorStop(0.4, "#fb923c");
        fg.addColorStop(1, "transparent");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(fx - 5, 36);
        ctx.lineTo(fx + 5, 36);
        ctx.lineTo(fx, 38 + flameLen);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = warp ? 30 : 18;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-22, -30, 44, 75, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-22, -30, 44, 75, 10);
      ctx.stroke();
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.roundRect(-15, -10, 30, 24, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(165,243,252,0.5)";
      ctx.fillRect(-15, -6, 30, 5);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(-3, -30, 6, 68);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = 15;
      ctx.fillRect(-18, -28, 10, 6);
      ctx.fillRect(8, -28, 10, 6);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Crash / near-miss spark particles
      const alive: typeof sparksRef.current = [];
      for (const sp of sparksRef.current) {
        sp.life -= dt;
        if (sp.life <= 0) continue;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 900 * dt;
        sp.vx *= 1 - dt * 1.5;
        ctx.globalAlpha = Math.max(0, Math.min(1, sp.life * 1.8));
        ctx.fillStyle = Math.random() < 0.5 ? "#fde68a" : "#fb923c";
        ctx.fillRect(sp.x, sp.y, 3, 3);
        alive.push(sp);
      }
      sparksRef.current = alive;
      ctx.globalAlpha = 1;
      ctx.restore(); // end screen-shake

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isGameOver, speed, onLose, maxSpeed, surfaceStyle, bodyColor]);

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border-2 border-cyan-500/30 bg-slate-950 p-4 shadow-[0_0_50px_rgba(6,182,212,0.15)] select-none">
      
      {/* Dynamic Header */}
      <div className="mb-3 flex w-full items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-black tracking-widest text-cyan-300">APEX VELOCITY 4D</span>
          </div>
          {(car || track) && (
            <p className="truncate text-[9px] font-bold text-slate-400">
              {car?.name ?? "Stock Racer"} · {track?.name ?? "Open Road"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
        </button>
      </div>

      {/* Telemetry Dashboard Stats */}
      <div className="mb-3 grid w-full grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">SPEED</span>
          <p className="text-lg font-black text-cyan-300">{speed} <span className="text-[10px]">KM/H</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">DISTANCE</span>
          <p className="text-lg font-black text-amber-300">{score} <span className="text-[10px]">M</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">NITRO</span>
          <p className="text-lg font-black text-rose-400">{Math.round((nitro / maxNitro) * 100)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="text-[9px] font-black text-slate-400">ARMOR</span>
          <p className="text-lg font-black text-emerald-300">{armorLeft}</p>
        </div>
      </div>

      {/* Main 4D Canvas Horizon Viewport */}
      <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-black">
        <canvas ref={canvasRef} width={360} height={380} className="h-full w-full object-cover" />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-md">
            <Trophy className="h-12 w-12 text-amber-400 animate-bounce mb-2" />
            <h3 className="text-lg font-black text-white">APEX VELOCITY 4D</h3>
            <p className="mt-1 text-xs text-slate-300">Dodge high-speed traffic, trigger Nitro warps, and master sensory steering.</p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-xs font-black tracking-widest text-white shadow-lg active:scale-95"
            >
              ENGAGE LAUNCH
            </button>
          </div>
        )}

        {/* Crash / Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center backdrop-blur-md">
            <ShieldAlert className="h-12 w-12 text-rose-500 animate-pulse mb-2" />
            <h3 className="text-lg font-black text-white">CHASSIS CRASHED!</h3>
            <p className="mt-1 text-xs text-slate-300">Reached {score} meters before structural impact.</p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 py-3.5 text-xs font-black tracking-widest text-white shadow-lg active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> RESTART RACE
            </button>
          </div>
        )}
      </div>

      {/* 5D Tactile Driving Controls */}
      <div className="mt-4 grid w-full grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => moveLane(-1)}
          className="rounded-2xl border border-cyan-500/40 bg-cyan-950/40 py-4 text-center font-black text-cyan-300 active:scale-90"
        >
          ◀️ STEER LEFT
        </button>

        <button
          type="button"
          onClick={triggerNitro}
          className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/50 bg-gradient-to-b from-rose-600/40 to-slate-950 py-2 font-black text-rose-300 active:scale-90"
        >
          <Flame className="h-5 w-5 text-rose-400 animate-bounce" />
          <span className="text-[10px] tracking-wider">NITRO WARP</span>
        </button>

        <button
          type="button"
          onClick={() => moveLane(1)}
          className="rounded-2xl border border-cyan-500/40 bg-cyan-950/40 py-4 text-center font-black text-cyan-300 active:scale-90"
        >
          STEER RIGHT ▶️
        </button>
      </div>

      {/* Telemetry Log */}
      <div className="mt-3 w-full rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-center text-[11px] font-bold text-cyan-200">
        {msg}
      </div>
    </div>
  );
}