import { getPublishedForPlacement } from "@/lib/server/content";

/**
 * Dynamic illustration for the Login / Sign Up card.
 *
 * Loads the highest-priority published image content assigned to the "auth"
 * placement from the admin panel (Supabase `content` table) and renders it as
 * the card's top banner — so admins can swap the artwork on the fly without a
 * code deploy. When nothing is configured (or Firebase/Supabase is not yet
 * seeded), it falls back to a branded gradient illustration so the card never
 * looks broken.
 */
export async function AuthIllustration({ className = "" }: { className?: string }) {
  let imageUrl: string | null = null;
  try {
    const items = await getPublishedForPlacement("auth");
    const image = items.find(
      (item) => item.mediaType === "image" && item.mediaUrl
    );
    imageUrl = image?.mediaUrl ?? null;
  } catch {
    imageUrl = null;
  }

  if (imageUrl) {
    return (
      <div className={`relative h-28 overflow-hidden sm:h-40 lg:h-44 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Couples Corner"
          className="h-full w-full object-cover"
        />
        {/* Fade the artwork into the card body for a seamless, premium look */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgb(15 23 42 / 0.05) 55%, rgb(15 23 42 / 0.92) 100%)",
          }}
        />
      </div>
    );
  }

  // Branded fallback illustration — two interlocking hearts on the app gradient.
  return (
    <div
      className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0B1120] sm:h-40 lg:h-44 ${className}`}
      role="img"
      aria-label="Couples Corner illustration"
    >
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full opacity-30 blur-2xl"
        style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
      />
      <svg
        viewBox="0 0 120 72"
        className="h-24 w-40 text-brand-500 drop-shadow-lg"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M33.6 6C22.3 6 13.2 15 13.2 26.2c0 8.5 5.2 14.7 10.4 19.8 5.2 5.2 10.4 8.6 10.4 8.6s5.2-3.4 10.4-8.6c5.2-5.1 10.4-11.3 10.4-19.8C54.8 15 45.7 6 34.4 6h-.8Z" opacity="0.85" />
        <path d="M85.6 18c-8.2 0-14.8 6.6-14.8 14.7 0 6.2 3.8 10.7 7.6 14.4 3.8 3.8 7.6 6.3 7.6 6.3s3.8-2.5 7.6-6.3c3.8-3.7 7.6-8.2 7.6-14.4C101.2 24.6 94.6 18 86.4 18h-.8Z" opacity="0.55" />
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to bottom, transparent, #1E293B)" }}
      />
    </div>
  );
}
