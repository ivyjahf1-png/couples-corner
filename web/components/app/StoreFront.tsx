"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Coins, Home, ShoppingBag, X } from "lucide-react";
import { PageLock } from "@/components/app/PageHeader";
import { purchaseStoreItemAction } from "@/lib/actions/commerce";
import {
  CATEGORY_LABELS,
  formatDuration,
  STORE_CATEGORIES,
  STORE_ITEMS,
  type StoreCategory,
  type StoreItem,
} from "@/lib/storeCatalog";

/**
 * THE STORE - a full page, rebuilt.
 *
 * WHY THIS IS A PAGE AND NOT THE MODAL. The previous `/store` was a launcher
 * whose only job was to open a modal. The bugs this replaces - overlapping text,
 * ghost "watermark" gradients bleeding through item art, and rows squashed into
 * illegibility - all came from that design: every item card was a `.lux-card`,
 * whose `::after` paints a 1px gradient edge OVER its own children at
 * `z-index: 1`, so each preview gradient had to be lifted with a manual `z-[2]`
 * to escape its own frame. That fragile contract is why this page does not use
 * the class at all.
 *
 * `.lux-card` is SHARED with other surfaces, so it was NOT modified - rewriting
 * it would retint screens nobody asked about. The `lux-*` rules are therefore still
 * in `globals.css` and still used by Aristocracy.
 *
 * ONE SCROLL REGION. `PageLock` renders `head` outside the single
 * `overflow-y-auto` body, so the top bar stays put while the catalogue scrolls.
 * `pb-24` reserves the shell fixed tab bar, which this component does NOT
 * render - the shell owns it, and a second bar here would draw a duplicate.
 */

/**
 * One catalogue card.
 *
 * `min-w-0` on the text column is load-bearing: without it a long item name
 * refuses to shrink, and because the grid track is a fraction the name pushes the
 * price row out of the card instead of wrapping. `line-clamp-2` caps it at two
 * lines so one verbose item cannot make its whole row taller than its neighbour -
 * that uneven height is what read as "squished rows".
 */
function StoreItemCard({
  item,
  owned,
  busy,
  affordable,
  onRent,
}: {
  item: StoreItem;
  /** Already in the member inventory, so the action becomes "Owned". */
  owned: boolean;
  busy: boolean;
  /** Balance covers the price. Drives the label, not the colour. */
  affordable: boolean;
  onRent: (item: StoreItem) => void;
}) {
  return (
    <li className="min-w-0">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        {/* PREVIEW. `aspect-[4/3]` holds every tile to one ratio, so cards in a row
            are the same height. The emoji is the asset own `icon` from the
            catalogue - there is no artwork table, and a grey placeholder would read
            as a loading failure. `aria-hidden`: the heading is the accessible name. */}
        <div
          className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${item.gradient}`}
        >
          <span aria-hidden className="text-5xl leading-none drop-shadow-lg">
            {item.icon}
          </span>

          {item.badge ? (
            <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {item.badge}
            </span>
          ) : null}

          {/* OWNED sits ON the artwork, not beside it: the top corner is where the
              Hot/New badge lives, and two chips in one corner is exactly the
              collision this rebuild exists to remove. */}
          {owned ? (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-emerald-500/90 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              <Check className="h-3 w-3" aria-hidden />
              Owned
            </span>
          ) : null}
        </div>

        {/* BODY. `flex-1` lets the meta block absorb spare height, so the Rent button
            sits on one baseline across every card instead of floating at whatever
            height the name happened to wrap to. */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 title={item.name} className="line-clamp-2 text-sm font-bold leading-tight text-white">
            {item.name}
          </h3>

          <p className="text-[11px] text-[#A09AB0]">{formatDuration(item.durationDays)}</p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-white">
              <Coins className="h-4 w-4 shrink-0 text-[#FF7A00]" aria-hidden />
              <span className="truncate tabular-nums">{item.price.toLocaleString()}</span>
              <span className="sr-only"> tokens</span>
            </span>

            <button
              type="button"
              onClick={() => onRent(item)}
              disabled={owned || busy}
              /* The price is rendered, so WHY the button is unavailable must be in
                 the accessible name, not carried by colour alone. */
              aria-label={
                owned
                  ? `${item.name} is already yours`
                  : `Rent ${item.name} for ${item.price.toLocaleString()} tokens`
              }
              className={[
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0C1B]",
                owned
                  ? "cursor-default bg-white/10 text-[#A09AB0]"
                  : // Unaffordable stays `disabled` but KEEPS the orange: greying it
                    // out hides which item the member is working toward.
                    "bg-[#FF7A00] text-[#0F0C1B] hover:bg-[#FF9500] disabled:opacity-55",
              ].join(" ")}
            >
              {busy ? "..." : owned ? "Owned" : affordable ? "Rent" : "Need tokens"}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
/**
 * THE STORE PAGE.
 *
 * `signedIn` drives whether the Rent button can act at all: the server action
 * re-resolves the session regardless, but disabling the control here saves a
 * pointless round trip and tells the member why before they tap.
 */
export function StoreFront({
  signedIn,
  coinBalance,
  ownedItemIds,
}: {
  signedIn: boolean;
  coinBalance: number;
  /** Ids already in the member inventory, rendered as "Owned". */
  ownedItemIds: string[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<StoreCategory>("Frames");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* A Set, because `includes` on a 15-item array inside a render loop over the
     whole catalogue is O(n*m) and this runs for every visible card. */
  const owned = useMemo(() => new Set(ownedItemIds), [ownedItemIds]);

  const items = useMemo(
    () => STORE_ITEMS.filter((item) => item.category === category),
    [category]
  );

  /* Balance is local state, not a prop read: a purchase changes it server-side, so
     holding it here is what lets the "Need tokens" label update on the very next
     render instead of only after a full navigation. */
  const [balance, setBalance] = useState(coinBalance);

  /**
   * BUY. The price is NEVER sent from here - `purchaseStoreItemAction` resolves it
   * from the server catalogue, so a tampered client cannot rent a 1,370-token item
   * for 1 token. This call passes only the item id.
   */
  function rent(item: StoreItem) {
    if (!signedIn || busyId) return;
    setBusyId(item.id);
    setNotice(null);
    startTransition(async () => {
      const result = await purchaseStoreItemAction(item.id);
      setBusyId(null);
      if (!result.ok) {
        setNotice(result.error ?? "That purchase did not go through.");
        return;
      }
      /* Debit locally so the grid reflects the new balance immediately, then let
         the action own `revalidatePath` refresh the server truth. */
      setBalance((current) => Math.max(0, current - item.price));
      owned.add(item.id);
      setNotice(`Rented ${item.name}.`);
      router.refresh();
    });
  }

  return (
    <PageLock
      className="bg-[#0F0C1B]"
      /* `head` is OUTSIDE the scroll region, which is what pins this bar. */
      head={
        <header className="flex h-14 items-center gap-3 border-b border-white/10 bg-[#0F0C1B] px-3">
          <Link
            href="/discover"
            aria-label="Back to Explore"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#A09AB0] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>

          <span className="min-w-0 flex-1 truncate text-base font-bold text-white">
            Couple&apos;s Corner
          </span>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <Home className="h-3.5 w-3.5" aria-hidden />
            Home
          </Link>
        </header>
      }
      bodyClassName="px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 md:pb-8"
    >
      {/* TITLE BLOCK. `flex-wrap` lets the heading and the cart pill share a row on
          a wide phone and stack on a narrow one, instead of the pill being pushed
          off the edge by a long heading. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black uppercase tracking-wide text-[#FF7A00]">
            Store
          </h1>
          <p className="mt-1 text-sm text-[#A09AB0]">
            Frames, vehicles, effects and themes
          </p>
        </div>

        {/* BAG + EXIT, as one control group so they cannot overlap the heading. */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-3 pr-2">
            <ShoppingBag className="h-4 w-4 text-[#FF7A00]" aria-hidden />
            <span className="text-sm font-bold tabular-nums text-white">{owned.size}</span>
            <span className="sr-only"> items in your bag</span>
          </span>
          <Link
            href="/profile"
            aria-label="Leave the store"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#A09AB0] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
          >
            <X className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* BALANCE. Stated once, here, rather than on every card: repeating it 15
          times is what made the old grid noisy. */}
      <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-white">
        <Coins className="h-4 w-4 text-[#FF7A00]" aria-hidden />
        <span className="tabular-nums">{balance.toLocaleString()}</span>
        <span className="font-normal text-[#A09AB0]">tokens available</span>
      </p>

      {/* CATEGORY TABS. Horizontal scroll with `shrink-0` pills, so six categories
          stay ONE line tall on a phone instead of wrapping into a block that eats
          the first row of products. `scrollbar-none` hides the scrollbar so it
          costs no vertical space. */}
      <div
        role="tablist"
        aria-label="Store categories"
        className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {STORE_CATEGORIES.map((entry) => {
          const active = entry === category;
          return (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(entry)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]",
                active
                  ? "bg-[#FF7A00] text-[#0F0C1B]"
                  : "border border-white/15 bg-white/[0.04] text-[#A09AB0] hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {CATEGORY_LABELS[entry]}
            </button>
          );
        })}
      </div>

      {/* NOTICES. `role="status"` so a failed purchase is announced, not merely
          drawn. `pending` is carried separately because a failed action settles
          while `pending` is already false, and losing the message on that race is
          exactly the bug this avoids. */}
      {notice ? (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
            notice.startsWith("Rented")
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {notice}
        </p>
      ) : null}
      <span className="sr-only" aria-busy={pending} />

      {/* THE GRID. Two columns on a phone because one column wastes half the width
          and three makes each card too narrow for the price row. `auto-rows-fr`
          plus `h-full` on the card is what equalises row heights. */}
      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#A09AB0]">
          Nothing in this category yet.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 items-stretch gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <StoreItemCard
              key={item.id}
              item={item}
              owned={owned.has(item.id)}
              busy={busyId === item.id}
              affordable={balance >= item.price}
              onRent={rent}
            />
          ))}
        </ul>
      )}
    </PageLock>
  );
}
