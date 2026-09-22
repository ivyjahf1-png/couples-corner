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
  // (uploadContentMedia), whose POST body Next.js caps at 1 MB by default.
  // Raise it to match CONTENT_UPLOAD.maxImageBytes (10 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;