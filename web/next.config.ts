import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: turbopack root disabled — it hung `next build` on Windows.
  // Legacy route aliases: /home and /main never existed as pages and 404'd.
  // They now route smoothly to the active user screen (/dashboard). These are
  // checked before filesystem routes, so they only affect unmatched paths.
  async redirects() {
    return [
      { source: "/home", destination: "/dashboard", permanent: false },
      { source: "/main", destination: "/dashboard", permanent: false },
      // The membership surface was briefly renamed "VIP Club" at /vip-club and
      // has been reverted to "Aristocracy". The old /vip-club links are kept as
      // a redirect rather than 404'd, so a bookmark, a shared link or a still-
      // cached bundle from the short-lived alias still lands on a real page.
      // `permanent: false` keeps it re-evaluated, matching the aliases above.
      { source: "/vip-club", destination: "/aristocracy", permanent: false },
      // The legacy Game Center was removed wholesale (built-in engines, the old
      // /games hub and /api/games/reward). Old links survive in two places:
      // bookmarks/shared URLs, and the task-center seed row whose link is
      // `/games/couples-ludo-advance`.
      //
      // ── WHY THE TREE-WIDE `/games/:path*` REDIRECT IS GONE ──────────────────
      // It used to shadow the whole prefix on the reasoning that "there is no
      // games route left to send them to". There is one again: `app/(app)/games/
      // [gameId]/page.tsx` serves the catalog-driven launcher. Next checks
      // redirects BEFORE filesystem routes, so leaving this entry would have
      // made every `/games/<id>` — including every valid catalog id — bounce to
      // the dashboard and left the new page unreachable while still building.
      //
      // The legacy-link behaviour it provided now lives in the page itself: an
      // id that is not in the catalogue calls `redirect("/dashboard")`, so
      // `/games/couples-ludo-advance` still lands on a real screen, and the
      // blanket redirect no longer has to exist to achieve that.
      //
      // ── WHY THE `/games` REDIRECT IS ALSO GONE ───────────────────────────
      // `/games` used to point at the old hub. It is now the Arcade hub again:
      // `app/(app)/games/page.tsx` maps the full catalogue from data/games.json
      // with category filtering and a working iframe launcher. Next evaluates
      // redirects BEFORE filesystem routes, so a `{ source: "/games" }` entry
      // would have made the new hub unreachable — the exact failure the tree-
      // wide `/games/:path*` redirect above caused for the detail page.
      // Category filters live on the query string (`/games?category=Board`),
      // which the hub reads via `searchParams`, so no route alias is needed.
    ];
  },
  // Server Action request body limit.
  //
  // IMPORTANT — this does NOT raise Vercel's 4.5 MB platform cap on function
  // request bodies, and nothing in next.config can. That misreading is what
  // produced "An unexpected response was received from the server" on moment
  // uploads: the whole video used to be sent as the action body, Vercel rejected
  // it with 413 FUNCTION_PAYLOAD_TOO_LARGE before the action ran, and the 413
  // body is not an RSC payload, so Next's action client threw error E394.
  //
  // Moment media no longer travels through a Server Action at all — the browser
  // uploads straight to Supabase Storage (lib/utils/direct-upload.ts) and only a
  // small JSON payload is sent to the action. This setting is kept at a modest
  // 10 MB purely as defence-in-depth for any future action that is tempted to
  // accept a file: a small ceiling makes that mistake fail fast and obviously
  // rather than as an opaque 413.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;