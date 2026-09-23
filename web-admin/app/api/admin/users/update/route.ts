import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  setUserCoinBalance,
  setUserSubscriptionTier,
} from "@/lib/server/admin";
import { isSubscriptionTierName } from "@/lib/models/wallet";

/**
 * POST /api/admin/users/update
 *
 * Secure, service-role-backed route for manually updating a user's
 * subscription tier and/or coin balance. Session + admin role are verified
 * before any write; every mutation is audited in lib/server/admin.ts.
 *
 * Body: { uid, subscriptionTier?, coinBalance?, reason? }
 */
export async function POST(request: Request) {
  const admin = await getCurrentSessionUser();
  if (!admin) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      uid?: string;
      subscriptionTier?: string;
      coinBalance?: number;
      reason?: string;
    };

    if (!body.uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    if (body.subscriptionTier !== undefined) {
      if (!isSubscriptionTierName(body.subscriptionTier)) {
        return NextResponse.json(
          { error: "subscriptionTier must be free, premium or vip" },
          { status: 400 }
        );
      }
      await setUserSubscriptionTier(
        body.uid,
        body.subscriptionTier,
        admin.uid,
        body.reason
      );
    }

    if (body.coinBalance !== undefined) {
      if (!Number.isInteger(body.coinBalance) || body.coinBalance < 0) {
        return NextResponse.json(
          { error: "coinBalance must be a non-negative integer" },
          { status: 400 }
        );
      }
      await setUserCoinBalance(body.uid, body.coinBalance, admin.uid, body.reason);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}