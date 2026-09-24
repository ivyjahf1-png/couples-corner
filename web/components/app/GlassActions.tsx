"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/landing/Icon";

/**
 * Glass action controls — the professional interaction tokens used by the Home
 * page, the community feed, and profile surfaces.
 *
 * Anatomy comes from `.glass-action` / `.glass-action--*` in `app/globals.css`:
 * a frosted translucent core, a hairline rim, an inset top highlight, a crisp
 * `currentColor` line icon, a real pressed state and an unmistakable active
 * (selected) state — rose aura for a like, sky glow for an open comment thread.
 *
 * PRESERVATION CONSTRAINT: these components are presentation only. They never
 * read Supabase, never call a Server Action and never own routing — `href`
 * links are passed in by the caller exactly as before, and the like toggle is
 * the same honest, unpersisted visual state the feed already used.
 */

type GlassActionVariant = "like" | "comment" | "quiet" | "plain";
type GlassActionSize = "sm" | "md";

interface GlassActionButtonProps {
  icon: IconName;
  /** Visible label, e.g. "likes", "comments", "View". */
  label: string;
  /** Optional count rendered before the label ("4 likes"). */
  count?: number;
  /** Selected state (like pressed / thread open). */
  active?: boolean;
  /** Fill the glyph when active (solid heart). */
  filled?: boolean;
  variant?: GlassActionVariant;
  size?: GlassActionSize;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Accessible name override for icon-only buttons. */
  ariaLabel?: string;
  className?: string;
}

const sizeClasses: Record<GlassActionSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
};

const variantClasses: Record<GlassActionVariant, string> = {
  like: "glass-action--like",
  comment: "glass-action--comment",
  quiet: "glass-action--quiet",
  plain: "",
};

/** One glass action control. Renders a link when `href` is set, else a button. */
export function GlassActionButton({
  icon,
  label,
  count,
  active = false,
  filled,
  variant = "plain",
  size = "md",
  href,
  onClick,
  disabled = false,
  ariaLabel,
  className,
}: GlassActionButtonProps) {
  const classes = [
    "glass-action",
    variantClasses[variant],
    sizeClasses[size],
    className ?? "",
  ]
    .join(" ")
    .trim();

  const body = (
    <>
      <Icon
        name={icon}
        filled={filled ?? (variant === "like" && active)}
        className={size === "sm" ? "h-4 w-4" : "h-[1.05rem] w-[1.05rem]"}
      />
      {typeof count === "number" || label ? (
        <span className="truncate">
          {typeof count === "number" ? `${count} ` : ""}
          {label}
        </span>
      ) : null}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href as never}
        className={classes}
        aria-label={ariaLabel}
        aria-pressed={variant === "like" ? active : undefined}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      aria-pressed={variant === "like" ? active : undefined}
      aria-expanded={variant === "comment" ? active : undefined}
    >
      {body}
    </button>
  );
}

/**
 * Standalone like control with its own optimistic visual state.
 *
 * Used where no parent owns the count (Home suggestion / nearby rows). The
 * toggle is deliberately UI-local — the persisted write lands with the likes
 * Server Action — so no backend contract is touched here.
 */
export function LikeActionButton({
  initialLiked = false,
  initialCount,
  name,
  size = "md",
  showCount = true,
  className,
}: {
  initialLiked?: boolean;
  initialCount?: number;
  /** Member or post name, used for the accessible label. */
  name?: string;
  size?: GlassActionSize;
  showCount?: boolean;
  className?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount ?? 0);

  function toggle() {
    const next = !liked;
    setLiked(next);
    if (typeof initialCount === "number") {
      setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    }
  }

  return (
    <GlassActionButton
      icon="heart"
      label={showCount && typeof initialCount === "number" ? (count === 1 ? "like" : "likes") : ""}
      count={showCount && typeof initialCount === "number" ? count : undefined}
      variant="like"
      size={size}
      active={liked}
      onClick={toggle}
      ariaLabel={name ? `Like ${name}` : "Like"}
      className={className}
    />
  );
}
