/**
 * Height parsing and formatting.
 *
 * ONE module owns every conversion between the two units this app uses, because
 * the pair is asymmetric and easy to get subtly wrong:
 *
 *   • STORAGE + DISPLAY are centimetres (a `height_cm` INTEGER column, migration
 *     051). Numeric, sortable, unambiguous.
 *   • INPUT is whatever the member types — feet/inches ("5'11\"", "5ft 11in") or
 *     centimetres ("179cm") — because the members this app targets do not all use
 *     the same system and refusing one of them is a needless wall.
 *
 * `parseHeightToCm` accepts both and returns null for anything unparseable, so a
 * caller can treat "not set" and "garbage" identically rather than writing NaN.
 * `formatHeight` goes the other way for display.
 *
 * Deliberately dependency-free and side-effect-free so both the client form and
 * the server-rendered profile can import it without pulling in React.
 */

/** Tallest plausible human, in cm. Mirrors the DB check constraint in migration 051. */
const MAX_CM = 254;
/** Shortest plausible human, in cm. Below this, the input is a typo, not a person. */
const MIN_CM = 90;

const FEET_PER_INCH = 2.54;

/**
 * Parse a member-typed height into centimetres.
 *
 * ACCEPTED FORMS (case-insensitive, whitespace tolerant):
 *     "179"  "179cm"  "179 cm"      -> centimetres
 *     "5'11"  "5'11\""  "5ft 11in"  -> feet and inches
 *     "5"                      -> bare number, read as CENTIMETRES
 *
 * A bare number is centimetres rather than feet deliberately: "179" is an
 * implausible foot count and an extremely plausible cm value, so misreading it as
 * feet would turn a correct entry into 34 inches of nonsense.
 *
 * Returns `null` — never NaN, never a partial parse — when the input cannot be
 * read, so the caller can store null and render "not set".
 */
export function parseHeightToCm(input: string | null | undefined): number | null {
  if (!input) return null;
  const text = String(input).trim().toLowerCase();
  if (!text) return null;

  // Feet/inches: 5'11" or 5' or 5ft 11in. The apostrophe and the word "ft" are
  // equivalent spellings, and both the straight and curly quote are accepted
  // because iOS's keyboard substitutes the curly one and the member pastes it.
  const feetMatch = text.match(/^(\d{1,2})\s*(?:'|’|ft|foot|feet)\s*(\d{1,2})?\s*(?:"|”|in|inch|inches)?$/);
  if (feetMatch) {
    const feet = Number(feetMatch[1]);
    const inches = feetMatch[2] ? Number(feetMatch[2]) : 0;
    // 12 inches to the foot is a real constraint, not a style preference: "5'14"
    // is a mis-typed 5'2", and silently accepting it would store a height nobody
    // typed.
    if (inches > 11) return null;
    const cm = feet * 12 * FEET_PER_INCH + inches * FEET_PER_INCH;
    return inRange(cm) ? Math.round(cm) : null;
  }

  // Centimetres, bare or suffixed.
  const cmMatch = text.match(/^(\d{1,3}(?:\.\d+)?)\s*(?:cm|centimet(?:er|re)s?)?$/);
  if (cmMatch) {
    const cm = Number(cmMatch[1]);
    return inRange(cm) ? Math.round(cm) : null;
  }

  return null;
}

/** True when a centimetre value is a physically plausible height. */
function inRange(cm: number): boolean {
  return Number.isFinite(cm) && cm >= MIN_CM && cm <= MAX_CM;
}

/**
 * Render centimetres for display, as feet/inches with a rounded inch.
 *
 * `null` renders as null so the caller can omit the attribute entirely rather
 * than print "null cm" or an empty pill — the same "don't show what you don't
 * have" rule the rest of the profile follows.
 */
export function formatHeight(cm: number | null | undefined): string | null {
  if (typeof cm !== "number" || !Number.isFinite(cm)) return null;
  const totalInches = cm / FEET_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  // Rounding 11.6in up to 12 must carry into the feet, or "5'12"" appears.
  const carry = inches === 12;
  return `${carry ? feet + 1 : feet}'${carry ? 0 : inches}"`;
}

/** Compact display for the profile hero, e.g. "5'11" (179 cm)". */
export function formatHeightDetailed(cm: number | null | undefined): string | null {
  const imperial = formatHeight(cm);
  if (!imperial || typeof cm !== "number") return null;
  return `${imperial} (${Math.round(cm)} cm)`;
}

/**
 * The lifestyle vocabulary offered in the editor.
 *
 * Stored as free-form text rather than a foreign key so a member can add their
 * own, but these are the suggested options. `id` is what persists; `label` is
 * what renders — which is why "pet-owner" never appears on screen.
 */
export const LIFESTYLE_OPTIONS: { id: string; label: string }[] = [
  { id: "pet-owner", label: "Pet owner" },
  { id: "fitness", label: "Fitness" },
  { id: "travel", label: "Travel lover" },
  { id: "foodie", label: "Foodie" },
  { id: "music", label: "Music lover" },
  { id: "reader", label: "Reader" },
  { id: "night-owl", label: "Night owl" },
  { id: "early-bird", label: "Early bird" },
  { id: "homebody", label: "Homebody" },
  { id: "outdoors", label: "Outdoors" },
  { id: "creative", label: "Creative" },
  { id: "etelts", label: "Eats" },
];

/** Human label for a stored lifestyle id, falling back to a title-cased id. */
export function lifestyleLabel(id: string): string {
  const match = LIFESTYLE_OPTIONS.find((option) => option.id === id);
  if (match) return match.label;
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}