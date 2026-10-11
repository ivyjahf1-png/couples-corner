"use client";

/**
 * Coin wallet modal — balance, rate sheet, live converter, withdraw, bind.
 *
 * ── WHY THIS REPLACED THE OLD INLINE DIALOG ─────────────────────────────────
 * `WalletTile` used to carry its own `<dialog>` with a balance card and a bare
 * withdraw input. That was fine while the wallet was one number, but the panel
 * now has to answer four different questions (what am I worth, what is the
 * rate, what would this convert to, how do I get paid) and stacking all four
 * into a single column made it unusable on a phone. The four are therefore
 * TABS, with the balance card pinned above them — so the one number that
 * matters never scrolls out of reach, and each question gets a full screen.
 *
 * ── DATA LOADING IS LAZY AND FAIL-SOFT ─────────────────────────────────────
 * Nothing is fetched until the member actually opens the modal (see `open()`),
 * and every fetch degrades: rates fall back to an offline seed table, and the
 * payout lookup falls back to "nothing bound". A wallet that cannot reach its
 * backend still opens, still shows the balance it was given, and still
 * publishes its rates — it just cannot submit.
 *
 * ── REF HANDLING ────────────────────────────────────────────────────────────
 * Exposed as an imperative handle rather than a raw `<dialog>` ref, so the
 * caller cannot `showModal()` without also triggering the lazy loads. The
 * parent asks to OPEN the wallet; how that happens is this component's business.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Banknote,
  Building2,
  Check,
  Coins,
  Landmark,
  Loader2,
  Minus,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";

import {
  clearPayoutAccountAction,
  getPayoutAccountAction,
  requestWithdrawalAction,
  savePayoutAccountAction,
  type PayoutAccount,
} from "@/lib/actions/wallet";
import { notifyFailure, notifySuccess } from "@/components/ui/FailureToasts";
import {
  CURRENCIES,
  COIN_RATE_SHEET,
  COINS_PER_USD,
  coinsToUsd,
  fallbackRateTable,
  fetchUsdRates,
  usdToCoins,
  type RateTable,
} from "@/lib/wallet/rates";

/** The four panels. A union so an unknown tab is impossible to render. */
type WalletTab = "rates" | "exchange" | "withdraw" | "payout";

interface TabDefinition {
  id: WalletTab;
  label: string;
  icon: typeof Wallet;
}

const TABS: TabDefinition[] = [
  { id: "rates", label: "Rates", icon: Banknote },
  { id: "exchange", label: "Convert", icon: Coins },
  { id: "withdraw", label: "Withdraw", icon: Minus },
  { id: "payout", label: "Payout", icon: Landmark },
];

/** Format a coin count with thousands separators and no trailing decimals. */
function formatCoins(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.floor(value).toLocaleString("en-US");
}

/**
 * Format a USD figure, trimming to a sensible precision.
 *
 * Large balances read better rounded to the dollar; small ones need cents or
 * they collapse to "$0" and look broken.
 */
function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  const digits = value >= 1 ? 2 : 4;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
export const CoinWalletModal = forwardRef<CoinWalletModalHandle, { balance: number }>(
  function CoinWalletModal({ balance }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    // Loaded on first open, then cached for the session.
    const [rates, setRates] = useState<RateTable>(() => fallbackRateTable());
    const [ratesLoading, setRatesLoading] = useState(false);
    const [payout, setPayout] = useState<PayoutAccount | null>(null);
    const [payoutLoaded, setPayoutLoaded] = useState(false);

    const [tab, setTab] = useState<WalletTab>("rates");

    // Withdraw tab.
    const [amount, setAmount] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);

    // Payout (bind account) tab.
    const [binding, setBinding] = useState(false);
    const [bindingOpen, setBindingOpen] = useState(false);
    const [payoutDraft, setPayoutDraft] = useState<PayoutAccount>({
      method: "bank",
      provider: "",
      destination: "",
      holderName: "",
    });

    // Converter tab.
    const [converterAmount, setConverterAmount] = useState("");
    const [converterUnit, setConverterUnit] = useState<"coins" | "usd">("coins");
    const [converterCurrency, setConverterCurrency] = useState("NGN");

    const loadPayout = useCallback(async () => {
      const result = await getPayoutAccountAction();
      setPayout(result.ok ? (result.account ?? null) : null);
      // Marked loaded even on failure: an outage must not leave the form stuck
      // behind a spinner, and a stale "no account bound" is recoverable.
      setPayoutLoaded(true);
    }, []);

    const loadRates = useCallback(async () => {
      setRatesLoading(true);
      setRates(await fetchUsdRates());
      setRatesLoading(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          const dialog = dialogRef.current;
          if (!dialog || dialog.open) return;
          dialog.showModal();
          void loadRates();
          void loadPayout();
        },
        close: () => dialogRef.current?.close(),
      }),
      [loadPayout, loadRates],
    );

    // Reset transient notices when the dialog closes, so a stale "submitted"
    // message is not waiting for the member next time they open the wallet.
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const onClose = () => {
        setWithdrawNotice(null);
        setBindingOpen(false);
      };
      dialog.addEventListener("close", onClose);
      return () => dialog.removeEventListener("close", onClose);
    }, []);

    async function withdraw() {
      const value = Number.parseInt(amount, 10);
      if (!Number.isInteger(value) || value <= 0) {
        setWithdrawNotice("Enter an amount greater than zero.");
        return;
      }
      if (value > balance) {
        setWithdrawNotice("That is more than your balance.");
        return;
      }
      setWithdrawing(true);
      setWithdrawNotice(null);
      try {
        const result = await requestWithdrawalAction({ amount: value });
        if (result.ok) {
          setAmount("");
          setWithdrawNotice(`Withdrawal request for ${formatCoins(value)} coins submitted.`);
          notifySuccess("Withdrawal request submitted");
        } else {
          setWithdrawNotice(result.error ?? "Withdrawal failed.");
        }
      } catch {
        setWithdrawNotice("Withdrawals are unavailable right now. Try again later.");
      } finally {
        setWithdrawing(false);
      }
    }

    async function savePayout() {
      setBinding(true);
      try {
        const result = await savePayoutAccountAction({ account: payoutDraft });
        if (result.ok) {
          setPayout(payoutDraft);
          setBindingOpen(false);
          notifySuccess("Payout account saved");
        } else {
          notifyFailure(result.error ?? "Couldn't save that account.");
        }
      } catch {
        notifyFailure("Couldn't save that account. Try again later.");
      } finally {
        setBinding(false);
      }
    }

    async function unbindPayout() {
      setBinding(true);
      try {
        const result = await clearPayoutAccountAction();
        if (result.ok) {
          setPayout(null);
          notifySuccess("Payout account removed");
        } else {
          notifyFailure(result.error ?? "Couldn't remove that account.");
        }
      } catch {
        notifyFailure("Couldn't remove that account. Try again later.");
      } finally {
        setBinding(false);
      }
    }

    /* ── CONVERTER ARITHMETIC ───────────────────────────────────────────────
       The member types into whichever unit they think in (coins or dollars) and
       reads the answer in their local currency. Everything routes through USD,
       which is the only unit `lib/wallet/rates` stores a rate for — converting
       directly NGN→GHS would need a second rate table that could disagree with
       the first, so USD stays the single pivot. */
    const parsedConverter = Number.parseFloat(converterAmount);
    const converterValid = Number.isFinite(parsedConverter) && parsedConverter > 0;
    const converterCoins =
      converterUnit === "coins" ? parsedConverter : usdToCoins(parsedConverter);
    const converterUsd =
      converterUnit === "usd" ? parsedConverter : coinsToUsd(parsedConverter);
    const usdRate = rates.perUsd[converterCurrency] ?? 1;
    const activeCurrency =
      CURRENCIES.find((currency) => currency.code === converterCurrency) ?? CURRENCIES[0];

    /* Balance-card quote. Derived here (not passed in) so the card and every
       panel below it read from the same `coinsToUsd` conversion. */
    const usdValue = coinsToUsd(balance);

    /* Clicking the backdrop closes the dialog. Only a direct backdrop click
       counts: `event.target === event.currentTarget` is false once the click has
       landed on a child, so taps inside the panel never dismiss it. */
    function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
      if (event.target === event.currentTarget) dialogRef.current?.close();
    }

    return (
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-label="Coin wallet"
        className="w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-white/10 bg-[#1B1636] p-0 text-white shadow-2xl backdrop:bg-black/70"
      >
        <div className="max-h-[85vh] overflow-y-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 pt-5 pb-1">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
              <Wallet className="h-3.5 w-3.5" />
              Wallet
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close wallet"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 💳 BALANCE CARD — always visible, never scrolls away. */}
          <div className="px-6 pt-3">
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-4"
              style={{ backgroundImage: "linear-gradient(135deg, #FF7A00 0%, #E25C00 100%)" }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/25">
                <Coins className="h-6 w-6 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-3xl font-bold tabular-nums leading-none">
                  {formatCoins(balance)}
                </span>
                <span className="mt-1 block truncate text-xs font-semibold uppercase tracking-wide text-white/80">
                  Coins · ≈ {formatUsd(usdValue)}
                </span>
              </span>
            </div>
          </div>

          {/* TAB BAR — one control drives all four panels. */}
          <div className="mt-4 grid grid-cols-4 gap-1 px-6">
            {TABS.map((entry) => {
              const Icon = entry.icon;
              const active = entry.id === tab;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                    active ? "bg-[#FF7A00]/15 text-[#FF7A00]" : "text-[#A09AB0] hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div className="px-6 pb-6 pt-4">
            {tab === "rates" ? (
              <RatesPanel
                balance={balance}
                live={rates.live}
                loading={ratesLoading}
                onRefresh={() => void loadRates()}
              />
            ) : null}
            {tab === "exchange" ? (
              <ExchangePanel
                balance={balance}
                amount={converterAmount}
                onAmount={setConverterAmount}
                unit={converterUnit}
                onUnit={setConverterUnit}
                currency={converterCurrency}
                onCurrency={setConverterCurrency}
                valid={converterValid}
                coins={converterCoins}
                usd={converterUsd}
                rate={usdRate}
                currencySymbol={activeCurrency.symbol}
                live={rates.live}
              />
            ) : null}
            {tab === "withdraw" ? (
              <WithdrawPanel
                balance={balance}
                amount={amount}
                onAmount={setAmount}
                busy={withdrawing}
                notice={withdrawNotice}
                onWithdraw={() => void withdraw()}
                hasPayout={Boolean(payout)}
                onGoToPayout={() => setTab("payout")}
              />
            ) : null}
            {tab === "payout" ? (
              <PayoutPanel
                loaded={payoutLoaded}
                payout={payout}
                binding={binding}
                bindingOpen={bindingOpen}
                onBindingOpen={setBindingOpen}
                draft={payoutDraft}
                onDraft={setPayoutDraft}
                onSave={() => void savePayout()}
                onUnbind={() => void unbindPayout()}
              />
            ) : null}
          </div>
        </div>
      </dialog>
    );
  },
);

/* ────────────────────────────────────────────────────────────────────────────
   📊 RATES PANEL
   The published cash-out sheet. Deliberately a plain table rather than a set
   of cards: a member comparing tiers is doing arithmetic in their head, and a
   grid of equal-weight cards makes that harder, not easier. Highlighting the
   smallest tier their balance clears turns the table into an answer ("you can
   cash out now") instead of a price list.
   ──────────────────────────────────────────────────────────────────────────── */
function RatesPanel({
  balance,
  live,
  loading,
  onRefresh,
}: {
  balance: number;
  live: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  /* The smallest tier the member's balance actually clears. `find` rather than
     `filter` because only the first one matters: "you can cash out $10" is the
     actionable line, and marking every tier above it too would just restate
     that the balance is a number. */
  const reachableIndex = COIN_RATE_SHEET.findIndex((tier) => balance >= tier.coins);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
          Coin rate sheet
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh exchange rates"
          className="flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-[#A09AB0] transition hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Updating" : live ? "Live" : "Offline rates"}
        </button>
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[#A09AB0]/70">
            <th className="pb-2 font-semibold">Coins</th>
            <th className="pb-2 text-right font-semibold">Cash-out value</th>
          </tr>
        </thead>
        <tbody>
          {COIN_RATE_SHEET.map((tier, index) => {
            const reachable = reachableIndex >= 0 && index >= reachableIndex;
            return (
              <tr
                key={tier.coins}
                className={`border-t border-white/[0.08] ${
                  reachable ? "text-white" : "text-[#A09AB0]"
                }`}
              >
                <td className="py-2.5 font-semibold tabular-nums">
                  {formatCoins(tier.coins)}
                  {index === reachableIndex ? (
                    <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Reachable
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatCoins(tier.usd)}{" "}
                  <span className="text-[11px] text-[#A09AB0]">USD</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-xs leading-5 text-[#A09AB0]">
        {formatCoins(COINS_PER_USD)} coins = $1. Rates apply when you cash out; buying coins uses
        the separate store pricing.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   💱 EXCHANGE PANEL
   A three-way converter: the member picks what they are counting (coins or
   USD), types a number, and sees the equivalent in USD, in coins, and in their
   local currency at once. Showing all three rather than just the requested pair
   is deliberate — the follow-up question is always "so what is that in…", and
   making them change the units to find out is what makes converters feel slow.

   The input is controlled but NOT clamped as they type: filtering to digits
   only would silently swallow a decimal point mid-number, and a converter that
   eats your keystrokes is worse than one that briefly shows an empty result.
   ──────────────────────────────────────────────────────────────────────────── */
function ExchangePanel({
  balance,
  amount,
  onAmount,
  unit,
  onUnit,
  currency,
  onCurrency,
  valid,
  coins,
  usd,
  rate,
  currencySymbol,
  live,
}: {
  balance: number;
  amount: string;
  onAmount: (value: string) => void;
  unit: "coins" | "usd";
  onUnit: (value: "coins" | "usd") => void;
  currency: string;
  onCurrency: (value: string) => void;
  valid: boolean;
  coins: number;
  usd: number;
  rate: number;
  currencySymbol: string;
  live: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
          Currency converter
        </p>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-[#A09AB0]">
          {live ? "Live rate" : "Offline rate"}
        </span>
      </div>

      {/* Unit toggle — what the number below is counted in. */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.05] p-1">
        {(["coins", "usd"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onUnit(option)}
            aria-pressed={unit === option}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              unit === option ? "bg-[#FF7A00] text-[#0F0C1B]" : "text-[#A09AB0]"
            }`}
          >
            {option === "coins" ? "Coins" : "USD"}
          </button>
        ))}
      </div>

      <label htmlFor="wallet-convert-amount" className="mt-3 block text-xs font-semibold text-[#A09AB0]">
        Amount
      </label>
      <input
        id="wallet-convert-amount"
        inputMode="decimal"
        value={amount}
        onChange={(event) => {
          // Digits and at most one decimal point. Anything else is dropped so a
          // paste cannot inject a NaN-producing string into the arithmetic.
          const cleaned = event.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
          onAmount(cleaned);
        }}
        placeholder={unit === "coins" ? "100000" : "10"}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base tabular-nums text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
      />

      <label htmlFor="wallet-convert-currency" className="mt-3 block text-xs font-semibold text-[#A09AB0]">
        Convert to
      </label>
      <select
        id="wallet-convert-currency"
        value={currency}
        onChange={(event) => onCurrency(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none"
      >
        {CURRENCIES.map((option) => (
          <option key={option.code} value={option.code} className="bg-[#1B1636]">
            {option.code} — {option.name}
          </option>
        ))}
      </select>

      {/* RESULT — all three legs of the conversion, always. */}
      <div className="mt-4 space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <ResultRow
          label={unit === "coins" ? "USD" : "Coins"}
          value={valid ? (unit === "coins" ? formatUsd(usd) : `${formatCoins(coins)} coins`) : "—"}
        />
        <ResultRow
          label={currency}
          value={valid ? formatLocal(usd * rate, currencySymbol) : "—"}
        />
        <ResultRow label="Rate" value={`1 USD = ${rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`} muted />
      </div>

      {/* Convenience: convert the whole balance without typing it out. */}
      {balance > 0 ? (
        <button
          type="button"
          onClick={() => onAmount(String(balance))}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] py-2 text-xs font-semibold text-[#A09AB0] transition hover:text-white"
        >
          Use my full balance ({formatCoins(balance)} coins)
        </button>
      ) : null}
    </div>
  );
}

/** One label/value line inside a panel result block. */
function ResultRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs text-[#A09AB0]">{label}</span>
      <span
        className={`truncate text-right tabular-nums ${muted ? "text-[11px] text-[#A09AB0]/70" : "text-sm font-bold text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   💸 WITHDRAW PANEL
   The cash-out form. Shows the USD value of what is being typed as they type
   it, because "50000" is an abstraction and "$5" is the thing being withdrawn —
   a member who can see the value is far less likely to submit an amount they
   did not mean.
   ──────────────────────────────────────────────────────────────────────────── */
function WithdrawPanel({
  balance,
  amount,
  onAmount,
  busy,
  notice,
  onWithdraw,
  hasPayout,
  onGoToPayout,
}: {
  balance: number;
  amount: string;
  onAmount: (value: string) => void;
  busy: boolean;
  notice: string | null;
  onWithdraw: () => void;
  hasPayout: boolean;
  onGoToPayout: () => void;
}) {
  const parsed = Number.parseInt(amount, 10);
  const previewUsd = Number.isInteger(parsed) && parsed > 0 ? coinsToUsd(parsed) : 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
        Withdraw coins
      </p>

      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs text-[#A09AB0]">
        Available: <span className="font-bold text-white tabular-nums">{formatCoins(balance)}</span>{" "}
        coins · <span className="tabular-nums">{formatUsd(coinsToUsd(balance))}</span>
      </div>

      <label htmlFor="wallet-withdraw-amount" className="mt-4 block text-sm font-semibold">
        Amount
      </label>
      <input
        id="wallet-withdraw-amount"
        inputMode="numeric"
        pattern="[0-9]*"
        value={amount}
        onChange={(event) => onAmount(event.target.value.replace(/[^0-9]/g, ""))}
        placeholder="0"
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base tabular-nums text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
      />

      <p className="mt-2 text-xs text-[#A09AB0]">
        You&apos;ll receive about{" "}
        <span className="font-semibold text-white tabular-nums">{formatUsd(previewUsd)}</span>
      </p>

      {notice ? <p className="mt-3 text-xs text-white/70">{notice}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={onWithdraw}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF7A00] text-sm font-bold text-[#0F0C1B] transition hover:bg-[#FF9500] active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
        {busy ? "Submitting…" : "Withdraw"}
      </button>

      {/* Nudge towards binding a destination — the request is accepted either
          way, but staff cannot settle it without one, so saying so up front
          saves a support round trip. */}
      {!hasPayout ? (
        <button
          type="button"
          onClick={onGoToPayout}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-[#A09AB0] transition hover:text-white"
        >
          <Landmark className="h-3.5 w-3.5" />
          Bind a bank or crypto account for faster payout
        </button>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   🏦 PAYOUT (BIND ACCOUNT) PANEL
   Attaches ONE withdrawal destination per member, so the panel is either a
   summary of what is bound (with an edit/unbind control) or a form — never
   both at once. Keeping the form collapsed until it is asked for is what stops
   a saved account number sitting on screen, readable over the member's
   shoulder, every time they check their wallet.
   ──────────────────────────────────────────────────────────────────────────── */
function PayoutPanel({
  loaded,
  payout,
  binding,
  bindingOpen,
  onBindingOpen,
  draft,
  onDraft,
  onSave,
  onUnbind,
}: {
  loaded: boolean;
  payout: PayoutAccount | null;
  binding: boolean;
  bindingOpen: boolean;
  onBindingOpen: (open: boolean) => void;
  draft: PayoutAccount;
  onDraft: (account: PayoutAccount) => void;
  onSave: () => void;
  onUnbind: () => void;
}) {
  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#A09AB0]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your payout details…
      </div>
    );
  }

  // BOUND — a masked summary; the full number is never kept on screen.
  if (payout && !bindingOpen) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
          Payout account
        </p>
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 text-[#FF7A00]">
              {payout.method === "bank" ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <Coins className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{payout.provider}</p>
              <p className="truncate text-xs text-[#A09AB0]">
                {payout.method === "bank" ? "Bank" : "Crypto"} · {maskDestination(payout.destination)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={binding}
            onClick={() => {
              // Seed the form from what is already bound, so changing bank does
              // not mean retyping the holder name.
              onDraft({ ...payout });
              onBindingOpen(true);
            }}
            className="min-h-11 flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Change
          </button>
          <button
            type="button"
            disabled={binding}
            onClick={onUnbind}
            className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-[#F87171] transition hover:bg-white/10 disabled:opacity-50"
          >
            {binding ? "Removing…" : "Unbind"}
          </button>
        </div>
      </div>
    );
  }

  // UNBOUND, OR EDITING — the form.
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A09AB0]">
          {payout ? "Change payout account" : "Bind account"}
        </p>
        {payout ? (
          <button
            type="button"
            onClick={() => onBindingOpen(false)}
            className="text-[11px] font-semibold text-[#A09AB0] transition hover:text-white"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {/* Method toggle. Labels differ per method so the fields below read as a
          bank form or a wallet form rather than one generic shape. */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.05] p-1">
        {(["bank", "crypto"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onDraft({ ...draft, method })}
            aria-pressed={draft.method === method}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
              draft.method === method ? "bg-[#FF7A00] text-[#0F0C1B]" : "text-[#A09AB0]"
            }`}
          >
            {method === "bank" ? (
              <Building2 className="h-3.5 w-3.5" />
            ) : (
              <Coins className="h-3.5 w-3.5" />
            )}
            {method === "bank" ? "Bank account" : "Crypto wallet"}
          </button>
        ))}
      </div>

      <label htmlFor="payout-provider" className="mt-4 block text-xs font-semibold text-[#A09AB0]">
        {draft.method === "bank" ? "Bank name" : "Network"}
      </label>
      <input
        id="payout-provider"
        value={draft.provider}
        maxLength={120}
        onChange={(event) => onDraft({ ...draft, provider: event.target.value })}
        placeholder={draft.method === "bank" ? "e.g. GTBank" : "e.g. TRC-20"}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
      />

      <label
        htmlFor="payout-destination"
        className="mt-3 block text-xs font-semibold text-[#A09AB0]"
      >
        {draft.method === "bank" ? "Account number" : "Wallet address"}
      </label>
      <input
        id="payout-destination"
        value={draft.destination}
        maxLength={120}
        onChange={(event) => onDraft({ ...draft, destination: event.target.value })}
        placeholder={draft.method === "bank" ? "0123456789" : "Your wallet address"}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
      />

      <label htmlFor="payout-holder" className="mt-3 block text-xs font-semibold text-[#A09AB0]">
        Account holder name
      </label>
      <input
        id="payout-holder"
        value={draft.holderName}
        maxLength={120}
        onChange={(event) => onDraft({ ...draft, holderName: event.target.value })}
        placeholder="As it appears on the account"
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
      />

      <button
        type="button"
        disabled={binding}
        onClick={onSave}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF7A00] text-sm font-bold text-[#0F0C1B] transition hover:bg-[#FF9500] active:scale-[0.98] disabled:opacity-50"
      >
        {binding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {binding ? "Saving…" : "Save account"}
      </button>
    </div>
  );
}

/**
 * Mask an account number or wallet address for display.
 *
 * Only the last four characters are shown, which is enough for a member to
 * recognise their own account and useless to anyone reading it off the screen.
 * Short values are masked entirely rather than shown whole — a 4-digit
 * PIN-style value would otherwise survive the masking untouched.
 */
function maskDestination(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `•••• ${trimmed.slice(-4)}`;
}

/** Format a local-currency amount, rounded to whole units above 100. */
function formatLocal(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return `${symbol}0`;
  const digits = Math.abs(value) >= 100 ? 0 : 2;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Imperative surface the tile uses to drive the dialog. */
export interface CoinWalletModalHandle {
  open: () => void;
  close: () => void;
}
