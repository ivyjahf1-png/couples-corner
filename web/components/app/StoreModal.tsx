"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Coins, ShoppingBag, Sparkles, X } from "lucide-react";
import { equipInventoryItemAction, purchaseStoreItemAction } from "@/lib/actions/commerce";
import {
  CATEGORY_LABELS,
  STORE_CATEGORIES,
  formatDuration,
  itemsForCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/storeCatalog";

/** The bag row shape, mirroring what the server returns from getUserInventory. */
export interface OwnedStoreItem {
  itemId: string;
  name: string;
  icon: string;
  equipped: boolean;
  expiresAt: string | null;
}

export interface StoreModalProps {
  signedIn: boolean;
  coinBalance: number;
  initialOwned?: OwnedStoreItem[];
  onClose: () => void;
  /** Open the token top-up flow from the insufficient-coins prompt. */
  onTopUp?: () => void;
}

/**
 * The store, as a modal.
 *
 * WHY A MODAL RATHER THAN A PAGE: the store is reached from a profile, a feed
 * card or a room, and a page would navigate away from whatever the member was
 * doing. A modal opens over the current context and returns to it.
 *
 * ── WHAT IS AND IS NOT IN HERE ─────────────────────────────────────────────
 * The catalogue, the purchase transaction, the wallet debit and the expiry all
 * live on the SERVER (`lib/storeCatalog.ts`, `lib/server/commerce.ts`). This
 * component sends an item ID and nothing else. The price shown here is
 * presentation only — a tampered request cannot change what is charged, because
 * the server re-resolves the item from its own catalogue and charges that.
 *
 * That is also why the "Insufficient coins" check here is advisory. It is a
 * courtesy that spares a member a round trip to be told what the server was
 * always going to say. The authoritative check runs again server-side, and the
 * panel opens off the server's `reason`, not off a local guess.
 */
export function StoreModal({
  signedIn,
  coinBalance,
  initialOwned = [],
  onClose,
  onTopUp,
}: StoreModalProps) {
  const [category, setCategory] = useState<StoreCategory>(STORE_CATEGORIES[0]);
  const [balance, setBalance] = useState(coinBalance);
  const [owned, setOwned] = useState<OwnedStoreItem[]>(initialOwned);
  const [confirming, setConfirming] = useState<StoreItem | null>(null);
  const [shortfallFor, setShortfallFor] = useState<StoreItem | null>(null);
  const [shortfall, setShortfall] = useState<number>(0);
  const [justBought, setJustBought] = useState<OwnedStoreItem | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = itemsForCategory(category);
  const ownedIds = new Set(owned.map((item) => item.itemId));

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function buy(item: StoreItem) {
    if (!signedIn) {
      flash("Sign in to buy items.");
      return;
    }
    setConfirming(item);
  }

  function confirm() {
    const item = confirming;
    if (!item) return;

    startTransition(async () => {
      const result = await purchaseStoreItemAction(item.id);

      if (!result.ok) {
        // The insufficient case gets a real panel with numbers and a route to
        // top-up, because it is the one failure the member can actually DO
        // something about. A toast that scrolls away is not a recovery.
        if (result.reason === "insufficient") {
          const have = result.coinBalance ?? balance;
          setShortfallFor(item);
          setShortfall(item.price - have > 0 ? item.price - have : 0);
          setConfirming(null);
          return;
        }
        flash(result.error ?? "Purchase failed");
        setConfirming(null);
        return;
      }

      setBalance(result.coinBalance);
      setOwned((prev) => [
        ...prev,
        {
          itemId: result.item.itemId,
          name: result.item.name,
          icon: result.item.icon,
          equipped: false,
          expiresAt: result.item.expiresAt,
        },
      ]);
      // Offered immediately rather than making the member dig for the bag:
      // they just bought a frame to WEAR it, not to admire it in a list.
      setJustBought({
        itemId: result.item.itemId,
        name: result.item.name,
        icon: result.item.icon,
        equipped: false,
        expiresAt: result.item.expiresAt,
      });
      setConfirming(null);
    });
  }

  function equip(itemId: string) {
    startTransition(async () => {
      const result = await equipInventoryItemAction(itemId);
      if (!result.ok) {
        flash(result.error ?? "Could not equip that");
        return;
      }
      setOwned((prev) => prev.map((item) => ({ ...item, equipped: item.itemId === itemId })));
      setJustBought((current) => (current && current.itemId === itemId ? { ...current, equipped: true } : current));
      flash("Equipped");
    });
  }
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Store"
        onClick={(e) => e.stopPropagation()}
        className="lux-card relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <h2 className="lux-metal text-lg font-black uppercase tracking-wider">Store</h2>
            <p className="text-[11px] text-white/50">Frames, vehicles, effects and themes</p>
          </div>
          {/* Bag sits in the header, not as a seventh tab: it is a view of what
              you OWN, not a category you shop in. Keeping it out of the tablist
              stops the "six categories" from reading as seven. */}
          <button
            type="button"
            onClick={() => setBagOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/15"
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Bag</span>
            <span aria-hidden className="tabular-nums">({owned.length})</span>
            <span className="sr-only">items owned</span>
          </button>
          <span className="lux-coin hidden shrink-0 text-xs sm:flex sm:items-center sm:gap-1">
            <Coins className="h-3.5 w-3.5" aria-hidden />
            {balance.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close store"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Category tabs. Singular labels via CATEGORY_LABELS; the stored
            category keys stay plural. Horizontally scrollable because six tabs
            plus their labels do not fit a 360px phone without truncating. */}
        <div
          role="tablist"
          aria-label="Store categories"
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {STORE_CATEGORIES.map((name) => {
            const on = name === category;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategory(name)}
                className="lux-tab shrink-0"
              >
                {CATEGORY_LABELS[name]}
              </button>
            );
          })}
        </div>

        {/* Item grid */}
        <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {items.map((item) => {
            const isOwned = ownedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => buy(item)}
                disabled={isOwned || isPending}
                className={[
                  "lux-card group flex flex-col overflow-hidden text-left transition",
                  isOwned ? "opacity-70" : "hover:-translate-y-0.5",
                ].join(" ")}
              >
                <span className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${item.gradient}`}>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_35%,rgba(255,255,255,0.4),transparent_70%)]"
                  />
                  {/* The rental term, on the artwork where it is read first. */}
                  <span className="lux-tag absolute right-1.5 top-1.5 z-10 text-[9px]">
                    {formatDuration(item.durationDays)}
                  </span>
                  <span aria-hidden className="relative z-10 text-4xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
                    {item.icon}
                  </span>
                  {isOwned ? (
                    <span className="absolute inset-x-0 bottom-0 z-10 bg-slate-950/75 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                      Owned
                    </span>
                  ) : null}
                </span>
                <span className="relative z-10 block w-full p-3">
                  <span className="block truncate text-xs font-semibold text-white">{item.name}</span>
                  <span className="lux-metal mt-1.5 block text-sm font-extrabold tabular-nums">
                    {item.price.toLocaleString()}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {notice ? (
          <p
            role="status"
            className="shrink-0 border-t border-white/10 bg-slate-950/80 px-5 py-2 text-center text-xs font-semibold text-white"
          >
            {notice}
          </p>
        ) : null}
      </div>

      {/* ── BAG DRAWER ─────────────────────────────────────────────────────
          A slide-in panel rather than a second tab, so checking what you own
          does not throw away the category you were browsing.

          Sorted so the equipped item is on top: the thing currently applied is
          the one a member is looking for when they open this. */}
      {bagOpen ? (
        <div
          className="absolute inset-0 z-10 flex justify-end bg-black/60"
          onClick={() => setBagOpen(false)}
        >
          <aside
            role="dialog"
            aria-label="Your bag"
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-[min(100%,22rem)] flex-col border-l border-white/10 bg-slate-950 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Your Bag</h3>
              <button
                type="button"
                onClick={() => setBagOpen(false)}
                aria-label="Close bag"
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {owned.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">
                Your bag is empty. Buy an item and it appears here.
              </p>
            ) : (
              <ul className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
                {[...owned]
                  .sort((a, b) => Number(b.equipped) - Number(a.equipped))
                  .map((item) => {
                    // An expired rental must read as expired. The server filters
                    // these out of the snapshot, but an item can lapse while the
                    // modal is open, and showing a lapsed frame as equipdable is
                    // worse than showing it as dead.
                    const expired = item.expiresAt
                      ? new Date(item.expiresAt).getTime() <= Date.now()
                      : false;
                    return (
                      <li
                        key={item.itemId}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <span aria-hidden className="text-2xl">
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">
                            {item.name}
                          </span>
                          {item.expiresAt ? (
                            <span
                              className={`block text-[11px] ${expired ? "text-rose-300" : "text-white/40"}`}
                            >
                              {expired
                                ? "Expired"
                                : `Expires ${new Date(item.expiresAt).toLocaleDateString()}`}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => equip(item.itemId)}
                          disabled={item.equipped || expired || isPending}
                          className="shrink-0 rounded-lg border border-amber-300/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 transition disabled:opacity-60"
                        >
                          {item.equipped ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" aria-hidden /> Equipped
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" aria-hidden /> Equip
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}

            <p className="mt-4 text-xs text-white/40">
              Equipped items become your active profile frame and room effect.
            </p>
          </aside>
        </div>
      ) : null}
      {/* ── CONFIRM ────────────────────────────────────────────────────────
          Tapping a card does NOT buy. It opens this, because a single tap that
          spends currency is the fastest way to lose a member's trust — and a
          mis-tap on a 2-column grid is easy. The price and the rental term are
          both restated here, since those are the two facts the decision rests
          on and the grid is scrolled, not focused. */}
      {confirming ? (
        <DialogShell title="Confirm purchase" onClose={() => setConfirming(null)}>
          <div className="flex flex-col items-center gap-4 px-6 py-5 text-center">
            <span
              aria-hidden
              className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${confirming.gradient} text-5xl shadow-lg`}
            >
              {confirming.icon}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">{confirming.name}</h3>
              <p className="mt-1 text-xs text-white/55">
                {formatDuration(confirming.durationDays)} rental ·{" "}
                {CATEGORY_LABELS[confirming.category]}
              </p>
            </div>

            <dl className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs">
              <div>
                <dt className="text-white/50">You have</dt>
                <dd className="mt-1 text-base font-bold text-white">{balance.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-white/50">Costs</dt>
                <dd className="lux-metal mt-1 text-base font-bold">
                  {confirming.price.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">After</dt>
                <dd className="mt-1 text-base font-bold text-emerald-300">
                  {(balance - confirming.price).toLocaleString()}
                </dd>
              </div>
            </dl>

            {balance < confirming.price ? (
              <p className="text-[11px] font-semibold text-amber-300">
                You are {(confirming.price - balance).toLocaleString()} short — confirming will
                open the top-up.
              </p>
            ) : null}

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className="lux-cta flex-1 py-3 text-xs"
              >
                {isPending ? "Working…" : `Buy for ${confirming.price.toLocaleString()}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="lux-tab flex-1 py-3 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogShell>
      ) : null}

      {/* ── INSUFFICIENT COINS ─────────────────────────────────────────────
          Opened off the SERVER's `reason`, not a local guess, so the numbers
          shown are the balance the server actually checked.

          Two exits, because "not enough coins" has two legitimate answers: buy
          more, or go earn some. Offering only the first quietly pushes members
          toward a purchase they may not want. */}
      {shortfallFor ? (
        <DialogShell title="Insufficient coins" onClose={() => setShortfallFor(null)}>
          <div className="flex flex-col items-center gap-5 px-6 py-5 text-center">
            <span
              aria-hidden
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-3xl"
            >
              {shortfallFor.icon}
            </span>
            <p className="text-sm leading-6 text-white/80">
              <strong className="text-white">{shortfallFor.name}</strong> costs{" "}
              <strong className="text-white">{shortfallFor.price.toLocaleString()}</strong> for{" "}
              {formatDuration(shortfallFor.durationDays)}.
            </p>

            <dl className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs">
              <div>
                <dt className="text-white/50">You have</dt>
                <dd className="mt-1 text-base font-bold text-white">{balance.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-white/50">You need</dt>
                <dd className="mt-1 text-base font-bold text-amber-300">
                  {shortfall.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">Costs</dt>
                <dd className="mt-1 text-base font-bold text-white">
                  {shortfallFor.price.toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              {onTopUp ? (
                <button
                  type="button"
                  onClick={() => {
                    setShortfallFor(null);
                    setConfirming(null);
                    onTopUp();
                  }}
                  className="lux-cta flex-1 py-3 text-xs"
                >
                  Get coins
                </button>
              ) : (
                <Link
                  href="/subscription"
                  onClick={() => setShortfallFor(null)}
                  className="lux-cta flex-1 py-3 text-center text-xs"
                >
                  Get coins
                </Link>
              )}
              <Link
                href="/task"
                onClick={() => setShortfallFor(null)}
                className="lux-tab flex-1 py-3 text-center text-xs"
              >
                Earn free coins
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShortfallFor(null)}
              className="text-xs font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              Keep browsing
            </button>
          </div>
        </DialogShell>
      ) : null}
      {/* ── SUCCESS ────────────────────────────────────────────────────────
          Offers Equip immediately. A member who buys a frame bought it to WEAR
          it; making them reopen the bag to apply it is an extra step between
          the purchase and the thing they actually wanted. */}
      {justBought ? (
        <DialogShell title="Added to your bag" onClose={() => setJustBought(null)}>
          <div className="flex flex-col items-center gap-5 px-6 py-5 text-center">
            <span
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-5xl"
            >
              {justBought.icon}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">{justBought.name} is yours</h3>
              {justBought.expiresAt ? (
                <p className="mt-1 text-xs text-white/55">
                  Expires {new Date(justBought.expiresAt).toLocaleDateString()}
                </p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  equip(justBought.itemId);
                  setJustBought(null);
                }}
                disabled={justBought.equipped || isPending}
                className="lux-cta flex-1 py-3 text-xs"
              >
                {justBought.equipped ? "Already equipped" : "Use now"}
              </button>
              <button
                type="button"
                onClick={() => setJustBought(null)}
                className="lux-tab flex-1 py-3 text-xs"
              >
                Keep shopping
              </button>
            </div>
          </div>
        </DialogShell>
      ) : null}
    </div>
  );
}

/** A centred panel over the store, sharing the store's own stacking context. */
function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="lux-card w-full max-w-sm overflow-hidden rounded-3xl"
      >
        <h3 className="border-b border-white/10 bg-slate-950/70 px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-white/90">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}