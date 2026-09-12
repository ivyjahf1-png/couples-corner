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
