"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  declareWhot,
  drawCard,
  freshWhotGame,
  legalPlays,
  playCard,
  stallWinner,
  type ShapeCall,
  type WhotCard,
  type WhotEffect,
  type WhotGameState,
} from "@/lib/whot/engine";
import { botPlayDelay, botThinkDelay, botReaction, chooseBotAction, SEATS, thinkSuffix } from "@/lib/whot/bots";
import {
  ENTRY,
  POT,
  TURN_SECONDS,
  haptic,
  setWhotMuted,
  whotCall,
  whotDraw,
  whotError,
  whotSelect,
  whotSlap,
  whotTick,
  whotWin,
  whotWinSting,
} from "@/lib/whot/sensory";
import { SHAPE_COLOR, SHAPE_LABEL } from "@/lib/whot/engine";
import { WhotTopBar } from "./WhotTopBar";
import { WhotPods } from "./WhotPods";
import { WhotCenter } from "./WhotCenter";
import { WhotHand } from "./WhotHand";
import { WhotControls } from "./WhotControls";
import { WhotShapeModal } from "./WhotShapeModal";

/**
 * WhotGame — the 4-player match orchestrator and 4D sensory hub.
 *
 * Flow: deal overlay (entry stake) → live table → win screen. Every turn
 * is a locked sequence: bots think on variable delays, declare WHOT at one
 * card, then shed or draw. Plays trigger a parabolic card flight from the
 * actor's seat into the discard with a glowing trail; haptics + synthesised
 * audio fire per effect; the active seat's rim light breathes; shimmer
 * particles float over the felt; the table parallaxes to pointer and
 * gyroscope. A 20 s house clock ticks audibly and auto-plays for you.
 */
type Phase = "deal" | "play" | "win";

export function WhotGame({
  balance,
  onWin,
  onLose,
}: {
  balance: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("deal");
  const [game, setGame] = useState<WhotGameState>(() => freshWhotGame());
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Entry 100 coins — tap Deal to play.");
  const [clock, setClock] = useState(TURN_SECONDS);
  const [soundOn, setSoundOn] = useState(true);
  const [motionOn, setMotionOn] = useState(false);
  const [sortMode, setSortMode] = useState<"value" | "shape">("value");
  const [chatOpen, setChatOpen] = useState(false);
  const [humanEmoji, setHumanEmoji] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<number, string | null>>({});
  const [whotModal, setWhotModal] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tilt, setTilt] = useState("rotateX(0deg) rotateY(0deg)");

  const gameRef = useRef(game);
  gameRef.current = game;
  const busyRef = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const timersRef = useRef<number[]>([]);
  const claimedRef = useRef(false);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const flightLayerRef = useRef<HTMLDivElement | null>(null);
  const reactionTimersRef = useRef<Record<number, number>>({});

  /** Schedule work inside the current turn sequence (all cleared on exit). */
  const later = useCallback((fn: () => void, ms: number): number => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const id = window.setTimeout(() => setToast(null), 1700);
    timersRef.current.push(id);
  }, []);

  /* ── 3D Spatial dimension: parabolic card flight ─────────────────────── */

  /**
   * Fly a visual card from a seat's hand position into the discard pile on
   * a parabolic arc with a glowing trail, then land it with a slap.
   */
  const flyCard = useCallback(
    (card: WhotCard, fromSeat: number) => {
      const layer = flightLayerRef.current;
      const target = discardRef.current;
      if (!layer || !target) return;
      const tRect = target.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();

      let sx: number;
      let sy: number;
      if (fromSeat === 0) {
        const el = document.querySelector<HTMLElement>(`[data-card="${card.id}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          sx = r.left - layerRect.left + r.width / 2;
          sy = r.top - layerRect.top + r.height / 2;
        } else {
          sx = layerRect.width / 2;
          sy = layerRect.height - 30;
        }
      } else {
        const el = document.querySelector<HTMLElement>(`[data-seat="${fromSeat}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          sx = r.left - layerRect.left + r.width / 2;
          sy = r.top - layerRect.top + r.height / 2;
        } else {
          sx = layerRect.width / 2;
          sy = 60;
        }
      }
      const ex = tRect.left - layerRect.left + tRect.width / 2;
      const ey = tRect.top - layerRect.top + tRect.height / 2;

      const mote = document.createElement("div");
      mote.style.cssText = `position:absolute;left:0;top:0;width:54px;height:78px;border-radius:8px;
        background:linear-gradient(160deg,#FFFDF6,#F5EFE0);border:1.5px solid ${SHAPE_COLOR[card.shape]};
        box-shadow:0 0 22px ${SHAPE_COLOR[card.shape]}cc, 0 8px 16px rgba(0,0,0,.5);
        display:grid;place-items:center;font-weight:900;font-size:22px;color:${SHAPE_COLOR[card.shape]};
        will-change:transform,opacity;pointer-events:none;z-index:90;`;
      mote.textContent = card.shape === "whot" ? "👑" : String(card.value);
      layer.appendChild(mote);

      const midX = (sx + ex) / 2;
      const arcY = Math.min(sy, ey) - 90; // parabola apex
      const anim = mote.animate(
        [
          { transform: `translate(${sx - 27}px, ${sy - 39}px) rotate(-8deg) scale(1)`, opacity: 1 },
          { transform: `translate(${midX - 27}px, ${arcY - 39}px) rotate(160deg) scale(1.15)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${ex - 27}px, ${ey - 39}px) rotate(358deg) scale(.96)`, opacity: 1 },
        ],
        { duration: 620, easing: "cubic-bezier(.35,.02,.28,1)" },
      );
      anim.onfinish = () => {
        mote.remove();
        if (soundOn) whotSlap();
        haptic("slap");
      };
    },
    [soundOn],
  );

  /* ── Effect → sensory routing (Sound + Touch + Atmosphere) ─────────── */

  const celebrate = useCallback((seat: number) => {
    confetti({ particleCount: 160, spread: 95, origin: { y: 0.6 }, colors: ["#F59E0B", "#E11D48", "#2563EB", "#16A34A"] });
    window.setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 350);
    haptic("win");
    if (soundOn) { whotWinSting(); whotWin(); }
    if (seat === 0) onWin(POT);
  }, [soundOn, onWin]);

  const throwReaction = useCallback((seat: number) => {
    const emoji = botReaction(seat);
    if (!emoji) return;
    setReactions((r) => ({ ...r, [seat]: emoji }));
    window.clearTimeout(reactionTimersRef.current[seat]);
    reactionTimersRef.current[seat] = window.setTimeout(
      () => setReactions((r) => ({ ...r, [seat]: null })),
      1600,
    );
  }, []);

  /** Turn effects → status lines + sound/haptic cues. Returns the headline. */
  const narrate = useCallback(
    (effects: WhotEffect[]): string => {
      const lines: string[] = [];
      for (const e of effects) {
        switch (e.type) {
          case "hold":
            lines.push(`${SEATS[e.seat]!.name} holds on — plays again!`);
            if (soundOn) whotSelect();
            break;
          case "pick":
            if (e.seat === e.victim) lines.push(`${SEATS[e.seat]!.name} absorbs ${e.count} cards.`);
            else lines.push(`${SEATS[e.victim]!.name} picks ${e.count}!`);
            if (soundOn) whotDraw();
            break;
          case "skip":
            lines.push(`${SEATS[e.victim]!.name} misses a turn!`);
            break;
          case "market-all":
            lines.push(`General market! Everyone draws.`);
            if (soundOn) whotDraw();
            break;
          case "whot-call":
            lines.push(`${SEATS[e.seat]!.name} calls ${SHAPE_LABEL[e.shape]}s!`);
            if (soundOn) whotCall();
            haptic("call");
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.55 }, colors: ["#F59E0B", "#FDE68A"], scalar: 0.7 });
            break;
          case "declare":
            lines.push(`${SEATS[e.seat]!.name} calls WHOT!`);
            if (soundOn) whotCall();
            haptic("call");
            break;
          case "reshuffle":
            lines.push(`The market reshuffles.`);
            break;
          case "win":
            break;
        }
      }
      return lines[0] ?? "";
    },
    [soundOn],
  );

  /* ── Turn engine ───────────────────────────────────────────────────── */

  /** Apply one engine step, route sensory FX, fly the card, handle wins. */
  const commitStep = useCallback(
    (seat: number, step: { state: WhotGameState; effects: WhotEffect[] } | null, card?: WhotCard) => {
      if (!step) return false;
      busyRef.current = false;
      setBusy(false);
      setGame(step.state);
      gameRef.current = step.state;

      if (card) flyCard(card, seat);
      else if (soundOn) whotDraw();

      const headline = narrate(step.effects);
      if (headline) setStatus(headline);

      const win = step.effects.find((e) => e.type === "win");
      if (win && win.type === "win") {
        const wSeat = win.seat;
        later(() => {
          setWinner(wSeat);
          setPhase("win");
          celebrate(wSeat);
        }, 900);
        return true;
      }

      // A punishing pick on another seat earns the attacker a reaction.
      const pick = step.effects.find((e) => e.type === "pick" && e.seat !== e.victim);
      if (pick && pick.type === "pick") throwReaction(pick.seat);
      return true;
    },
    [flyCard, narrate, later, celebrate, soundOn, throwReaction],
  );

  /** Human: play the selected card (WHOT 20 opens the shape modal first). */
  const tryHumanPlay = useCallback(
    (cardId: string, shape?: ShapeCall) => {
      const state = gameRef.current;
      const card = state.players[0]?.hand.find((c) => c.id === cardId);
      if (!card || busyRef.current || state.turn !== 0 || state.winner !== null) return;
      if (card.value === 20 && shape === undefined) {
        setSelected(cardId);
        setWhotModal(true);
        return;
      }
      const step = playCard(state, 0, cardId, shape);
      if (!step) {
        if (state.players[0] && state.players[0].hand.length === 1 && !state.players[0].called) {
          showToast("Call WHOT first!");
        } else if (state.pendingPick > 0) {
          showToast(`Take ${state.pendingPick} or stack ${state.pendingKind}s!`);
        } else {
          showToast("Can't play that card.");
        }
        if (soundOn) whotError();
        haptic("error");
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setSelected(null);
      commitStep(0, step, card);
    },
    [commitStep, showToast, soundOn],
  );

  /** Human: Pass → market (absorbs any pending pick pile). */
  const tryHumanDraw = useCallback(() => {
    if (busyRef.current) return;
    const state = gameRef.current;
    if (state.turn !== 0 || state.winner !== null) return;
    busyRef.current = true;
    setBusy(true);
    setSelected(null);
    commitStep(0, drawCard(state, 0));
  }, [commitStep]);

  /** Human: declare WHOT at one card. */
  const tryHumanDeclare = useCallback(() => {
    if (busyRef.current) return;
    const step = declareWhot(gameRef.current, 0);
    if (!step) {
      showToast("You can only call at one card.");
      return;
    }
    setGame(step.state);
    gameRef.current = step.state;
    narrate(step.effects);
    setStatus("You call WHOT! Shed that last card.");
    confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 }, colors: ["#F59E0B", "#FDE68A"], scalar: 0.7 });
  }, [narrate, showToast]);

  /* ── Bot driver: "David is thinking…" → declare → play/draw ─────────── */

  const runBotTurn = useCallback(
    (seat: number) => {
      busyRef.current = true;
      setBusy(true);
      setStatus(`${SEATS[seat]!.name} ${thinkSuffix(seat)}`);
      later(() => {
        const state = gameRef.current;
        if (phaseRef.current !== "play" || state.turn !== seat || state.winner !== null) {
          busyRef.current = false;
          setBusy(false);
          return;
        }
        const me = state.players[seat]!;

        // Bots declare WHOT automatically when down to their final card.
        if (me.hand.length === 1 && !me.called) {
          const decl = declareWhot(state, seat);
          if (decl) {
            setGame(decl.state);
            gameRef.current = decl.state;
            narrate(decl.effects);
            setStatus(`${SEATS[seat]!.name} calls WHOT!`);
          }
        }

        later(() => {
          const s2 = gameRef.current;
          if (phaseRef.current !== "play" || s2.turn !== seat || s2.winner !== null) {
            busyRef.current = false;
            setBusy(false);
            return;
          }
          const action = chooseBotAction(s2, seat);
          if (action.kind === "play") {
            const card = s2.players[seat]!.hand.find((c) => c.id === action.cardId);
            const step = playCard(s2, seat, action.cardId, action.shape);
            commitStep(seat, step, card);
          } else {
            commitStep(seat, drawCard(s2, seat));
          }
        }, botPlayDelay(seat));
      }, botThinkDelay(seat));
    },
    [commitStep, later, narrate],
  );

  /* ── Effects wiring: bot turns, stall watchdog, turn clock, tilt ───── */

  useEffect(() => {
    if (phase !== "play" || winner !== null || busy) return;
    if (game.turn === 0) {
      setStatus(game.pendingPick > 0 ? `Take ${game.pendingPick} cards or stack!` : "Your turn — match or draw.");
      return;
    }
    runBotTurn(game.turn);
  }, [phase, game.turn, winner, busy, runBotTurn, game.pendingPick]);

  // Stall watchdog: dry table for a full lap → fewest cards takes it.
  useEffect(() => {
    if (phase !== "play" || winner !== null) return;
    const w = stallWinner(game);
    if (w === null) return;
    setWinner(w);
    setPhase("win");
    celebrate(w);
  }, [phase, game, winner, celebrate]);

  // Turn clock: tick audibly in the final stretch; house plays on expiry.
  useEffect(() => {
    if (phase !== "play" || winner !== null || busy) return;
    setClock(TURN_SECONDS);
    const iv = window.setInterval(() => {
      setClock((c) => {
        const next = c - 1;
        if (next <= 5 && next > 0 && soundOn) whotTick(next <= 2);
        if (next <= 0) {
          if (gameRef.current.turn === 0) {
            setStatus("Time! The house draws for you.");
            tryHumanDraw();
          }
          return TURN_SECONDS;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [phase, game.turn, busy, winner, soundOn, tryHumanDraw]);

  // Spatial dimension: pointer + gyroscope parallax tilt of the whole table.
  const tiltTargetRef = useRef({ rx: 0, ry: 0 });
  const tiltFrameRef = useRef(0);
  const applyTilt = useCallback(() => {
    tiltFrameRef.current = 0;
    const { rx, ry } = tiltTargetRef.current;
    setTilt(`rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
  }, []);
  const onTablePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tiltTargetRef.current = { rx: -py * 8, ry: px * 10 };
      if (!tiltFrameRef.current) tiltFrameRef.current = requestAnimationFrame(applyTilt);
    },
    [applyTilt],
  );

  useEffect(() => {
    if (!motionOn || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const handler = (e: DeviceOrientationEvent) => {
      const beta = Math.max(-16, Math.min(16, (e.beta ?? 0) - 40)) * 0.4;
      const gamma = Math.max(-16, Math.min(16, e.gamma ?? 0)) * 0.45;
      tiltTargetRef.current = { rx: beta, ry: gamma };
      if (!tiltFrameRef.current) tiltFrameRef.current = requestAnimationFrame(applyTilt);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [motionOn, applyTilt]);

  /* ── Lifecycle ─────────────────────────────────────────────────────── */

  const startMatch = useCallback(() => {
    clearTimers();
    const fresh = freshWhotGame();
    setGame(fresh);
    gameRef.current = fresh;
    setWinner(null);
    setSelected(null);
    setPhase("play");
    setBusy(false);
    busyRef.current = false;
    setStatus("Cards dealt — your move!");
    if (!claimedRef.current) {
      claimedRef.current = true;
      onLose(ENTRY);
    }
    haptic("tap");
    if (soundOn) whotDraw();
  }, [clearTimers, onLose, soundOn]);

  const restart = useCallback(() => {
    claimedRef.current = false;
    startMatch();
  }, [startMatch]);

  const leave = useCallback(() => {
    clearTimers();
    router.push("/games");
  }, [clearTimers, router]);

  useEffect(
    () => () => {
      clearTimers();
      Object.values(reactionTimersRef.current).forEach((id) => window.clearTimeout(id));
    },
    [clearTimers],
  );

  const toggleSound = () => {
    setSoundOn((v) => {
      setWhotMuted(v); // flipping off → muted
      return !v;
    });
    haptic("tap");
  };

  const toggleMotion = () => {
    const win = window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } };
    const DOE = win.DeviceOrientationEvent;
    if (!motionOn && DOE && typeof DOE.requestPermission === "function") {
      void DOE.requestPermission()
        .then((res) => {
          if (res === "granted") setMotionOn(true);
          else showToast("Motion permission denied.");
        })
        .catch(() => showToast("Motion unavailable."));
      return;
    }
    setMotionOn((v) => !v);
  };

  const myTurn = game.turn === 0 && phase === "play" && winner === null && !busy;
  const legal = myTurn ? legalPlays(game, 0) : [];
  const legalIds = new Set(legal.map((c) => c.id));
  const selectedLegal = selected !== null && legalIds.has(selected);
  const mustDeclare = myTurn && (game.players[0]?.hand.length ?? 9) === 1 && !game.players[0]?.called;

  const thinking = busy && game.turn !== 0 && phase === "play" && winner === null ? status : null;

  return (
    <div className="relative flex h-[640px] max-h-[78vh] w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl">
      <div className="px-3 pt-3">
        <WhotTopBar
          soundOn={soundOn}
          motionOn={motionOn}
          onToggleSound={toggleSound}
          onToggleMotion={toggleMotion}
          onRestart={restart}
          onLeave={leave}
        />
      </div>

      {/* Status strip + turn clock */}
      <div className="mx-3 mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-1.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${myTurn ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${myTurn ? "bg-emerald-400" : "bg-amber-400"}`} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/85">{status}</span>
        {phase === "play" && winner === null ? (
          <span className={`shrink-0 rounded-full px-2 py-[2px] text-[10px] font-black tabular-nums ${clock <= 5 ? "animate-pulse bg-rose-500/80 text-white" : "bg-white/10 text-white/70"}`}>
            {clock}s
          </span>
        ) : null}
      </div>

      {/* ── The radial felt table ── */}
      <div
        className="relative mx-3 mt-2 min-h-0 flex-1 touch-none overflow-hidden rounded-3xl border border-emerald-900/40"
        style={{
          background: "radial-gradient(ellipse at 50% 42%, #14532D 0%, #0B2E1A 55%, #06170E 100%)",
          transform: tilt,
          transformStyle: "preserve-3d",
          transition: "transform .18s ease-out",
        }}
        onPointerMove={onTablePointer}
      >
        {/* Atmosphere dimension: floating shimmer particles */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => {
            const left = (i * 7.3 + 4) % 96;
            const top = (i * 13.7 + 6) % 88;
            const size = 2 + (i % 3);
            return (
              <span
                key={i}
                className="absolute animate-pulse rounded-full bg-amber-200/70"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  animationDuration: `${2.4 + (i % 5) * 0.7}s`,
                  animationDelay: `${(i % 7) * 0.4}s`,
                  boxShadow: "0 0 6px rgba(253,230,138,.8)",
                }}
              />
            );
          })}
        </div>

        {/* Active seat rim light washing over the felt */}
        {winner === null && phase === "play" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-all duration-700"
            style={{
              background: `radial-gradient(circle at ${game.turn === 1 ? "12%" : game.turn === 3 ? "88%" : game.turn === 2 ? "50% -4%" : "50% 104%"}, ${SEATS[game.turn]!.ring}33 0%, transparent 46%)`,
            }}
          />
        ) : null}

        <WhotPods state={game} turn={game.turn} thinking={thinking} reactions={reactions} />
        <WhotCenter state={game} discardRef={discardRef} />

        {/* 3D card-flight layer (parabolic arcs into the discard) */}
        <div ref={flightLayerRef} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>

      {/* Your hand + action bar */}
      <div className="px-3">
        <WhotHand
          state={game}
          tilt=""
          selected={selected}
          sortMode={sortMode}
          chatOpen={chatOpen}
          reaction={humanEmoji}
          onSelect={(id) => {
            if (!myTurn) return;
            if (!legalIds.has(id)) {
              if (soundOn) whotError();
              haptic("error");
              showToast(explainIllegal(game, id));
              return;
            }
            setSelected((cur) => (cur === id ? null : id));
            if (soundOn) whotSelect();
            haptic("select");
          }}
          onSort={() => {
            setSortMode((m) => (m === "value" ? "shape" : "value"));
            haptic("tap");
          }}
          onToggleChat={() => {
            setChatOpen((v) => !v);
            haptic("tap");
          }}
          onSendEmoji={(e) => {
            setHumanEmoji(e);
            setChatOpen(false);
            haptic("tap");
            window.setTimeout(() => setHumanEmoji(null), 1500);
          }}
        />
        <WhotControls
          myTurn={myTurn}
          hasSelection={selected !== null}
          canPlaySelection={selectedLegal}
          mustDeclare={mustDeclare}
          pendingPick={game.pendingPick}
          busy={busy}
          onPlay={() => {
            haptic("tap");
            if (selected) tryHumanPlay(selected);
          }}
          onCall={() => {
            haptic("call");
            tryHumanDeclare();
          }}
          onPass={() => {
            haptic("tap");
            tryHumanDraw();
          }}
        />
      </div>
      {/* WHOT wild-card shape picker */}
      {whotModal && selected ? (
        <WhotShapeModal
          onPick={(shape) => {
            setWhotModal(false);
            const id = selected;
            setSelected(null);
            tryHumanPlay(id, shape);
          }}
        />
      ) : null}

      {/* Deal overlay */}
      {phase === "deal" ? (
        <div className="absolute inset-0 z-[85] grid place-items-center bg-black/75 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-amber-400/40 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 text-2xl shadow-[0_0_24px_rgba(245,158,11,.65)]">
              👑
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-amber-300">Whot 4 Players</h2>
            <p className="mt-1 text-[11px] font-semibold text-white/55">
              Entry {ENTRY} coins · Winner takes {POT}
            </p>
            <div className="mt-4 flex flex-wrap -justify-center gap-1">
              {[0, 1, 2, 3].map((s) => (
                <span
                  key={s}
                  className="rounded-full border px-2 py-[3px] text-[9px] font-black"
                  style={{ borderColor: SEATS[s]!.ring, color: SEATS[s]!.ring }}
                >
                  {SEATS[s]!.name}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={startMatch}
              className="mt-5 w-full rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-600/40 transition hover:from-orange-300 hover:to-orange-500 active:scale-95"
            >
              Deal Cards
            </button>
            <p className="mt-2 text-[10px] font-semibold text-white/40">Stake is deducted from your wallet.</p>
          </div>
        </div>
      ) : null}
      {/* Win overlay */}
      {phase === "win" && winner !== null ? (
        <div className="absolute inset-0 z-[85] grid place-items-center bg-black/78 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-amber-400/50 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center shadow-2xl">
            <div className="text-4xl">{winner === 0 ? "🏆" : "🃏"}</div>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-white">
              {winner === 0 ? "You win!" : `${SEATS[winner]!.name} wins!`}
            </h2>
            <p className="mt-1 text-sm font-bold text-amber-300">
              {winner === 0 ? `+${POT} coins` : `Pot lost — ${SEATS[winner]!.name} shed the last card.`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] font-bold text-white/60">
              {[0, 1, 2, 3].map((s) => (
                <span key={s}>
                  {SEATS[s]!.name}: {game.players[s]?.hand.length ?? 0}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-5 w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-600/40 transition hover:from-emerald-300 hover:to-emerald-500 active:scale-95"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={leave}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-black uppercase tracking-wide text-white/80 transition hover:bg-white/10 active:scale-95"
            >
              Back to Games
            </button>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-[90] -translate-x-1/2 whitespace-nowrap rounded-full border border-rose-400/40 bg-rose-950/90 px-4 py-1.5 text-[11px] font-black text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/** Why can't this card be played? — precise coaching for illegal taps. */
function explainIllegal(game: WhotGameState, cardId: string): string {
  const card = game.players[0]?.hand.find((c) => c.id === cardId);
  if (!card) return "Can't play that card.";
  if (game.pendingPick > 0) return `Stack ${game.pendingKind}s or take ${game.pendingPick}!`;
  if (card.value === 20) return "Pick a shape first.";
  return "Match the number or the called shape.";
}




