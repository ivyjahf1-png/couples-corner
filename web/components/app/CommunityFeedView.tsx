"use client";

import { PostCard } from "@/components/app/PostCard";
import { EmptyState } from "@/components/app/EmptyState";
import { FeedCreateLauncher } from "@/components/app/FeedCreateLauncher";
import { Icon } from "@/components/landing/Icon";
import type { FeedPostView } from "@/lib/feature/types";

/**
 * The Community Feed view: a chronological timeline of status posts and photos.
 *
 * ── WHY THIS IS SEPARATE FROM THE PLAYER ───────────────────────────────────
 * The player is a media-first, one-card-at-a-time experience. This is the
 * opposite: a scrolling list where the member is reading words and images, and
 * where the fraud-safety banner has room to actually be read. Forcing the
 * banner onto a full-bleed video player would mean overlaying it on the media
 * the member is trying to watch, so the two genuinely want different layouts.
 *
 * ── THE SCAM WARNING, AND WHY IT IS UNDISMISSABLE HERE ──────────────────────
 * This is the one place in the app that surfaces fraud advice, because this is
 * the only surface where a member reads unsolicited text from strangers — which
 * is exactly where a scam arrives. On a video player the same message would be
 * visual noise over the media.
 *
 * It is NOT dismissible, and that is deliberate. The guidance is two lines of
 * evergreen safety advice, it appears above content the member has not chosen
 * to read yet, and it costs no interaction. A dismissible warning on a
 * scrolling timeline is a warning that gets dismissed once and never seen
 * again, which is worse than no warning at all — it creates the impression the
 * member has been told, while having told them nothing.
 *
 * Wording is advisory, not accusatory: it says what to watch for and where to
 * report, and it does NOT claim we have verified every message. The safety page
 * already draws that line carefully ("flagged for review - never as an
 * automatic ban") and this banner must not overstate what the product does.
 */
/*
 * ── WHY THE "RECOMMEND / FOLLOW" SORT ROW IS GONE ──────────────────────────
 * That row has been removed. It was a second, `sticky top-0` bar sitting
 * directly beneath the screen header, so opening the community view showed TWO
 * stacked bars before any content — and because both were pinned to `top-0`,
 * feed content scrolled underneath the sort row while the header above it stayed
 * put, so the two visibly disagreed about where "the top" was.
 *
 * It was also carrying a control the data cannot honour. "Follow" did NOT mean
 * "people you follow": there is no follow graph available to this view (the
 * public feed query is not scoped to who the member follows), so it silently
 * re-ordered the member's OWN posts under a label promising something else.
 * Removing the control beats keeping a filter that misrepresents what it does.
 *
 * The screen header's single "Moment / feed-view" switch is now the only
 * navigation on this screen, which is the point of the shared header.
 */
export function CommunityFeedView({
  posts,
  canPost,
  userId,
}: {
  posts: FeedPostView[];
  canPost: boolean;
  /** The signed-in member's id, threaded to the upload modal. */
  userId?: string;
}) {
  /* Newest first, which is exactly what the server already returns. The previous
     client-side "Follow" re-order is gone with the tab row that offered it — see
     the note above on why that control overstated what it could do. */
  const visible = posts;

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* ── SCAM / SAFETY WARNING ───────────────────────────────────────────
          `role="note"` rather than `role="alert"`: it is not urgent, and
          `alert` would interrupt a screen reader mid-sentence on every visit
          to this view. The amber left border is the visual signal; the shield
          glyph is decorative, so the text alone carries the meaning. */}
      <aside
        role="note"
        className="flex gap-3 rounded-2xl border border-amber-400/30 border-l-4 border-l-amber-400 bg-amber-500/[0.07] p-4"
      >
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300"
        >
          <Icon name="shield" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-100">
            Stay safe — a quick heads-up
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            Never send money, gift cards or codes to someone you have not met in
            person, and be wary of urgent requests, too-good-to-be-true offers,
            or links to files and apps. If a message pressures you to act
            quickly, that pressure is the warning sign.
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Nothing on this app will ever ask you for a password, a code we sent
            you, or a payment to unlock your account. Report anything that does —
            we read every report.
          </p>
          <a
            href="/safety"
            className="mt-2 inline-block text-xs font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100"
          >
            Read the safety centre
          </a>
        </div>
      </aside>

      {canPost ? (
        /* Light card. `border-ink-700 bg-surface` and `text-ink-300` are
           dark-theme tokens — on the community panel's near-white canvas the
           body copy rendered at roughly 2:1 and read as blank. Converted to the
           same slate pair as the rest of this view. */
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Share with the community</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Post a status or a photo and it appears here for everyone. For short
            videos, switch to the Moment reels with the control at the top.
          </p>
        </div>
      ) : null}

      {/* `aria-labelledby` pointed at `community-tab-${tab}`, an id that lived on the
          sort row that has been removed — leaving it would have been a dangling
          reference to a non-existent element. It now labels itself, which is
          accurate: the screen header above is the only navigation, and this panel
          is the community timeline it switches to. */}
      <div id="community-panel" role="region" aria-label="Community feed posts">
        {visible.length === 0 ? (
          <EmptyState
            icon="moments"
            title="Nothing here yet"
            body="When members share a status or a photo it will show up here. Be the first."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {visible.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating "+" opening the photo/moment composer.

          Gated on `canPost` deliberately. The launcher is `fixed`, and
          `MomentFeed` keeps BOTH panels mounted (the hidden one via the `hidden`
          attribute) so their scroll positions survive a toggle — so rendering
          this unconditionally would put a second launcher on the video player's
          subtree. `display:none` on the parent does suppress it, but relying on
          that to hide a `position:fixed` control is fragile; this guard makes
          the scoping explicit and independent of the panel's hidden state. */}
      {canPost ? <FeedCreateLauncher userId={userId} /> : null}
    </div>
  );
}