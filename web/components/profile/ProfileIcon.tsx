"use client";

import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  ChevronDown,
  Crown,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  Home,
  MapPin,
  Moon,
  Music,
  PawPrint,
  Pencil,
  Ruler,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunrise,
  Plane,
  Settings,
  BookOpen as Reader,
  Coffee,
  Camera,
  TrendingUp,
  Wallet,
  type LucideIcon,
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
 * Client Component, which is why this never came up before.
 *
 * So the icons live here, behind a `"use client"` boundary, and the server page
 * refers to them BY NAME. That keeps the component boundary serialisable: a
 * component *function* cannot cross it, but a plain string can, which is why
 * callers pass `name="gift"` rather than `icon={Gift}`.
 *
 * Add a new icon by extending the map — the union type below makes a typo or a
 * missing entry a compile error rather than a blank space at runtime.
 */
export type ProfileIconName =
  | "crown"
  | "gift"
  | "shopping-bag"
  | "trending-up"
  | "wallet"
  /* Profile-screen redesign. Every name below is referenced BY NAME from the
     Server Component page, so the union is the compile-time guarantee that a
     typo becomes a build error rather than a blank square at runtime. */
  | "back"
  | "settings"
  | "edit"
  | "expand"
  | "camera"
  | "verified"
  | "location"
  | "heart-goal"
  | "height"
  | "profession"
  | "education"
  | "pet-owner"
  | "fitness"
  | "travel"
  | "foodie"
  | "music"
  | "reader"
  | "night-owl"
  | "early-bird"
  | "homebody"
  | "outdoors"
  | "creative"
  | "etelts";

const ICONS: Record<ProfileIconName, LucideIcon> = {
  crown: Crown,
  gift: Gift,
  "shopping-bag": ShoppingBag,
  "trending-up": TrendingUp,
  wallet: Wallet,
  back: ArrowLeft,
  settings: Settings,
  edit: Pencil,
  expand: ChevronDown,
  camera: Camera,
  verified: Award,
  location: MapPin,
  "heart-goal": Heart,
  height: Ruler,
  profession: Briefcase,
  education: GraduationCap,
  "pet-owner": PawPrint,
  fitness: Dumbbell,
  travel: Plane,
  foodie: Coffee,
  music: Music,
  reader: Reader,
  "night-owl": Moon,
  "early-bird": Sunrise,
  homebody: Home,
  outdoors: Sparkles,
  creative: Heart,
  etelts: BookOpen,
};

/**
 * Render one profile icon.
 *
 * `className` is passed straight through so each call site keeps control of size
 * and colour, matching the surrounding Midnight Slate & Orange treatment.
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
