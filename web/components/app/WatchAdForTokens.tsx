"use client";

import { useState, useTransition } from "react";
import { Gift, Loader2 } from "lucide-react";
import { claimAdRewardAction } from "@/lib/actions/ad-rewards";
import { notifySuccess } from "@/components/ui/FailureToasts";

/**
 * "Watch Ad to Earn Free Tokens" control.
 *
 * STUBBED CLIENT. The real ad client does not exist yet - this repository is a
 * Next.js web app, and AdMob does not serve rewarded video on the web at all.
 * Clicking this calls the stubbed server action, which credits coins through
 * the same secure RPC a verified ad completion will eventually use. That means
 * the ledger, the atomic wallet update and the cooldown are all exercised for
 * real today, and swapping in a real ad client later changes only what happens
 * between the button press and `onRewarded` - not the crediting path itself.
 *
 * The props below are the seam the real ad SDK will plug into:
 *   - `onRewarded` fires only when the ad network has genuinely completed,
 *     which is the ONLY safe moment to request a credit.
 */
export function WatchAdForTokens({
  className = "",
  onRewarded,
}: {
  className?: string;
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

  const disabled = busy || pending;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Gift className="h-4 w-4" aria-hidden />
        )}
        {disabled ? "Loading…" : "Watch Ad to Earn Free Tokens"}
      </button>
      {message ? (
        <p role="status" className="mt-1.5 text-xs text-ink-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
