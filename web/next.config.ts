import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Absolute root prevents the "inferred workspace root" warning and keeps
    // Turbopack's filesystem watcher stable regardless of cwd.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;