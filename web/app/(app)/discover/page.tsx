import { requireUser, isRedirectOrNotFoundError } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { DiscoverCardStack } from "@/components/app/DiscoverCardStack";
import { DiscoverFiltersSync } from "@/components/app/DiscoverFiltersSync";
import { MediaFeedSearch } from "@/components/app/MediaFeedSearch";
import { parseDiscoveryFilters } from "@/lib/utils/filters";
import { getDiscoverProfiles } from "@/lib/server/discovery";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const sp = await searchParams;

  const filters = parseDiscoveryFilters(sp);

  let profiles: Awaited<ReturnType<typeof getDiscoverProfiles>> | null = null;
  let failed = false;
  try {
    profiles = await getDiscoverProfiles(session.uid, filters);
  } catch (error) {
    if (isRedirectOrNotFoundError(error)) throw error;
    // Single-string log: Next.js forwards server console.error to the browser
    // overlay by serializing extra args — a second-arg object renders as `{}`.
    // Stringifying here keeps message + cause visible in both places.
    const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
    const causeText =
      cause && typeof cause === "object"
        ? ` code=${String((cause as { code?: unknown }).code ?? "n/a")} causeMessage=${String((cause as { message?: unknown }).message ?? "n/a")} details=${String((cause as { details?: unknown }).details ?? "n/a")} hint=${String((cause as { hint?: unknown }).hint ?? "n/a")}`
        : cause !== undefined
          ? ` cause=${String(cause)}`
          : "";
    const message = error instanceof Error ? error.message : "Unexpected discovery fetch error";
    const stack = error instanceof Error && error.stack ? ` stack=${error.stack.slice(0, 800)}` : "";
    console.error(`[discover] Fetch failed: ${message}${causeText}${stack}`);
    failed = true;
  }

  if (failed || profiles === null) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Discover" title="Find your people" />
        <ErrorState
          title="Couldn't load profiles"
          body="Something went wrong reaching the community. Please try again."
        />
      </div>
    );
  }

  return (
    /* ── WHY THIS IS NOT `h-[100dvh]` ─────────────────────────────────────────
     * A "strict viewport lock" for this screen already exists, and it starts one
     * level UP, in `AppShell`:
     *
     *   AppShell   h-[100dvh] flex-col overflow-hidden   <- the viewport is sized here
     *   └ AppMain  flex-1 min-h-0                        <- subtracts the chrome
     *     └ this div  h-full min-h-0 overflow-hidden     <- fills what is left
     *
     * Adding another `h-[100dvh]` HERE would measure the viewport a SECOND time.
     * This column is already shorter than the viewport by the mobile back header
     * above it and the fixed tab bar below it, so a fresh 100dvh here would
     * overflow that box by the height of both — pushing the action dock below the
     * fold and reintroducing exactly the "scroll up and down to reach the buttons"
     * symptom this layout was built to remove. `h-full` is the correct value
     * because it fills the space actually available.
     *
     * `overflow-hidden` is load-bearing: without it the column may exceed its box
     * and `AppMain` picks up a scroll, which is the symptom being fixed. It is
     * now ALSO `overflow-hidden` at the `AppMain` level for this route (see
     * `isFullBleedSurface` there), so an overflow fails inside the child that
     * caused it rather than sliding the whole page.
     *
     * The bottom tab bar is `fixed` (see `BottomNavRegion`), so it overlays this
     * column. The inner region reserves its height with bottom padding (5rem),
     * which is where `AppMain`'s `pb-20` went when this route joined
     * `isFullBleedSurface`. The two must agree — see the note in AppNav.
     *
     * WHAT THE FIX WAS ON MOBILE. The viewport lock above was already correct,
     * but three pieces of chrome inside it were not, and together they ate the
     * height the deck needed:
     *
     *   1. `pt-[max(0.75rem,env(safe-area-inset-top))]` on this header. The
     *      safe-area inset belongs to the EDGE OF THE SCREEN, and it is already
     *      consumed there — `MobileBackHeader` above applies it with
     *      `pt-[env(safe-area-inset-top)]`. Applying it a second time, halfway
     *      down the page, added a second notch-sized (up to 47px on an iPhone in
     *      standalone PWA mode) gap in the middle of the column. That is ~10% of
     *      a small phone's viewport handed to blank space, and it pushed the
     *      action dock toward the fold. The header now takes a flat `pt-1.5`.
     *   2. `pb-2` plus the header row's own line-height — trimmed to `pb-1`.
     *   3. `h-full min-h-0 overflow-hidden` is load-bearing on EVERY breakpoint,
     *      and the deck inside it is `flex-1 min-h-0`, so the card absorbs the
     *      leftover height rather than setting it. Nothing on this route is
     *      allowed to contribute intrinsic height. */
    /* ONE HEADER, AND IT IS THIS ONE.

       This screen used to show TWO. `MobileBackHeader` rendered a bare centred
       "Discover" bar directly above this block, which renders the page title —
       so the route opened with "Discover" and then, a few pixels lower,
       "Discover: Find your people". The outer bar repeated the inner one's first
       word, carried no action of its own, and cost a 4rem spacer on a
       viewport-locked column whose card absorbs every spare pixel.

       `MobileBackHeader` now returns `null` for `/discover`, so this is the only
       header and it is promoted accordingly:

         • The eyebrow is GONE. In `compact` mode `PageHeader` renders
           `"{eyebrow}: {title}"` inside the single `<h1>`, so the eyebrow was
           never a separate chip — it was the first half of the title. Removing it
           and writing the full string as `title` produces the same reading but
           as ONE deliberate heading rather than a label plus a title, and it stops
           the two halves being editable independently (someone can shorten the
           title without accidentally deleting the product name, or vice versa).
         • `titleClassName` is DROPPED, so the title falls back to `compact`'s
           `text-lg`. It had been shrunk to `text-[15px]` to buy height while two
           headers were competing; with one header that shrinking is exactly
           backwards, and "prominent" is the requirement now.
         • Top padding returns to `pt-1.5` for the same reason. The height this
           spends is paid back several times over by the header that is no longer
           being rendered above it.

       "Browse grid" stays beside the title. It is the same control the member
       had, it is the route's only exit to the grid view, and it costs nothing
       vertically — `compact` renders the title and the action on one flex row. */
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* No `env(safe-area-inset-top)` here — see note 1 above. The inset is a
          screen-edge concern and `MobileBackHeader` already owns it. */}
      <div className="shrink-0 px-4 pt-1.5 sm:px-6 sm:pt-2">
        <PageHeader
          compact
          title="Discover: Find your people"
          actions={<Button href="/explore" variant="ghost">Browse grid</Button>}
        />

        {/* Search by name or public code. MOVED HERE from the Moment feed, where
            it was a search box sitting over a video feed — the one place a
            member looks to BROWSE, not to FIND. It sits under the header and
            above the deck, `shrink-0` so it never takes height from the cards,
            and submits `?q=` back to this route, which now filters by
            display_name substring or an exact user_code. */}
        <div className="mt-2.5 shrink-0 sm:mt-3">
          <MediaFeedSearch action="/discover" />
        </div>
      </div>

      <DiscoverFiltersSync filters={filters} resultCount={profiles.length} />

      {/* `min-h-0` is required, not decorative: without it this flex child
          refuses to shrink below its content and overflows the locked column,
          which is precisely how the dock ended up below the fold before.
          5rem plus the home-indicator inset keeps the deck clear of
          the fixed tab bar; `md:pb-0` drops it where that bar is `md:hidden`
          and the sidebar rail takes over. */}
      {/* `app-dock-reserve` is released by the LANDSCAPE block in globals.css.

          This element reserves 5rem of bottom padding for the fixed tab bar.
          `md:pb-0` already drops that reserve on wide viewports, but it keys off
          WIDTH, and there is a gap between the two conditions that matter:

            iPhone SE / older in landscape: 667px wide, 375px tall
              -> below md, so `md:pb-0` does NOT apply, and the reserve stays
              -> but the landscape block HIDES the bottom bar (`max-height: 560`)

          Result: 80px of dead padding at the foot of a 375px-tall viewport — over
          a fifth of the screen reserved for a nav that is not rendered. That is
          precisely the "scroll up and down to reach the buttons" symptom, and it
          is the one case the width-based `md:pb-0` could never cover.

          The class exists so the landscape block can drop the reserve by HEIGHT,
          which is the axis the block already tests. */}
      <div className="app-dock-reserve flex min-h-0 flex-1 flex-col pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0">
        {profiles.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
            <EmptyState
              icon="discover"
              title="No profiles found"
              body="No profiles match these filters yet. Try widening your search or check back soon — the community is growing."
            />
          </div>
        ) : (
          /* Couple's Corner-style deck: left/right tap zones + 5-icon action bar. */
          <DiscoverCardStack profiles={profiles.filter((p) => p?.id)} />
        )}
      </div>

      {/* THE GAME CENTER IS NOT HERE ANYMORE.

         It used to render as a viewport-fixed button at `bottom-44`, stacked
         below the action dock and the 5rem tab bar. That was a losing position
         to defend: three fixed-height elements shared one band at the bottom of
         the screen, so the offsets had to be derived by hand and any change to
         the card or the dock silently reintroduced an overlap — which is exactly
         what happened, with the button landing on the Like control and stealing
         taps from the screen's primary interaction.

         It now lives in the card's own top-right corner as `GameCenterBadge`
         (see DiscoverCardStack), so the bottom of this page carries only the two
         things that belong there: the action row and the nav. */}
    </div>
  );
}