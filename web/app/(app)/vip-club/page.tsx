import { VipClubCenter } from "@/components/vip/VipClubCenter";
import { getSessionUser } from "@/lib/auth/authorization";
import { getUserInventory } from "@/lib/server/commerce";

export const dynamic = "force-dynamic";

/** The VIP Club — the coin-funded membership tier progression. */
export default async function VipClubPage() {
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
    <VipClubCenter
      initialCoins={snapshot.coinBalance}
      activeTier={snapshot.activeTier}
      activeTierExpiresAt={snapshot.activeTierExpiresAt}
    />
  );
}