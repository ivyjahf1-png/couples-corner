/**
 * Country name → flag emoji, for the small age/country badge on Explore cards
 * and anywhere else a self-reported country is shown compactly.
 *
 * Mirrors the lookup in app/(app)/profile/edit/page.tsx but lives in lib/ so
 * client components can import it without pulling in the profile form. Matching
 * is trimmed and case-insensitive; an unknown or missing country returns null so
 * callers omit the flag instead of guessing one.
 */
const FLAGS: Record<string, string> = {
  // Africa
  nigeria: "🇳🇬",
  ghana: "🇬🇭",
  kenya: "🇰🇪",
  "south africa": "🇿🇦",
  egypt: "🇪🇬",
  "ivory coast": "🇨🇮",
  senegal: "🇸🇳",
  tanzania: "🇹🇿",
  uganda: "🇺🇬",
  rwanda: "🇷🇼",
  ethiopia: "🇪🇹",
  cameroon: "🇨🇲",
  zambia: "🇿🇲",
  zimbabwe: "🇿🇼",
  namibia: "🇳🇦",
  botswana: "🇧🇼",
  morocco: "🇲🇦",
  // Americas
  "united states": "🇺🇸",
  "united states of america": "🇺🇸",
  usa: "🇺🇸",
  canada: "🇨🇦",
  mexico: "🇲🇽",
  brazil: "🇧🇷",
  argentina: "🇦🇷",
  colombia: "🇨🇴",
  jamaica: "🇯🇲",
  // Europe
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  ireland: "🇮🇪",
  france: "🇫🇷",
  germany: "🇩🇪",
  spain: "🇪🇸",
  italy: "🇮🇹",
  netherlands: "🇳🇱",
  portugal: "🇵🇹",
  sweden: "🇸🇪",
  norway: "🇳🇴",
  poland: "🇵🇱",
  russia: "🇷🇺",
  ukraine: "🇺🇦",
  // Asia & Oceania
  india: "🇮🇳",
  pakistan: "🇵🇰",
  china: "🇨🇳",
  japan: "🇯🇵",
  "south korea": "🇰🇷",
  philippines: "🇵🇭",
  indonesia: "🇮🇩",
  malaysia: "🇲🇾",
  singapore: "🇸🇬",
  "united arab emirates": "🇦🇪",
  uae: "🇦🇪",
  australia: "🇦🇺",
  "new zealand": "🇳🇿",
};

/** Flag emoji for a self-reported country name, or null when unknown/absent. */
export function countryFlag(country?: string | null): string | null {
  const key = country?.trim().toLowerCase();
  if (!key) return null;
  return FLAGS[key] ?? null;
}