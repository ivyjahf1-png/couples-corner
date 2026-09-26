import type { ReactNode } from "react";

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
 * Initials avatar placeholder. Photos will come from Cloud Storage later;
 * for now every avatar is a deterministic, warm-toned initials disc.
 */
export function Avatar({ name, src, kind = "person", size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={[
          "h-full w-full rounded-full object-cover",
          sizeClasses[size],
        ].join(" ")}
      />
    );
  }

  const initials = name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <span
      aria-hidden
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        kind === "couple" ? "bg-brand-500/15 text-brand-300" : "bg-white/15 text-ink-200",
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
