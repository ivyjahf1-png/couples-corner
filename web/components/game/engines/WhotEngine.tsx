"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SHAPE_COLOR,
  SHAPE_LABEL,
  SHAPE_ORDER,
  declareWhot,
  drawCard,
  freshWhotGame,
  legalPlays,
  playCard,
  sortHand,
  topCard,
  type ShapeCall,
  type WhotCard,
  type WhotEffect,
  type WhotGameState,
} from "@/lib/whot/engine";
import { SEATS, botReaction, chooseBotAction } from "@/lib/whot/bots";
import {
  haptic,
  pickHaptic,
  whotCall,
  whotDeclare,
  whotDraw,
  whotError,
  whotHold,
  whotMarket,
  whotPick,
  whotSelect,
  whotSkip,
  whotSlap,
  whotWin,
  whotWinSting,
} from "@/lib/whot/sensory";

/**
 * WhotEngine — 5D sensory UI wired directly to the core rules engine.
 * 4-player table (you + 3 bots), sorted tap-to-play hand, tap the market
 * to draw, WHOT declaration button at one card, and every effect returned
 * by playCard/drawCard/declareWhot routed to Web Audio synth voices +
 * vibration patterns.
 */

function CardFace({ card, small }: { card: WhotCard; small?: boolean }) {
  const color = SHAPE_COLOR[card.shape];
  return (
    <div
      className={`grid place-items-center rounded-lg border-2 bg-[#FFFDF6] font-black ${
        small ? "h-14 w-10 text-sm" : "h-20 w-14 text-xl"
      }`}
      style={{ borderColor: color, color, boxShadow: `0 0 14px ${color}66` }}
    >
      {card.shape === "whot" ? (
        <span title="WHOT 20">👑</span>
      ) : (
        <span>
          {card.value}
          <span className="ml-0.5 text-[0.6em]">{SHAPE_LABEL[card.shape][0]}</span>
        </span>
      )}
    </div>
  );
}

export function WhotEngine({
  balance,
  onWin,
  onLose,
}: {
  balance?: number;
  onWin: (n: number) => void;
  onLose: (n: number) => void;
}) {
  const [game, setGame] = useState<WhotGameState>(() => freshWhotGame());
  const [status, setStatus] = useState("Your move — match the top card.");
  const [feed, setFeed] = useState<string[]>([]);
  const [thinking, setThinking] = useState<number | null>(null);
  const [callShape, setCallShape] = useState<ShapeCall | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  const pushFeed = useCallback((line: string) => {
    setFeed((prev) => [line, ...prev].slice(0, 4));
  }, []);

  /** Route one core-rules effect → 5D audio + haptic + feed line. */
  const fireEffect = useCallback(
    (fx: WhotEffect) => {
      switch (fx.type) {
        case "hold":
          haptic("hold");
          whotHold();
          pushFeed(`${SEATS[fx.seat]!.name} holds on — plays again!`);
          break;
        case "pick":
          haptic("pick", pickHaptic(fx.count));
          whotPick(fx.count);
          pushFeed(
            fx.seat === fx.victim
              ? `${SEATS[fx.seat]!.name} absorbs ${fx.count} cards.`
              : `${SEATS[fx.seat]!.name} deals Pick ${fx.count} to ${SEATS[fx.victim]!.name}!`,
          );
          break;
        case "skip":
          haptic("skip");
          whotSkip();
          pushFeed(`${SEATS[fx.victim]!.name} misses a turn!`);
          break;
        case "market-all":
          haptic("market");
          whotMarket();
          pushFeed("General Market! Everyone else draws one.");
          break;
        case "whot-call":
          haptic("call");
          whotCall();
          pushFeed(`${SEATS[fx.seat]!.name} calls ${SHAPE_LABEL[fx.shape]}!`);
          break;
        case "declare":
          haptic("declare");
          whotDeclare();
          pushFeed(`${SEATS[fx.seat]!.name} declares WHOT!`);
          break;
        case "reshuffle":
          haptic("tap");
          whotDraw();
          pushFeed("Market ran dry — discard reshuffled.");
          break;
        case "win":
          break;
      }
    },
    [pushFeed],
  );

  const applyStep = useCallback(
    (step: { state: WhotGameState; effects: WhotEffect[] } | null, headline?: string) => {
      if (!step) return;
      for (const fx of step.effects) fireEffect(fx);
      setGame(step.state);
      const win = step.effects.find((e) => e.type === "win");
      if (win && win.type === "win") {
        const wSeat = win.seat;
        pushFeed(`${SEATS[wSeat]!.name} sheds the last card — wins!`);
        setStatus(wSeat === 0 ? "You win the round! 🎉" : `${SEATS[wSeat]!.name} wins the round.`);
        setRoundOver(true);
        haptic("win");
        whotWinSting();
        whotWin();
        if (wSeat === 0) onWin(400);
        else onLose(100);
        return;
      }
      if (headline) setStatus(headline);
    },
    [fireEffect, pushFeed, onWin, onLose],
  );

  /* ── Human actions ── */
  const myTurn = game.turn === 0 && game.winner === null && !roundOver;
  const legal = useMemo(() => (myTurn ? legalPlays(game, 0) : []), [game, myTurn]);
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal]);
  const hand = useMemo(() => sortHand(game.players[0]?.hand ?? []), [game]);
  const me = game.players[0];
  const top = topCard(game);
  const mustDeclare = !!me && me.hand.length === 1 && !me.called && myTurn;

  const playHumanCard = (cardId: string) => {
    if (!myTurn) return;
    const state = gameRef.current;
    const card = state.players[0]?.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.value === 20 && !callShape) {
      setStatus("Pick a shape for your WHOT 20 first.");
      whotSelect();
      return;
    }
    const step = playCard(state, 0, cardId, card.value === 20 ? (callShape ?? undefined) : undefined);
    if (!step) {
      haptic("error");
      whotError();
      setStatus("Illegal play — match value or shape call, or play WHOT.");
      return;
    }
    whotSlap();
    applyStep(step, `You play ${card.value === 20 ? "WHOT 20" : `${card.value} ${SHAPE_LABEL[card.shape]}`}.`);
    setCallShape(null);
  };

  const drawHuman = () => {
    if (!myTurn) return;
    haptic("tap");
    applyStep(drawCard(gameRef.current, 0), "You draw from the market.");
  };

  const declareHuman = () => {
    if (!mustDeclare) return;
    const step = declareWhot(gameRef.current, 0);
    if (!step) return;
    applyStep(step, "You declare WHOT!");
  };

  /* Bot loop: seats 1-3 declare at one card, then play or draw. */
  useEffect(() => {
    if (roundOver || game.winner !== null) return;
    const seat = game.turn;
    if (seat === 0) return;
    setThinking(seat);
    const t = window.setTimeout(() => {
      let s = gameRef.current;
      if (s.turn !== seat || s.winner !== null) return;
      const p = s.players[seat];
      if (p && p.hand.length === 1 && !p.called) {
        const decl = declareWhot(s, seat);
        if (decl) {
          for (const fx of decl.effects) if (fx.type === "declare") fireEffect(fx);
          s = decl.state;
          setGame(s);
        }
      }
      const action = chooseBotAction(s, seat);
      const step = action.kind === "play" ? playCard(s, seat, action.cardId, action.shape) : drawCard(s, seat);
      setThinking(null);
      if (!step) return;
      for (const fx of step.effects) fireEffect(fx);
      setGame(step.state);
      const win = step.effects.find((e) => e.type === "win");
      if (win && win.type === "win") {
        const wSeat = win.seat;
        pushFeed(`${SEATS[wSeat]!.name} sheds the last card — wins!`);
        setStatus(`${SEATS[wSeat]!.name} wins the round.`);
        setRoundOver(true);
        haptic("win");
        whotWinSting();
        whotWin();
        onLose(100);
        return;
      }
      const emo = botReaction(seat);
      setStatus(
        action.kind === "play" ? `${SEATS[seat]!.name} plays.${emo ? ` ${emo}` : ""}` : `${SEATS[seat]!.name} draws.`,
      );
    }, 900);
    return () => window.clearTimeout(t);
  }, [game.turn, game.winner, roundOver, fireEffect, pushFeed, onLose]);

  const restart = () => {
    const fresh = freshWhotGame();
    setGame(fresh);
    gameRef.current = fresh;
    setFeed([]);
    setStatus("New round — your move.");
    setCallShape(null);
    setRoundOver(false);
    setThinking(null);
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-200/20 bg-gradient-to-b from-[#1B1033] to-[#0D0A1F] p-4 text-white shadow-2xl sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-widest text-amber-300">Whot - 4 Players</h2>
        <div className="text-xs text-white/60">Balance: {(balance ?? 0).toLocaleString()}</div>
      </div>
      <p className="mt-1 min-h-6 text-sm text-white/80" role="status">{status}</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((seat) => {
          const profile = SEATS[seat]!;
          const count = game.players[seat]?.hand.length ?? 0;
          const isTurn = game.turn === seat && !roundOver;
          return (
            <div key={seat} className={`rounded-2xl border p-2 text-center ${isTurn ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/5"}`}>
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-black" style={{ border: `2px solid ${profile.ring}`, color: profile.ring }}>{profile.initials}</div>
              <div className="mt-1 truncate text-xs font-bold">{profile.name}{seat === 0 ? " (You)" : ""}</div>
              <div className="text-[11px] text-white/60">{profile.flag} Lv.{profile.level} - {count} cards</div>
              <div className="text-[11px] text-amber-300">{thinking === seat ? "thinking..." : isTurn ? "turn" : ""}{game.players[seat]?.called ? " - WHOT" : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-6 rounded-2xl border border-white/10 bg-black/30 p-4">
        <button type="button" onClick={drawHuman} disabled={!myTurn} className="grid place-items-center gap-1 rounded-xl border border-dashed border-white/30 bg-white/5 p-3 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40" title="Draw from the market">
          <span className="text-2xl">M</span>Market - {game.market.length}<span className="text-[10px]">{myTurn ? "tap to draw" : ""}</span>
        </button>
        <div className="text-center">
          <CardFace card={top} />
          <div className="mt-1 text-[11px] text-white/60">Call: {game.call ? SHAPE_LABEL[game.call] : "--"}{game.pendingPick > 0 ? ` - Pick +${game.pendingPick}` : ""}</div>
        </div>
        <div className="text-center text-xs text-white/60"><div className="text-2xl">D</div>Discard - {game.discard.length}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-white/60">WHOT calls:</span>
        {SHAPE_ORDER.map((shape) => (
          <button key={shape} type="button" onClick={() => { setCallShape(shape); whotSelect(); }} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-bold" style={{ color: SHAPE_COLOR[shape] }}>{SHAPE_LABEL[shape]}</button>
        ))}
        {callShape ? <span className="text-amber-300">picked: {SHAPE_LABEL[callShape]}</span> : null}
      </div>
      <div className="mt-3">
        <div className="mb-1 text-xs uppercase tracking-widest text-white/50">Your hand (sorted)</div>
        <div className="flex flex-wrap gap-2">
          {hand.map((card) => {
            const ok = myTurn && legalIds.has(card.id);
            return (
              <button key={card.id} type="button" data-card={card.id} disabled={!ok} onClick={() => playHumanCard(card.id)} className={ok ? "transition hover:-translate-y-1" : "opacity-40 saturate-50"} title={ok ? "Play this card" : "Not playable now"}>
                <CardFace card={card} small />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {mustDeclare ? <button type="button" onClick={declareHuman} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black shadow-lg hover:bg-amber-300">Declare WHOT!</button> : null}
        <button type="button" onClick={drawHuman} disabled={!myTurn} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Draw</button>
        <button type="button" onClick={restart} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold text-white/70">New round</button>
      </div>
      {feed.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/75">
          {feed.map((line, i) => <li key={`${i}-${line}`}>- {line}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

