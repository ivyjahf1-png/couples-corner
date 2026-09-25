"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Sparkles, X, Check, Coins } from "lucide-react";
import {
  STORE_CATEGORIES,
  itemsForCategory,
  type StoreCategory,
  type StoreItem,
} from "@/lib/storeCatalog";
import { purchaseStoreItemAction, equipInventoryItemAction } from "@/lib/actions/commerce";

export interface OwnedItem {
  itemId: string;
  name: string;
  icon: string;
  equipped: boolean;
  expiresAt: string | null;
}

export function StoreMarketplace({
  initialCoins = 0,
  initialOwned = [],
}: {
  initialCoins?: number;
  initialOwned?: OwnedItem[];
}) {
  const [category, setCategory] = useState<StoreCategory>("Frames");
  const [bagOpen, setBagOpen] = useState(false);
  const [coins, setCoins] = useState(initialCoins);
  const [owned, setOwned] = useState<OwnedItem[]>(initialOwned);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ownedIds = new Set(owned.map((item) => item.itemId));
  const items: StoreItem[] = itemsForCategory(category);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function buy(item: StoreItem) {
    setPendingId(item.id);
    startTransition(async () => {
      const result = await purchaseStoreItemAction(item.id);
      setPendingId(null);
      if (!result.ok) {
        flash(result.error ?? "Purchase failed");
        return;
      }
      setCoins(result.coinBalance);
      setOwned((prev) => [
        ...prev,
        { itemId: result.item.itemId, name: result.item.name, icon: result.item.icon, equipped: false, expiresAt: result.item.expiresAt },
      ]);
      flash(`${result.item.name} added to your bag`);
    });
  }

  function equip(itemId: string) {
    startTransition(async () => {
      const result = await equipInventoryItemAction(itemId);
      if (!result.ok) {
        flash(result.error ?? "Equip failed");
        return;
      }
      setOwned((prev) => prev.map((item) => ({ ...item, equipped: item.itemId === itemId })));
      flash("Item equipped as your active style");
    });
  }
  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-amber-300">Premium collection</p>
          <h1 className="text-3xl font-bold text-white">Store</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-200">
            <Coins className="h-4 w-4" /> {coins.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setBagOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200"
            aria-label="Open bag"
          >
            <ShoppingBag className="h-4 w-4" /> Bag ({owned.length})
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Store categories">
        {STORE_CATEGORIES.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={category === name}
            onClick={() => setCategory(name)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
              category === name
                ? "border-amber-300 bg-amber-300 text-slate-950"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const isOwned = ownedIds.has(item.id);
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl">
              <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${item.gradient} text-6xl`}>
                {item.icon}
                {item.badge ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex justify-between gap-2">
                  <h2 className="truncate font-semibold text-white">{item.name}</h2>
                  <span className="whitespace-nowrap text-xs text-white/45">/{item.durationDays}D</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-300">🪙 {item.price.toLocaleString()}</span>
                  <button
                    type="button"
                    disabled={isOwned || isPending}
                    onClick={() => buy(item)}
                    className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {isOwned ? "Owned" : pendingId === item.id ? "..." : "Buy"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {notice ? (
        <p role="status" className="fixed bottom-28 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/95 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {notice}
        </p>
      ) : null}
      {bagOpen ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60" role="dialog" aria-label="Shopping bag">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close bag" onClick={() => setBagOpen(false)} />
          <aside className="relative flex h-full w-[min(100%,22rem)] flex-col border-l border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your Bag</h2>
              <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="rounded-lg p-2 text-ink-300 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {owned.length === 0 ? (
              <p className="mt-4 text-sm text-ink-300">Your bag is empty. Buy an item to own it here.</p>
            ) : (
              <ul className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
                {owned.map((item) => (
                  <li key={item.itemId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-2xl" aria-hidden>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{item.name}</span>
                      {item.expiresAt ? (
                        <span className="block text-[11px] text-ink-400">Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => equip(item.itemId)}
                      disabled={item.equipped || isPending}
                      className="rounded-lg border border-amber-300/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 disabled:opacity-60"
                    >
                      {item.equipped ? (
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Equipped</span>
                      ) : (
                        <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Equip</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink-400">Equipped items become your active profile frame and room effect.</p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}