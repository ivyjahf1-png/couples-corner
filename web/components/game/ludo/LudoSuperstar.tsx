"use client";
import { useEffect, useRef, useState } from "react";
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
import { LudoBoard } from "./LudoBoard";
import { LudoHud } from "./LudoHud";
import { soundEngine } from "./soundEngine";
import { LudoSeedCustomizerModal } from "./LudoSeedCustomizerModal";
import { LudoStatusBar, type EmojiBurst } from "./LudoStatusBar";
import { LudoTopBar } from "./LudoTopBar";
import { LudoLobby, LudoWinScreen, type LudoMode } from "./LudoLobby";

type Phase = "menu" | "board" | "win";

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
        ? nm + " captured a pawn! 😈"
        : res.finished
          ? nm + " sent a pawn home! 🏠"
          : nm + " moved " + d + " square" + (d === 1 ? "" : "s") + ".",
    );
    if ((res.captured || res.finished) && isBot(color) && Math.random() < 0.55) {
      const emoji = botReaction(color);
      if (emoji) pushBurst(emoji);
    }
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
    setStatus(
      mode === "cpu"
        ? "Tap a glowing pawn to move " + d + "."
        : dName(color) + ", tap a glowing pawn to move " + d + ".",
    );
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
    setStatus(
      mode === "cpu" ? "Your move — tap the dice to roll." : "You start — tap the dice to roll!",
    );
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
    clockRef.current = TURN_SECONDS;
  }, [phase, game.turn]);

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
  const hubLabel = rolling
    ? "Rolling…"
    : humanCanAct
      ? "Tap to Roll"
      : selectable.length > 0
        ? "Pick a pawn"
        : dName(game.turn) + " to roll";
  const youWon = winnerSeat !== null && (mode !== "cpu" || winnerSeat === 0);
  const winnerName = winnerSeat !== null ? dName(winnerSeat) : "";

  return (
    <div className="relative mx-auto w-full max-w-xl h-[100dvh] flex flex-col justify-between overflow-hidden select-none bg-[#050814] pb-1">
      <LudoTopBar
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onRestart={restart}
        onLeave={leave}
        onCustomizeSeed={() => setSeedCustomOpen(true)}
      />

      {phase === "board" && (
        <div className="flex justify-center items-center py-0.5 z-20">
          <div className="flex items-center gap-1 bg-[#121A33] p-0.5 rounded-xl border border-white/10 shadow-md">
            <button 
              onClick={() => setBoardTheme("Aero")}
              className={"px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all " + (boardTheme === "Aero" ? "bg-blue-600 text-white shadow" : "text-gray-400")}
            >
              Aero
            </button>
            <button 
              onClick={() => setBoardTheme("Classic")}
              className={"px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all " + (boardTheme === "Classic" ? "bg-purple-600 text-white shadow" : "text-gray-400")}
            >
              Classic
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-xl border border-white/20 bg-slate-900/90 px-3 py-1.5 text-[10px] font-black text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
      {phase === "menu" ? (
        <div className="mt-4 flex-1 overflow-y-auto">
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
        <div className="flex-1 flex flex-col justify-between overflow-hidden px-2 pb-1">
          <LudoHud
            state={game}
            dice={game.dice}
            rolling={rolling}
            canRollNow={humanCanAct}
            onRoll={handleRoll}
            hubLabel={hubLabel}
            names={names}
          />
          <div className="flex-1 flex items-center justify-center overflow-hidden my-0.5">
            <LudoBoard
              state={game}
              selectable={sel}
              onSelect={pickToken}
              isNeon={boardTheme === "Classic"}
            />
          </div>
          <LudoStatusBar
            status={status}
            thinking={thinking}
            pot={pot}
            bursts={bursts}
            onReact={pushBurst}
          />
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