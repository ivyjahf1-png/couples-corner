import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { normalizeInviteCode, INVITE_COOKIE } from "@/lib/utils/invite";

/**
 * Invite landing page.
 *
 * THE FUNNEL: a visitor arrives here from a shared `/invite/CODE` link. Rather
 * than showing a static "Accept invitation" card, this route hands the
 * referral off to the home feed and redirects there, so the visitor lands
 * straight into the immersive feed with a video already playing. The feed then
 * runs a 3-second timer and raises the signup wall (see
 * `components/app/InviteSignupWall.tsx`).
 *
 * WHY A SERVER COOKIE IS SET HERE: the referral has to survive a redirect to
 * `/`, and it also has to be readable by the SERVER component that renders the
 * feed (so the wall is present in the first HTML paint, not only after
 * hydration). A cookie is the only store that satisfies both. It is
 * intentionally NOT httpOnly - the client reads it to pass the code into
 * registration, which happens entirely in the browser. The value is a
 * public, non-secret invite code, so there is nothing to protect here.
 *
 * Attribution survives independently of this route: `invite-code-stash` also
 * writes localStorage, and RegisterForm reads that as a fallback.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeInviteCode(code);
  if (!normalized) redirect("/");

  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE, normalized, {
    // Referral attribution should outlive a short browsing session - the
    // visitor watches the feed, may explore, and only then registers. 30 days
    // is a standard referral window; `maxAge` matches it exactly.
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    // `secure` so the referral is never sent over plaintext. This is a
    // production HTTPS app; the guard keeps local http dev working.
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}
