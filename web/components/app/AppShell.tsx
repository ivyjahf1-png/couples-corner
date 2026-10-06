import { MobileHomeHeader } from "@/components/app/MobileBackHeader";
import Link from "next/link";
import { AppSidebar, AppMain, BottomNavRegion } from "@/components/app/AppNav";
import { Avatar } from "@/components/app/Avatar";
import { Logo } from "@/components/ui/Logo";
import { getCurrentSessionUser } from "@/lib/server/session";
import { displayNameFromEmail, safePublicDisplayName } from "@/lib/utils/display-name";
import { getUnreadCountAction } from "@/lib/actions/messaging";
import { NotificationBell } from "@/components/app/NotificationBell";
import { BannerAd } from "@/components/ads/BannerAd";
import { ADSENSE_SLOT_SIDEBAR } from "@/lib/ads/adsense";

/**
 * Authenticated-app shell — VISUAL LAYER ONLY.
 *
 * Chrome:
 *   • md and up (tablet / PC): one fixed left-hand deep-navy (#0F172A) rail.
 *   • below md (phone): a frosted navy top bar plus a 4-tab floating glass
 *     capsule (Home · Moments · Messages · Me). The "Menu" drawer is retained
 *     behind the app shell for secondary destinations.
 *
 * PRESERVATION CONSTRAINT: the session lookup below is unchanged and the demo
 * banner keeps its original /api/auth/logout target. Nothing in this file
 * touches route parameters, Supabase queries, auth handlers or API endpoints —
 * only layout, styling and which nav component is rendered where.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  // Parallel fetch — session and unread count resolve together instead of
  // serially, so the shell paints as soon as the session is known.
  const [user, unreadCount] = await Promise.all([
    getCurrentSessionUser(),
    getUnreadCountAction(),
  ]);
  const isDemo = user?.isDemo ?? false;
  /* The name shown in the shell's avatar and account chip.

     This was `user.email.split("@")[0]`, which renders "ivy.jahf1" in the top bar
     for every member who signed up without choosing a name. `displayNameFromEmail`
     turns that into "Ivy J." and leaves an already-chosen name alone. The `||` is
     the fallback for an account with no email at all, which must still render
     something rather than an empty avatar. */
  const displayName = displayNameFromEmail(user?.email) || "User";
  /* THE ACCOUNT CHIP'S SUBTITLE, PREFIXED FOR DISPLAY ONLY.

     The full address is shown in exactly one place — /settings. Everywhere else
     (this rail, the mobile drawer) the chip prints `publicDisplayName`, so
     "ivyjahf1@gmail.com" reads as "ivyjahf1". The raw `user.email` is untouched
     underneath, so nothing that needs the real value (sign-in, settings) breaks.
     `safePublicDisplayName` (not the bare `publicDisplayName`) so a Turbopack
     RSC binding race degrades to a plain string instead of throwing
     `TypeError: publicDisplayName is not a function`. */
  const displayEmail = safePublicDisplayName(user?.email) || "demo@couplescorner";

  return (
    // `min-h-0 flex-1`, NOT `h-[100dvh]`.
    //
    // `MobileBackHeader` — the "Moment / feed-view" bar — is mounted by the ROOT
    // layout into `<body>` as a SIBLING ABOVE this shell, in normal flow. So the
    // document is `header (4rem) + shell`, and a shell claiming a full `100dvh`
    // made the BODY the scroll region by exactly the header's height. The member's
    // only symptom was the whole screen sliding under the header and the player's
    // bottom controls riding under the tab bar — the "messy scrolling" reported.
    //
    // The shell now fills exactly what the header leaves (`flex-1`), with
    // `min-h-0` so it may shrink below its content's intrinsic height. The viewport
    // is measured ONCE, by `<html class="h-full">` + `<body class="min-h-dvh">`;
    // every route below just divides the space it is given.
    //
    // `overflow-hidden` is load-bearing: it makes containment STRUCTURAL. Without
    // it a child that overflows its box silently promotes the shell into a
    // scroller and the page starts drifting again.
    //
    // `h-dvh` (NOT `min-h-0 flex-1`): the shell must be a BOUNDED box so inner
    // `flex-1 min-h-0` scroll regions resolve against a real height on mobile.
    // `min-h-dvh` let content height stretch the shell past the viewport, which
    // collapsed every `height:100%` child (PageLock, profile column) to zero and
    // is exactly why Profile/Messages could not scroll on phones. Subtract the
    // ~4rem mobile header sibling above so the shell + header equal one viewport.
    <div className="app-canvas relative flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden bg-slate-950 text-foreground md:h-dvh">
      {/* Demo banner — shrink-0 so it never collapses or scrolls away. */}
      {isDemo && (
        <div className="shrink-0 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
          <span className="font-semibold">Preview mode</span> — You&apos;re using a demo account.
          <Link href="/api/auth/logout" className="ml-2 font-medium text-white underline hover:text-amber-50">
            Sign in with a real account
          </Link>
        </div>
      )}

      {/* Mobile top bar — frosted navy with high-contrast white icons. */}
      <div className="shrink-0">
        <MobileHomeHeader>
          {/* Standardised header metrics, shared with `MobileBackHeader`:
              `min-h-16` + `px-4` + `py-2` + a single `border-b` on the bar
              itself. The previous `px-4 py-3` with no minimum height meant this
              header was a different height from every feature screen, so
              switching tabs made the whole page jump. Matching the numbers is
              what makes the chrome read as one system. */}
          <div className="flex min-h-16 items-center justify-between px-4 py-2">
            <Link href="/dashboard" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/profile"
                aria-label="Your profile"
                className="rounded-full ring-2 ring-transparent transition hover:ring-brand-400 focus-visible:ring-brand-500"
              >
                <Avatar name={displayName} size="sm" />
              </Link>
            </div>
          </div>
        </MobileHomeHeader>
      </div>

      {/* Middle segment: sidebar (md+) + the single content scroll region. */}
      <div className="flex min-h-0 w-full flex-1">
        {/* Left-hand navy rail (tablet + desktop).
            In-flow rather than `fixed`: the shell owns the viewport, so a
            fixed child would escape the flex column and reintroduce the
            document-level scrolling this layout exists to prevent. */}
        <aside className="app-sidebar hidden w-72 shrink-0 flex-col overflow-hidden md:flex">
          <div className="shrink-0 px-5 pb-5 pt-6">
            <Link href="/dashboard" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
          </div>

          <AppSidebar />

          {/* Display ad, above the account card.
              minHeight reserves space so the rail does not jump when the
              creative arrives. `vertical` matches the sidebar's tall, narrow
              column and must agree with the size configured for this ad unit in
              the dashboard - a mismatch is why the format is not left on
              `auto` here. */}
          <div className="shrink-0 px-3 pb-3">
            <BannerAd
              slot={ADSENSE_SLOT_SIDEBAR}
              format="vertical"
              minHeight={600}
            />
          </div>

          <div className="shrink-0 border-t border-white/10 p-3">
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${isDemo ? "border-amber-400/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
              <Avatar name={displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-300">{isDemo ? "Demo account" : displayEmail}</p>
              </div>
              {isDemo && (
                <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold uppercase text-slate-950">
                  Demo
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* AppMain is the single vertical scroll region in the app. It keeps
            the normal page gutters everywhere, and drops them inside an active
            conversation so that page can own the full 100dvh. The bottom nav is
            an in-flow sibling below this, so content is never hidden behind it
            and needs no compensating padding. */}
        <AppMain>{children}</AppMain>
      </div>

      {/* Bottom tab navigation, pinned with `fixed` to the viewport bottom so
          content above can never drag it around (see BottomNavRegion). Because
          it is out of flow, AppMain carries the matching `pb-20`. It hides
          itself inside an active conversation. */}
      <BottomNavRegion
        displayName={displayName}
        displayEmail={displayEmail}
        isDemo={isDemo}
        unreadCount={unreadCount}
      />
    </div>
  );
}
