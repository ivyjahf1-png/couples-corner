import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Absolute root prevents the "inferred workspace root" warning and keeps
    // Turbopack's filesystem watcher stable regardless of cwd.
    root: path.resolve(import.meta.dirname),
  },
  // Legacy route aliases: /home and /main never existed as pages and 404'd.
  // They now route smoothly to the active user screen (/dashboard). These are
  // checked before filesystem routes, so they only affect unmatched paths.
  async redirects() {
    return [
      { source: "/home", destination: "/dashboard", permanent: false },
      { source: "/main", destination: "/dashboard", permanent: false },
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