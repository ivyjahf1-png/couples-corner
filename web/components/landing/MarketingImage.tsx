"use client";

import { useState } from "react";

type Tone = "hero" | "media" | "story";

interface MarketingImageProps {
  /** Where the real image lives, e.g. "/images/hero-couple.jpg". */
  src?: string;
  alt: string;
  /** Which warm gradient fallback to use when the image isn't present yet. */
  tone?: Tone;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

const toneClasses: Record<Tone, string> = {
  hero: "hero-photo",
  media: "media-placeholder",
  story: "story-placeholder",
};

/**
 * Marketing / landing imagery.
 *
 * ADMIN-CONTROLLED CONTENT: marketing images (hero, promotional, stories)
 * should eventually come from admin-managed content + Supabase Storage. Until
 * then this renders an elegant warm gradient placeholder behind the requested
 * image path, so dropping a real file into `public/images/...` is all that's
 * needed to bring it to life — no code change required.
 */
export function MarketingImage({
  src,
  alt,
  tone = "media",
  className,
  imgClassName,
  eager = false,
}: MarketingImageProps) {
  const [failed, setFailed] = useState(!src);

  return (
    <div className={[toneClasses[tone], "relative overflow-hidden", className ?? ""].join(" ").trim()}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className={["h-full w-full object-cover", imgClassName ?? ""].join(" ").trim()}
        />
      ) : null}
      {/* Accessible caption only when fallback is shown (no real photo). */}
      {src && failed ? (
        <span className="sr-only">{alt}</span>
      ) : null}
    </div>
  );
}