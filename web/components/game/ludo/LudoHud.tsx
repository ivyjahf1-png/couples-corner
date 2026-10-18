"use client";
/**
 * LudoHud — the purely PRESENTATIONAL pieces of the 5D Ludo screen.
 *
 * No game logic lives here: the orchestrator (LudoEngine) owns turn/dice state
 * and passes primitives down. Everything in this file is layout + material:
 *
 *  - LudoPlayerCard   the persistent neon-bordered base card (avatar puck,
 *                     flag, Lv tag, personal dice slot). Sits Top-Left /
 *                     Top-Right / Bottom-Left / Bottom-Right per the
 *                     reference HUD: David (cyan) · Bella (magenta) ·
 *                     Tunde (green) · Aisha (gold).
 *  - LudoMeetHereCard the top-centre "Meet Here (No Drop)" home-status card.
 *  - LudoRollPedestal the bottom-centre AAA Tap-to-Roll dice pedestal.
 *  - LudoStatusPill   the dynamic indicator pill (breathing dot + emoji)
 *                     pinned right above the fixed bottom navigation.
 */
import { LudoDice } from "./LudoDice";

export function LudoPlayerCard({
  name,
  flag,
  avatar,
  level,
  neon,
  active = false,
  align = "left",
  isYou = false,
  showDice = false,
  diceValue = 6,
  rolling = false,
  timer,
  photoUrl,
}: {
  name: string;
  flag: string;
  avatar: string;
  level: number;
  /** Neon border/glow colour for this seat's base container. */
  neon: string;
  /** True while it is this seat's turn. */
  active?: boolean;
  align?: "left" | "right";
  isYou?: boolean;
  /** Show the live die in the personal dice slot (the active seat only). */
  showDice?: boolean;
  diceValue?: number;
  rolling?: boolean;
  /** Live turn-countdown ring drawn around the avatar (active seat only). */
  timer?: { remaining: number; total: number };
  /** Optional custom photo URL; falls back to emoji avatar if absent/broken. */
  photoUrl?: string | null;
}) {
  const frac = timer ? Math.max(0, Math.min(1, timer.remaining / Math.max(1, timer.total))) : 0;
  // Green → Yellow → Red as the decision window runs out.
  const ringColor = frac > 0.5 ? "#34D399" : frac > 0.2 ? "#FBBF24" : "#F87171";
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-2xl border-2 px-1.5 py-1 backdrop-blur-md transition-shadow ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
      style={{
        borderColor: isYou ? "#F59E0B" : active ? neon : `${neon}88`,
        background: isYou
          ? "linear-gradient(160deg, rgba(245,158,11,.28) 0%, rgba(2,6,23,.82) 58%)"
          : `linear-gradient(160deg, ${neon}1f 0%, rgba(2,6,23,.82) 58%)`,
        boxShadow: isYou
          ? `0 0 18px rgba(245,158,11,.35), inset 0 0 12px rgba(245,158,11,.12), 0 6px 14px rgba(0,0,0,.45)`
          : active
            ? `0 0 18px ${neon}66, inset 0 0 12px ${neon}22, 0 6px 14px rgba(0,0,0,.45)`
            : `0 0 8px ${neon}22, 0 6px 12px rgba(0,0,0,.4)`,
      }}
    >
      {/* Photoreal avatar puck: glossy sphere with contact shadow + online dot */}
      <span className="relative grid h-9 w-9 shrink-0 place-items-center">
        {/* Prominent YOU badge for the client user's own card */}
        {isYou ? (
          <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 text-[7px] font-black tracking-wider text-slate-950 shadow-[0_0_10px_rgba(251,191,36,.8)]">
            YOU
          </span>
        ) : null}
        {/* Circular progress ring — depletes over TURN_SECONDS, green→yellow→red */}
        {timer ? (
          <svg viewBox="0 0 48 48" className="absolute -inset-[4px] -rotate-90" aria-hidden>
            <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3.5" />
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke={ringColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 21}
              strokeDashoffset={(1 - frac) * 2 * Math.PI * 21}
              style={{ transition: "stroke-dashoffset .12s linear, stroke .35s linear" }}
            />
          </svg>
        ) : null}
        {timer ? (
          <span
            className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-950/90 px-1 text-[7px] font-black leading-[11px]"
            style={{ color: ringColor }}
            aria-hidden
          >
            {Math.ceil(timer.remaining)}s
          </span>
        ) : null}
        <span
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full text-[15px] ring-1 ring-white/45"
          style={{
            background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,.75), ${neon} 58%, rgba(0,0,0,.6) 135%)`,
            boxShadow:
              "0 4px 8px rgba(0,0,0,.55), inset 0 -2px 4px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.5)",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span aria-hidden>{avatar}</span>
          )}
        </span>
        <span
          className="absolute -bottom-0.5 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950/80"
          aria-hidden
        />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[10px] font-black leading-tight text-white ${
            align === "right" ? "text-right" : ""
          }`}
        >
          {name} <span className="text-[9px]">{flag}</span>
        </span>
        <span
          className={`mt-0.5 flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
        >
          <span className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-1.5 text-[8px] font-black leading-4 text-black">
            Lv.{level}
          </span>
          {isYou ? (
            <span className="rounded-full bg-sky-500/85 px-1.5 text-[8px] font-black leading-4 text-white">
              YOU
            </span>
          ) : null}
        </span>
      </span>

      {/* Personal dice slot — frosted socket; hosts the live glass die on your turn */}
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/15 bg-slate-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,.6)]"
        aria-hidden
      >
        {showDice ? (
          <LudoDice value={diceValue} rolling={rolling} size={20} />
        ) : (
          <span className="text-[10px] leading-none text-white/25">🎲</span>
        )}
      </span>
    </div>
  );
}

/** Top-centre home-status card: the no-drop meeting zone. */
export function LudoMeetHereCard() {
  return (
    <div
      className="flex shrink-0 flex-col items-center rounded-2xl border border-emerald-400/40 bg-slate-950/75 px-2.5 py-1 text-center backdrop-blur-md"
      style={{ boxShadow: "0 0 14px rgba(16,185,129,.22), 0 6px 12px rgba(0,0,0,.4)" }}
    >
      <span className="text-[11px] leading-none" aria-hidden>
        🏠
      </span>
      <p className="mt-0.5 text-[8px] font-black uppercase leading-tight tracking-[.08em] text-emerald-300">
        Meet Here
      </p>
      <p className="text-[7px] font-bold uppercase leading-tight tracking-wide text-white/55">
        (No Drop)
      </p>
    </div>
  );
}

/**
 * Bottom-centre Tap-to-Roll pedestal. Wires straight to the orchestrator's
 * roll handler — enabling/disabling is decided by game state upstream.
 */
export function LudoRollPedestal({
  diceValue,
  rolling,
  canRoll,
  label,
  onClick,
}: {
  diceValue: number;
  rolling: boolean;
  canRoll: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canRoll}
      aria-label="Roll the dice"
      className={`relative flex flex-col items-center justify-center gap-1 rounded-3xl border-2 px-4 py-1.5 backdrop-blur-md transition active:scale-95 disabled:cursor-default ${
        canRoll ? "animate-[cc-ludo-halo_2s_ease-in-out_infinite]" : ""
      }`}
      style={{
        borderColor: canRoll ? "#FCD34D" : "rgba(255,255,255,.18)",
        background: canRoll
          ? "radial-gradient(120% 120% at 50% 0%, rgba(251,191,36,.32), rgba(120,53,15,.55) 70%, rgba(30,20,10,.78))"
          : "rgba(15,23,42,.72)",
        boxShadow: canRoll
          ? "0 10px 22px rgba(0,0,0,.55), inset 0 0 18px rgba(251,191,36,.2)"
          : "inset 0 0 14px rgba(0,0,0,.5)",
      }}
    >
      <LudoDice value={diceValue} rolling={rolling} active={canRoll} size={38} />
      <span
        className={`text-[8px] font-black uppercase leading-none tracking-[.16em] sm:text-[9px] ${
          canRoll ? "text-amber-200" : "text-white/70"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

/** Dynamic status pill — breathing dot + emoji, sits right above the nav. */
export function LudoStatusPill({
  text,
  thinking,
}: {
  text: string;
  thinking: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-slate-950/85 px-3 py-1.5 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,.45)]">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          thinking
            ? "bg-amber-300 animate-[cc-ludo-breathe_1.2s_ease-in-out_infinite]"
            : "bg-emerald-400"
        }`}
        aria-hidden
      />
      <span className="text-[11px] leading-none" aria-hidden>
        {thinking ? "💭" : "🎲"}
      </span>
      <p className="min-w-0 flex-1 truncate text-center text-[11px] font-black text-white/85">
        {text}
      </p>
    </div>
  );
}