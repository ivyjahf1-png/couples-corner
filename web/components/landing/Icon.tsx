import type { ReactNode } from "react";

/** Names of the available inline line icons. */
export type IconName =
  | "discover"
  | "profile"
  | "couple"
  | "chat"
  | "moments"
  | "lock"
  | "shield"
  | "flag"
  | "sparkle"
  | "arrow"
  | "home"
  | "bell"
  | "settings"
  | "search"
  | "check"
  | "plus"
  | "send"
  | "eye"
  | "eye-off"
  | "logout"
  | "compass"
  | "heart"
  | "menu"
  | "close"
  | "crown"
  | "chevron"
  | "flame"
  | "rewind"
  | "star";

/*
 * Tasteful, hand-drawn 24x24 line icons rendered with `currentColor` so they
 * pick up whichever text token the parent uses. Stroke is rounded for a warm,
 * friendly feel consistent with the Couples Corner language.
 */
const paths: Record<IconName, ReactNode> = {
  discover: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3 L12 7 M12 17 L12 21 M3 12 L7 12 M17 12 L21 12" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="7" r="4.5" />
      <path d="M5 21 C5 14 8 11 16 11 19 14 19 21 Z" />
    </>
  ),
  couple: (
    <>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M12 9 L12 15" />
    </>
  ),
  chat: (
    <>
      <rect x="6" y="4" width="12" height="9" rx="2.5" />
      <path d="M12 13 L10 18 L14 18 L14 20 L10 20 Z" />
      <circle cx="9.5" cy="8" r="0.8" />
      <circle cx="12" cy="9.5" r="0.8" />
      <circle cx="14.5" cy="11" r="0.8" />
    </>
  ),
  moments: (
    <>
      <rect x="4" y="4" width="8" height="7" rx="1.5" />
      <rect x="12" y="4" width="8" height="7" rx="1.5" />
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <circle cx="12" cy="15.5" r="1.4" />
    </>
  ),
  lock: (
    <>
      <path d="M9 4 C9 2 12 1.5 15 4 Z" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <circle cx="12" cy="12.5" r="1.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 L6 6 L4 10 L6 14 L12 15 L18 14 L20 10 L18 6 L12 3 Z" />
      <path d="M9 9 L12 11 L15 9" />
    </>
  ),
  flag: (
    <>
      <rect x="9.5" y="5" width="1.4" height="16" />
      <path d="M10.9 5 L5 9 L10.9 9 Z" />
      <path d="M10.9 13 L16 17 L10.9 17 Z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3 L12 21" />
      <path d="M3 12 L21 12" />
      <path d="M7 7 L17 17 M7 17 L17 7" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  arrow: <path d="M4 13 L10 7 L16 7 L16 19 L10 19 L21 13" />,
  home: (
    <>
      <path d="M4 11 L12 4 L20 11" />
      <path d="M6 10 L6 20 L18 20 L18 10" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16 C6 9 8 5 12 5 C16 5 18 9 18 16 Z" />
      <path d="M4.5 16 L19.5 16" />
      <path d="M10 19 C10 20.5 14 20.5 14 19" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3 L12 6 M12 18 L12 21 M3 12 L6 12 M18 12 L21 12 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M18.4 5.6 L16.3 7.7 M7.7 16.3 L5.6 18.4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15 L20 20" />
    </>
  ),
  check: <path d="M4 12.5 L9.5 18 L20 6.5" />,
  plus: <path d="M12 4 L12 20 M4 12 L20 12" />,
  send: (
    <>
      <path d="M4 12 L20 4 L15 20 L11.5 13.5 Z" />
      <path d="M11.5 13.5 L20 4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M2 2 L22 22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21 H5 a2 2 0 0 1-2-2 V5 a2 2 0 0 1 2-2 h4" />
      <path d="M16 17 L21 12 L16 7" />
      <path d="M21 12 H9" />
    </>
  ),
  /* --- App navigation icons (bottom bar + drawer + sidebar) ------------- */
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8 L13.6 13.6 L8 16 L10.4 10.4 Z" />
    </>
  ),
  heart: (
    <path d="M12 20.2 C12 20.2 3.8 15.1 3.8 9.6 C3.8 6.9 6 5 8.4 5 C10.1 5 11.4 5.9 12 7.2 C12.6 5.9 13.9 5 15.6 5 C18 5 20.2 6.9 20.2 9.6 C20.2 15.1 12 20.2 12 20.2 Z" />
  ),
  menu: (
    <>
      <path d="M4 7 H20" />
      <path d="M4 12 H20" />
      <path d="M4 17 H20" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 L18 18" />
      <path d="M18 6 L6 18" />
    </>
  ),
  crown: (
    <>
      <path d="M3.5 17 L5 7.5 L9.3 11.5 L12 6.5 L14.7 11.5 L19 7.5 L20.5 17 Z" />
      <path d="M4 20 H20" />
    </>
  ),
  chevron: <path d="M9.5 5 L16 12 L9.5 19" />,
  /* --- Discover action-bar icons ----------------------------------------- */
  flame: (
    <path d="M12 21 C8 21 6 18.2 6 14.8 C6 11.6 8 9.2 10 7 C10.4 9 11.2 10 12.4 10.6 C12 8.6 12.6 6 14.6 4 C14.4 6.4 15.6 7.6 16.8 9.2 C18.2 11 18 13.4 18 14.8 C18 18.2 16 21 12 21 Z" />
  ),
  rewind: (
    <>
      <path d="M11 6 L4 12 L11 18 Z" />
      <path d="M20 6 L13 12 L20 18 Z" />
    </>
  ),
  star: (
    <path d="M12 3.5 L14.4 9 L20.5 9.7 L16 13.7 L17.2 19.8 L12 16.7 L6.8 19.8 L8 13.7 L3.5 9.7 L9.6 9 Z" />
  ),
};

interface IconProps {
  name: IconName;
  /** Extra sizing/label classes (colour comes from `currentColor`). */
  className?: string;
  /** Accessible label for icon-only contexts. */
  label?: string;
  /** Render a solid glyph (used for the deck Like heart / Super-like star). */
  filled?: boolean;
}

/** Renders a single line icon. Pass `label` when the icon is meaningful alone. */
export function Icon({ name, className, label, filled }: IconProps) {
  const size = className ?? "h-6 w-6";
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : "true"}
      role={label ? "img" : undefined}
      className={size}
    >
      {label ? <title>{label}</title> : null}
      {paths[name]}
    </svg>
  );
}