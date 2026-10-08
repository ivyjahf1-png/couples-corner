import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { buildPublicProfileView } from "@/lib/server/public-profile";
import { PublicProfileScreen } from "@/components/profile/PublicProfileScreen";

export const dynamic = "force-dynamic";

/**
 * THE EXTERNAL PROFILE PAGE — `/profile/[userId]`.
 *
 * This route was rewritten from scratch. The previous version rendered a column
 * of dark `<Card>` sections (identity, About, Interests, a media gallery, a
 * relationship block, and four inline action buttons) down an ordinary
 * scrolling document. It is replaced entirely by `PublicProfileScreen`, an
 * immersive surface: full-bleed photo header with a thumbnail switcher, an
 * overlapping white sheet, About/Honor/Relation tabs, tag pills, and a pinned
 * Chat + Follow action bar. None of the old markup survives —
 * there is deliberately no "legacy" version left to fall back to.
 *
 * ── THIS PAGE IS A SERVER COMPONENT, ON PURPOSE ──────────────────────────────
 * All reading happens here: the profile, its privacy and block checks,
 * presence, and the viewer's own coordinates. The client component receives a
 * flat, pre-derived `PublicProfileView` and fetches nothing on mount except
 * presence polling — the same split the rest of this app uses.
 *
 * ── WHY THE ASSEMBLY MOVED OUT ───────────────────────────────────────────────
 * The view construction (photos, derived age, distance, Honor/Relation rows)
 * now lives in `lib/server/public-profile.ts` so the global profile modal —
 * which renders the SAME `PublicProfileScreen` from any surface in the app —
 * consumes an identical payload through `getPublicProfileViewAction`. One
 * builder, two callers; neither can drift from the other.
 *
 * ── WHAT STOPPED BEING IMPORTED, AND WHAT WAS DELETED ─────────────────────────
 * `PageHeader`, `Card`, `Chip`, `ReportDialog` and `BlockDialog` are no longer
 * used HERE but are still imported elsewhere in the app, so they were kept.
 * The other legacy widgets the redesign replaced remain deleted:
 * `ProfileConnectionActions` and `MessageProfileButton` (superseded by
 * `ProfileChatButton` / `ProfileFollowButton`), and `PublicMediaGallery` plus
 * `ProfilePresenceAvatar` (superseded by the screen's gallery header and online
 * pill).
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getSessionUser();

  /* Privacy and block checks run inside the builder. A null result means the
     profile must not be shown to this viewer, so the route 404s rather than
     rendering an empty shell that confirms the account exists. */
  const view = await buildPublicProfileView(userId, session?.uid ?? null);
  if (!view) notFound();

  return <PublicProfileScreen view={view} />;
}