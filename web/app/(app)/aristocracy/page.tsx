import { AristocracyCenter } from "@/components/aristocracy/AristocracyCenter";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserInventory } from "@/lib/server/commerce";

export const dynamic = "force-dynamic";

export default async function AristocracyPage() {
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
    <AristocracyCenter
      initialCoins={snapshot.coinBalance}
      activeTier={snapshot.activeTier}
      activeTierExpiresAt={snapshot.activeTierExpiresAt}
    />
  );
}