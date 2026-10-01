"use client";

import { useState, type ReactNode } from "react";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

interface AvatarProps {
  name: string;
  src?: string | null;
  /** "couple" renders the two-dot duo mark instead of initials. */
  kind?: "person" | "couple";
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar: the member's photo when one is available, initials otherwise.
 */
export function Avatar({ name, src, kind = "person", size = "md", className }: AvatarProps) {
  // A photo URL that 404s (deleted upstream, storage path changed, private
  // bucket) would otherwise render the browser's broken-image glyph rather than
  // anything deliberate. Tracking the failed URL and falling back to initials
  // keeps the circle looking intentional. Comparing against `src` (rather than
  // a boolean) means a NEW url retries instead of staying stuck on the
  // fallback forever.
  //
  // `usableSrc` guards the two cases that make `<img src>` render nothing useful
  // even though `src` is non-null, which is what left the chat showing an empty
  // circle instead of initials:
  //
  //   1. A whitespace-only string. `summary.avatarUrl ?? photos[0].publicUrl` style
  //      fallbacks can produce `""` or `"   "`, and both are TRUTHY-adjacent: `""`
  //      is falsy so it fell through, but `"   "` is truthy, so an `<img>` was
  //      rendered with a whitespace src, resolved to the current page URL, and
  //      failed — or worse, "succeeded" by re-requesting the HTML as an image.
  //   2. A non-HTTP scheme (`data:`, `blob:` is fine, `javascript:` is not). The
  //      API route issues `/api/photos/...` relative paths, so an absolute-URL
  //      check alone would be wrong here — the check is "looks like a real source"
  //      rather than "is absolute".
  const usableSrc =
    typeof src === "string" && src.trim() !== "" && !/^javascript:/i.test(src.trim())
      ? src.trim()
      : null;

  // The failed marker RESETS whenever the url changes, so a new (or newly valid)
  // url retries instead of staying permanently stuck on initials.
  //
  // The reset happens DURING render — React's documented "adjust state when a prop
  // changes" pattern — rather than in an effect: an effect runs after paint, so
  // the avatar would flash one frame of initials on every src change, and a
  // `setState` in an effect is a cascading render for no benefit. Comparing the
  // TRIMMED url is deliberate: `"  /api/photos/x  "` → `"/api/photos/x"` is the
  // same image and must not blank the circle.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [seenSrc, setSeenSrc] = useState<string | null>(usableSrc);
  if (seenSrc !== usableSrc) {
    setSeenSrc(usableSrc);
    setFailedSrc(null);
  }

  // `initials` is what a member sees when there is no usable photo, so it must
  // never itself be empty. `display_name` is nullable in the database and the
  // chat mappers fall back to "Member", but other call sites pass raw values —
  // and a blank `"".split(...)` produced an EMPTY gradient disc, which is
  // exactly the "missing profile picture" this fallback exists to solve. The
  // `?` keeps the circle legible and obviously deliberate.
  const initials =
    name
      .split(/[\s&]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  if (usableSrc && failedSrc !== usableSrc) {
    return (
      <img
        src={usableSrc}
        alt={name}
        onError={() => setFailedSrc(usableSrc)}
        // `className` is merged so a caller that sizes the avatar itself (the
        // feed header wraps it in a fixed-size overflow-hidden ring) can
        // override the default size instead of fighting it with two competing
        // height utilities.
        // `shrink-0` is REQUIRED here, not decorative.
        //
        // This element is a flex item in the comment row. Without it, a photo
        // with a large intrinsic size can shrink the avatar below its box and,
        // because the text column beside it is `min-w-0 flex-1`, squeeze that
        // column to roughly one character wide - which is what forces text to
        // wrap letter-by-letter down the screen.
        //
        // The initials branch below already had `shrink-0`; the image branch did
        // not, so the bug only appeared for members WITH a profile photo.
        className={[
          "h-full w-full shrink-0 rounded-full object-cover",
          sizeClasses[size],
          className ?? "",
        ]
          .join(" ")
          .trim()}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        // The initials fallback carries a real gradient rather than a flat
        // `bg-white/15`. A flat translucent white over a dark card resolves to
        // the same desaturated grey as every other placeholder, so a deck of
        // members who have not uploaded photos read as a wall of identical
        // grey discs — visually flat, and it made the card look broken rather
        // than empty. The gradient is deterministic per name, so the same
        // member keeps the same colours everywhere they appear instead of
        // flickering between greys on each render.
        kind === "couple"
          ? "bg-gradient-to-br from-brand-500/25 via-brand-600/15 to-ink-700/40 text-brand-200"
          : "bg-gradient-to-br from-brand-500/30 via-purple-500/20 to-orange-500/20 text-white",
        sizeClasses[size],
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {kind === "couple" ? (
        <span className="flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
        </span>
      ) : (
        initials
      )}
    </span>
  );
}

/**
 * Online / offline indicator dot, designed to sit on the bottom-right of an
 * avatar.
 *
 * The two states are visually distinct at a glance, which is the whole point:
 * online is a vibrant, saturated green with a soft outer glow and a gentle
 * pulse; offline is a flat, desaturated slate disc with no glow. A member
 * reading a feed at a glance should never have to squint to tell the two
 * apart, and colour alone should never be the only cue - hence the `title` and
 * the visually-hidden text, so a screen reader announces "Offline" too.
 *
 * Size defaults track the avatars it is most often paired with.
 */
export function PresenceDot({
  online,
  size = "md",
  className,
  label,
}: {
  online: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Overrides the announced text; defaults to "Online" / "Offline". */
  label?: string;
}) {
  const dotSize =
    size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  const text = label ?? (online ? "Online" : "Offline");

  return (
    <span
      // The dot is decorative; the state is exposed via the title and the
      // visually-hidden label rather than as an image with a meaningless alt.
      aria-hidden
      title={text}
      data-presence={online ? "online" : "offline"}
      className={[
        "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-slate-950",
        dotSize,
        online
          ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)] motion-safe:animate-pulse"
          : "bg-slate-500/70",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <span className="sr-only">{text}</span>
    </span>
  );
}

/**
 * An avatar with its presence dot already positioned, for the common case of
 * "avatar + status in the bottom-right corner".
 *
 * Wraps rather than modifies `Avatar` so every existing `Avatar` call site
 * keeps working untouched, and so the ring/positioning stays consistent.
 */
export function AvatarWithPresence({
  online,
  name,
  src,
  kind,
  size = "md",
  dotSize,
  avatarClassName,
  className,
}: {
  online: boolean;
  name: string;
  src?: string | null;
  kind?: "person" | "couple";
  size?: AvatarSize;
  dotSize?: "sm" | "md" | "lg";
  avatarClassName?: string;
  className?: string;
}) {
  return (
    <span className={["relative inline-flex shrink-0", className ?? ""].join(" ").trim()}>
      <Avatar name={name} src={src} kind={kind} size={size} className={avatarClassName} />
      <PresenceDot online={online} size={dotSize} />
    </span>
  );
}

export function AvatarWithMeta({
  name,
  meta,
  kind,
  size = "md",
  children,
}: {
  name: string;
  meta?: string;
  kind?: "person" | "couple";
  size?: AvatarSize;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} kind={kind} size={size} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{name}</p>
        {meta ? <p className="truncate text-sm text-ink-300">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}
