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

/**
 * LudoSuperstar — the match orchestrator.
 *
 * Flow: menu (mode + stake) → board → win. Each turn runs as a locked
 * sequence: roll (1 s wooden tumble) → resolve → pick pawn (auto if only one,
 * "thinking" delays for bots, tap for humans) → hop + SFX → extra roll or
 * pass. A 15 s turn clock lets the house play for you on expiry; three
 * consecutive sixes forfeit the turn. Seat 0 is the local player in
 * vs-COMPUTER; Pass-and-Play hot-seats all four.
 */
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
  /** Board rules variant — picked in the lobby, frozen into the state at start. */
  const [rules, setRules] = useState<LudoRules>("classic");
  /** Seat display names; seat 0 is the device holder ("You"). Friends mode
   *  lets the lobby rename seats 1–3 to whoever is playing around you. */
  const [names, setNames] = useState<string[]>(["You", SEATS[1].name, SEATS[2].name, SEATS[3].name]);
  const [bet, setBet] = useState(100);
  const [game, setGame] = useState<LudoGameState>(() => freshGame());
  const [selectable, setSelectable] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pick a mode and stake to play.");
  /** Turn timer — the value itself is never rendered (the countdown only drives
   *  `houseAct` on expiry), so the state value is discarded via a destructure hole. */
  const [, setClock] = useState(TURN_SECONDS);
  const [soundOn, setSoundOn] = useState(true);
  const [bursts, setBursts] = useState<EmojiBurst[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [winnerSeat, setWinnerSeat] = useState<LudoColor | null>(null);

  // ── Custom photo avatar for the local player (seat 0), from the profile
  // photo gallery the app upload pipeline maintains (profiles.photos jsonb,
  // bucket "photos"). profiles.avatar_url was retired by migration 015 — the
  // uploader writes photos, not avatar_url — so the primary photo's public
  // URL is the avatar source of truth here, with initials as the fallback. ──
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([null, null, null, null]);
  /** The local player's saved seed customization (animal + colour), applied to seat 0. */
  const [seedCustom, setSeedCustom] = useState<{ animal?: string | null; color?: string | null } | null>(null);
  const [seedCustomOpen, setSeedCustomOpen] = useState(false);

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

  /** Seats dealt into the match: duo plays the diagonal pair (you + friend). */
  const activeSeats: LudoColor[] = mode === "duo" ? [0, 2] : [0, 1, 2, 3];
  const players = activeSeats.length;
  const pot = potFor(bet, players);
  const gameRef = useRef(game);
  gameRef.current = game;
  const busyRef = useRef(false);
  const rollingRef = useRef(false);
  rollingRef.current = rolling;
  const selectableRef = useRef<number[]>([]);
  selectableRef.current = selectable;
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const claimedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const burstIdRef = useRef(0);

  /** Schedule work inside the current turn sequence (all cleared on exit). */
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
    // Emoji tap → synthesised SFX + live commentator voice.
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
    setStatus(`${dName(next)} to roll…`);
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
        ? `${nm} captured a pawn! 😈`
        : res.finished
          ? `${nm} sent a pawn home! 🏠`
          : `${nm} moved ${d} square${d === 1 ? "" : "s"}.`,
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
          setStatus(isBot(color) ? `${SEATS[color].name} rolls again!` : `${nm} gets another roll!`);
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
      setStatus(`Three sixes in a row — ${dName(color)} forfeits the turn!`);
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
      setStatus(`${dName(color)} can't move — the turn passes.`);
      later(() => finishTurn(color), 1200);
      return;
    }
    if (opts.length === 1) {
      later(() => playToken(color, opts[0]!, d), 320);
      return;
    }
    if (isBot(color)) {
      setStatus(`${SEATS[color].name} ${thinkSuffix(color)}`);
      later(() => playToken(color, chooseBotMove(g, color, d) ?? opts[0]!, d), botMoveDelay(color));
      return;
    }
    setSelectable(opts);
    setStatus(
      mode === "cpu"
        ? `Tap a glowing pawn to move ${d}.`
        : `${dName(color)}, tap a glowing pawn to move ${d}.`,
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
    setClock(TURN_SECONDS);
    setStatus(isBot(color) ? `${SEATS[color].name} rolls the dice…` : `${dName(color)} rolls the dice…`);
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
      setStatus(`${dName(color)} rolled a ${d}${d === 6 ? " 🔥" : ""}`);
      announceRoll(d);
      later(() => resolveRoll(color, d), 460);
    }, 1000);
  };

  /** Turn-clock expiry: the house rolls / picks for the local side. */
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
    setClock(TURN_SECONDS);
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
  /* Bot driver: when a bot holds the dice and everything is idle, think → roll. */
  useEffect(() => {
    if (phase !== "board" || mode !== "cpu" || game.winner !== null) return;
    const c = game.turn;
    if (c === 0) return;
    if (!game.canRoll || rolling || busy || selectable.length > 0) return;
    setStatus(`${SEATS[c].name} ${thinkSuffix(c)}`);
    const id = window.setTimeout(() => runRoll(c), botThinkDelay(c));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, game.turn, game.canRoll, game.winner, rolling, busy, selectable.length]);

  /* Fresh clock whenever the turn changes (also when entering the match). */
  useEffect(() => {
    setClock(TURN_SECONDS);
  }, [phase, game.turn]);

  /* 1 s countdown for human-held turns; expiry hands play to the house. */
  useEffect(() => {
    if (phase !== "board" || game.winner !== null) return;
    if (mode === "cpu" && game.turn !== 0) return;
    const id = window.setInterval(() => {
      setClock((c) => {
        if (c <= 1) {
          window.setTimeout(() => houseAct(), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        : `${dName(game.turn)} to roll`;
  const youWon = winnerSeat !== null && (mode !== "cpu" || winnerSeat === 0);
  const winnerName = winnerSeat !== null ? dName(winnerSeat) : "";
  /*LOGIC_SLOT_2*/

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <LudoTopBar
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onRestart={restart}
        onLeave={leave}
        onCustomizeSeed={() => setSeedCustomOpen(true)}
      />
      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-xl border border-white/20 bg-slate-900/90 px-3 py-1.5 text-[10px] font-black text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
      {phase === "menu" ? (
        <div className="mt-4">
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
        <>
          {/* Player HUD (seat cards + the active player's attached dice) sits
              directly above the board; the old floating corner pods are gone. */}
          <div className="relative mt-3">
            <LudoHud
              state={game}
              dice={game.dice}
              rolling={rolling}
              canRollNow={humanCanAct}
              onRoll={handleRoll}
              hubLabel={hubLabel}
              names={names}
            />
            <LudoBoard
              state={game}
              selectable={sel}
              onSelect={pickToken}
              seedCustom={seedCustom}
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
        </>
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