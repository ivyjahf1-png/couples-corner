"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { applyMove, chooseAiMove, freshGame, movableTokens, rollDice, LUDO_NAMES, type LudoColor, type LudoGameState } from "@/lib/ludo/engine";
import { freshPowerUps, potFor, type LudoPhase, type PowerUpState } from "@/lib/ludo/match";
import { LudoBoard } from "./LudoBoard";
import { LudoDice } from "./LudoDice";
import { BettingLobby, Matchmaking, WinScreen } from "./LudoScreens";
import { CallButton, ChatOverlay } from "./LudoOverlays";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function LudoSuperstar({ balance, onWin, onLose }: { balance: number; onWin: (n: number) => void; onLose: (n: number) => void }) {
  const [phase, setPhase] = useState<LudoPhase>("menu");
  const [bet, setBet] = useState(100);
  const [game, setGame] = useState<LudoGameState>(() => freshGame());
  const [selectable, setSelectable] = useState<number[]>([]);
  const [powers, setPowers] = useState<PowerUpState>(() => freshPowerUps());
  const [rolling, setRolling] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [matchId] = useState(() => `ludo-${Date.now().toString(36)}`);
  const [claimed, setClaimed] = useState(false);
  const snapshot = useRef<LudoGameState | null>(null);
  const pot = potFor(bet, 4);
  const myTurn = game.turn === 0 && phase === "board" && !game.winner;

  const sync = useCallback((g: LudoGameState) => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    const insertP = sb.from("ludo_matches").upsert({ id: matchId, state: g, updated_at: new Date().toISOString() }, { onConflict: "id" });
    void Promise.resolve(insertP).catch(() => undefined);
  }, [matchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabaseClient();
    const ch = sb.channel(`ludo:${matchId}`).on("postgres_changes", { event: "*", schema: "public", table: "ludo_matches", filter: `id=eq.${matchId}` }, (payload) => {
      const row = (payload as { new?: { state?: LudoGameState } }).new;
      if (row?.state && phase === "board") setGame(row.state);
    }).subscribe();
    return () => { void sb.removeChannel(ch).catch(() => undefined); };
  }, [matchId, phase]);

  function startMatchmaking() {
    if (balance < bet) return;
    onLose(bet);
    setPhase("matchmaking");
    window.setTimeout(() => {
      const g = freshGame();
      setGame(g);
      setPowers(freshPowerUps());
      setSelectable([]);
      setClaimed(false);
      setPhase("board");
      sync(g);
    }, 1800);
  }

  function doRoll() {
    if (!myTurn || rolling || !game.canRoll) return;
    setRolling(true);
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      setGame((g) => ({ ...g, dice: rollDice() }));
      if (ticks >= 6) {
        window.clearInterval(timer);
        const d = rollDice();
        setGame((g) => {
          if (d === 6 && g.consecutiveSixes + 1 >= 3) {
            const ng: LudoGameState = { ...g, dice: d, consecutiveSixes: 0, canRoll: true, turn: ((g.turn + 1) % 4) as LudoColor, log: [...g.log, "Three 6s — turn skipped!"] };
            setSelectable([]);
            sync(ng);
            return ng;
          }
          const ng: LudoGameState = { ...g, dice: d, consecutiveSixes: d === 6 ? g.consecutiveSixes + 1 : 0, canRoll: false, log: g.log };
          const moves = movableTokens(ng, ng.turn, d);
          setSelectable(ng.turn === 0 ? moves : []);
          if (ng.turn === 0 && moves.length === 0) {
            ng.log = [...ng.log, `Rolled ${d} — no moves.`];
            ng.turn = 1;
            ng.canRoll = true;
          }
          sync(ng);
          return ng;
        });
        setRolling(false);
      }
    }, 90);
  }

  function pickToken(idx: number) {
    if (!myTurn || !selectable.includes(idx)) return;
    snapshot.current = JSON.parse(JSON.stringify(game)) as LudoGameState;
    setGame((g) => {
      const ng: LudoGameState = { ...g, players: JSON.parse(JSON.stringify(g.players)) as LudoGameState["players"] };
      const res = applyMove(ng, 0, idx, ng.dice);
      ng.log = [...ng.log, res.message];
      if (ng.players[0]!.finished === 4) ng.winner = 0;
      if (ng.winner === null) {
        if (res.extraTurn) ng.canRoll = true;
        else { ng.turn = 1; ng.canRoll = true; }
      } else {
        setPhase("win");
      }
      setSelectable([]);
      sync(ng);
      return ng;
    });
  }

  useEffect(() => {
    if (phase !== "board" || game.winner !== null) return;
    if (game.turn === 0) return;
    const t = window.setTimeout(() => {
      setGame((g) => {
        if (g.turn === 0 || g.winner !== null) return g;
        const ng: LudoGameState = { ...g, players: JSON.parse(JSON.stringify(g.players)) as LudoGameState["players"] };
        const d = rollDice();
        ng.dice = d;
        const mv = chooseAiMove(ng, ng.turn, d);
        if (mv === null) {
          ng.log = [...ng.log, `${LUDO_NAMES[ng.turn]} rolled ${d} — no moves.`];
        } else {
          const res = applyMove(ng, ng.turn, mv, d);
          ng.log = [...ng.log, res.message];
          if (ng.players[ng.turn]!.finished === 4) {
            ng.winner = ng.turn;
            setPhase("win");
            sync(ng);
            return ng;
          }
        }
        ng.turn = ((ng.turn + 1) % 4) as LudoColor;
        if (ng.turn === 0) ng.canRoll = true;
        sync(ng);
        return ng;
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [game.turn, phase, game.winner, sync]);

  function usePower(kind: keyof PowerUpState) {
    if (!myTurn || powers[kind] <= 0) return;
    if (kind === "undo" && snapshot.current) {
      setGame(snapshot.current);
      sync(snapshot.current);
      setPowers((p) => ({ ...p, undo: p.undo - 1 }));
      setSelectable([]);
      return;
    }
    if (kind === "roll2") {
      const nd = Math.min(6, game.dice + 2);
      setGame((g) => ({ ...g, dice: nd }));
      setSelectable(movableTokens(game, 0, nd));
      setPowers((p) => ({ ...p, roll2: p.roll2 - 1 }));
      return;
    }
    const nd = game.dice >= 4 ? 6 : 2;
    setGame((g) => ({ ...g, dice: nd }));
    setSelectable(movableTokens(game, 0, nd));
    setPowers((p) => ({ ...p, hilo: p.hilo - 1 }));
  }

  if (phase === "menu" || phase === "lobby") {
    return <BettingLobby balance={balance} bet={bet} setBet={(b) => { setBet(b); setPhase("lobby"); }} onConfirm={startMatchmaking} />;
  }
  if (phase === "matchmaking") return <Matchmaking bet={bet} onCancel={() => setPhase("lobby")} />;
  if (phase === "win") {
    const won = game.winner === 0;
    return <WinScreen winnerName={won ? "You" : `${LUDO_NAMES[game.winner ?? 1]} (CPU)`} pot={won ? pot : 0}
      onClaim={() => { if (!claimed && won) { onWin(pot); setClaimed(true); } setPhase("lobby"); }} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {/* Turn HUD: glass pills + active glow ring + animated timer bar */}
      <div className="flex items-center gap-2">
        {(["YOU", "Blue", "Green", "Yellow"] as const).map((n, i) => {
          const active = game.turn === i;
          return (
            <div
              key={n}
              className={`relative flex-1 overflow-hidden rounded-2xl border px-2 py-1.5 text-center text-[11px] font-black backdrop-blur-md ${
                active
                  ? "border-amber-300/70 bg-amber-400/20 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,.5)]"
                  : "border-white/10 bg-white/5 text-white/60"
              }`}
            >
              <span className="relative z-10">
                {n} · {game.players[i as LudoColor]!.finished}/4
              </span>
              {active ? (
                <motion.div
                  key={`timer-${i}-${game.log.length}`}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-300 to-brand-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 12, ease: "linear" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <LudoBoard state={game} selectable={myTurn ? selectable : []} onSelect={pickToken} />
      {/* Control bar: 3D dice, roll pill, icon tray */}
      <div className="flex items-center justify-center gap-3">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${
            myTurn
              ? "border-amber-300/70 shadow-[0_0_20px_rgba(251,191,36,.6)]"
              : "border-white/10"
          } bg-white/5 backdrop-blur-md`}
        >
          <LudoDice value={game.dice} rolling={rolling} />
        </div>
        <button type="button" onClick={doRoll} disabled={!myTurn || rolling || !game.canRoll}
          className="rounded-full bg-gradient-to-b from-brand-400 to-brand-600 px-8 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(249,115,22,.55)] ring-1 ring-white/20 backdrop-blur-md disabled:opacity-40">
          {rolling ? "Rolling…" : myTurn ? "ROLL" : `${LUDO_NAMES[game.turn]}…`}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-md">
          <CallButton channelName={matchId} />
          <button type="button" onClick={() => setChatOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base" aria-label="Chat">💬</button>
          <button type="button" onClick={() => setEmojiOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base" aria-label="Emojis">😀</button>
        </div>
      </div>
      {emojiOpen ? (
        <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
          {["😂", "😡", "👏", "😍", "🍀", "🔥", "👍", "😭"].map((e) => (
            <button key={e} type="button" onClick={() => setEmojiOpen(false)} className="rounded-full bg-white/10 px-2.5 py-1 text-lg">{e}</button>
          ))}
        </div>
      ) : null}
      {/* Power-up pills */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => usePower("undo")} disabled={powers.undo <= 0}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2 text-xs font-black text-white backdrop-blur-md disabled:opacity-40">
          ↩️ Undo
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1 text-[9px] font-black text-black">{powers.undo}</span>
        </button>
        <button type="button" onClick={() => usePower("roll2")} disabled={powers.roll2 <= 0}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2 text-xs font-black text-white backdrop-blur-md disabled:opacity-40">
          🎲 Roll+2
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1 text-[9px] font-black text-black">{powers.roll2}</span>
        </button>
        <button type="button" onClick={() => usePower("hilo")} disabled={powers.hilo <= 0}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2 text-xs font-black text-white backdrop-blur-md disabled:opacity-40">
          🔼 Hi-Lo
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1 text-[9px] font-black text-black">{powers.hilo}</span>
        </button>
      </div>
      {myTurn && selectable.length > 0 ? <p className="text-center text-xs font-bold text-amber-300">Tap a glowing token to move {game.dice}.</p> : null}
      <p className="text-center text-[11px] text-white/60">Pot: {pot.toLocaleString()} coins · {game.log[game.log.length - 1]}</p>
      {chatOpen ? <ChatOverlay matchId={matchId} onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
