"use client";

import { Button } from "@/components/ui/Button";
import { openAuthModal } from "@/components/auth/AuthModals";

/**
 * Client-side CTA buttons for the homepage.
 *
 * Extracted from the server-rendered HomePage so that the interactive
 * onClick handlers (which open the auth modal) live in a Client Component,
 * while the rest of the page stays a Server Component and can safely import
 * server-only modules like ContentSlot.
 */
export function HeroActions() {
  return (
    <>
      <Button onClick={() => openAuthModal("register")} size="lg" variant="primary">
        Create Free Account
      </Button>
      <Button href="/how-it-works" size="lg" variant="ghost">
        Learn more
      </Button>
    </>
  );
}

export function CTAActions() {
  return (
    <>
      <Button onClick={() => openAuthModal("register")} size="lg" variant="primary">
        Create Free Account
      </Button>
      <Button href="/how-it-works" size="lg" variant="ghost">
        Learn more
      </Button>
    </>
  );
}

/**
 * The three hero CTAs on the guest landing page.
 *
 * WHY THESE ARE BUTTONS AND NOT LINKS: the auth modal is already mounted once
 * for the whole app by `AuthModalProvider` in the root layout, and it is a
 * Client Component. Opening it from a server page requires a click handler, so
 * this island exists purely to hold those three handlers. Everything else in
 * the landing page stays a Server Component and can keep importing server-only
 * modules.
 *
 * ORDER IS DELIBERATE, and matches how the rest of the product already speaks:
 *   1. "Create Account"  — the primary action, in the brand orange.
 *   2. "Get the App"     — secondary, for a member who already has the APK.
 *   3. "Log In"          — tertiary and visually quiet. A returning member is
 *      looking for this, but leading with it splits the hero's attention and
 *      reads as "this is a login screen" rather than a value proposition.
 *
 * "Get the App" is a link, not a store badge: the app is distributed as a
 * Capacitor APK, not through the Play Store, and pointing at a store listing
 * that does not exist would be a dead end. It routes to the store page, which
 * is the honest destination.
 */
export function LandingHeroActions() {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
      <Button
        onClick={() => openAuthModal("register")}
        size="lg"
        variant="primary"
        className="w-full sm:w-auto"
      >
        Create Account
      </Button>
      <Button href="/app" size="lg" variant="secondary" className="w-full sm:w-auto">
        Get the App
      </Button>
      <Button
        onClick={() => openAuthModal("login")}
        size="lg"
        variant="ghost"
        className="w-full sm:w-auto"
      >
        Log In
      </Button>
    </div>
  );
}

/** The closing call-to-action band, reusing the same three actions. */
export function LandingFooterActions() {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
      <Button
        onClick={() => openAuthModal("register")}
        size="lg"
        variant="primary"
        className="w-full sm:w-auto"
      >
        Create Account
      </Button>
      <Button href="/app" size="lg" variant="secondary" className="w-full sm:w-auto">
        Get the App
      </Button>
    </div>
  );
}
