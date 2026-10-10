
import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * POST /api/game/webhook — credit coins onto a member's game wallet.
 *
 * UNAUTHORIZATION
 * ---------------
 * The only credential that matters is an HMAC-SHA256 over the raw request
 * body, keyed by `GAME_WEBHOOK_SECRET`. That secret is issued to the coin
 * gateway that pays out rewards (the client bundle never sees it, and the
 * value lives in server env only). The body's `userId` and `rewardCoins` are
 * therefore *data* the gateway authorises — not credentials. They carry no
 * trust; the signature does.
 *
 * A body-supplied signature is NEVER trusted, and we never fall back to an
 * "unset secret = trust me" mode: if `GAME_WEBHOOK_SECRET` is absent, the
 * route refuses to start rather than silently opening a money printer.
 *
 * Why no session here: the gateway that calls this endpoint has no Supabase
 * session. The HMAC is the authorization. The wallet itself is only touched by
 * the service-role client (bypasses RLS), and the RPC is `security definer`
 * with EXECUTE revoked from everyone, so even a direct database call without
 * the signature cannot credit anything.
 *
 * RESPONSE
 * --------
 * `{ success: true }` on a credited wallet. Errors are never leaked back to
 * the caller with detail: the gateway should log the status if it retires.
 */

/** Server-only shared secret issued to the coin gateway. */
const WEBHOOK_SECRET = process.env.GAME_WEBHOOK_SECRET;

/** Constant-time signature check against the raw request body. */
function isValidSignature(rawBody: string, provided: string): boolean {
  if (!WEBHOOK_SECRET || !provided) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: Request) {
  /* Read the raw body once: it is both the canonical HMAC input and the JSON
     payload. A second parse from a re-read would change the bytes and break
     verification on a retry. */
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let input: {
    userId?: string;
    rewardCoins?: number | string;
    signature?: string;
  };
  try {
    input = JSON.parse(rawBody) as typeof input;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId =
    typeof input.userId === "string" ? input.userId.trim() : "";
  const rewardCoins =
    typeof input.rewardCoins === "number"
      ? input.rewardCoins
      : typeof input.rewardCoins === "string" && input.rewardCoins.trim() !== ""
        ? Number(input.rewardCoins)
        : NaN;
  const signature = typeof input.signature === "string" ? input.signature : "";

  // --- Field validation (rejected before ANY wallet access) ---
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!Number.isInteger(rewardCoins) || rewardCoins <= 0) {
    return NextResponse.json({ error: "Invalid rewardCoins" }, { status: 400 });
  }
  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // --- Server-authoritative wallet write (service role, bypasses RLS) ---
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error(
      "[webhook] GAME_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY not configured"
    );
    return NextResponse.json(
      { error: "Wallet service unavailable" },
      { status: 500 }
    );
  }

  const { error } = await supabase.rpc("increment_user_coins", {
    user_id: userId,
    amount: rewardCoins,
  });

  if (error) {
    console.error("[webhook] increment_user_coins failed:", error.message);
    return NextResponse.json({ error: "Wallet update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
