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
  // Media uploads for user posts/content travel through Server Actions
  // (uploadUserMediaAction / publishMomentAction), whose POST body Next.js
  // caps at 1 MB by default.
  //
  // This MUST stay >= MAX_USER_MEDIA_BYTES (250 MB) in lib/utils/media-upload.ts
  // and MAX_BYTES in app/(app)/task/upload-moment/page.tsx. The File is sent as
  // the request body, so a value LOWER than the app's own per-file limit means
  // Next.js rejects the request before the action runs — the user sees
  // "Could not publish your moment" with no server-side error to explain it.
  // That mismatch is what broke video uploads while images (under 10 MB) worked.
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },
};

export default nextConfig;