/**
 * THE VIRTUAL GIFT CATALOGUE — client-safe static data.
 *
 * WHY A STATIC LIST RATHER THAN A TABLE. There is no `gifts` table in this schema:
 * `giftAristocracyTier` in `lib/server/commerce.ts` gifts a *membership tier* by
 * user code, which is a different feature entirely. So this file is the single
 * source of truth for what a gift costs and what it is called, exactly as
 * `lib/storeCatalog.ts` is for store items.
 *
 * ── PRICES ARE FOR DISPLAY ONLY, NEVER FOR THE DEBIT ──────────────────────────
 * The numbers here are what the shopper reads. The amount actually debited is
 * resolved SERVER-SIDE from this same catalogue by the send action, so a member
 * who edits the DOM, replays the request or ships a modified client still pays
 * the catalogue price. A client that could name its own price would make the coin
 * balance meaningless.
 *
 * `emoji` is the gift's artwork. There is no asset pipeline for gift images in
 * this app, and a grey placeholder tile reads as a broken image, so the glyph IS
 * the visual — the same approach `StoreFront` takes for store items.
 */

/** One gift in the drawer. */
export interface GiftItem {
  id: string;
  name: string;
  /** Coin cost for ONE unit. */
  price: number;
  emoji: string;
}

/**
 * THE CATALOGUE, in the order the drawer shows them.
 *
 * Cheapest first. That ordering is deliberate rather than alphabetical: the low
 * tier is what a brand-new member with a small balance can actually afford, and
 * burying `Kiss` at the bottom of a flat grid makes the cheapest gift unreachable
 * without scrolling. Tiers step 20 -> 50 -> 100 -> 800 -> 1000 -> 25000 -> 50000,
 * which is what makes the price tags do the sorting work instead of the eye.
 */
export const GIFTS: GiftItem[] = [
  { id: "gift-kiss", name: "Kiss", price: 20, emoji: "\u{1F48B}" },
  { id: "gift-love", name: "Love", price: 20, emoji: "\u{1F495}" },
  { id: "gift-heart", name: "Heart", price: 20, emoji: "\u{2764}\uFE0F" },
  { id: "gift-rose", name: "Rose", price: 50, emoji: "\u{1F339}" },
  { id: "gift-bear", name: "Bear", price: 50, emoji: "\u{1F43B}" },
  { id: "gift-cupid-heart", name: "Electric heart", price: 50, emoji: "\u{1F49C}" },
  { id: "gift-diamond", name: "Diamond", price: 100, emoji: "\u{1F48E}" },
  { id: "gift-chocolate", name: "Chocolate", price: 100, emoji: "\u{1F36D}" },
  { id: "gift-love-letter", name: "Love Letter", price: 100, emoji: "\u{1F48C}" },
  { id: "gift-butterfly", name: "Butterfly", price: 100, emoji: "\u{1F98B}" },
  { id: "gift-crystal-ball", name: "Crystal Ball", price: 800, emoji: "\u{1F52E}" },
  { id: "gift-sunglasses", name: "Party mask", price: 800, emoji: "\u{1F576}\uFE0F" },
  { id: "gift-handbag", name: "Luxury Handbag", price: 1000, emoji: "\u{1F45B}" },
  { id: "gift-cute-duck", name: "Cute duck", price: 1000, emoji: "\u{1F986}" },
  { id: "gift-strong-tea", name: "Strong Tea", price: 1000, emoji: "\u{1F9C5}" },
  { id: "gift-perfume", name: "Perfume", price: 1000, emoji: "\u{1F4A6}" },
  { id: "gift-air-support", name: "Air support", price: 1000, emoji: "\u{1F680}" },
  { id: "gift-air-avenger", name: "Air avenger", price: 1000, emoji: "\u{1F680}" },
  { id: "gift-golden-palace", name: "Golden Palace", price: 25000, emoji: "\u{1F3F0}" },
  { id: "gift-romantic-castle", name: "Romantic castle", price: 25000, emoji: "\u{1F3F0}" },
  { id: "gift-diamond-ring", name: "Diamond Ring", price: 25000, emoji: "\u{1F48D}" },
  { id: "gift-lamborghini", name: "Lamborghini", price: 25000, emoji: "\u{1F697}" },
  { id: "gift-year-2026", name: "2026", price: 50000, emoji: "\u{1F381}" },
];

/**
 * Resolve a gift id to its catalogue entry, or null.
 *
 * Returns null for an unknown id rather than throwing, and the caller treats null
 * as "send nothing". That is deliberate: this is the one function on the send path
 * that a client controls the argument to, and an unknown id must fail CLOSED.
 */
export function resolveGift(giftId: string): GiftItem | null {
  const id = typeof giftId === "string" ? giftId.trim() : "";
  if (!id) return null;
  return GIFTS.find((gift) => gift.id === id) ?? null;
}

/** Lowest price in the catalogue, used to pre-select a gift the member can afford. */
export const CHEAPEST_GIFT_PRICE = Math.min(...GIFTS.map((gift) => gift.price));

/**
 * Maximum quantity of one gift in a single send.
 *
 * Bounded because the cost is multiplied by it: an unbounded quantity lets a
 * client ask for 1e9 of the 50,000 gift and the server action has to either trust
 * the cap above or fail on an absurd debit. 99 is well past any plausible send
 * and keeps the arithmetic in a sane range.
 */
export const MAX_GIFT_QUANTITY = 99;