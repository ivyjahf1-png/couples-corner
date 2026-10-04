import { StoreFront } from "@/components/app/StoreFront";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserInventory } from "@/lib/server/commerce";

export const dynamic = "force-dynamic";

/**
 * The Digital Store route.
 *
 * REBUILT as a real page rather than a modal launcher.
 *
 * The previous version rendered a centred "Open the store" button whose only job
 * was to mount `StoreModal`. That modal is what carried the reported defects —
 * overlapping text layers, `.lux-card` gradient edges bleeding over each item's
 * own artwork as visible "watermarks", and item rows squashed into illegibility —
 * so the fix is to stop using it on THIS route.
 *
 * `StoreLauncher` (the modal-launcher this replaced) has been DELETED, and with
 * it `StoreModal` became unreferenced, so both are gone. That was verified by
 * grepping every `.tsx`/`.ts` under app/, components/ and lib/ for both names:
 * `StoreModal` was imported in exactly one place, and that place was
 * `StoreLauncher`. They were not reachable from any other surface, so deleting
 * them removes no capability.
 *
 * The `lux-card` / `lux-cta` / `lux-tab` CSS is DELIBERATELY LEFT IN `globals.css`.
 * A repo-wide grep showed it is still used by `AristocracyCenter` and
 * `AristocracyModal`, so deleting the classes would have unstyled those screens.
 * This page simply does not use them, which is what removes the watermark class of
 * bug without touching anyone else's styling.
 *
 * The price is never passed to the client from here - `StoreFront` receives a
 * balance and ids, and the server action resolves the price itself.
 */
export default async function StorePage() {
  const user = await getSessionUser();

  /* Fail-soft: a commerce outage must still render the catalogue, which is static
     and useful, rather than 500ing the whole store. */
  const snapshot = user
    ? await getUserInventory(user.uid).catch(() => ({
        items: [],
        activeTier: null,
        activeTierExpiresAt: null,
        coinBalance: 0,
      }))
    : { items: [], activeTier: null, activeTierExpiresAt: null, coinBalance: 0 };

  return (
    <StoreFront
      signedIn={Boolean(user)}
      coinBalance={snapshot.coinBalance}
      /* Only ids cross the boundary. The client needs to know WHICH items are
         owned, not anything else about them. */
      ownedItemIds={snapshot.items.map((item) => item.itemId)}
    />
  );
}