"use client";

import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUser,
  Coins,
  Copy,
  Crown,
  Diamond,
  Eye,
  Gamepad2,
  Gem,
  Headset,
  Heart,
  Leaf,
  ListChecks,
  LucideIcon,
  MessageSquare,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Settings,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Icon bridge for the profile Server Component.
 *
 * WHY THIS EXISTS: `app/(app)/profile/page.tsx` is a Server Component — it
 * resolves the session, profile, stats and wallet on the server — and it cannot
 * import `lucide-react` directly. That package touches `createContext` at module
 * evaluation, which has no meaning in the server (RSC) module graph, so importing
 * it into a server component fails the build with
 * "d.createContext is not a function". Every other page that uses Lucide is a
 * Client Component, which is why this never comes up elsewhere.
 *
 * So the icons live here, behind a `"use client"` boundary, and the server page
 * refers to them BY NAME. That keeps the component boundary serialisable: a
 * component *function* cannot cross it, but a plain string can, which is why
 * callers pass `name="wallet"` rather than `icon={Wallet}`.
 *
 * Add a new icon by extending the map — the union type below makes a typo or a
 * missing entry a compile error rather than a blank space at runtime.
 */
export type ProfileIconName =
  /* Header + stats */
  | "chevron-right"
  | "chevron-down"
  | "copy"
  | "badge"
  | "leaf"
  | "user"
  | "users"
  | "user-plus"
  | "eye"
  /* Wallet + VIP cards */
  | "coin"
  | "gem"
  | "diamond"
  | "crown"
  | "settings"
  /* Friend banner + games */
  | "heart"
  | "gamepad"
  | "sparkles"
  /* Quick actions + menu rows */
  | "tasks"
  | "wallet"
  | "store"
  | "bag"
  | "level"
  | "star"
  | "trending-up"
  /* Menu rows below Bag/Level. `badge` (achievements), `certification`
     (checkmark), `support` (headset), `feedback` (message bubble) and
     `settings` (gear) — each one a DISTINCT glyph, so scanning the list does not
     require reading five labels to tell the rows apart. */
  | "certification"
  | "support"
  | "feedback";

const ICONS: Record<ProfileIconName, LucideIcon> = {
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  copy: Copy,
  badge: BadgeCheck,
  leaf: Leaf,
  user: CircleUser,
  users: Users,
  "user-plus": UserPlus,
  eye: Eye,
  coin: Coins,
  gem: Gem,
  diamond: Diamond,
  crown: Crown,
  settings: Settings,
  heart: Heart,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  tasks: ListChecks,
  wallet: Wallet,
  store: ShoppingCart,
  bag: ShoppingBag,
  level: Star,
  star: Star,
  "trending-up": TrendingUp,
  certification: Check,
  support: Headset,
  feedback: MessageSquare,
};

/**
 * Render one profile icon.
 *
 * `className` is passed straight through so each call site keeps full control of
 * size, colour and stroke weight — the new profile screen is a LIGHT theme, so
 * every glyph is tinted at the call site rather than inheriting a dark default.
 */
export function ProfileIcon({
  name,
  className,
}: {
  name: ProfileIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden className={className} />;
}
