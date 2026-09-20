import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  claimReward,
  getGameWallet,
  settleGame,
  stakeGame,
} from "@/lib/server/games";

/**
 * GET /api/games/reward
 * Returns the caller's live coin balance (polled by the Game Center UI).
 */
export async function GET() {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const wallet = await getGameWallet(session.uid);
  return NextResponse.json({ balance: wallet.coinBalance, totalEarned: wallet.totalEarned });
}

/**
 * POST /api/games/reward
 *
 * Body: { action: "claim" | "stake" | "settle", rewardId?, gameId?, won? }
 *
 * - claim  → verify chest cooldown / milestone, credit coins.
 * - stake  → deduct the registry-defined buy-in for a game session.
 * - settle → pay out a win (server-derived amount) against an open stake.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      rewardId?: string;
      gameId?: string;
      won?: boolean;
    };

    switch (body.action) {
      case "claim": {
        if (!body.rewardId) {
          return NextResponse.json({ error: "rewardId is required" }, { status: 400 });
        }
        const wallet = await claimReward(session.uid, body.rewardId);
        return NextResponse.json({ success: true, balance: wallet.coinBalance });
      }
      case "stake": {
        if (!body.gameId) {
          return NextResponse.json({ error: "gameId is required" }, { status: 400 });
        }
        const { wallet } = await stakeGame(session.uid, body.gameId);
        return NextResponse.json({ success: true, balance: wallet.coinBalance });
      }
      case "settle": {
        if (!body.gameId || typeof body.won !== "boolean") {
          return NextResponse.json({ error: "gameId and won are required" }, { status: 400 });
        }
        const wallet = await settleGame(session.uid, body.gameId, body.won);
        return NextResponse.json({ success: true, balance: wallet.coinBalance });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reward request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
