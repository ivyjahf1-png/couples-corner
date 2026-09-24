import type { ReactNode } from "react";
import { Icon } from "@/components/landing/Icon";
import { HOME, PLAYER_COLORS, PLAYER_DEEP, PLAYER_PROFILES, type Tokens } from "./ludoCore";

/**
 * Ludo Superstar-style HUD pieces for the built-in Ludo game view:
 * top navigation, player profile frames, turn card, action bar,
 * emoji drawer, chat sheet, call chip and modal panels.
 *
 * All presentation — the game view wires these to the untouched engine.
 */

export type NavPanel = "settings" | "trophies" | "rules";

export interface ChatMessage {
  id: number;
  from: "you" | "them";
  /** Display name for opponent messages. */
  sender?: string;
  text: string;
}

export interface SessionStats {
  played: number;
  wins: number;
}

export interface HudSettings {
  sound: boolean;
  stars: boolean;
  hints: boolean;
}

/* ── Small inline line icons (same 24-grid + stroke as <Icon/>) ─────── */

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 6.5C10.2 5 7.9 4.4 5 4.6A1.5 1.5 0 0 0 3.5 6v11.9c0 .9.8 1.5 1.6 1.4 2.7-.2 4.9.4 6.9 1.9 2-1.5 4.2-2.1 6.9-1.9.9.1 1.6-.5 1.6-1.4V6c0-.9-.7-1.5-1.6-1.4-2.9-.2-5.2.4-7 1.5Z" />
      <path d="M12 6.5v17.4" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M7.2 3.5h2.6l1.4 3.7-2 1.5a12.4 12.4 0 0 0 5.1 5.1l1.5-2 3.7 1.4v2.6a2.2 2.2 0 0 1-2.3 2.2A15.6 15.6 0 0 1 5 5.8a2.2 2.2 0 0 1 2.2-2.3Z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M13 2.5 4.8 13.4h5.6L9.6 21.5l8.6-11.2h-5.4z" />
    </svg>
  );
}

function SmileyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.4 13.8s1.4 2 3.6 2 3.6-2 3.6-2" />
      <path d="M9 9.6h.01M15 9.6h.01" strokeWidth={2.4} />
    </svg>
  );
}

function GemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M6.2 3.5h11.6L21 9.2 12 20.8 3 9.2z" />
      <path d="M3 9.2h18M8.8 9.2 12 20.8l3.2-11.6M8.8 9.2 6.2 3.5M15.2 9.2 17.8 3.5" />
    </svg>
  );
}
/* ── Top navigation ─────────────────────────────────────────────────── */

const navButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/85 transition hover:border-orange-400/60 hover:bg-orange-500/10 hover:text-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export function LudoTopNav({
  coinBalance,
  onOpen,
}: {
  coinBalance: number;
  onOpen: (panel: NavPanel) => void;
}) {
  return (
    <header className="flex w-full max-w-xl items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button type="button" className={navButtonClass} aria-label="Game settings"
          onClick={() => onOpen("settings")}>
          <Icon name="settings" className="h-5 w-5" />
        </button>
        <button type="button" className={navButtonClass} aria-label="Trophies and match stats"
          onClick={() => onOpen("trophies")}>
          <Icon name="crown" className="h-5 w-5" />
        </button>
        <button type="button" className={navButtonClass} aria-label="How to play — rules"
          onClick={() => onOpen("rules")}>
          <BookIcon className="h-5 w-5" />
        </button>
        <span className="ml-1 hidden text-[11px] font-black uppercase tracking-[0.24em] text-white/35 sm:inline">
          Couple Ludo
        </span>
      </div>

      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-400/25 to-amber-500/10 px-2.5 py-1.5 sm:px-3"
        aria-label={`Coin balance: ${coinBalance.toLocaleString()} coins`}
      >
        <GemIcon className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-sm font-extrabold tabular-nums text-amber-200">
          {coinBalance.toLocaleString()}
        </span>
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-amber-300/70 sm:inline">
          coins
        </span>
      </span>
    </header>
  );
}

/* ── Player profile frames ──────────────────────────────────────────── */

export function ProfileFrame({
  player,
  tokens,
  active,
  align,
}: {
  player: number;
  tokens: Tokens;
  active: boolean;
  align: "start" | "end";
}) {
  const profile = PLAYER_PROFILES[player];
  const color = PLAYER_COLORS[player];
  const deep = PLAYER_DEEP[player];
  const home = tokens.filter((pos) => pos === HOME).length;
  const reversed = align === "end";

  return (
    <div
      className={`flex min-w-0 max-w-[48%] items-center gap-1.5 rounded-2xl border bg-slate-950/85 px-1.5 py-1.5 sm:gap-2 sm:px-2.5 ${
        reversed ? "flex-row-reverse" : ""
      }`}
      style={{
        borderColor: active ? color : "rgba(255,255,255,0.1)",
        boxShadow: active ? `0 0 18px ${color}59` : undefined,
      }}
      title={`${profile.name} — ${home}/4 tokens home`}
    >
      <span className="relative shrink-0">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white ring-2 ring-white/75 sm:h-9 sm:w-9 sm:text-base"
          style={{ background: `linear-gradient(135deg, ${color}, ${deep})` }}
          aria-hidden="true"
        >
          {profile.initial}
        </span>
      </span>

      <span className="min-w-0">
        <span className={`flex items-center gap-1 ${reversed ? "justify-end" : ""}`}>
          {active ? (
            <span
              className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate text-xs font-bold text-white sm:text-sm">{profile.name}</span>
          <span className="shrink-0 text-[11px] leading-none" aria-label={`Flag ${profile.flag}`}>
            {profile.flag}
          </span>
        </span>
        <span
          className={`mt-0.5 flex items-center gap-1 ${reversed ? "justify-end" : ""}`}
          aria-label={`${home} of 4 tokens home`}
        >
          {tokens.map((pos, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={
                pos === HOME
                  ? { background: color }
                  : { boxShadow: `inset 0 0 0 1.5px ${pos >= 0 ? color : "rgba(255,255,255,0.35)"}` }
              }
            />
          ))}
          <span className="text-[10px] font-semibold tabular-nums text-white/45">{home}/4</span>
        </span>
      </span>
    </div>
  );
}
/* ── Turn indicator + glowing roll control ──────────────────────────── */

export function TurnCard({
  turnLabel,
  turnColor,
  log,
  dice,
  canRoll,
  onRoll,
}: {
  turnLabel: string;
  turnColor: string;
  log: string;
  dice: number | null;
  canRoll: boolean;
  onRoll: () => void;
}) {
  return (
    <section
      className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-[#0F172A]/90 p-3 shadow-xl shadow-black/30 sm:flex-row sm:items-center"
      aria-label="Turn status"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl font-black text-slate-900 shadow-inner"
          aria-label={dice !== null ? `Dice showing ${dice}` : "Dice idle"}
        >
          {dice ?? "🎲"}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Turn</p>
          <p
            className="flex items-center gap-1.5 text-sm font-extrabold text-white sm:text-base"
            aria-live="polite"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: turnColor }}
              aria-hidden="true"
            />
            <span className="truncate">{turnLabel}</span>
          </p>
          <p role="status" className="mt-0.5 text-xs leading-5 text-white/55">
            {log}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRoll}
        disabled={!canRoll}
        className={`w-full shrink-0 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 sm:w-auto ${
          canRoll
            ? "animate-[cc-glow_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
            : ""
        }`}
      >
        {canRoll ? "Roll dice 🎲" : dice !== null ? "Moving…" : "Waiting…"}
      </button>
    </section>
  );
}

/* ── Interactive player action bar ──────────────────────────────────── */

function ActionButton({
  label,
  onClick,
  active = false,
  disabled = false,
  badge,
  badgeClass = "bg-rose-500",
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
  badgeClass?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-orange-400/70 bg-orange-500/20 text-orange-100"
          : "border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10"
      }`}
    >
      {children}
      <span className="truncate text-[9px] font-black uppercase tracking-wider sm:text-[10px]">
        {label}
      </span>
      {badge !== undefined ? (
        <span
          className={`absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-black leading-none text-white ${badgeClass}`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function ActionBar({
  emojiOpen,
  chatOpen,
  unread,
  callActive,
  canUndo,
  undoCharges,
  powerArmed,
  powerCharges,
  onEmoji,
  onChat,
  onCall,
  onUndo,
  onPower,
}: {
  emojiOpen: boolean;
  chatOpen: boolean;
  unread: number;
  callActive: boolean;
  canUndo: boolean;
  undoCharges: number;
  powerArmed: boolean;
  powerCharges: number;
  onEmoji: () => void;
  onChat: () => void;
  onCall: () => void;
  onUndo: () => void;
  onPower: () => void;
}) {
  return (
    <div className="grid w-full max-w-xl grid-cols-5 gap-1.5 rounded-2xl border border-white/10 bg-slate-950/70 p-2 sm:gap-2">
      <ActionButton label="Emoji" onClick={onEmoji} active={emojiOpen}>
        <SmileyIcon className="h-5 w-5" />
      </ActionButton>
      <ActionButton
        label="Chat"
        onClick={onChat}
        active={chatOpen}
        badge={unread > 0 ? unread : undefined}
        badgeClass="bg-rose-500"
      >
        <Icon name="chat" className="h-5 w-5" />
      </ActionButton>
      <ActionButton label={callActive ? "End" : "Call"} onClick={onCall} active={callActive}>
        <PhoneIcon className="h-5 w-5" />
      </ActionButton>
      <ActionButton
        label="Undo"
        onClick={onUndo}
        disabled={!canUndo}
        badge={undoCharges}
        badgeClass="bg-sky-500"
      >
        <Icon name="rewind" className="h-5 w-5" />
      </ActionButton>
      <ActionButton
        label="Power"
        onClick={onPower}
        active={powerArmed}
        disabled={powerCharges <= 0}
        badge={powerCharges}
        badgeClass="bg-amber-500"
      >
        <BoltIcon className="h-5 w-5" />
      </ActionButton>
    </div>
  );
}
/* ── Emoji reactions drawer ──────────────────────────────────────────── */

export const REACTION_EMOJI = [
  "😂", "😮", "🔥", "👏", "😭", "😱",
  "💪", "🎲", "❤️", "😴", "🤔", "🎉",
];

const sheetClass =
  "absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border-t border-white/15 bg-slate-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-md animate-[cc-sheet-up_0.18s_ease-out] motion-reduce:animate-none";

export function EmojiDrawer({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={sheetClass} role="dialog" aria-label="Quick reaction drawer">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          Quick reactions
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reactions"
          className="rounded-lg p-1 text-white/60 transition hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {REACTION_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`React with ${emoji}`}
            className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/5 text-xl transition hover:scale-110 hover:border-orange-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:hover:scale-100"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Big emoji that floats up over the board and fades away. */
export function FloatingReaction({ emoji }: { emoji: string }) {
  return (
    <span
      className="pointer-events-none absolute bottom-1/3 left-1/2 z-30 select-none text-5xl animate-[cc-float-up_2.2s_ease-out_forwards] motion-reduce:animate-none"
      style={{ transform: "translateX(-50%)" }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

/* ── Voice/video call chip ───────────────────────────────────────────── */

export function CallChip({
  mode,
  seconds,
  onToggleMode,
  onEnd,
}: {
  mode: "voice" | "video";
  seconds: number;
  onToggleMode: () => void;
  onEnd: () => void;
}) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div
      className="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-950/90 py-1 pl-2.5 pr-1.5 shadow-lg backdrop-blur animate-[cc-sheet-up_0.18s_ease-out] motion-reduce:animate-none"
      role="status"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <PhoneIcon className="h-3.5 w-3.5 text-emerald-300" />
      <span className="whitespace-nowrap text-[11px] font-bold text-emerald-200">
        {mode === "video" ? "Video" : "Voice"} · {mm}:{String(ss).padStart(2, "0")}
      </span>
      <button
        type="button"
        onClick={onToggleMode}
        aria-label={mode === "video" ? "Switch to voice" : "Switch to video"}
        className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/85 transition hover:bg-white/20"
      >
        {mode === "video" ? "Voice" : "Video"}
      </button>
      <button
        type="button"
        onClick={onEnd}
        aria-label="End call"
        className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase text-white transition hover:bg-red-600"
      >
        End
      </button>
    </div>
  );
}
/* ── In-game chat overlay ────────────────────────────────────────────── */

export const QUICK_PHRASES = [
  "Nice move! 👏",
  "So close 😅",
  "Your turn!",
  "Good game 🎲",
  "Lucky roll! 😱",
  "Watch this 👀",
];

export function ChatSheet({
  messages,
  draft,
  onDraftChange,
  onSend,
  onQuick,
  onClose,
}: {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onQuick: (phrase: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={sheetClass} role="dialog" aria-label="In-game chat">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          Table chat
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-lg p-1 text-white/60 transition hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <ul className="mb-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`flex ${message.from === "you" ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] break-words rounded-2xl px-2.5 py-1.5 text-xs leading-snug ${
                message.from === "you"
                  ? "rounded-br-sm bg-orange-500/85 font-medium text-white"
                  : "rounded-bl-sm bg-white/10 text-white/85"
              }`}
            >
              {message.from === "them" && message.sender ? (
                <span className="mr-1 font-black text-amber-300/90">{message.sender}:</span>
              ) : null}
              {message.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-2 flex flex-wrap gap-1">
        {QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => onQuick(phrase)}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:border-orange-400/50 hover:text-orange-200"
          >
            {phrase}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          maxLength={120}
          placeholder="Say something nice…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-orange-400/60 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

/* ── Modal panels (settings / trophies / rules) ─────────────────────── */

export function GameModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
      />
      <div className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/15 bg-[#0F172A] p-5 shadow-2xl shadow-black/60 animate-[cc-sheet-up_0.18s_ease-out] motion-reduce:animate-none">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold tracking-wide text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-white/60 transition hover:text-white"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-white/50">{hint}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          on ? "bg-orange-500" : "bg-white/15"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}




