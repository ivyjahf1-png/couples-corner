import { PageSkeleton } from "@/components/app/Skeleton";

/**
 * Root boundary for public/marketing routes.
 *
 * An instant in-place skeleton (hero lines + card grid) instead of the old
 * blocking "Loading Couple's Corner…" box: the page streams into the same
 * geometry, so there is no spinner and no layout jump.
 */
export default function Loading() {
  return <PageSkeleton />;
}
