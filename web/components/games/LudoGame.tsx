"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Couple's Ludo — Ludo Superstar-style game view over the classic VS-Bot
 * engine (rules + geometry live untouched in ./ludoCore, painting in
 * ./ludoPaint, chrome in ./LudoHud).
 *
 * The human plays Red against three bot opponents (Green, Yellow, Blue).
 * Full classic rules: roll a 6 to leave the yard, extra turn on a 6,
 * captures send tokens home, safe start squares, 57-step race to home.
 * The result (win/loss) is reported to the player container which settles
 * the coin stake server-side.
 *
 * HUD additions that do NOT alter turn flow:
 * - undo charges restore a snapshot of your last turn (only allowed while
 *   no dice is pending and no token pick is waiting — every scheduled bot
 *   timer is owned by the auto-roll effect and cancels itself on restore);
 * - the lucky-six power-up only forces the human's own next roll.
 */

import {
  applyMove,
  botChoose,
  HOME,
  legalMoves,
  PLAYER_COLORS,
  PLAYER_NAMES,
  SIZE,
  type GameState,
  type Tokens,
} from "./ludoCore";
import { paintBoard } from "./ludoPaint";
import {
  ActionBar,
  CallChip,
  ChatSheet,
  EmojiDrawer,
  FloatingReaction,
  GameModal,
  LudoTopNav,
  ProfileFrame,
  ToggleRow,
  TurnCard,
  type ChatMessage,
  type HudSettings,
  type NavPanel,
  type SessionStats,
} from "./LudoHud";

export function LudoGame({
  muted,
  onGameOver,
  coinBalance = 0,
}: {
  muted: boolean;
  onGameOver: (won: boolean) => void;
  /** Live coin balance shown in the top-nav indicator (display only). */
  coinBalance?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    tokens: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],
    turn: 0,
    dice: null,
    winner: null,
  });
  const [, forceRender] = useState(0);
  const [pendingMoves, setPendingMoves] = useState<number[]>([]);
  const [log, setLog] = useState<string>("You are Red. Roll a 6 to leave your yard!");
  const reportedRef = useRef(false);
  const state = stateRef.current;

  /* ── HUD state (presentation only) ──────────────────────────────── */
  const [panel, setPanel] = useState<NavPanel | null>(null);
  const [settings, setSettings] = useState<HudSettings>({ sound: true, stars: true, hints: true });
  const [stats, setStats] = useState<SessionStats>({ played: 0, wins: 0 });

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reaction, setReaction] = useState<{ id: number; emoji: string } | null>(null);
  const reactionTimerRef = useRef<number | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, from: "them", sender: "Mateo", text: "Hey! Ready to race? 🎲" },
  ]);
  const messageIdRef = useRef(2);
  const chatTimersRef = useRef<number[]>([]);

  const [callMode, setCallMode] = useState<"voice" | "video" | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  const [undoCharges, setUndoCharges] = useState(2);
  const [powerCharges, setPowerCharges] = useState(2);
  const [powerArmed, setPowerArmed] = useState(false);
  const powerArmedRef = useRef(false);
  const undoSnapshotRef = useRef<GameState | null>(null);

  /* ── Tiny WebAudio blip for dice rolls / UI tones ───────────────── */
  const beep = useCallback(
    (frequency: number) => {
      if (muted || !settings.sound) return;
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
        osc.onended = () => void ctx.close();
      } catch {
        // Audio is best-effort.
      }
    },
    [muted, settings.sound]
  );

  /* ── Board painting (visual only) ───────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintBoard(ctx, stateRef.current, {
      pendingMoves,
      showStars: settings.stars,
      showHints: settings.hints,
    });
  }, [state.tokens, pendingMoves, settings.stars, settings.hints]);

  /* ── Turn flow: settle the stake when the race ends ─────────────── */
  useEffect(() => {
    if (state.winner !== null && !reportedRef.current) {
      reportedRef.current = true;
      setLog(
        state.winner === 0
          ? "🏆 You win the Ludo crown!"
          : `🏆 ${PLAYER_NAMES[state.winner]} wins!`
      );
      setStats((s) => ({ played: s.played + 1, wins: s.wins + (state.winner === 0 ? 1 : 0) }));
      onGameOver(state.winner === 0);
    }
  }, [state.winner, onGameOver]);
  /* ── Turn flow ───────────────────────────────────────────────────── */
  const roll = useCallback(() => {
    const current = stateRef.current;
    if (current.winner !== null || current.dice !== null) return;

    // Snapshot your turn start so the Undo power-up can restore it later.
    if (current.turn === 0) {
      undoSnapshotRef.current = {
        tokens: current.tokens.map((t) => [...t] as Tokens),
        turn: 0,
        dice: null,
        winner: null,
      };
    }

    // Lucky-six power-up: only ever affects the human's own roll.
    const useBoost = current.turn === 0 && powerArmedRef.current;
    if (useBoost) {
      powerArmedRef.current = false;
      setPowerArmed(false);
      setPowerCharges((c) => Math.max(0, c - 1));
    }

    const dice = useBoost ? 6 : 1 + Math.floor(Math.random() * 6);
    current.dice = dice;
    beep(dice === 6 ? 660 : 440);
    forceRender((n) => n + 1);

    const moves = legalMoves(current, current.turn, dice);
    if (moves.length === 0) {
      setLog(`${PLAYER_NAMES[current.turn]} rolled ${dice} — no legal move.`);
      window.setTimeout(() => {
        const s = stateRef.current;
        if (s.winner !== null) return;
        if (dice !== 6) s.turn = (s.turn + 1) % 4; // a 6 keeps the turn
        s.dice = null;
        forceRender((n) => n + 1);
      }, 900);
      return;
    }

    if (current.turn === 0) {
      // Human: auto-move when only one option, otherwise wait for a pick.
      if (moves.length === 1) {
        setLog(`You rolled ${dice}.`);
        window.setTimeout(() => {
          stateRef.current = applyMove(stateRef.current, 0, moves[0], dice);
          setPendingMoves([]);
          forceRender((n) => n + 1);
        }, 400);
      } else {
        setPendingMoves(moves);
        setLog(`You rolled ${dice} — choose a token to move.`);
      }
    } else {
      setLog(`${PLAYER_NAMES[current.turn]} rolled ${dice}…`);
      window.setTimeout(() => {
        const s = stateRef.current;
        if (s.winner !== null) return;
        const token = botChoose(s, s.turn, dice);
        if (token !== null) {
          stateRef.current = applyMove(s, s.turn, token, dice);
          setLog(`${PLAYER_NAMES[s.turn]} moved.`);
        }
        forceRender((n) => n + 1);
      }, 900);
    }
  }, [beep]);

  // Auto-roll for bot turns (its cleanup cancels a pending bot roll, which
  // is exactly what makes the Undo restore below timer-safe).
  useEffect(() => {
    if (state.winner !== null) return;
    if (state.turn !== 0 && state.dice === null) {
      const id = window.setTimeout(roll, 900);
      return () => window.clearTimeout(id);
    }
  }, [state.turn, state.dice, state.winner, roll]);

  const moveToken = useCallback((token: number) => {
    const s = stateRef.current;
    if (s.turn !== 0 || s.dice === null) return;
    stateRef.current = applyMove(s, 0, token, s.dice);
    setPendingMoves([]);
    setLog("You moved.");
    forceRender((n) => n + 1);
  }, []);

  const canRoll = state.turn === 0 && state.dice === null && state.winner === null;

  const canUndo =
    undoSnapshotRef.current !== null &&
    undoCharges > 0 &&
    state.winner === null &&
    state.dice === null &&
    pendingMoves.length === 0;

  /** Restore the snapshot taken at your last roll (one charge). */
  const undo = useCallback(() => {
    const snapshot = undoSnapshotRef.current;
    const s = stateRef.current;
    if (!snapshot || undoCharges <= 0) return;
    if (s.winner !== null || s.dice !== null || pendingMoves.length > 0) return;
    stateRef.current = {
      tokens: snapshot.tokens.map((t) => [...t] as Tokens),
      turn: snapshot.turn,
      dice: null,
      winner: null,
    };
    undoSnapshotRef.current = null;
    setUndoCharges((c) => Math.max(0, c - 1));
    setPendingMoves([]);
    setLog("⏪ Undo used — take that turn again.");
    beep(320);
    forceRender((n) => n + 1);
  }, [undoCharges, pendingMoves.length, beep]);
  const togglePower = useCallback(() => {
    if (powerCharges <= 0 || state.winner !== null) return;
    const next = !powerArmed;
    setPowerArmed(next);
    powerArmedRef.current = next;
    setLog(next ? "⚡ Lucky six armed — your next roll is a 6!" : "⚡ Power-up disarmed.");
    beep(next ? 760 : 300);
  }, [powerArmed, powerCharges, state.winner, beep]);

  /* ── Social HUD: reactions, chat, call ──────────────────────────── */
  const pushMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: messageIdRef.current }].slice(-40));
    messageIdRef.current += 1;
  }, []);

  const pickReaction = useCallback((emoji: string) => {
    setReaction({ id: Date.now(), emoji });
    if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => setReaction(null), 2300);
    setEmojiOpen(false);
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      pushMessage({ from: "you", text: trimmed });
      setDraft("");
      const id = window.setTimeout(() => {
        const replies = [
          "Right back at you 😄",
          "Good luck! 🍀",
          "Hmm… tricky 😅",
          "Watch this move 👀",
          "Almost had it! 😤",
        ];
        const sender = Math.random() < 0.5 ? "Mateo" : "Yuki";
        pushMessage({
          from: "them",
          sender,
          text: replies[Math.floor(Math.random() * replies.length)],
        });
        if (!chatOpenRef.current) setUnread((u) => u + 1);
      }, 800 + Math.random() * 900);
      chatTimersRef.current.push(id);
    },
    [pushMessage]
  );

  const toggleChat = useCallback(() => {
    setChatOpen((open) => {
      chatOpenRef.current = !open;
      return !open;
    });
    setEmojiOpen(false);
    setUnread(0);
  }, []);

  const toggleCall = useCallback(() => {
    if (callMode !== null) {
      setCallMode(null);
      setCallSeconds(0);
    } else {
      setCallMode("voice");
      setCallSeconds(0);
      beep(660);
    }
  }, [callMode, beep]);

  useEffect(() => {
    if (callMode === null) return;
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [callMode]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Cleanup every HUD-owned timer on unmount.
  useEffect(
    () => () => {
      if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
      chatTimersRef.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  // Escape closes the topmost overlay.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (panel !== null) setPanel(null);
      else if (emojiOpen) setEmojiOpen(false);
      else if (chatOpen) {
        setChatOpen(false);
        chatOpenRef.current = false;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, emojiOpen, chatOpen]);

  const toggleSetting = useCallback((key: keyof HudSettings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }, []);
  /* ── View ────────────────────────────────────────────────────────── */
  const turnLabel =
    state.winner !== null
      ? state.winner === 0
        ? "🏆 You win!"
        : `🏆 ${PLAYER_NAMES[state.winner]} wins`
      : state.turn === 0
        ? "Your turn"
        : `${PLAYER_NAMES[state.turn]}'s turn`;
  const turnColor = PLAYER_COLORS[state.winner !== null ? state.winner : state.turn];

  return (
    <div className="flex w-full flex-col items-center gap-3 p-3 sm:p-5">
      {/* ── Top navigation: settings · trophies · rules · balance ─── */}
      <LudoTopNav coinBalance={coinBalance} onOpen={setPanel} />

      {/* ── Player frames for the top bases (Red left · Green right) ─ */}
      <div className="flex w-full max-w-xl items-start justify-between gap-2">
        <ProfileFrame
          player={0}
          tokens={state.tokens[0]}
          active={state.winner === null && state.turn === 0}
          align="start"
        />
        <ProfileFrame
          player={1}
          tokens={state.tokens[1]}
          active={state.winner === null && state.turn === 1}
          align="end"
        />
      </div>

      {/* ── Board + floating overlays (all clipped inside the frame) ─ */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="block w-full touch-manipulation select-none"
          role="img"
          aria-label="Couple's Ludo board — you are red, playing against three bots"
        />

        {callMode !== null ? (
          <CallChip
            mode={callMode}
            seconds={callSeconds}
            onToggleMode={() => setCallMode((m) => (m === "voice" ? "video" : "voice"))}
            onEnd={toggleCall}
          />
        ) : null}

        {reaction ? <FloatingReaction key={reaction.id} emoji={reaction.emoji} /> : null}

        {emojiOpen ? (
          <EmojiDrawer onPick={pickReaction} onClose={() => setEmojiOpen(false)} />
        ) : null}

        {chatOpen ? (
          <ChatSheet
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSend={() => sendChat(draft)}
            onQuick={(phrase) => sendChat(phrase)}
            onClose={toggleChat}
          />
        ) : null}
      </div>

      {/* ── Player frames for the bottom bases (Blue left · Yellow right) ─ */}
      <div className="flex w-full max-w-xl items-start justify-between gap-2">
        <ProfileFrame
          player={3}
          tokens={state.tokens[3]}
          active={state.winner === null && state.turn === 3}
          align="start"
        />
        <ProfileFrame
          player={2}
          tokens={state.tokens[2]}
          active={state.winner === null && state.turn === 2}
          align="end"
        />
      </div>

      {/* ── Turn notification + glowing roll control ───────────────── */}
      <TurnCard
        turnLabel={turnLabel}
        turnColor={turnColor}
        log={log}
        dice={state.dice}
        canRoll={canRoll}
        onRoll={roll}
      />
      {/* ── Token picker (only when several moves are legal) ──────── */}
      {pendingMoves.length > 0 ? (
        <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-3 py-2.5">
          <span className="text-sm font-semibold text-orange-100">Move token:</span>
          {pendingMoves.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => moveToken(token)}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-400/60 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[0] }}
                aria-hidden="true"
              />
              Token {token + 1}
              <span className="text-xs font-normal text-white/60">
                {state.tokens[0][token] === -1 ? "(yard)" : `step ${state.tokens[0][token]}`}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ── Interactive player action bar ─────────────────────────── */}
      <ActionBar
        emojiOpen={emojiOpen}
        chatOpen={chatOpen}
        unread={unread}
        callActive={callMode !== null}
        canUndo={canUndo}
        undoCharges={undoCharges}
        powerArmed={powerArmed}
        powerCharges={powerCharges}
        onEmoji={() => {
          setEmojiOpen((open) => !open);
          if (chatOpen) {
            setChatOpen(false);
            chatOpenRef.current = false;
          }
        }}
        onChat={toggleChat}
        onCall={toggleCall}
        onUndo={undo}
        onPower={togglePower}
      />

      {/* ── Settings panel ────────────────────────────────────────── */}
      {panel === "settings" ? (
        <GameModal title="Game settings" onClose={() => setPanel(null)}>
          <div className="space-y-2">
            <ToggleRow
              label="Sound effects"
              hint="Dice blips and UI tones"
              on={settings.sound}
              onToggle={() => toggleSetting("sound")}
            />
            <ToggleRow
              label="Safe-spot stars"
              hint="Stars on the protected start squares"
              on={settings.stars}
              onToggle={() => toggleSetting("stars")}
            />
            <ToggleRow
              label="Move hints"
              hint="Glow around tokens you can move"
              on={settings.hints}
              onToggle={() => toggleSetting("hints")}
            />
          </div>
        </GameModal>
      ) : null}
      {/* ── Trophies panel ────────────────────────────────────────── */}
      {panel === "trophies" ? (
        <GameModal title="Trophies & stats" onClose={() => setPanel(null)}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-black tabular-nums text-white">{stats.played}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                Rounds
              </p>
            </div>
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
              <p className="text-2xl font-black tabular-nums text-amber-200">{stats.wins}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/60">
                Wins
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { icon: "🏁", label: "First race — play a round", done: stats.played >= 1 },
              { icon: "🏆", label: "Champion — win a match", done: stats.wins >= 1 },
              { icon: "👑", label: "Dominant — win 3 matches", done: stats.wins >= 3 },
              { icon: "💎", label: "Legend — win 5 matches", done: stats.wins >= 5 },
            ].map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  item.done
                    ? "border-amber-400/40 bg-amber-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/45"
                }`}
              >
                <span className={item.done ? "" : "opacity-50 grayscale"} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
                  {item.label}
                </span>
                <span className="text-[10px] font-black uppercase">
                  {item.done ? "Unlocked" : "Locked"}
                </span>
              </li>
            ))}
          </ul>
        </GameModal>
      ) : null}

      {/* ── Rules panel ───────────────────────────────────────────── */}
      {panel === "rules" ? (
        <GameModal title="How to play" onClose={() => setPanel(null)}>
          <ul className="space-y-2.5 text-sm leading-relaxed text-white/70">
            <li>
              Roll a <strong className="text-white">6</strong> to bring a token out of your
              yard — a 6 also earns an extra roll.
            </li>
            <li>
              Land on an opponent to send it back to its yard — tokens on a{" "}
              <strong className="text-white">star safe square</strong> are protected.
            </li>
            <li>
              Race all 4 tokens up your colour column and into the centre with the exact
              count.
            </li>
            <li>
              <strong className="text-orange-300">⏪ Undo</strong> replays your last turn;{" "}
              <strong className="text-amber-300">⚡ Power</strong> arms a guaranteed 6.
            </li>
            <li>First player to bring all 4 tokens home wins the crown — and the stake.</li>
          </ul>
        </GameModal>
      ) : null}
    </div>
  );
}





