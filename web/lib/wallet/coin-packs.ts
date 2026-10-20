/**
 * THE COIN PACK CATALOGUE — one source of truth for every coin price.
 *
 * ── WHY THIS MODULE EXISTS ───────────────────────────────────────────────────
 * Before this file, the price of a coin pack was written out FOUR separate
 * times in four separate places:
 *
 *   • `lib/server/subscription.ts#COIN_PACKS` — what a purchase actually costs
 *   • `components/app/CoinTopUpModal.tsx` — the shared "Get Coins" sheet
 *   • `components/app/DiscoverCardStack.tsx` — the discover sheet
 *   • `components/app/WalletMenu.tsx` — the wallet drawer
 *
 * and the four had already drifted apart: the server quoted Naira, while the
 * two client sheets quoted US dollars for a DIFFERENT set of packs
 * (100/550/1200 coins at $4.99/$24.99/$49.99) that the server could not even
 * sell. A member who read ₦772.24 in the wallet drawer and $4.99 in the
 * discover sheet was being shown two different economies, and the second one
 * was not purchasable.
 *
 * This module is the ONE list. The server imports it to price a purchase; the
 * client components import it to display one. They cannot drift, because there
 * is nothing to drift.
 *
 * ── THE PRICES ───────────────────────────────────────────────────────────────
 * All prices are in Nigerian Naira (NGN). No third-party wallet names are
 * used anywhere in this codebase, and no currency other than Naira is
 * accepted for coins — the pack prices below are the published Naira prices.
 *
 * The prices are deliberately NOT derived from a formula. A "coins × rate"
 * formula looks tidier but silently changes every price the moment the rate
 * is edited, and a price that changes without anyone noticing is a price a
 * member cannot trust. These are literal, published, and stable.
 *
 * ── SERVER AUTHORITY ─────────────────────────────────────────────────────────
 * The prices here are used for DISPLAY on the client and for RESOLUTION on the
 * server. A client that edits the DOM, replays the request or ships a modified
 * bundle still pays the server's price, because `purchaseCoinPack` resolves the
 * pack by id from this same list — the client only ever names an id.
 */

/** One purchasable tier of coins. */
export interface CoinPack {
  /** Stable id the client sends back on purchase. */
  id: string;
  /** How many coins the member receives. */
  coins: number;
  /** Price in Nigerian Naira. */
  priceNgn: number;
  /** Human label, e.g. "1,000 Coins". */
  label: string;
}

/**
 * The naira symbol, used wherever a price is rendered.
 *
 * Declared once so a pack list in the wallet drawer and the same pack list in
 * the chat sheet cannot disagree about the glyph — and so the symbol is the
 * real ₦ (U+20A6) rather than a lookalike that some fonts render as a
 * capital N with a bar through it.
 */
export const NAIRA_SIGN = "₦";

/**
 * Format a naira price with two decimals: ₦1,560.24.
 *
 * `Intl.NumberFormat` gives the thousands separator for free, which matters
 * because ₦15744.24 is materially harder to read at a glance than ₦15,744.24
 * on a phone.
 */
export function formatNaira(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${NAIRA_SIGN}${safe.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * THE PACK LIST.
 *
 * Ordered smallest first: a brand-new member with an empty wallet can afford
 * the 500-coin pack, and burying it under six larger tiers makes the cheapest
 * option something they have to hunt for.
 *
 * The label is derived from the coin count rather than typed out, so it can
 * never disagree with the number of coins actually credited.
 */
export const COIN_PACKS: CoinPack[] = [
  { id: "pack_500", coins: 500, priceNgn: 772.24 },
  { id: "pack_1000", coins: 1_000, priceNgn: 1_560.24 },
  { id: "pack_2000", coins: 2_000, priceNgn: 3_136.24 },
  { id: "pack_5000", coins: 5_000, priceNgn: 7_864.24 },
  { id: "pack_10000", coins: 10_000, priceNgn: 15_744.24 },
  { id: "pack_20000", coins: 20_000, priceNgn: 31_504.24 },
  { id: "pack_50000", coins: 50_000, priceNgn: 78_784.24 },
  { id: "pack_100000", coins: 100_000, priceNgn: 157_584.24 },
  { id: "pack_200000", coins: 200_000, priceNgn: 315_184.24 },
].map((pack) => ({
  ...pack,
  label: `${pack.coins.toLocaleString("en-US")} Coins`,
}));

/**
 * Resolve a pack id to its catalogue entry, or null.
 *
 * Returns null for an unknown id rather than throwing. This is the one
 * function on the purchase path whose argument is client-controlled, so an
 * unknown id must fail CLOSED: a member who tampers with the id gets nothing
 * credited, not a free pack and not a crash.
 */
export function resolveCoinPack(packId: string): CoinPack | null {
  const id = typeof packId === "string" ? packId.trim() : "";
  if (!id) return null;
  return COIN_PACKS.find((pack) => pack.id === id) ?? null;
}

/** The cheapest pack — the one a member with a small balance can actually buy. */
export const CHEAPEST_COIN_PACK = COIN_PACKS[0]!;
