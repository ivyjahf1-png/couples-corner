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
