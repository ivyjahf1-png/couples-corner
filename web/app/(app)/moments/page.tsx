import { MomentViewerCard } from "@/components/app/MomentViewerCard";
import { requireUser } from "@/lib/auth/authorization";

/**
 * `/moments` — the "Moment" screen: a single immersive moment player.
 *
 * The player is self-contained: it renders its built-in demo moment and keeps
 * likes / connect / comment state local, so the screen always has content to
 * show. To play real uploads again, fetch them with `getRecentMoments` from
 * `@/lib/server/tasks` and pass the result to the card's `moment` prop.
 */
export default async function MomentsPage() {
  await requireUser();
  return <MomentViewerCard />;
}
