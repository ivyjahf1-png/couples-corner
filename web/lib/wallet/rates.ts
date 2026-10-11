/**
 * Coin valuation + foreign-exchange helpers for the coin wallet modal.
 *
 * ── WHY THESE NUMBERS LIVE HERE ──────────────────────────────────────────────
 * The wallet quotes a cash-out value for a coin balance, and that quote has to
 * be identical everywhere it appears: the balance card's "≈ $X", the rate sheet,
 * the exchange converter and the withdraw screen all read from THIS module so a
 * member can never see two different prices for the same balance on one screen.
 *
 * ── THE RATE ────────────────────────────────────────────────────────────────
 * 10,000 coins = $1, i.e. 1 coin = $0.0001. Every tier in `COIN_RATE_SHEET`
 * resolves to exactly that ratio, so the sheet is a set of round-number
 * milestones rather than five independent prices that could drift apart.
 *
 * NOTE the deliberate distinction from `lib/server/subscription.ts#COIN_PACKS`,
 * which is what coins COST to BUY (quoted in ₦ and priced well above this
 * line). A purchase price and a cash-out price are different numbers by design —
 * the spread is what funds the economy — so nothing here reads from there.
 */

/** Cash-out value of a single coin. 10,000 coins = $1. */
export const COINS_PER_USD = 10_000;

/** One row of the published cash-out rate sheet. */
export interface CoinRateTier {
  coins: number;
  usd: number;
}

/** The five tiers shown on the wallet's rate sheet, ascending. */
export const COIN_RATE_SHEET: CoinRateTier[] = [
  { coins: 100_000, usd: 10 },
  { coins: 200_000, usd: 20 },
  { coins: 500_000, usd: 50 },
  { coins: 1_000_000, usd: 100 },
  { coins: 100_000_000, usd: 10_000 },
];

/** Cash-out value of a coin amount, in USD. Never negative. */
export function coinsToUsd(coins: number): number {
  if (!Number.isFinite(coins) || coins <= 0) return 0;
  return coins / COINS_PER_USD;
}

/** Coin amount a USD figure is worth at the cash-out rate. */
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return usd * COINS_PER_USD;
}

/**
 * A currency the converter can quote.
 *
 * `fallbackPerUsd` is the seed used when the live rate fetch fails. It is
 * deliberately approximate and labelled as such in the UI — an offline quote
 * that is a few percent out is far better than a blank converter, provided the
 * member is told they are looking at a fallback.
 */
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  fallbackPerUsd: number;
}

/**
 * Currencies offered in the converter.
 *
 * NGN leads because that is the app's primary market (`COIN_PACKS` is priced in
 * Naira), and the rest cover the other regions the app localises for.
 */
export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", fallbackPerUsd: 1 },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", fallbackPerUsd: 1575.84 },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", fallbackPerUsd: 15.4 },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", fallbackPerUsd: 129.2 },
  { code: "ZAR", symbol: "R", name: "South African Rand", fallbackPerUsd: 18.2 },
  { code: "GBP", symbol: "£", name: "British Pound", fallbackPerUsd: 0.79 },
  { code: "EUR", symbol: "€", name: "Euro", fallbackPerUsd: 0.92 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", fallbackPerUsd: 1.37 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", fallbackPerUsd: 83.5 },
];

/** Result of a rate lookup: the table plus whether it came from the network. */
export interface RateTable {
  /** Currency code -> units per 1 USD. */
  perUsd: Record<string, number>;
  /** True when these are live network rates rather than the offline seeds. */
  live: boolean;
}

/** Seed table built from `CURRENCIES`, used whenever the network is unreachable. */

/**
 * How long we wait for the rates API before giving up and using the seeds.
 *
 * Short on purpose: this runs when the modal opens, and a member staring at a
 * converter for five seconds while a request times out is a worse experience
 * than an immediately-shown offline quote that refreshes.
 */
const RATE_FETCH_TIMEOUT_MS = 6_000;

/**
 * Fetch live USD exchange rates, falling back to the offline seeds.
 *
 * Uses `open.er-api.com` because it is keyless and CORS-enabled, so it can be
 * called straight from the browser. It must never THROW: a wallet modal that
 * fails to open because a currency API is down would be a self-inflicted
 * outage, so every failure path resolves to the fallback table instead.
 */
export async function fetchUsdRates(): Promise<RateTable> {
  const seed = fallbackRateTable();
  if (typeof fetch !== "function") return seed;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RATE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: controller.signal,
        // Rates change slowly; a cached table is fine and makes reopening the
        // modal instant.
        cache: "force-cache",
      });
      if (!response.ok) return seed;
      const payload = (await response.json()) as {
        result?: string;
        rates?: Record<string, unknown>;
      };
      if (payload.result !== "success" || !payload.rates) return seed;

      // Merge onto the seed rather than replacing it, so a currency the API
      // omits still has a number to show.
      const perUsd: Record<string, number> = { ...seed.perUsd };
      for (const currency of CURRENCIES) {
        const live = payload.rates[currency.code];
        if (typeof live === "number" && Number.isFinite(live) && live > 0) {
          perUsd[currency.code] = live;
        }
      }
      return { perUsd, live: true };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Network blocked, offline, malformed JSON, or the abort above. All of them
    // mean the same thing to the member: use the offline quote.
    return seed;
  }
}

export function fallbackRateTable(): RateTable {
  const perUsd: Record<string, number> = {};
  for (const currency of CURRENCIES) perUsd[currency.code] = currency.fallbackPerUsd;
  return { perUsd, live: false };
}
