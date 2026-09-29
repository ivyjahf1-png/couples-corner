import { StoreLauncher } from "@/components/app/StoreLauncher";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserInventory } from "@/lib/server/commerce";

export const dynamic = "force-dynamic";

/**
 * The Digital Store route.
 *
 * A LAUNCHER, not the store itself: the store now opens as a modal so it can be
 * reached from a profile, a feed card or a room without navigating away from
 * whatever the member was doing. This page is the canonical URL, so a bookmark
 * or the profile's "Store" link still lands somewhere real, and the member
 * gets the full-screen store from here.
 */
export default async function StorePage() {
  const user = await getSessionUser();
  const snapshot = user
    ? await getUserInventory(user.uid).catch(() => ({
        items: [],
        activeTier: null,
        activeTierExpiresAt: null,
        coinBalance: 0,
      }))
    : { items: [], activeTier: null, activeTierExpiresAt: null, coinBalance: 0 };

  return (
    <StoreLauncher
      signedIn={Boolean(user)}
      initialCoins={snapshot.coinBalance}
      initialOwned={snapshot.items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        icon: item.icon,
        equipped: item.equipped,
        expiresAt: item.expiresAt,
      }))}
    />
  );
}