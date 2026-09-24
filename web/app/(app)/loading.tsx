import { AppZoneSkeleton } from "@/components/app/Skeleton";

/**
 * Route-level boundary for the authenticated app zone.
 *
 * Renders an INSTANT skeleton that mirrors the Home layout (hero panel, card
 * grid, list rows) so navigation never shows a blocking "Loading…" box and the
 * content swap causes no layout shift. No spinners, no full-screen overlay.
 */
export default function Loading() {
  return <AppZoneSkeleton />;
}
