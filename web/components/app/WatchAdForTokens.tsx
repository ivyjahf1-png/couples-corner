"use client";

import { useEffect, useState, useTransition } from "react";
import { Gift, Loader2 } from "lucide-react";
import { claimAdRewardAction } from "@/lib/actions/ad-rewards";
import { notifySuccess } from "@/components/ui/FailureToasts";

/** "28:14" style countdown, or null once the moment has passed. */
function formatRemaining(ms: number): string | null {
  if (ms <= 0) return null;
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * "Claim free tokens" control for the Moment feed.
 *
 * STUBBED - NO AD IS SERVED. This repository is a Next.js web app, and there is
 * no rewarded ad product for it to call: AdMob does not serve rewarded video on
 * the web, and Ad Manager's rewarded inventory is sold through a publisher-
 * managed deal with a demand partner rather than a self-serve SDK. So this
 * button deliberately does NOT claim to show a video. It used to read "Watch Ad
 * to Earn Free Tokens" while serving nothing, which is a false promise to the
 * member for the sole purpose of making a free-coins button feel monetised.
 *
 * What it actually does is grant a small, rate-limited token grant through the
 * real secure path: the server action calls the `claim_ad_reward` RPC, which
 * writes an append-only ledger row and credits the wallet atomically. The
 * ledger, the atomic update and the cooldown are all exercised for real today,
 * so integrating a real rewarded network later changes only what happens
 * between the button press and the network's completion callback - not the
 * crediting path itself.
 *
 * The tradeoff while stubbed: anyone signed in can press this and receive
 * tokens, because nothing here can prove an ad was watched. It is bounded by a
 * hard server-side cooldown and the `AD_REWARDS_ENABLED` kill switch, and it
 * should stay that way until a real ad network is behind it.
 *
 * The props below are the seam a real ad client plugs into:
 *   - `onRewarded` fires only when the ad network has genuinely completed,
 *     which is the ONLY safe moment to request a credit.
 */
export function WatchAdForTokens({
  className = "",
  nextAvailableAt = null,
  onRewarded,
}: {
  className?: string;
  /**
   * ISO timestamp from `getNextAdRewardAtAction`. Drives the visible cooldown
   * so the member is not left guessing why the button stopped working.
   */
  nextAvailableAt?: string | null;
  /**
   * Called after a successful credit. With a real ad client this is where the
   * ad would be shown, and it must invoke the credit itself rather than letting
   * the button call it directly - otherwise the button becomes a free-coins
   * button wearing an ad's clothes.
   */
  onRewarded?: (claim: () => Promise<void>) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);

  // Countdown. Ticks locally so the label stays live without polling, and
  // self-clears at zero so the button re-enables on its own.
  useEffect(() => {
    if (!nextAvailableAt) {
      setRemaining(null);
      return;
    }
    const target = new Date(nextAvailableAt).getTime();
    const tick = () => setRemaining(formatRemaining(target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextAvailableAt]);

  const claim = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await claimAdRewardAction();
      if (!result.ok) {
        setMessage(result.error ?? "Could not credit your tokens.");
        return;
      }
      if (result.credited) {
        notifySuccess(`+${result.rewardAmount} tokens added to your wallet!`);
      } else {
        setMessage(result.error ?? "That reward was already claimed.");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    // With a real ad client this branch becomes: show the ad, and call `claim`
    // from the network's earned-reward callback only.
    if (onRewarded) {
      void onRewarded(claim);
      return;
    }
    startTransition(() => {
      void claim();
    });
  };

  const cooling = remaining !== null;
  const disabled = busy || pending || cooling;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy || pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Gift className="h-4 w-4" aria-hidden />
        )}
        {busy || pending
          ? "Loading…"
          : cooling
            ? `Next tokens in ${remaining}`
            : "Claim Free Tokens"}
      </button>
      {message ? (
        <p role="status" className="mt-1.5 text-xs text-ink-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
