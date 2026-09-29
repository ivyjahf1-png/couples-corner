"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, ShoppingBag } from "lucide-react";
import { StoreModal, type OwnedStoreItem } from "@/components/app/StoreModal";

/**
 * The /store landing screen: opens StoreModal.
 *
 * WHY A LAUNCHER PAGE: the store is a modal so it can be opened from anywhere
 * (a profile, a room, a feed card) without navigating away from the member's
 * current context. This route keeps a canonical URL for it — bookmarks, the
 * profile's "Store" link and the nav all point here — so the modal is reachable
 * even when nothing else in the app has a button for it.
 *
 * A single "Open store" button rather than rendering the grid inline: rendering
 * it twice would mean two copies of the catalogue to keep in sync, and the
 * member would see a different store depending on which route they came from.
 */
export function StoreLauncher({
  signedIn,
  initialCoins,
  initialOwned,
}: {
  signedIn: boolean;
  initialCoins: number;
  initialOwned: OwnedStoreItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-3xl"
      >
        <ShoppingBag className="h-8 w-8 text-amber-300" />
      </span>

      <div>
        <h1 className="lux-metal text-2xl font-black uppercase tracking-wider">Digital Store</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
          Profile frames, vehicles, chat bubbles, room effects and themes. Rent one for 5, 7 or 30
          days with your tokens.
        </p>
      </div>

      {signedIn ? (
        <p className="lux-coin text-sm">
          <Coins className="h-4 w-4" aria-hidden />
          {initialCoins.toLocaleString()} tokens
        </p>
      ) : null}

      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        <button type="button" onClick={() => setOpen(true)} className="lux-cta px-6 py-3 text-xs">
          Open the store
        </button>
        {!signedIn ? (
          <Link href="/login" className="lux-tab px-6 py-3 text-center text-xs">
            Sign in
          </Link>
        ) : null}
      </div>

      <p className="max-w-sm text-xs leading-5 text-white/35">
        Everything is a rental. An item returns to the store when its term ends, and you can
        equip anything in your bag at any time before then.
      </p>

      {open ? (
        <StoreModal
          signedIn={signedIn}
          coinBalance={initialCoins}
          initialOwned={initialOwned}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}