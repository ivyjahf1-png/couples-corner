"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SHEET_SHELL, SHEET_BACKDROP, SHEET_PANEL_RELATIVE } from "@/components/ui/layers";
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
    <section
      aria-label="Profile deck"
      /* `min-h-0 flex-1`: the deck now FILLS whatever height the page hands it
         instead of being sized by its own content. Without `min-h-0` this flex
         child refuses to shrink below the card's intrinsic height and pushes
         the action dock out of the locked column — which is exactly the
         overflow being fixed.

         `max-w-md` is kept for the card's proportions, not as a height cap: the
         deck centres itself but may be taller than the width would imply.

         The gutters and the gap below `sm` are the mobile-fit values (see the
         COMPACT-ON-MOBILE note on the summary block): every pixel here is taken
         from the card, because on a phone the card is already sharing the locked
         column with the action dock and the 5rem nav reserve. `gap-2` / `px-2`
         rather than `gap-3` / `px-3` returns ~14px of height to the photo on a
         667px-tall screen, where that is the difference between the deck feeling
         generous and the dock hugging the fold. `sm` restores the roomier rhythm
         because from there up there is height to spare. */
      className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center gap-2 px-2 sm:gap-5 sm:px-4"
    >
      {total === 0 ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-6 text-center shadow-card sm:p-10">
          <Icon name="heart" className="h-10 w-10 text-orange-400" />
          <p className="text-lg font-semibold text-white">You&apos;re all caught up</p>
          <p className="text-sm text-ink-300">No more profiles right now — check back soon.</p>
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- Card */}
          {/* THE CARD.
            On a phone this is `flex-1 min-h-0`: it takes all the height the
            locked column has left after the action dock, so the dock is always
            on screen and the card never dictates the page height.

            `aspect-[3/4]` is a WIDTH-driven size. At 358px wide the card is
            477px tall, and added to the header, the gutters and the 64px dock
            that exceeds a phone viewport — which is what pushed the dock below
            the fold. From `sm` up there is room to spare and the fixed
            3:4 portrait ratio is the better look, so it is kept there. The
            breakpoint is the small-screen ceiling (~640px), not a device
            guess: below it the phone case applies, above it the ratio does.

            `sm:max-h-full` is the correction, and without it that ratio is an
            overflow bug. `sm:flex-none` takes the card out of flex sizing
            entirely, so `aspect-[3/4]` sizes it from its WIDTH and nothing
            constrains the resulting height. Fine on a tall screen — but `sm` is a
            WIDTH test, and a phone in landscape is wide. An iPhone SE rotated is
            667px across, comfortably over the 640px threshold, so the ratio
            applied at ~448px of card width and demanded ~597px of height inside a
            375px viewport. The card overflowed its region by ~220px, which is
            what made the action dock unreachable and the page appear to scroll.

            `max-h-full` caps the box at the height its flex parent actually has.
            The photo underneath is `object-cover`, so when the cap binds the card
            is slightly wider than 3:4 rather than running off the screen — the
            correct trade, since a cropped photo is recoverable and an unreachable
            button is not. */}
        <div className="relative min-h-0 w-full flex-1 select-none overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] shadow-card sm:aspect-[3/4] sm:max-h-full sm:flex-none">
            {/* Photo, or a designed fallback when there is none.
                The old fallback dropped a plain avatar onto the bare card
                gradient, leaving a large flat expanse of near-black with a
                small disc in the middle — the card read as "failed to load"
                rather than "no photo yet". The fallback now fills the frame
                with a member-themed gradient plus a soft bloom, so the card
                looks deliberate at every state and the initials stay the
                focal point.

                All three fallback layers live inside the `else` below, so a
                member who HAS a photo never gets a gradient or an avatar
                painted over their face. */}
            {current?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.avatarUrl ?? ""} alt={name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-brand-600/30 via-[#1E293B] to-orange-600/20" />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(60% 45% at 50% 38%, rgba(255,138,76,0.22), transparent 70%)",
                  }}
                />
                <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                  <Avatar
                    name={name}
                    kind={current?.kind}
                    size="xl"
                    className="h-32 w-32 bg-gradient-to-br from-brand-500/40 via-purple-500/30 to-orange-500/30 text-3xl font-bold text-white ring-2 ring-white/20 shadow-2xl"
                  />
                </div>
              </>
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

            {/* Profile summary — COMPACT ON MOBILE.

                This block is `absolute … bottom-0` INSIDE the card, so it never
                pushes the page taller: whatever height it needs comes straight out
                of the photo. That makes it the safe place to trim, and on a phone
                it has to be trimmed — on a 667px-tall screen the card is only
                ~350px tall, and a 20px-padded block carrying a 2rem name, a
                two-line bio at `leading-6`, four chips and a link was taller than
                the card itself, so the scrim covered most of the photo and the
                link crowded the deck counter.

                Below `sm` this drops to `p-3` / `gap-1`, an `lg` name, `text-xs`
                meta and bio at `leading-5`, and THREE interest chips (the fourth
                is `max-sm:hidden`) instead of four. Every shrunken value is
                restored by its `sm:` counterpart, so tablet and desktop are
                pixel-identical to before.

                `max-h-[80%]` + `overflow-y-auto` is the last-resort guard, not the
                primary mechanism. Without it, a long bio plus four wide chips on a
                very short screen would paint the summary past the top of the card.
                It scrolls internally instead — so the CARD and the PAGE both still
                fit, and the overflow is contained by the one element that caused
                it rather than sliding the whole screen. `sm:max-h-none
                sm:overflow-visible` restores the desktop behaviour. */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] flex-col gap-1 overflow-y-auto p-3 scrollbar-none sm:max-h-none sm:gap-2 sm:overflow-visible sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-white sm:text-2xl">{name}</h2>
                  <p className="truncate text-xs text-ink-300 sm:text-sm">
                    {/* Age and location are independent, so a member with no
                        location used to render the bare literal "Location not
                        shared" — which reads as an error string rather than a
                        missing field. An en dash with the same grey carries the
                        same information without looking like a failure, and the
                        age still stands alone when location is absent. */}
                    {current?.age != null ? `${current.age}` : null}
                    {current?.location?.trim() ? (
                      <>
                        {current?.age != null ? " · " : null}
                        {current.location.trim()}
                      </>
                    ) : current?.age != null ? (
                      " · Location private"
                    ) : null}
                  </p>
                </div>
                {connection ? (
                  <Chip tone={connection === "connected" ? "success" : connection === "outgoing_pending" ? "brand" : "neutral"}>
                    {connection === "outgoing_pending" ? "Liked" : connection === "incoming_pending" ? "Requested" : connection === "connected" ? "Connected" : "New"}
                  </Chip>
                ) : null}
              </div>
              {/* `text-xs` / `leading-5` below `sm`: at `text-sm leading-6` two
                  clamped lines cost 48px, which on a phone is more than the whole
                  summary block's budget. Still two lines, still legible. */}
              {current?.bio?.trim() ? <p className="line-clamp-2 text-xs leading-5 text-ink-200 sm:text-sm sm:leading-6">{current.bio.trim()}</p> : null}
              {current?.interests?.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
                  {/* Three chips on a phone, four from `sm` up. The fourth is
                      hidden rather than removed from the array so the desktop
                      render is untouched. */}
                  {current.interests.slice(0, 4).map((interest, index) => (
                    <li key={interest} className={index === 3 ? "max-sm:hidden" : undefined}><Chip tone="neutral">{interest}</Chip></li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="text-left text-xs font-semibold text-orange-300 hover:underline sm:text-sm"
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
              land on the control rather than the card beneath it.

              `gap-2` below `sm`: the row is `shrink-0` and therefore never
              compressed, so its gaps are pure height tax on the card. No
              individual button shrinks — the smallest stays `h-12` (48px), above
              the 44px touch-target minimum — so this trims spacing only and
              costs nothing in tappability. */}
          <nav aria-label="Profile actions" className="relative z-20 flex w-full shrink-0 items-center justify-center gap-2 sm:gap-3">
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
        <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Get Super Likes">
          <button type="button" aria-label="Close" onClick={() => setSuperLikeModal(false)} className={SHEET_BACKDROP} />
          <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl`}>
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
        <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Send First Impressions">
          <button type="button" aria-label="Close" onClick={() => setImpressionsModal(false)} className={SHEET_BACKDROP} />
          <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-4 shadow-2xl sm:rounded-3xl sm:p-5`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300"><Icon name="send" className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Send First Impressions</h2>
                <p className="truncate text-xs text-ink-300">To {name}</p>
              </div>
              <button type="button" onClick={() => setImpressionsModal(false)} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            {impressionsSent ? (
              <div className="flex flex-col items-center gap-3 py-5 text-center">
                <Icon name="check" className="h-10 w-10 text-success-400" />
                <p className="font-semibold text-white">Impression sent!</p>
                <p className="text-sm text-ink-300">They&apos;ll see your message at the top of their inbox.</p>
                {/* When the coin system goes live, Continue routes to the coin purchase modal. */}
                <button type="button" onClick={() => { if (!requireCoins("first_impression_continue").allowed) return; setImpressionsModal(false); }}
                  className="mt-1 rounded-xl bg-gradient-to-br from-orange-500 to-[#FF5722] px-6 py-2.5 text-sm font-semibold text-white">
                  Continue
                </button>
              </div>
            ) : (
              <>
                {/*
                  COMPACT COMPOSER.

                  The send control lives INSIDE the input container, bottom-right,
                  rather than as a full-width bar underneath. That is the pattern
                  every first-impression composer uses, and it is what makes this
                  fit: a separate button row below forced the sheet to grow by
                  another ~56px, and the whole modal was reaching halfway up the
                  discover card.

                  The textarea is rows={3} (was 4) and carries extra right padding
                  (`pr-14`) so text scrolls clear of the floating button instead of
                  running underneath it.
                */}
                <div className="relative">
                  <label htmlFor="first-impressions-input" className="sr-only">Your first impression</label>
                  <textarea
                    id="first-impressions-input"
                    rows={3}
                    value={impressionsText}
                    onChange={(event) => setImpressionsText(event.target.value)}
                    placeholder={`Say something unforgettable to ${name}…`}
                    maxLength={500}
                    className="w-full resize-none rounded-2xl border border-ink-700 bg-white/[0.04] py-2.5 pl-3.5 pr-14 text-sm leading-6 text-white placeholder:text-ink-400 focus:border-brand-500/60 focus:outline-none"
                    onKeyDown={(event) => {
                      // Enter sends; Shift+Enter inserts a newline. A textarea
                      // swallows Enter for a line break, so without this the
                      // keyboard is a dead end for anyone not using a mouse.
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendFirstImpressions();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendFirstImpressions()}
                    disabled={!impressionsText.trim() || impressionsBusy}
                    aria-label="Send first impression"
                    title="Send"
                    className={[
                      "absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full transition",
                      // The disabled state keeps a solid, legible shape. A dimmed
                      // gradient or bare icon read as "no button here" rather than
                      // "not ready yet", which is the whole point of showing it.
                      impressionsText.trim() && !impressionsBusy
                        ? "bg-gradient-to-br from-orange-500 to-[#FF5722] text-white hover:brightness-110"
                        : "border border-white/15 bg-white/[0.06] text-ink-400",
                    ].join(" ")}
                  >
                    {/* Stays the send glyph while in flight - swapping to a tick
                        would read as "delivered" before the request has returned.
                        The disabled styling and the "Sending…" label carry the
                        state instead. */}
                    <Icon name="send" className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                {/* Counter plus a text label for the control, so the icon is not
                    the only thing announcing what it does. */}
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-[11px] text-ink-400">
                    {impressionsBusy ? "Sending…" : "Enter to send · Shift+Enter for a new line"}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-400">{impressionsText.length}/500</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}


      {/* ------------------------------ Coin purchase / tier modal (future) */}
      {coinModalOpen ? (
        <div className={SHEET_SHELL} role="dialog" aria-modal="true" aria-label="Get Coins">
          <button type="button" aria-label="Close" onClick={() => setCoinModalOpen(false)} className={SHEET_BACKDROP} />
          <div className={`${SHEET_PANEL_RELATIVE} w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:rounded-3xl`}>
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
