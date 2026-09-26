"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/ui/Chip";
import { sendConnectionAction } from "@/lib/actions/connections";
import { sendFirstImpressionAction } from "@/lib/actions/messaging";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import type { ProfileCardView } from "@/lib/feature/types";
import { useCoinGate } from "@/lib/hooks/useCoinGate";
import { ProfileDetailSheet } from "@/components/app/ProfileDetailSheet";

/**
 * Discover — swipe-deck style profile card stack (VISUAL MIGRATION ONLY).
 *
 * • Left/right halves of the card navigate the deck (currentIndex ± 1).
 * • The 5-icon action bar: Rewind · Pass · Super Like · Like · First Impressions.
 * • Super Like opens the "Get Super Likes" price-tier modal.
 * • First Impressions opens the direct-message overlay (free while the coin
 *   system is off — see lib/hooks/useCoinGate.ts). Once live, sending routes
 *   to the coin purchase modal instead.
 *
 * No Supabase tables, migrations or API endpoints are touched. All profile
 * data is read through strict optional chaining so malformed rows can never
 * crash the deck.
 */

/** Coin-pack tiers for the future purchase modal (display only for now). */
const COIN_PACKS = [
  { coins: 100, priceUsd: 4.99, bonus: "" },
  { coins: 550, priceUsd: 24.99, bonus: "Save 10%" },
  { coins: 1200, priceUsd: 49.99, bonus: "Best value" },
] as const;

const SUPER_LIKE_TIERS: ReadonlyArray<{ amount: number; coins: number; tag?: string }> = [
  { amount: 5, coins: 100 },
  { amount: 15, coins: 275, tag: "Popular" },
  { amount: 50, coins: 850, tag: "Best value" },
] as const;

export function DiscoverCardStack({ profiles }: { profiles: ProfileCardView[] }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [superLikeModal, setSuperLikeModal] = useState(false);
  const [impressionsModal, setImpressionsModal] = useState(false);
  const [impressionsText, setImpressionsText] = useState("");
  const [impressionsSent, setImpressionsSent] = useState(false);
  const [impressionsBusy, setImpressionsBusy] = useState(false);
  const [impressionConversationId, setImpressionConversationId] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [error, reportError] = useActionError();
  const { coinModalOpen, setCoinModalOpen, requireCoins } = useCoinGate();
  // Half-page bottom sheet with the full profile (center tap / View full profile).
  const [detailOpen, setDetailOpen] = useState(false);

  // Never index out of range — clamp on every render.
  const total = Array.isArray(profiles) ? profiles.length : 0;
  const safeIndex = total > 0 ? Math.min(Math.max(currentIndex, 0), total - 1) : 0;
  const current: ProfileCardView | null | undefined = total > 0 ? profiles?.[safeIndex] : null;

  function goPrev() {
    if (safeIndex <= 0) return;
    setCurrentIndex(safeIndex - 1);
  }
  function goNext() {
    if (safeIndex >= total - 1) return;
    setCurrentIndex(safeIndex + 1);
  }

  // Keyboard support: ← prev, → next.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (superLikeModal || impressionsModal || coinModalOpen) return;
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, total, superLikeModal, impressionsModal, coinModalOpen]);

  async function likeCurrent() {
    const targetId = current?.id?.trim();
    if (!targetId || likeBusy) return;
    if (!requireCoins("like").allowed) return;
    setLikeBusy(true);
    reportError(null);
    try {
      const result = await sendConnectionAction(targetId);
      if (result.ok) {
        setLikedIds((prev) => [...prev, targetId]);
        router.refresh();
      } else {
        reportError(failureMessage(result.error || "Couldn't send your like. Please try again.", "Couldn't send your like. Please try again."));
      }
    } catch (err) {
      reportError(failureMessage(err, "Couldn't send your like. Check your connection and try again."));
    } finally {
      setLikeBusy(false);
    }
  }

  function openSuperLikes() {
    // When the coin system is live, purchasing routes through the coin modal.
    setSuperLikeModal(true);
  }

  // Timer for the post-send auto-dismiss of the First Impressions sheet.
  // Held in a ref so unmount (or a re-send) can cancel a pending close rather
  // than firing setState on a gone component.
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  async function sendFirstImpressions() {
    const body = impressionsText.trim();
    const targetId = current?.id?.trim();
    if (!body || !targetId || impressionsBusy) return;
    // Coin gate: while offline-testing mode is on, this is a free message.
    if (!requireCoins("first_impression").allowed) return;

    setImpressionsBusy(true);
    reportError(null);
    try {
      // The impression is written into a real conversation server-side, so it
      // appears immediately in the Messages inbox for both people.
      const result = await sendFirstImpressionAction({ recipientId: targetId, body });
      if (!result.ok) {
        reportError(
          failureMessage(
            result.error || "Couldn't send your impression. Please try again.",
            "Couldn't send your impression. Check your connection and try again."
          )
        );
        return;
      }
      setImpressionsText("");
      setImpressionConversationId(result.conversationId ?? null);
      setImpressionsSent(true);
      router.refresh();

      // Close and reset on its own. Leaving the modal parked on the success
      // panel meant the next open inherited `impressionsSent`, and on a bottom
      // sheet the user had to hunt for "Continue" to dismiss it. The success
      // panel still shows for a beat first, so the send is acknowledged.
      closeTimer.current = window.setTimeout(() => {
        setImpressionsModal(false);
        setImpressionsSent(false);
        setImpressionsText("");
      }, 1500);
    } catch (err) {
      reportError(failureMessage(err, "Couldn't send your impression. Check your connection and try again."));
    } finally {
      setImpressionsBusy(false);
    }
  }

  const name = current?.name?.trim() || "Community member";
  const liked = typeof current?.id === "string" && likedIds.includes(current.id);
  const connection = liked ? "outgoing_pending" : current?.connection;

  return (
    <section aria-label="Profile deck" className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      {total === 0 ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-10 text-center shadow-card">
          <Icon name="heart" className="h-10 w-10 text-orange-400" />
          <p className="text-lg font-semibold text-white">You&apos;re all caught up</p>
          <p className="text-sm text-ink-300">No more profiles right now — check back soon.</p>
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- Card */}
          <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] shadow-card">
            {/* Photo (optional-chained; falls back to the gradient avatar) */}
            {current?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.avatarUrl ?? ""} alt={name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar name={name} kind={current?.kind} size="xl" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40 ring-1 ring-white/10" />
              </div>
            )}
            {/* Bottom scrim keeps the text legible without forcing white cards. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/85 to-transparent" />

            {/* Click zones: left half = previous, right half = next. */}
            <button type="button" aria-label="Previous profile" onClick={goPrev} disabled={safeIndex <= 0} className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize disabled:cursor-default" />
            {/* Center tap opens the full-profile bottom sheet. */}
            <button
              type="button"
              aria-label={`View full profile — ${name}`}
              onClick={() => setDetailOpen(true)}
              className="absolute inset-y-0 left-1/3 z-10 w-1/3 cursor-pointer"
            />
            <button type="button" aria-label="Next profile" onClick={goNext} disabled={safeIndex >= total - 1} className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-e-resize disabled:cursor-default" />

            {/* Deck counter */}
            <span className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-[#0F172A]/80 px-3 py-1 text-xs font-medium text-ink-200 backdrop-blur">
              {safeIndex + 1} / {total}
            </span>

            {/* Profile summary */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold text-white">{name}</h2>
                  <p className="truncate text-sm text-ink-300">
                    {[current?.age != null ? `${current.age}` : null, current?.location?.trim() || "Location not shared"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {connection ? (
                  <Chip tone={connection === "connected" ? "success" : connection === "outgoing_pending" ? "brand" : "neutral"}>
                    {connection === "outgoing_pending" ? "Liked" : connection === "incoming_pending" ? "Requested" : connection === "connected" ? "Connected" : "New"}
                  </Chip>
                ) : null}
              </div>
              {current?.bio?.trim() ? <p className="line-clamp-2 text-sm leading-6 text-ink-200">{current.bio.trim()}</p> : null}
              {current?.interests?.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
                  {current.interests.slice(0, 4).map((interest) => (
                    <li key={interest}><Chip tone="neutral">{interest}</Chip></li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="text-left text-sm font-semibold text-orange-300 hover:underline"
              >
                View full profile
              </button>
              {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
            </div>
          </div>

          {/* Full-profile bottom sheet (comprehensive details). */}
          <ProfileDetailSheet
            profileId={current?.id}
            name={name}
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
          />

          {/* 5-icon action bar. `relative z-20` keeps every button above the
              card's own overlay and tap zones on touch devices, so taps always
              land on the control rather than the card beneath it. */}
          <nav aria-label="Profile actions" className="relative z-20 flex w-full shrink-0 items-center justify-center gap-3">
            {/* Rewind */}
            <button type="button" onClick={goPrev} disabled={safeIndex <= 0} aria-label="Rewind to previous profile" title="Rewind"
              className="deck-btn deck-btn--rewind h-12 w-12">
              <Icon name="rewind" className="h-5 w-5" />
            </button>
            {/* Pass */}
            <button type="button" onClick={goNext} disabled={safeIndex >= total - 1} aria-label="Pass — next profile" title="Pass"
              className="deck-btn deck-btn--pass h-14 w-14">
              <Icon name="close" className="h-6 w-6" />
            </button>
            {/* Super Like — opens the Get Super Likes tier modal */}
            <button type="button" onClick={openSuperLikes} aria-label="Super Like — get Super Likes" title="Super Like"
              className="deck-btn deck-btn--star h-14 w-14">
              <Icon name="star" className="h-6 w-6" />
            </button>
            {/* Like */}
            <button type="button" onClick={() => void likeCurrent()} disabled={likeBusy || liked || !current?.id} aria-label="Like this profile" title="Like" data-liked={liked ? "true" : undefined}
              className={`deck-btn deck-btn--like h-16 w-16 ${liked ? "is-liked" : ""}`}>
              <Icon name="heart" className="h-7 w-7" filled={liked} />
            </button>
            {/* First Impressions — opens the message overlay */}
            <button type="button" onClick={() => { setImpressionsSent(false); setImpressionsModal(true); }} aria-label="Send First Impressions" title="First Impressions"
              className="deck-btn deck-btn--send h-12 w-12">
              <Icon name="send" className="h-5 w-5" />
            </button>
          </nav>

        </>
      )}

      {/* ------------------------------------------------ Get Super Likes modal */}
      {superLikeModal ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Get Super Likes">
          <button type="button" aria-label="Close" onClick={() => setSuperLikeModal(false)} className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300"><Icon name="star" className="h-6 w-6" /></span>
              <div>
                <h2 className="text-lg font-semibold text-white">Get Super Likes</h2>
                <p className="text-xs text-ink-300">Stand out — your like jumps to the top of their deck.</p>
              </div>
              <button type="button" onClick={() => setSuperLikeModal(false)} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex flex-col gap-3">
              {SUPER_LIKE_TIERS.map((tier) => (
                <li key={tier.amount}>
                  <button type="button" onClick={() => { setSuperLikeModal(false); if (!requireCoins(`super_likes_${tier.amount}`).allowed) return; }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-brand-400/40 hover:bg-brand-500/10">
                    <span className="flex items-center gap-2">
                      <Icon name="star" className="h-5 w-5 text-brand-300" />
                      <span className="font-semibold text-white">{tier.amount} Super Likes</span>
                      {tier.tag ? <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">{tier.tag}</span> : null}
                    </span>
                    <span className="text-sm font-semibold text-orange-300">🪙 {tier.coins}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs text-ink-400">
              Purchases use your Couples Corner coin wallet. Coins are coming soon — Super Likes are in preview.
            </p>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------- First Impressions overlay */}
      {impressionsModal ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Send First Impressions">
          <button type="button" aria-label="Close" onClick={() => setImpressionsModal(false)} className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300"><Icon name="send" className="h-6 w-6" /></span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Send First Impressions</h2>
                <p className="truncate text-xs text-ink-300">To {name}</p>
              </div>
              <button type="button" onClick={() => setImpressionsModal(false)} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            {impressionsSent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Icon name="check" className="h-10 w-10 text-success-400" />
                <p className="font-semibold text-white">Impression sent!</p>
                <p className="text-sm text-ink-300">They&apos;ll see your message at the top of their inbox.</p>
                {/* When the coin system goes live, Continue routes to the coin purchase modal. */}
                <button type="button" onClick={() => { if (!requireCoins("first_impression_continue").allowed) return; setImpressionsModal(false); }}
                  className="mt-2 rounded-xl bg-gradient-to-br from-orange-500 to-[#FF5722] px-6 py-2.5 text-sm font-semibold text-white">
                  Continue
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="first-impressions-input" className="sr-only">Your first impression</label>
                <textarea
                  id="first-impressions-input"
                  rows={4}
                  value={impressionsText}
                  onChange={(event) => setImpressionsText(event.target.value)}
                  placeholder={`Say something unforgettable to ${name}…`}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-ink-700 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter inserts a newline.
                    // A textarea swallows Enter for a line break, so without this
                    // the keyboard is a dead end - the only way to submit was
                    // reaching for the button with a finger.
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendFirstImpressions();
                    }
                  }}
                />
                <p className="mt-1 text-right text-xs text-ink-400">{impressionsText.length}/500</p>
                <button
                  type="button"
                  onClick={() => void sendFirstImpressions()}
                  disabled={!impressionsText.trim() || impressionsBusy}
                  className={[
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                    // The disabled state used a 50%-opacity gradient, which on the
                    // dark sheet read as "no button here" rather than "not ready
                    // yet" - the control genuinely looked missing. Now it keeps a
                    // solid, legible shape and only the colour dims.
                    impressionsText.trim() && !impressionsBusy
                      ? "bg-gradient-to-br from-orange-500 to-[#FF5722] text-white hover:brightness-110"
                      : "border border-white/15 bg-white/[0.06] text-ink-400",
                  ].join(" ")}
                >
                  <Icon name="send" className="h-4 w-4" aria-hidden />
                  {impressionsBusy ? "Sending…" : "Send First Impression"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}


      {/* ------------------------------ Coin purchase / tier modal (future) */}
      {coinModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Get Coins">
          <button type="button" aria-label="Close" onClick={() => setCoinModalOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300"><Icon name="sparkle" className="h-6 w-6" /></span>
              <div>
                <h2 className="text-lg font-semibold text-white">Get Coins</h2>
                <p className="text-xs text-ink-300">Top up your Couples Corner wallet to continue.</p>
              </div>
              <button type="button" onClick={() => setCoinModalOpen(false)} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex flex-col gap-3">
              {COIN_PACKS.map((pack) => (
                <li key={pack.coins}>
                  <button type="button" onClick={() => setCoinModalOpen(false)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-orange-400/40 hover:bg-orange-500/10">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-white">🪙 {pack.coins} coins</span>
                      {pack.bonus ? <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300">{pack.bonus}</span> : null}
                    </span>
                    <span className="text-sm font-semibold text-orange-300">${pack.priceUsd.toFixed(2)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}


    </section>
  );
}
