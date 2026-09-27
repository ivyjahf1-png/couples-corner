"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, Sparkles, Check } from "lucide-react";
import { claimAdRewardAction } from "@/lib/actions/ad-rewards";
import { notifySuccess, notifyFailure } from "@/components/ui/FailureToasts";
import { useFeedActiveState } from "@/components/app/FeedActiveContext";

/**
 * Seconds the member must keep the card on screen to earn the grant.
 *
 * Chosen to match a real short-form ad's watch time, so the interaction is
 * familiar rather than arbitrary. The server is still the authority on whether
 * a claim is allowed at all - see the verification note below.
 */
const WATCH_SECONDS = 12;

/** How often the progress bar advances. 100ms is smooth and cheap. */
const TICK_MS = 100;

export interface SponsoredMomentCardProps {
  /** Signed-in member, or null. No timer runs for a signed-out visitor. */
  viewerId: string | null;
  /**
   * ISO timestamp from `getNextAdRewardAtAction`; null when a claim is allowed.
   * Drives the cooldown state so the card cannot be farmed by re-entering it.
   */
  nextAvailableAt?: string | null;
}

/**
 * A sponsored, in-feed card that grants tokens after a watch period.
 *
 * ── WHAT THIS IS, HONESTLY ────────────────────────────────────────────────
 * This is a TIMED ENGAGEMENT GRANT. No advertisement is served and no ad
 * network is involved: the card renders a branded placeholder, not a creative.
 * "Sponsored" marks the placement as reserved for paid inventory - once a real
 * campaign fills it, the visual shell stays and only the body changes.
 *
 * ── THE TIMER IS NOT VERIFICATION ──────────────────────────────────────────
 * The countdown below is an ENGAGEMENT SIGNAL, not proof of anything. It runs
 * in the member's own browser, so anyone can complete it from a console, patch
 * the clock, or drive it without looking. It cannot make the grant trustworthy
 * and must never be described as if it does.
 *
 * What actually protects the wallet is unchanged and lives on the server:
 *   • the 30-minute cooldown in `claimAdRewardAction`, which this component only
 *     mirrors for display, and
 *   • the `claim_ad_reward` RPC staying `security definer` and revoked from
 *     `authenticated`, so no client can call it directly or for another user.
 *
 * When a real ad network is wired in, the completion signal moves server-side
 * (SSAR) and the timer disappears entirely - the same seam the rewarded
 * `onRewarded` prop represented in WatchAdForTokens.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function SponsoredMomentCard({
  viewerId,
  nextAvailableAt = null,
}: SponsoredMomentCardProps) {
  // Whether this card is the one snapped into view, read from the feed rather
  // than passed in. The timer runs ONLY while this is true, so a member cannot
  // park the feed and let it complete unattended.
  //
  // The null-guard matters: rendered outside a MediaFeed there is no provider,
  // and defaulting to `true` there would start the timer for a card nobody is
  // looking at. Unknown means NOT active, so the safe default is to do nothing.
  const feedActive = useFeedActiveState();
  const active = Boolean(
    feedActive &&
      feedActive.sponsoredIndex !== null &&
      feedActive.activeIndex === feedActive.sponsoredIndex
  );
  // Seconds elapsed on the current view. Reset whenever the card leaves view so
  // progress cannot be banked across visits.
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"idle" | "counting" | "claiming" | "done">("idle");
  // Cooldown countdown, ticking locally so the label stays live.
  const [remaining, setRemaining] = useState<string | null>(null);
  // Guards the claim so a tick boundary, a re-render, or a StrictMode double
  // invoke can never fire two claims for one watch period.
  const claiming = useRef(false);

  /* Cooldown label, and the gate the timer respects. */
  useEffect(() => {
    if (!nextAvailableAt) {
      setRemaining(null);
      return;
    }
    const target = new Date(nextAvailableAt).getTime();
    const tick = () => {
      const left = target - Date.now();
      if (left <= 0) {
        setRemaining(null);
        return;
      }
      const total = Math.ceil(left / 1000);
      setRemaining(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextAvailableAt]);

  const cooling = remaining !== null;

  /**
   * Ask the server to credit the wallet.
   *
   * Guarded by a ref rather than the `phase` state because two calls can be
   * queued from the same tick before React has re-rendered, and `phase` would
   * still read "counting" for both.
   */
  const claim = useCallback(async () => {
    if (claiming.current) return;
    claiming.current = true;
    setPhase("claiming");
    try {
      const result = await claimAdRewardAction({ source: "sponsored_card" });
      if (!result.ok) {
        notifyFailure(result.error ?? "Could not credit your tokens.");
        // Release the guard so a later view can try again, and rewind the bar
        // rather than stranding the member on a stuck "claimed" state.
        claiming.current = false;
        setElapsed(0);
        setPhase("counting");
        return;
      }
      if (result.credited) {
        notifySuccess(`+${result.rewardAmount} tokens added to your wallet!`);
      } else {
        notifyFailure(result.error ?? "That reward was already claimed.");
      }
      setPhase("done");
    } catch {
      notifyFailure("Something went wrong. Please try again.");
      claiming.current = false;
      setElapsed(0);
      setPhase("counting");
    }
  }, []);
  /* The watch timer. Runs only while this card is the snapped-to card. */
  useEffect(() => {
    // Signed out, cooling down, or already credited: nothing to time.
    if (!active || !viewerId || cooling || phase === "done" || phase === "claiming") {
      // Leaving the card resets progress, so progress cannot be banked by
      // flicking away and back. `done` is deliberately preserved so the
      // credited state survives a scroll within the cooldown.
      if (!active && phase !== "done") {
        setElapsed(0);
        setPhase("idle");
      }
      return;
    }

    if (phase === "idle") setPhase("counting");

    const id = window.setInterval(() => {
      setElapsed((prev) => Math.min(prev + TICK_MS / 1000, WATCH_SECONDS));
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [active, viewerId, cooling, phase]);

  /* Fire exactly once when the bar reaches the end. */
  useEffect(() => {
    if (elapsed >= WATCH_SECONDS && phase === "counting" && !claiming.current) {
      void claim();
    }
  }, [elapsed, phase, claim]);

  const progress = Math.min(elapsed / WATCH_SECONDS, 1);
  const secondsLeft = Math.max(Math.ceil(WATCH_SECONDS - elapsed), 0);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0F172A]">
      {/* Body. A real campaign replaces this block with the creative; the frame,
          label and timer around it are what the feed layout depends on, so they
          do not move. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-orange-950/40">
          <Sparkles className="h-8 w-8 text-white" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">
          Sponsored
        </p>
        <p className="text-balance text-lg font-bold leading-snug text-white">
          {phase === "done"
            ? "Tokens added to your wallet"
            : "Watch this moment to earn free tokens"}
        </p>
        <p className="text-xs leading-5 text-ink-300">
          {cooling
            ? "Come back shortly for your next tokens."
            : phase === "done"
              ? "Thanks for supporting the community."
              : viewerId
                ? `Stay on this card for ${WATCH_SECONDS} seconds.`
                : "Sign in to earn free tokens."}
        </p>
      </div>

      {/* Timer, pinned to the bottom like a video scrubber so the card reads as
          part of the feed rather than a dialog dropped on top of it. */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-label="Watch progress"
          aria-valuemin={0}
          aria-valuemax={WATCH_SECONDS}
          aria-valuenow={Math.round(elapsed)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-center text-xs font-medium text-white/80" aria-live="polite">
          {phase === "done" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <Check className="h-3.5 w-3.5" aria-hidden /> Credited
            </span>
          ) : cooling ? (
            `Next tokens in ${remaining}`
          ) : !viewerId ? (
            "Sign in to start"
          ) : phase === "claiming" ? (
            "Adding tokens…"
          ) : (
            `${secondsLeft}s`
          )}
        </p>
      </div>

      {/* Affordance, mirroring the reward button's gift cue so the two read as
          the same mechanic. Decorative: the timer runs automatically. */}
      <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white/90">
        <Gift className="h-3.5 w-3.5" aria-hidden />
        +25 tokens
      </span>
    </div>
  );
}
