import { PageLock } from "@/components/app/PageHeader";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

import { getSessionUser } from "@/lib/auth/authorization";
import { getOwnProfile } from "@/lib/server/profiles";
import { getProfileStats } from "@/lib/server/profile-stats";
import { getGameWallet } from "@/lib/server/games";

/**
 * Age in whole years from an ISO date of birth.
 *
 * SERVER-SIDE ONLY, and deliberately local to this page rather than promoted to
 * `lib/utils/`: `lib/server/discovery.ts` has a private copy for member cards,
 * and a shared version would have to reconcile two slightly different
 * birthday-boundary implementations. This one adjusts for the birthday NOT having
 * passed yet this year, which is the off-by-one that makes a profile show 28 on
 * the member's 29th.
 *
 * Returns null for a missing or unparseable date so the caller omits the age
 * entirely rather than printing "NaN" or a bare comma.
 */
function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  // A negative age means a birth date in the future — bad data, not a person.
  return age >= 0 && age < 130 ? age : null;
}

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
 * REPLACED. This file previously held a 700-line tabbed page (Profile / Wallet &
 * Tokens / More) built from four glass tiles, a social-games row, seven menu rows
 * and an invite-link card. It is replaced by `ProfileScreen`, the standard
 * dating-app layout: header bar, hero (avatar, name + age, bio, four stats), a
 * collapsible media grid, then About Me / My Interests / Lifestyle.
 *
 * WHAT SURVIVED THE REPLACEMENT, AND WHY IT WAS NOT SIMPLY DROPPED:
 *
 *   • The four server calls are UNCHANGED and still run in the same order:
 *     `getOwnProfile`, `getProfileStats`, `getGameWallet`, plus the session.
 *     The redesign is presentation, not a data-contract change.
 *
 *   • `getGameWallet` is retained specifically because this page was the ONLY
 *     reader of it in the whole app. Dropping the call would have made a member's
 *     token balance invisible on every surface, so the balance is passed into
 *     `ProfileScreen` and rendered as one compact row. The old FOUR-TILE financial
 *     hub is gone — that was the redesign — but the number is still on screen,
 *     and /subscription, /task and /store all remain reachable from the nav.
 *
 *   • `getProfileStats` still backs the four stats, unchanged.
 *
 * The invite-link card (`PersistentUserId`) and the VIP/level badges were removed
 * with the rest of the old chrome. Nothing is deleted from the database, and the
 * permanent user code remains available in Settings.
 */
export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) return null; // requireUser() at the layout level already redirects.

  const { user, profile } = await getOwnProfile(session.uid);
  const [stats, wallet] = await Promise.all([
    getProfileStats(session.uid),
    getGameWallet(session.uid),
  ]);

  const name = profile?.displayName || user?.displayName || "Your name";

  /* Visitors is the one stat with somewhere to go, so it is the one link in the
     row; Following points at discovery. Friends and Followers have no dedicated
     list screen, and inventing an href for them would produce a dead link. */
  const statCells = [
    { label: "Friends", value: stats.friends, href: null },
    { label: "Following", value: stats.following, href: "/discover" },
    { label: "Followers", value: stats.followers, href: null },
    { label: "Visitors", value: stats.visitors, href: "/likes" },
  ];

  return (
    /* PageLock is kept, not replaced. It is the app's single-scroll-region
       wrapper: `body` is the ONLY `overflow-y-auto` region and both slots carry
       `min-h-0`. Handing this screen a plain <div> would make the page itself the
       scroller, reintroducing the page-level scrolling the shell's fixed bottom
       nav cannot cope with.

       `head` is omitted because the tab bar that used to occupy it is gone — the
       redesigned screen has no tabs — so the body carries the top padding. */
    <PageLock className="mx-auto w-full max-w-xl" bodyClassName="flex flex-col gap-6 px-4 pt-4 pb-10">
      <ProfileScreen
        data={{
          uid: session.uid,
          name,
          age: ageFromDob(profile?.dateOfBirth ?? user?.dateOfBirth ?? null),
          avatarUrl: primaryPhotoUrl(session.uid, profile),
          bio: profile?.bio ?? null,
          stats: statCells,
          interests: profile?.interests ?? [],
          occupation: profile?.occupation ?? null,
          heightCm: profile?.heightCm ?? null,
          education: profile?.education ?? null,
          lifestyle: profile?.lifestyle ?? [],
          tokenBalance: wallet.coinBalance,
        }}
      />
    </PageLock>
  );
}