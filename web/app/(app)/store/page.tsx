import { StoreMarketplace } from "@/components/store/StoreMarketplace";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserInventory } from "@/lib/server/commerce";

export const dynamic = "force-dynamic";

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
    <StoreMarketplace
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
