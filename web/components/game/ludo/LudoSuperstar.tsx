"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import {
  applyMove,
  freshGame,
  movableTokens,
  rollDice,
  SAFE_CELLS,
  trackCell,
  type LudoColor,
  type LudoGameState,
  type LudoRules,
} from "@/lib/ludo/engine";
import { potFor, TURN_SECONDS } from "@/lib/ludo/match";
import { SEATS, botMoveDelay, botReaction, botThinkDelay, chooseBotMove, thinkSuffix } from "@/lib/ludo/bots";
import {
  announceRoll,
  narrateMove,
  playCapture,
  playHomeFanfare,
  playSafeChime,
  playWoodRoll,
  primeAudio,
  setAudioMuted,
} from "@/lib/game/ludoAudio";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LudoBoard, TempleSeed } from "./LudoBoard";
import { soundEngine } from "./soundEngine";
import { LudoSeedCustomizerModal } from "./LudoSeedCustomizerModal";
import { LudoStatusBar, type EmojiBurst } from "./LudoStatusBar";
import { LudoTopBar } from "./LudoTopBar";
import { LudoLobby, LudoWinScreen, type LudoMode } from "./LudoLobby";

type Phase = "menu" | "board" | "win";

const COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047"];
function colorOf(c: number) { return COLORS[c] || "#888"; }

function AAADiceCube({ dice, rolling, canRoll, onRoll }: { dice: number; rolling: boolean; canRoll: boolean; onRoll: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onRoll}
      disabled={!canRoll || rolling}
      className={"relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 shadow-2xl transition-all " + (canRoll && !rolling ? "border-cyan-400 shadow-cyan-500/60 cursor-pointer hover:scale-110" : "border-white/20 opacity-90 cursor-default")}
      animate={rolling ? { rotateX: [0, 360, 720, 1080], rotateY: [0, 360, 720, 1080], scale: [1, 1.25, 0.9, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <span className="text-2xl font-black text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
        {rolling ? "🎲" : dice || "🎲"}
      </span>
      {canRoll && !rolling && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
        </span>
      )}
    </motion.button>
  );
}

function PlayerCornerCard({
  color,
  name,
  isCurrent,
  isYou,
  dice,
  rolling,
  canRoll,
  onRoll,
  photoUrl,
}: {
  color: number;
  name: string;
  isCurrent: boolean;
  isYou: boolean;
  dice: number;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  photoUrl?: string | null;
}) {
  const primary = colorOf(color);

  return (
    <div className={"relative flex items-center gap-3 px-3 py-2 rounded-2xl border-2 backdrop-blur-md transition-all " + (isCurrent ? "bg-slate-900/95 shadow-[0_0_25px_rgba(34,211,238,0.35)] scale-[1.03]" : "bg-slate-950/75 opacity-80")} style={{ borderColor: isCurrent ? "#22d3ee" : primary }}>
      <div className="relative w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0 border-2 border-white/40 overflow-hidden" style={{ backgroundColor: primary }}>
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <TempleSeed color={color} size={22} />
        )}
      </div>

      <div className="flex flex-col min-w-[80px]">
        <span className="text-xs font-black text-white truncate max-w-[100px]">{isYou ? "YOU" : name}</span>
        <span className={"text-[10px] font-bold " + (isCurrent ? "text-cyan-300 animate-pulse" : "text-slate-400")}>
          {isCurrent ? "Playing..." : "Waiting"}
        </span>
      </div>

      <AnimatePresence>
        {isCurrent && (
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="absolute -right-3.5 z-30">
            <AAADiceCube dice={dice} rolling={rolling} canRoll={canRoll} onRoll={onRoll} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LudoSuperstar({
  balance,
  onWin,
  onLose,
}: {
  balance: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<LudoMode>("cpu");
  const [rules, setRules] = useState<LudoRules>("classic");
  const [names, setNames] = useState<string[]>(["You", SEATS[1].name, SEATS[2].name, SEATS[3].name]);
  const [bet, setBet] = useState(100);
  const [game, setGame] = useState<LudoGameState>(() => freshGame());
  const [selectable, setSelectable] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pick a mode and stake to play.");
  
  const clockRef = useRef(TURN_SECONDS);
  const [soundOn, setSoundOn] = useState(true);
  const [bursts, setBursts] = useState<EmojiBurst[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [winnerSeat, setWinnerSeat] = useState<LudoColor | null>(null);

  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([null, null, null, null]);
  const [seedCustom, setSeedCustom] = useState<{ animal?: string | null; color?: string | null } | null>(null);
  const [seedCustomOpen, setSeedCustomOpen] = useState(false);
  const [boardTheme, setBoardTheme] = useState<"Aero" | "Classic">("Aero");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    let alive = true;
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (!alive || !uid) return;
      sb.from("profiles").select("photos, ludo_seed, ludo_seed_color").eq("user_id", uid).maybeSingle().then(({ data: row }) => {
        const photos = (row as { photos?: Array<{ storagePath?: string; publicUrl?: string }> | null } | null)?.photos;
        if (!alive || !Array.isArray(photos) || photos.length === 0) return;
        const primary = photos[0]!;
        const stored = typeof primary.publicUrl === "string" ? primary.publicUrl.trim() : "";
        const path = typeof primary.storagePath === "string" ? primary.storagePath.trim() : "";
        const url = stored || (path ? sb.storage.from("photos").getPublicUrl(path).data.publicUrl : "");
        if (!url) return;
        setPhotoUrls((prev) => {
          const next = [...prev];
          next[0] = url;
          return next;
        });
        setSeedCustom({
          animal: (row as { ludo_seed?: string | null })?.ludo_seed ?? null,
          color: (row as { ludo_seed_color?: string | null })?.ludo_seed_color ?? null,
        });
      });
    });
    return () => { alive = false; };
  }, []);

  const activeSeats: LudoColor[] = mode === "duo" ? [0, 2] : [0, 1, 2, 3];
  const players = activeSeats.length;
  const pot = potFor(bet, players);
  const gameRef = useRef(game);
  const busyRef = useRef(false);
  const rollingRef = useRef(false);
  const selectableRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>(phase);
  const claimedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const burstIdRef = useRef(0);

  useEffect(() => {
    gameRef.current = game;
    rollingRef.current = rolling;
    selectableRef.current = selectable;
    phaseRef.current = phase;
  }, [game, rolling, selectable, phase]);

  const later = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = (): void => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  const isBot = (c: LudoColor): boolean => mode === "cpu" && c !== 0;
  const dName = (c: LudoColor): string => names[c] ?? SEATS[c].name;

  const pushBurst = (emoji: string): void => {
    soundEngine.playEmojiAudio(emoji);
    const id = (burstIdRef.current += 1);
    setBursts((b) => [...b, { id, emoji }]);
    later(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
  };

  const showToast = (msg: string, ms = 1200): void => {
    setToast(msg);
    later(() => setToast(null), ms);
  };

  const finishTurn = (color: LudoColor): void => {
    const at = activeSeats.indexOf(color);
    const next = activeSeats[(at + 1) % activeSeats.length]!;
    setGame((g) => ({ ...g, turn: next, canRoll: true, consecutiveSixes: 0 }));
    setStatus(dName(next) + " to roll…");
    busyRef.current = false;
    setBusy(false);
  };

  const finishMatch = (winner: LudoColor): void => {
    playHomeFanfare(true);
    const localSide = mode !== "cpu" || winner === 0;
    setWinnerSeat(winner);
    if (localSide && !claimedRef.current) {
      claimedRef.current = true;
      onWin(pot);
      confetti({ particleCount: 110, spread: 78, origin: { y: 0.55 } });
    }
    later(() => {
      setPhase("win");
      busyRef.current = false;
      setBusy(false);
    }, 950);
  };

  const playToken = (color: LudoColor, idx: number, d: number): void => {
    const g = JSON.parse(JSON.stringify(gameRef.current)) as LudoGameState;
    const res = applyMove(g, color, idx, d);
    setSelectable([]);
    selectableRef.current = [];
    narrateMove(d);
    if (res.captured) {
      playCapture();
      soundEngine.announceCapture();
    }
    if (res.finished) {
      playHomeFanfare(false);
      soundEngine.announceHome();
    }
    if (!res.captured && !res.finished) {
      const cell = trackCell(color, g.players[color]!.tokens[idx]!.steps);
      if (cell !== null && SAFE_CELLS.has(cell)) playSafeChime();
    }
    setGame(g);
    const nm = dName(color);
    setStatus(
      res.captured
        ? nm + " captured a seed! 😈"
        : res.finished
          ? nm + " sent a seed home! 🏠"
          : nm + " moved " + d + " square" + (d === 1 ? "" : "s") + ".",
    );
    later(
      () => {
        const w = g.winner;
        if (w !== null) {
          finishMatch(w);
          return;
        }
        if (res.extraTurn) {
          setGame((x) => ({ ...x, canRoll: true }));
          setStatus(isBot(color) ? SEATS[color].name + " rolls again!" : nm + " gets another roll!");
          busyRef.current = false;
          setBusy(false);
          return;
        }
        finishTurn(color);
      },
      res.captured || res.finished ? 950 : 700,
    );
  };

  const resolveRoll = (color: LudoColor, d: number): void => {
    const g = gameRef.current;
    if (d === 6 && g.consecutiveSixes >= 3) {
      setStatus("Three sixes in a row — " + dName(color) + " forfeits the turn!");
      later(() => finishTurn(color), 1200);
      return;
    }
    const opts = movableTokens(g, color, d);
    if (opts.length === 0) {
      showToast("No valid moves — passing turn", 1200);
      busyRef.current = false;
      setBusy(false);
      rollingRef.current = false;
      setRolling(false);
      setStatus(dName(color) + " can't move — the turn passes.");
      later(() => finishTurn(color), 1200);
      return;
    }
    if (opts.length === 1) {
      later(() => playToken(color, opts[0]!, d), 320);
      return;
    }
    if (isBot(color)) {
      setStatus(SEATS[color].name + " " + thinkSuffix(color));
      later(() => playToken(color, chooseBotMove(g, color, d) ?? opts[0]!, d), botMoveDelay(color));
      return;
    }
    setSelectable(opts);
    setStatus("Tap a glowing seed to move " + d + ".");
    busyRef.current = false;
    setBusy(false);
  };

  const runRoll = (color: LudoColor): void => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setRolling(true);
    rollingRef.current = true;
    clockRef.current = TURN_SECONDS;
    setStatus(isBot(color) ? SEATS[color].name + " rolls the dice…" : dName(color) + " rolls the dice…");
    playWoodRoll();
    later(() => {
      const d = rollDice();
      setRolling(false);
      rollingRef.current = false;
      setGame((prev) => ({
        ...prev,
        dice: d,
        canRoll: false,
        consecutiveSixes: d === 6 ? prev.consecutiveSixes + 1 : 0,
      }));
      setStatus(dName(color) + " rolled a " + d + (d === 6 ? " 🔥" : ""));
      announceRoll(d);
      later(() => resolveRoll(color, d), 460);
    }, 1000);
  };

  const houseAct = (): void => {
    if (busyRef.current || rollingRef.current || phaseRef.current !== "board") return;
    const g = gameRef.current;
    if (g.winner !== null) return;
    if (g.canRoll) {
      runRoll(g.turn);
      return;
    }
    const opts = selectableRef.current;
    if (opts.length > 0) {
      busyRef.current = true;
      setBusy(true);
      playToken(g.turn, opts[0]!, g.dice);
    }
  };

  const pickToken = (i: number): void => {
    if (rollingRef.current || busyRef.current) return;
    const g = gameRef.current;
    if (g.winner !== null || !selectableRef.current.includes(i)) return;
    busyRef.current = true;
    setBusy(true);
    playToken(g.turn, i, g.dice);
  };

  const handleRoll = (): void => {
    if (!humanCanAct) return;
    primeAudio();
    runRoll(game.turn);
  };

  const start = (): void => {
    if (balance < bet) return;
    clearTimers();
    primeAudio();
    setAudioMuted(!soundOn);
    soundEngine.setMuted(!soundOn);
    claimedRef.current = false;
    busyRef.current = false;
    setBusy(false);
    setRolling(false);
    rollingRef.current = false;
    setSelectable([]);
    selectableRef.current = [];
    setWinnerSeat(null);
    setGame(freshGame(0, rules));
    clockRef.current = TURN_SECONDS;
    setStatus("Your move — tap the dice on your card to roll.");
    onLose(bet);
    setPhase("board");
  };

  const playAgain = (): void => {
    if (balance < bet) {
      setPhase("menu");
      return;
    }
    start();
  };

  const restart = playAgain;
  const leave = (): void => {
    clearTimers();
    busyRef.current = false;
    setBusy(false);
    setPhase("menu");
    router.push("/games");
  };

  const toggleSound = (): void => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioMuted(!next);
    soundEngine.setMuted(!next);
  };

  useEffect(() => {
    if (phase !== "board" || mode !== "cpu" || game.winner !== null) return;
    const c = game.turn;
    if (c === 0) return;
    if (!game.canRoll || rolling || busy || selectable.length > 0) return;
    const id = window.setTimeout(() => {
      setStatus(SEATS[c].name + " " + thinkSuffix(c));
      runRoll(c);
    }, botThinkDelay(c));
    return () => window.clearTimeout(id);
  }, [phase, mode, game.turn, game.canRoll, game.winner, rolling, busy, selectable.length]);

  useEffect(() => {
    if (phase !== "board" || game.winner !== null) return;
    if (mode === "cpu" && game.turn !== 0) return;
    const id = window.setInterval(() => {
      const c = clockRef.current;
      if (c <= 1) {
        window.clearInterval(id);
        clockRef.current = 0;
        window.setTimeout(() => houseAct(), 0);
        return;
      }
      clockRef.current = c - 1;
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, game.turn, mode, game.winner]);

  const humanSeatTurn = mode !== "cpu" || game.turn === 0;
  const humanCanAct =
    phase === "board" && game.winner === null && !rolling && !busy && game.canRoll && humanSeatTurn;
  const sel = phase === "board" && humanSeatTurn && !rolling && !busy ? selectable : [];
  const thinking = phase === "board" && isBot(game.turn) && busy;
  const youWon = winnerSeat !== null && (mode !== "cpu" || winnerSeat === 0);
  const winnerName = winnerSeat !== null ? dName(winnerSeat) : "";

  return (
    <div className="relative mx-auto w-full max-w-md h-[100dvh] flex flex-col justify-between overflow-hidden select-none bg-[#090D1A] text-white">
      <LudoTopBar
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onRestart={restart}
        onLeave={leave}
        onCustomizeSeed={() => setSeedCustomOpen(true)}
      />

      {phase === "board" && (
        <div className="flex justify-center items-center py-1 z-20">
          <div className="flex items-center gap-1 bg-[#121A33] px-2.5 py-0.5 rounded-full border border-white/10 shadow">
            <button 
              onClick={() => setBoardTheme("Aero")}
              className={"px-3 py-0.5 rounded-full text-[10px] font-bold transition-all " + (boardTheme === "Aero" ? "bg-blue-600 text-white shadow-md" : "text-gray-400")}
            >
              Aero
            </button>
            <button 
              onClick={() => setBoardTheme("Classic")}
              className={"px-3 py-0.5 rounded-full text-[10px] font-bold transition-all " + (boardTheme === "Classic" ? "bg-purple-600 text-white shadow-md" : "text-gray-400")}
            >
              Classic
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-xl border border-white/20 bg-slate-900/95 px-3 py-1.5 text-[10px] font-bold text-white shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {phase === "menu" ? (
        <div className="flex-1 overflow-y-auto">
          <LudoLobby
            balance={balance}
            bet={bet}
            onBet={setBet}
            mode={mode}
            onMode={setMode}
            rules={rules}
            onRules={setRules}
            players={players}
            pot={pot}
            names={names}
            onNames={setNames}
            photoUrl={photoUrls[0] ?? null}
            onStart={start}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between px-2.5 py-1 overflow-hidden">
          <div className="flex justify-between items-center w-full px-1 z-20">
            <PlayerCornerCard
              color={3}
              name={names[3]}
              isCurrent={game.turn === 3}
              isYou={false}
              dice={game.dice}
              rolling={rolling && game.turn === 3}
              canRoll={humanCanAct && game.turn === 3}
              onRoll={handleRoll}
            />
            <PlayerCornerCard
              color={2}
              name={names[2]}
              isCurrent={game.turn === 2}
              isYou={false}
              dice={game.dice}
              rolling={rolling && game.turn === 2}
              canRoll={humanCanAct && game.turn === 2}
              onRoll={handleRoll}
            />
          </div>

          <div className="flex-1 flex items-center justify-center my-auto overflow-hidden px-1">
            <div className="w-full max-w-[min(96vw,46vh)] aspect-square">
              <LudoBoard
                state={game}
                selectable={sel}
                onSelect={pickToken}
                isNeon={boardTheme === "Classic"}
              />
            </div>
          </div>

          <div className="flex justify-between items-center w-full px-1 z-20 mb-1">
            <PlayerCornerCard
              color={0}
              name={names[0]}
              isCurrent={game.turn === 0}
              isYou={true}
              dice={game.dice}
              rolling={rolling && game.turn === 0}
              canRoll={humanCanAct && game.turn === 0}
              onRoll={handleRoll}
              photoUrl={photoUrls[0]}
            />
            <PlayerCornerCard
              color={1}
              name={names[1]}
              isCurrent={game.turn === 1}
              isYou={false}
              dice={game.dice}
              rolling={rolling && game.turn === 1}
              canRoll={humanCanAct && game.turn === 1}
              onRoll={handleRoll}
            />
          </div>

          <div className="w-full pb-1 z-20">
            <LudoStatusBar
              status={status}
              thinking={thinking}
              pot={pot}
              bursts={bursts}
              onReact={pushBurst}
            />
          </div>

          {phase === "win" && winnerSeat !== null ? (
            <LudoWinScreen
              winnerName={winnerName}
              youWon={youWon}
              pot={pot}
              onAgain={playAgain}
              onExit={leave}
            />
          ) : null}
        </div>
      )}

      <LudoSeedCustomizerModal
        open={seedCustomOpen}
        onClose={() => setSeedCustomOpen(false)}
        currentAnimal={seedCustom?.animal ?? null}
        currentColor={seedCustom?.color ?? null}
        onSave={(animal, color) => {
          setSeedCustom({ animal, color });
          setSeedCustomOpen(false);
        }}
      />
    </div>
  );
}