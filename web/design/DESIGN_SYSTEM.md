# Couples Corner — Visual Design System

A warm, romantic, trustworthy and modern visual foundation for the platform —
welcoming to everyone, with a premium social-platform feel.

## Where the tokens live
- **Design tokens:** `app/globals.css` — base palette in `:root`, bridged into
  first-class Tailwind utilities by `@theme inline` (Tailwind v4 CSS-first).
- **UI primitives:** `components/ui/` — `Button`, `Card`, `Chip`, `Logo`.
- **Anatomy placeholder:** `components/PlaceholderPage.tsx`.

## Colors
| Token | Purpose |
| --- | --- |
| `brand-50…950` | Warm clay brand scale (primary = `brand-700`) |
| `ink-50…950` | Warm neutral scale for text/borders/chrome |
| `background` / `foreground` | Page canvas + primary text |
| `surface` / `surface-muted` | Card / secondary surfaces |
| `border` / `border-strong` | Hairline + emphasis borders |
| `muted` / `subtle` | Accessible secondary text / faint icons+placeholders |
| `accent` / `accent-strong` | Romantic washes & highlights (tasteful, no hearts) |
| `danger-*` / `success-*` | Status (block/report; likes/unread states) |

Utility examples: `bg-brand-700`, `text-ink-700`, `border-ink-200`,
`bg-surface-muted`, `text-muted`, `bg-accent`.

## Typography
- **Sans:** Geist (`--font-sans`) — body; **Mono:** Geist Mono (`--font-mono`).
- **Type scale:** defaults (`text-sm … text-9xl`) plus display sizes
  `text-display-2xl … text-display-5xl` (tight `1.05–1.1` line-height).
- **Tracking:** `tracking-tight`, `tracking-display`, `tracking-wide`.
- Headings: `font-semibold` + `tracking-display` for a premium, refined feel.

## Spacing
Tailwind's built-in `p/m/gap` scale (0.25rem base) is the canonical spacing
system. Semantic aliases in `:root` (`--space-1…20`,
`--space-inset`, `--space-section`) are available to component code.

## Radius
`rounded-sm … rounded-2xl` plus `rounded-card` (1.25rem). Subtle, elegant —
no harsh corners.

## Shadows
`shadow-subtle`, `shadow-sm`, `shadow-card`, `shadow-md`, `shadow-lifted`,
`shadow-lg`, `shadow-floating` — defined in `--shadow-*` tokens.

## Layout / container widths
`max-w-sm … max-w-7xl` map from `--container-*` (24rem → 80rem). Use these
for centered content columns and app shells.

## Interactive states
- **Focus:** a consistent, accessible 2px ring via global `:focus-visible`
  using the `--focus-ring` token (brand in light, softened in dark).
- **Hover/active:** baked into `Button` variants and `Card tone="interactive"`
  (e.g. `hover:bg-brand-800`, `active:bg-brand-900`, `hover:shadow-lifted`).
- **Disabled:** `disabled:opacity-60 disabled:pointer-events-none`.
- **Motion:** `prefers-reduced-motion` disables transitions/animations.

## Dark mode
Automatic via `prefers-color-scheme: dark` — semantic surface/ink/focus tokens
are re-mapped so every utility that references them updates in place.

## Accessibility notes
- Contrast checked for text: `foreground`/`ink-600+` on surfaces exceed WAG AA.
- Focus never appears on mouse click (`:focus-visible` only).
- Selection highlight is a warm, tasteful wash, not a harsh default.