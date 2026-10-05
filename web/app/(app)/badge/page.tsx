"use client";

import { useState } from "react";
import { PageHeader, PageLock } from "@/components/app/PageHeader";
import { Check, Plus, User, X } from "lucide-react";

/**
 * BADGE — the badge management view.
 *
 * Three bands in ONE scroll region:
 *   1. Profile frame — pick which owned frame the avatar wears (ring preview).
 *   2. Equipped      — the four badge slots; filled slots remove on tap, empty
 *                      slots are the `+` add buttons.
 *   3. My badges      — the owned tray; tapping a badge equips/unequips it.
 *
 * EQUIP STATE IS LOCAL. The badges below are the demo account's owned set and
 * nothing in `profiles` persists an equipped slot yet — per this product's rule
 * of not claiming state the backend cannot support (the profile screen's
 * "Uncertified" row documents the same call). The handlers are shaped so a
 * future `saveLoadout({ frame, slots })` server action slots into them without
 * touching the markup.
 */

/* Dark slate surface shared with the Level screen: slate-900 glass + hairline. */
const CARD = "rounded-2xl border border-white/10 bg-[#0F172A]/70 shadow-lg";

interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  hint: string;
}

/** The demo account's owned badges — all eight are equippable immediately. */
const OWNED_BADGES: BadgeDef[] = [
  { id: "early-bird", name: "Early Bird", emoji: "🌅", hint: "Joined in the first month" },
  { id: "chatty", name: "Chatty", emoji: "💬", hint: "Sent 100 messages" },
  { id: "supporter", name: "Supporter", emoji: "🎁", hint: "Sent 10 gifts" },
  { id: "night-owl", name: "Night Owl", emoji: "🦉", hint: "Active after midnight" },
  { id: "explorer", name: "Explorer", emoji: "🧭", hint: "Tried every game" },
  { id: "poster", name: "Moment Star", emoji: "📸", hint: "Posted 25 moments" },
  { id: "loyal", name: "Loyal", emoji: "💛", hint: "30-day streak" },
  { id: "top-fan", name: "Top Fan", emoji: "🔥", hint: "Most reactions in a week" },
];

interface FrameDef {
  id: string;
  name: string;
  /** Tailwind border colour utility applied to the preview ring. */
  ring: string;
}

/** Owned profile frames. `ring` doubles as the preview's colour. */
const OWNED_FRAMES: FrameDef[] = [
  { id: "dawn", name: "Dawn", ring: "border-amber-400" },
  { id: "midnight", name: "Midnight", ring: "border-sky-400" },
  { id: "blossom", name: "Blossom", ring: "border-pink-400" },
];

/** Four slots: two filled by default, two open as `+` buttons. */
const SLOT_COUNT = 4;
const DEFAULT_SLOTS: (string | null)[] = ["early-bird", "chatty", null, null];

export default function BadgePage() {
  const [frameId, setFrameId] = useState(OWNED_FRAMES[0].id);
  const [slots, setSlots] = useState<(string | null)[]>(DEFAULT_SLOTS);
  const [notice, setNotice] = useState<string | null>(null);

  const frame = OWNED_FRAMES.find((entry) => entry.id === frameId) ?? OWNED_FRAMES[0];
  const equippedIds = slots.filter((id): id is string => id !== null);

  /* Transient status line; follows TaskCenter's flash pattern (no unmount
     bookkeeping — a setState after unmount is a no-op in React 18). */
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  /** Equip into the first open slot, or unequip if already worn. */
  function toggleBadge(id: string) {
    const wornAt = slots.indexOf(id);
    if (wornAt >= 0) {
      setSlots((prev) => prev.map((slot, index) => (index === wornAt ? null : slot)));
      return;
    }
    const emptyAt = slots.indexOf(null);
    if (emptyAt < 0) {
      flash(`All ${SLOT_COUNT} slots are full — remove one first.`);
      return;
    }
    setSlots((prev) => prev.map((slot, index) => (index === emptyAt ? id : slot)));
  }

  /** The `+` buttons: equip the first owned badge that is not already worn. */
  function addNextBadge() {
    const next = OWNED_BADGES.find((badge) => !slots.includes(badge.id));
    if (!next) {
      flash("Every owned badge is already equipped.");
      return;
    }
    toggleBadge(next.id);
  }

  return (
    <PageLock
      className="mx-auto w-full max-w-3xl"
      bodyClassName="pb-8"
      head={
        <PageHeader
          eyebrow="Profile"
          title="Badge"
          subtitle="Choose the frame your avatar wears and equip up to four badges."
        />
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── 1. PROFILE FRAME ─────────────────────────────────────────── */}
        <section aria-label="Profile frame" className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Profile Frame</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            The ring drawn around your avatar across the app.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            {/* Live preview: the frame's colour on a ringed disc. */}
            <div
              className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 bg-white/5 ${frame.ring}`}
              aria-label={`Current frame: ${frame.name}`}
            >
              <User className="h-8 w-8 text-slate-300" aria-hidden />
            </div>
            <ul className="flex flex-wrap gap-2">
              {OWNED_FRAMES.map((owned) => {
                const active = owned.id === frameId;
                return (
                  <li key={owned.id}>
                    <button
                      type="button"
                      onClick={() => setFrameId(owned.id)}
                      aria-pressed={active}
                      className={[
                        "flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]",
                        active
                          ? "border-[#FF7A00]/60 bg-[#FF7A00]/15 text-[#FFA040]"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                      ].join(" ")}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border-2 ${owned.ring}`}
                        aria-hidden
                      />
                      {owned.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── 2. EQUIPPED SLOTS — the `+` add buttons live here ────────── */}
        <section aria-label="Equipped badges" className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Equipped Badges
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Filled slots remove on tap; empty slots add the next badge.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-300">
              {equippedIds.length}/{SLOT_COUNT}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 p-5">
            {slots.map((id, index) => {
              const badge = id ? OWNED_BADGES.find((entry) => entry.id === id) ?? null : null;
              if (badge) {
                return (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    onClick={() => toggleBadge(badge.id)}
                    aria-label={`Unequip ${badge.name}`}
                    className="group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-[#FF7A00]/50 bg-[#FF7A00]/10 px-1 transition hover:bg-[#FF7A00]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
                  >
                    <span className="text-2xl" aria-hidden>
                      {badge.emoji}
                    </span>
                    <span className="w-full truncate text-center text-[10px] font-bold text-white">
                      {badge.name}
                    </span>
                    {/* Remove affordance, revealed on hover/focus so the resting
                        grid stays clean but the action stays discoverable. */}
                    <span
                      aria-hidden
                      className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full border border-white/20 bg-slate-800 text-white group-hover:grid group-focus-visible:grid"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={`slot-${index}`}
                  type="button"
                  onClick={addNextBadge}
                  aria-label="Add a badge to this slot"
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/15 text-slate-500 transition hover:border-[#FF7A00]/60 hover:text-[#FFA040] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                  <span className="text-[10px] font-bold">Add</span>
                </button>
              );
            })}
          </div>
          <p
            role="status"
            className={`px-5 pb-4 text-xs ${notice ? "text-[#FFA040]" : "text-slate-500"}`}
          >
            {notice ?? "Tap an equipped badge to remove it, or an Add slot to wear the next one."}
          </p>
        </section>

        {/* ── 3. OWNED TRAY ────────────────────────────────────────────── */}
        <section aria-label="My badges">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">My Badges</h2>
            <span className="text-[11px] text-slate-400">{OWNED_BADGES.length} owned</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {OWNED_BADGES.map((badge) => {
              const worn = equippedIds.includes(badge.id);
              return (
                <li key={badge.id}>
                  <button
                    type="button"
                    onClick={() => toggleBadge(badge.id)}
                    aria-pressed={worn}
                    className={[
                      "flex w-full flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]",
                      worn
                        ? "border-[#FF7A00]/60 bg-[#FF7A00]/10"
                        : "border-white/10 bg-[#0F172A]/70 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <span className="relative text-2xl" aria-hidden>
                      {badge.emoji}
                      {worn ? (
                        <span className="absolute -right-2.5 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#FF7A00]">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs font-bold text-white">{badge.name}</span>
                    <span className="text-[10px] leading-tight text-slate-400">{badge.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageLock>
  );
}


