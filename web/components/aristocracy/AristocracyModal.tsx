"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Coins, Crown, Gift, Lock, X } from "lucide-react";
import {
  activateAristocracyTierAction,
  giftAristocracyTierAction,
} from "@/lib/actions/commerce";
import {
  ARISTOCRACY_TIERS,
  TIER_DURATION_DAYS,
  TIER_MASCOTS,
  TIER_ORDINALS,
  TIER_PRICES,
  perksForTier,
  type AristocracyTier,
} from "@/lib/aristocracyTiers";

/**
 * The Aristocracy store.
 *
 * ── WHAT "SECURE" MEANS HERE ───────────────────────────────────────────────
 * The price is NEVER sent from here. This component sends a tier NAME, and the
 * server resolves the cost from TIER_PRICES inside `debitAndGrant`. There is no
 * code path in which the number rendered on this screen is the number charged,
 * because the client has no authority over it.
 *
 * ── WHY A MODAL AND NOT A PAGE ──────────────────────────────────────────────
 * The Aristocracy is a purchase surface a member opens FROM the profile or the
 * feed. A page means navigating away from what they were doing and a back
 * button that loses their place. As a modal it opens over the current context
 * and closes straight back to it.
 *
 * ── GLASSMORPHISM, HONESTLY ────────────────────────────────────────────────
 * The frosted look is `backdrop-blur` over a translucent gradient, not a
 * texture. Every panel carries a border because a translucent panel over a photo
 * or video is unreadable without one — glass without a border is a legibility
 * bug, not a style.
 */

type Tab = "self" | "gift";

export interface AristocracyModalProps {
  /** Caller is signed in. The panel refuses to act otherwise. */
  signedIn: boolean;
  /** Server-read coin balance; never trusted for the decision, only displayed. */
  coinBalance: number;
  /** The caller's current rank, or null. */
  activeTier: AristocracyTier | null;
  activeTierExpiresAt?: string | null;
  onClose: () => void;
  /** Open the coin top-up flow from the insufficient-funds prompt. */
  onTopUp?: () => void;
}

export function AristocracyModal({
  signedIn,
  coinBalance,
  activeTier,
  activeTierExpiresAt = null,
  onClose,
  onTopUp,
}: AristocracyModalProps) {
  const [tab, setTab] = useState<Tab>("self");
  const [selected, setSelected] = useState<AristocracyTier>(activeTier ?? ARISTOCRACY_TIERS[0]);
  const [balance, setBalance] = useState(coinBalance);
  const [recipientCode, setRecipientCode] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [shortfall, setShortfall] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const cost = TIER_PRICES[selected];
  const isCurrent = activeTier === selected;
  const affordable = balance >= cost;
  const perks = perksForTier(selected);

  function flash(tone: "ok" | "bad", text: string) {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 4200);
  }

  /**
   * The single submit path for BOTH tabs.
   *
   * Sharing it means the gift path cannot drift into a weaker version of the
   * checks the self path makes — the risk with a "give as a gift" branch is
   * precisely that it stops validating something the normal path validates.
   */
  function submit() {
    if (!signedIn) {
      flash("bad", "Sign in to activate a rank.");
      return;
    }

    startTransition(async () => {
      const result =
        tab === "self"
          ? await activateAristocracyTierAction(selected)
          : await giftAristocracyTierAction(selected, recipientCode);

      if (!result.ok) {
        // `insufficient` is separated out because it is the ONE failure the UI
        // can actually do something about, so it gets a panel with a route to
        // top-up rather than a transient toast that scrolls away.
        if (result.reason === "insufficient") {
          const short = cost - (result.coinBalance ?? balance);
          setShortfall(short > 0 ? short : null);
          return;
        }
        flash("bad", result.error ?? "That didn't go through. Please try again.");
        return;
      }

      setShortfall(null);
      if (typeof result.coinBalance === "number") setBalance(result.coinBalance);
      flash(
        "ok",
        tab === "self"
          ? `${selected} is yours for ${TIER_DURATION_DAYS} days.`
          : `${selected} sent${result.recipientName ? ` to ${result.recipientName}` : ""}.`
      );
      setRecipientCode("");
    });
  }
  // ── Insufficient funds: a dedicated, actionable panel ─────────────────────
  if (shortfall !== null) {
    return (
      <ModalFrame onClose={onClose} title="Not quite enough" subtitle="Top up to unlock this rank">
        <div className="flex flex-col items-center gap-5 px-6 py-4 text-center">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-3xl"
          >
            {TIER_MASCOTS[selected]}
          </span>

          <p className="text-sm leading-6 text-white/80">
            <strong className="text-white">{selected}</strong> costs{" "}
            <strong className="text-white">{cost.toLocaleString()}</strong> tokens for{" "}
            {TIER_DURATION_DAYS} days.
          </p>

          {/* The shortfall as a NUMBER, not just "insufficient". A member who is
              40,000 short can see whether that is one task or a real top-up. */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <dt className="text-white/50">You have</dt>
                <dd className="mt-1 text-lg font-bold text-white">{balance.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-white/50">You need</dt>
                <dd className="mt-1 text-lg font-bold text-amber-300">
                  {shortfall.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">Costs</dt>
                <dd className="mt-1 text-lg font-bold text-white">{cost.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {onTopUp ? (
              <button
                type="button"
                onClick={() => {
                  setShortfall(null);
                  onTopUp();
                }}
                className="lux-cta flex-1 py-3 text-xs"
              >
                Get tokens
              </button>
            ) : (
              /* No top-up handler wired, so fall back to the store rather than
                 rendering a button that does nothing. */
              <Link href="/store" className="lux-cta flex-1 py-3 text-center text-xs">
                Get tokens
              </Link>
            )}
            <Link href="/task" className="lux-tab flex-1 py-3 text-center text-xs">
              Earn free tokens
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShortfall(null)}
            className="text-xs font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            Back to ranks
          </button>
        </div>
      </ModalFrame>
    );
  }
  return (
    <ModalFrame
      onClose={onClose}
      title="Aristocracy"
      subtitle={`Exclusive standing for ${TIER_DURATION_DAYS} days`}
      balance={balance}
    >
      {/* ── TIER SWITCHER ──────────────────────────────────────────────────
          A horizontally scrollable rail, not a wrapping row. Six tiers do not
          fit a phone at legible widths, and a wrapping grid pushes the selected
          tier's details out of view as the list grows.

          `snap-x` keeps the active chip in view when it changes, and each chip
          is a real button carrying the tier NAME in text — the 3D animal emblem
          is decorative (`aria-hidden`) and never the only carrier of meaning. */}
      <div className="relative">
        <div
          role="tablist"
          aria-label="Ranks"
          className="flex snap-x gap-2 overflow-x-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ARISTOCRACY_TIERS.map((name) => {
            const isSel = name === selected;
            const held = activeTier === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => setSelected(name)}
                className={[
                  "group flex min-w-[5.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 transition",
                  isSel
                    ? "border-amber-300/70 bg-gradient-to-b from-white/20 to-white/[0.04] shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]",
                ].join(" ")}
              >
                {/* 3D animal emblem. The ring + drop-shadow is what sells the
                    depth; a flat emoji on a flat chip reads as a sticker. */}
                <span
                  aria-hidden
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full text-2xl transition",
                    "border border-white/15 bg-gradient-to-b from-white/25 to-transparent",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_14px_-6px_rgba(0,0,0,0.9)]",
                    isSel ? "scale-110" : "group-hover:scale-105",
                  ].join(" ")}
                >
                  {TIER_MASCOTS[name]}
                </span>
                <span className="text-xs font-bold text-white">{name}</span>
                <span aria-hidden className="text-[10px] uppercase tracking-wider text-white/45">
                  {TIER_ORDINALS[name]}
                </span>
                <span className="text-[11px] font-semibold text-amber-300/90">
                  {TIER_PRICES[name].toLocaleString()}
                </span>
                {held ? (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                    Yours
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SELF / GIVE AWAY TABS ────────────────────────────────────────── */}
      <div role="tablist" aria-label="Purchase mode" className="flex gap-2 px-6 pb-1">
        {(
          [
            { id: "self" as const, label: "Activate", icon: Crown },
            { id: "gift" as const, label: "Give away", icon: Gift },
          ]
        ).map((item) => {
          const on = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(item.id)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                on
                  ? "border-white/25 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        {/* Recipient field, gift tab only. The code is a 6-character user code,
            so the input uppercases to match how `resolveUserCode` normalises —
            a lowercase paste still resolves instead of failing server-side with
            a generic "not found". */}
        {tab === "gift" ? (
          <div>
            <label htmlFor="aristocracy-recipient" className="mb-1.5 block text-xs font-semibold text-white/70">
              Their 6-character member code
            </label>
            <input
              id="aristocracy-recipient"
              value={recipientCode}
              onChange={(e) => setRecipientCode(e.target.value.toUpperCase())}
              placeholder="21ATZE"
              maxLength={6}
              autoComplete="off"
              className="lux-input w-full px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.3em]"
            />
            <p className="mt-1.5 text-[11px] text-white/45">
              Members can find their code on their profile. Your tokens are charged, not theirs.
            </p>
          </div>
        ) : null}

        {/* ── PRIVILEGES GRID ──────────────────────────────────────────────
            The six privilege families, each badged with the tier that unlocks
            it. Locked ones stay visible with a padlock: "you get this at King"
            is the most persuasive thing on the screen for someone one rank down,
            so hiding it would hide the reason to upgrade. */}
        <div>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Exclusive privileges
          </h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {perks.map((perk) => (
              <li
                key={perk.id}
                className={[
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                  perk.unlocked
                    ? "border-white/15 bg-white/[0.06]"
                    : "border-white/[0.07] bg-white/[0.02] opacity-60",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="text-base">{perk.icon}</span>
                  {perk.unlocked ? (
                    <span className="lux-check" aria-hidden>
                      <Check className="h-3 w-3" />
                    </span>
                  ) : (
                    <Lock className="h-3 w-3 text-white/40" aria-hidden />
                  )}
                </span>
                <span className="text-[11px] font-bold text-white">{perk.label}</span>
                <span className="text-[10px] leading-4 text-white/50">{perk.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Price + CTA. The affordability line is stated rather than left for
            the member to work out, and the button is disabled with an
            explanation adjacent instead of silently inert. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/50">
              {TIER_DURATION_DAYS} days
            </span>
            <span className="lux-coin text-lg">
              <Coins className="h-4 w-4" aria-hidden />
              {cost.toLocaleString()}
            </span>
          </div>

          {!affordable ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-300">
              You need {(cost - balance).toLocaleString()} more tokens.
            </p>
          ) : null}

          {isCurrent && tab === "self" ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
              <Check className="h-3.5 w-3.5" aria-hidden />
              This is your current rank — activating again renews it.
            </p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={isPending || !signedIn || (tab === "gift" && recipientCode.length < 6)}
            className="lux-cta mt-3 w-full py-3 text-xs"
          >
            {isPending
              ? "Working…"
              : tab === "gift"
                ? `Give away ${selected}`
                : isCurrent
                  ? `Renew ${selected}`
                  : `Activate ${selected}`}
          </button>
        </div>

        {notice ? (
          <p
            role="status"
            className={[
              "rounded-xl border px-3 py-2 text-center text-xs font-semibold",
              notice.tone === "ok"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200",
            ].join(" ")}
          >
            {notice.text}
          </p>
        ) : null}
      </div>
    </ModalFrame>
  );
}
/**
 * The frosted shell.
 *
 * `role="dialog"` + `aria-modal` + the labelled heading, because this traps
 * focus context and a screen-reader user needs to know a dialog opened. The
 * backdrop is click-closable (the standard modal affordance) while the panel
 * stops propagation, so a click INSIDE the dialog — which is most of them —
 * cannot dismiss it mid-purchase.
 */
function ModalFrame({
  title,
  subtitle,
  balance,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  balance?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="lux-card relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-6 py-4 backdrop-blur-xl">
          <div>
            <h2 className="lux-metal text-lg font-black uppercase tracking-wider">{title}</h2>
            {subtitle ? <p className="text-[11px] text-white/55">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {typeof balance === "number" ? (
              <span className="lux-coin text-xs">
                <Coins className="h-3.5 w-3.5" aria-hidden />
                {balance.toLocaleString()}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}