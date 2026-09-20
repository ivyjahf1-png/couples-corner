import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  COIN_PACKS,
  TIER_UPGRADES,
  getMembership,
  purchaseCoinPack,
  upgradeTier,
} from "@/lib/server/subscription";

/**
 * GET /api/wallet/purchase
 * Live membership view — polled by the header wallet chip so tier changes
 * (user checkout or admin edits) appear without a reload.
 */
export async function GET() {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const wallet = await getMembership(session.uid);
  return NextResponse.json({
    subscriptionTier: wallet.subscriptionTier,
    coinBalance: wallet.coinBalance,
    totalEarned: wallet.totalEarned,
    coinPacks: COIN_PACKS,
    tierUpgrades: TIER_UPGRADES,
  });
}

/**
 * POST /api/wallet/purchase
 * Body: { kind: "coins", packId }  → credit a coin pack.
 * Body: { kind: "tier", tier }     → apply a paid tier upgrade.
 * All prices/amounts are derived server-side; the client only picks an id.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      kind?: string;
      packId?: string;
      tier?: string;
    };

    if (body.kind === "coins") {
      if (!body.packId) {
        return NextResponse.json({ error: "packId is required" }, { status: 400 });
      }
      const wallet = await purchaseCoinPack(session.uid, body.packId);
      return NextResponse.json({ success: true, ...wallet });
    }

    if (body.kind === "tier") {
      if (!body.tier) {
        return NextResponse.json({ error: "tier is required" }, { status: 400 });
      }
      const wallet = await upgradeTier(session.uid, body.tier as "free" | "premium" | "vip");
      return NextResponse.json({ success: true, ...wallet });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}