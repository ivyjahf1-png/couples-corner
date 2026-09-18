import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Absolute root prevents the "inferred workspace root" warning and keeps
    // Turbopack's filesystem watcher stable regardless of cwd.
    root: path.resolve(import.meta.dirname),
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