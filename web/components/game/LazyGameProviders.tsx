"use client";

import dynamic from "next/dynamic";

/* Deferred game overlays, mounted from the root layout. Each provider renders
   null until its open-event fires, so their JS (~50KB combined: GameCenter
   suite, launcher modal, Truth-or-Dare swiper, launcher sheet) never joins
   the first paint — it streams in after hydration instead. Static imports
   elsewhere stay untouched: helpers like `openGame` are event dispatches, not
   components. */
export const LazyGameModalProvider = dynamic(
  () => import("@/components/game/GameModal").then((m) => m.GameModalProvider),
  { ssr: false }
);
export const LazyGameCenterProvider = dynamic(
  () => import("@/components/game/GameCenter").then((m) => m.GameCenterProvider),
  { ssr: false }
);
export const LazyTruthOrDareModalProvider = dynamic(
  () => import("@/components/game/TruthOrDareModal").then((m) => m.TruthOrDareModalProvider),
  { ssr: false }
);
export const LazyGameLauncherProvider = dynamic(
  () => import("@/components/game/GameLauncher").then((m) => m.GameLauncherProvider),
  { ssr: false }
);
