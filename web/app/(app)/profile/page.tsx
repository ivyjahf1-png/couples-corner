import { PageLock } from "@/components/app/PageHeader";
import { ProfileScreen, ProfileHeader } from "@/components/profile/ProfileScreen";
import { GameCenterButton } from "@/components/app/GameCenterButton";

import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { getProfileStats } from "@/lib/server/profile-stats";
import { getGameWallet } from "@/lib/server/games";
import { getMembership } from "@/lib/server/subscription";

/**
 * Resolved URL for the member's primary profile photo.
 *
 * Prefers the pre-signed `publicUrl` Supabase already returns, and falls back to
 * the app's own `/api/photos/...` route. Returning null (rather than a broken
 * path) is what lets `ProfileScreen` fall back to initials — a photo that 404s
 * would otherwise render the browser's broken-image glyph inside the gradient
 * ring.
 */
function primaryPhotoUrl(
  uid: string,
  profile: Awaited<ReturnType<typeof getOwnProfile>>["profile"]
): string | null {
  const photo = profile?.photos?.find((p) => p.isPrimary) ?? profile?.photos?.[0];
  if (!photo) return null;
  if (photo.publicUrl) return photo.publicUrl;
  const fileName = photo.storagePath?.split("/").pop();
  return fileName ? `/api/photos/${uid}/${fileName}` : null;
}

/**
 * "Me" — the signed-in member's own profile.
 *
 * REDESIGNED TWICE. This file first held a 700-line tabbed page (Profile / Wallet
 * & Tokens / More) of glass tiles, then a dating-app layout (hero, bio, media
 * grid, About/Interests/Lifestyle). It is now the light-theme member hub:
 * header card, four-stat bar, wallet + VIP cards, friend banner, recommended
 * games, quick actions and two list rows — all rendered by `ProfileScreen`.
 *
 * WHAT THE SERVER CALLS NOW OWN, AND WHY EACH ONE STAYS:
 *
 *   • `getOwnProfile` — name and avatar only. Everything else it returns (bio,
 *     interests, lifestyle, occupation, height, relationship fields) is no longer
 *     rendered on this screen. The columns stay in the database and are still
 *     edited at /profile/edit; they are simply not displayed here.
 *
 *   • `getGameWallet` — retained because this page was the ONLY reader of it in
 *     the whole app. Dropping it would make the balance invisible everywhere, so
 *     it drives the yellow wallet card.
 *
 *   • `getProfileStats` — the four stats, unchanged. Friends/Followers/Visitors
 *     all still come from here.
 *
 *   • `getMembership` — NEW. The old layout had no VIP card, so the tier was
 *     never read; the new one needs it. It degrades to `subscriptionTier: "free"`
 *     on error.
 *
 * The invite-link card (`PersistentUserId`) and the VIP/level badges were
 * removed with the rest of the old chrome. Nothing is deleted from the database,
 * and the permanent user code remains available in Settings.
 */
export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) return null; // requireUser() at the layout level already redirects.

  const { user, profile } = await getOwnProfile(session.uid);
  /* `getMembership` is the fourth call, and it is the one that changed shape with
     the redesign: the VIP card needs a tier, not just a balance. It degrades to
     `{ subscriptionTier: "free", coinBalance: 0 }` on error, so a Supabase
     hiccup costs the VIP card its badge and nothing else. */
  const [stats, wallet, membership] = await Promise.all([
    getProfileStats(session.uid),
    getGameWallet(session.uid),
    getMembership(session.uid),
  ]);

  const name = profile?.displayName || user?.displayName || "Your name";

  /* Visitors is the one stat with somewhere to go, so it is the one link in the
     row; Following points at discovery. Friends and Followers have no dedicated
     list screen, and inventing an href for them would produce a dead link.
     `notify` lights the red dot: a visitor count above zero means there is
     something unread waiting at /likes. */
  const statCells = [
    { label: "Friends", value: stats.friends, href: null, notify: false },
    { label: "Following", value: stats.following, href: "/discover", notify: false },
    { label: "Followers", value: stats.followers, href: null, notify: false },
    { label: "Visitors", value: stats.visitors, href: "/likes", notify: stats.visitors > 0 },
  ];

  return (
    /* PageLock is kept, not replaced. It is the app's single-scroll-region
       wrapper: `body` is the ONLY `overflow-y-auto` region and both slots carry
       `min-h-0`. Handing this screen a plain <div> would make the page itself the
       scroller, reintroducing the page-level scrolling the shell's fixed bottom
       nav cannot cope with.

       `head` carries `ProfileHeader` so the screen has exactly ONE header, pinned
       above the scroll region. `MobileBackHeader` returns `null` on `/profile`,
       so this replaces the global bar rather than stacking under it.

       NO `max-w-xl`, NO centred inner column. The old `mx-auto w-full max-w-xl`
       wrapper was a second, narrower frame drawn inside the app shell — the
       "nested browser window" effect, where the profile appeared as a page
       embedded in a page and its content was letterboxed on wide screens. The
       shell already owns the viewport lock (`h-[100dvh] overflow-hidden`) and
       `PageLock` measures its parent via `height: 100%`, so the page fills the
       real screen with no clipping and no second set of edges. Padding is
       applied once, here, rather than being baked into a width cap. */
    /* THE CANVAS IS STATED HERE, EXPLICITLY, AND IT IS THE POINT OF THIS BLOCK.

       THE GRADIENT, NOT A FLAT FIELD. The page previously painted one flat
       `#0F0C1B`, which is exactly the "dead flat field" the glass cards cannot
       catch anything on. It is now a vertical ramp through three named zones and
       a warm bloom at the foot:

         0%#0F0C1B   midnight navy — the deep top
        38%         #1B1636   deep purple — where the identity and stats card sits
        72%         #33203C   plum      — the middle cards
       100%         #4A2A2E   warm plum, warming toward orange

       The warm end is deliberately MUTED (#4A2A2E, not a saturated orange). A
       bright orange foot on a screen whose accent is already `#FF7A00` would put
       two oranges in the same viewport and make the coin tile stop being the
       loudest thing on it. This warms the bottom without competing.

       The radial bloom sits UNDER the ramp in the layer stack and is what stops
       the bottom corner reading as a flat band of plum; `page-lock` has no
       background of its own, so this is the page's canvas.

       `PageLock` renders a `<div class="page-lock">` with no background, so this
       page previously inherited whatever the app shell painted behind it — which
       on the light build was white.

       These are raw hex values rather than `slate-*`/`purple-*` utilities because
       the app's `--background` token is still the old navy and its ramp steps are
       blue, not purple. Stated literally so an unrelated token change cannot
       nudge the brand canvas.

       This sits on the PageLock ROOT, not on the body: the body is the scroll
       region, so a gradient there would scroll with the content and leave a flat
       void above it once the member scrolled down. On the root it stays put and
       reads as atmosphere behind the list. */
    <PageLock
      style={{
        backgroundImage: [
          /* Warm bloom, bottom-centre. */
          "radial-gradient(120% 60% at 50% 108%, rgba(255,122,0,0.16) 0%, rgba(255,122,0,0.06) 38%, rgba(255,122,0,0) 70%)",
          /* The vertical ramp. */
          "linear-gradient(180deg, #0F0C1B 0%, #0F0C1B 6%, #1B1636 38%, #33203C 72%, #4A2A2E 100%)",
        ].join(", "),
        backgroundColor: "#0F0C1B",
      }}
      head={<ProfileHeader name={name} />}
      /* `pt-2`, not `pt-4`. The bar above is a fixed 56px tall and the hero's own
         avatar ring already supplies visual breathing room, so the old 16px of
         top padding pushed the whole profile down and left a dead band under the
         header — the "excess vertical padding" in the screenshot. `pb-28` on
         mobile clears the fixed 5rem tab bar, which is the thing actually
         crowding the bottom of the last card; `md:pb-8` drops it where that bar
         is `md:hidden` and the sidebar rail takes over. */
      /* NO `gap` HERE, DELIBERATELY. `ProfileScreen` owns all of its own vertical
         rhythm through the single `gap-3` on its root column. A second gap on
         this wrapper produced a doubled gutter around the whole screen — the
         first of the "disjointed spacing" symptoms.

         `pb-28` on mobile clears the fixed 5rem tab bar, which is the thing
         actually crowding the bottom of the last card; `md:pb-8` drops it where
         that bar is `md:hidden` and the sidebar rail takes over. */
      bodyClassName="px-4 pt-2 pb-28 md:pb-8"
    >
      <ProfileScreen
        data={{
          uid: session.uid,
          name,
          avatarUrl: primaryPhotoUrl(session.uid, profile),
          stats: statCells,
          coinBalance: wallet.coinBalance,
          vipTier: membership.subscriptionTier,
          relation: "No Relation",
        }}
      />
      {/* THE FLOATING GAME BUTTON.

          `bottom-24` (96px) = 80px tab bar + 16px of visible clearance, so the
          button sits clearly ABOVE the capsule instead of overlapping its rounded
          top edge. `md:bottom-8` drops the lift on tablet and desktop, where the
          bar is `md:hidden` and the sidebar rail takes over — without that, the
          button would float oddly high on a screen that has no bar under it.

          This is the SAME `GameCenterButton` the /explore and /discover surfaces
          float, reused with its own `bottomOffset` rather than reimplemented, so
          the control cannot drift between screens.

          WHY IT LIVES HERE AND NOT IN `ProfileScreen`. It is `position: fixed`, so
          it must escape `PageLock`'s scroll region — a button rendered inside the
          scrolling body would slide up the page and leave a permanent hole where
          it was. The page, not the component, owns the viewport-level overlay. */}
      <GameCenterButton
        bottomOffset="bottom-24 md:bottom-8"
        label="Game"
        ariaLabel="Open the game hub"
      />
    </PageLock>
  );
}