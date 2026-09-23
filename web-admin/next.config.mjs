/** @type {import('next').NextConfig} */
const nextConfig = {
  // Admin media uploads travel through Server Actions (uploadContentMedia)
  // as a fallback path when direct browser upload is blocked. Next.js caps
  // Server Action POST bodies at 1 MB by default — raise it to 10 MB to
  // match CONTENT_UPLOAD.maxImageBytes (mirrors web/next.config.ts).
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
