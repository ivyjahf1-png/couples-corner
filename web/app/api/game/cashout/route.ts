import "server-only";

import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/server/session";
import { creditGameWinnings } from "@/lib/server/games";

/**
 * POST /api/game/cashout â€" credit a self-hosted game's winnings.
 *
 * WHY THIS ROUTE EXISTS. The games under `public/html5-games/` are static
 * files: they run inside the runner's iframe with no Supabase session, so they
 * cannot touch the wallet themselves. The iframe posts `{ coins }` up to
 * `GameRunner`, which forwards it here WITH the member's own session cookie â€"
 * the session, never a client-supplied userId, decides whose wallet is
 * credited.
 *
 * HONEST LIMITATION. The payout figure is reported by the client. A fully
 * server-authoritative economy would re-simulate the round on the server;
 * that state does not exist yet, so this route instead applies the defences
 * that are possible today: session auth, integer validation, a hard per-tx
 * cap (`creditGameWinnings`), and a short per-user cooldown so a scripted
 * loop cannot hammer the endpoint. See `creditGameWinnings` for the
 * compare-and-swap write.
 */
const MAX_PER_TX = 100_000;
const COOLDOWN_MS = 2_000;

/** In-memory last-cashout clock per user (per instance â€" fine for a rate gate). */
const lastCashoutAt = new Map<string, number>();

export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { coins?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const coins =
    typeof body.coins === "number"
      ? body.coins
      : typeof body.coins === "string" && body.coins.trim() !== ""
        ? Number(body.coins)
        : NaN;

  if (!Number.isInteger(coins) || coins <= 0 || coins > MAX_PER_TX) {
    return NextResponse.json({ error: "Invalid cash-out amount" }, { status: 400 });
  }

  const now = Date.now();
  const previous = lastCashoutAt.get(session.uid) ?? 0;
  if (now - previous < COOLDOWN_MS) {
    return NextResponse.json({ error: "Cash-out is on cooldown, retry shortly" }, { status: 429 });
  }
  lastCashoutAt.set(session.uid, now);

  const result = await creditGameWinnings(session.uid, coins);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Cash-out failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true, coinBalance: result.coinBalance });
}