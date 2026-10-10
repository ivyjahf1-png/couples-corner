import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { findGame, DEFAULT_GAME_ID } from "@/lib/game/registry";

/**
 * POST /api/game/launch — mint the provider launch URL for one HTML5 game.
 *
 * Body: { gameId?: string, userId?: string }
 *   - `gameId` defaults to `DEFAULT_GAME_ID` when omitted; any id not in
 *     `lib/game/registry` is rejected with 404. The registry is the allow-list:
 *     a client can never talk this route into launching an arbitrary URL.
 *   - `userId`, when supplied, must equal the session's uid. It exists so a
 *     call site that already knows who it is can fail fast, but the SESSION is
 *     authoritative: the uid embedded in the launch URL always comes from
 *     `getCurrentSessionUser`, never from the body. (A body uid is what a
 *     provider launch is FOR — it tells the provider whose wallet/account the
 *     session belongs to — so letting the client choose it would be handing
 *     any member the ability to launch a game session credited to any other
 *     member. Mismatch is a hard 403, never a silent override.)
 *
 * Response: { gameUrl, gameId, title }
 *   - `gameUrl` points at the provider's launcher with `game_id`, `user_id`
 *     and the shared `token`. The provider URL and token live in env
 *     (`GAME_PROVIDER_BASE_URL`, `GAME_SECRET_TOKEN`) — never in the bundle,
 *     never returned to the client as anything but the finished URL.
 *   - `title` is display-only registry copy, so the modal header can name the
 *     game while the URL is still in flight.
 *
 * FALLBACK: when the provider env is unset the route returns the FIRST-PARTY
 * build path from the registry instead, so development and self-hosted builds
 * keep working with zero configuration. Set both env vars to go through the
 * provider. The fallback exists because an unconfigured launcher that 503s is
 * strictly worse than one that serves the local build slot — remove this
 * branch if provider-only is the desired deployment posture.
 */

/** Resolve the provider launch base + token, or null when unconfigured. */
function providerConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.GAME_PROVIDER_BASE_URL?.trim();
  const token = process.env.GAME_SECRET_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { gameId?: string; userId?: string } = {};
  try {
    body = (await request.json()) as { gameId?: string; userId?: string };
  } catch {
    /* Empty/invalid body → defaults below. Never a 500 for missing JSON. */
  }

  // Caller-supplied userId is advisory only; a MISMATCH is a hard refusal so a
  // confused or hostile call site can't mint a launch for another member's
  // account. The session's uid is always what gets embedded.
  const claimedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (claimedUserId && claimedUserId !== session.uid) {
    return NextResponse.json({ error: "User mismatch" }, { status: 403 });
  }

  const requestedId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const game = findGame(requestedId || DEFAULT_GAME_ID);
  if (!game) {
    return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  }

  const provider = providerConfig();
  if (provider) {
    const params = new URLSearchParams({
      game_id: game.id,
      user_id: session.uid,
      token: provider.token,
    });
    return NextResponse.json({
      gameUrl: `${provider.baseUrl}/launch?${params.toString()}`,
      gameId: game.id,
      title: game.title,
    });
  }

  // No provider configured — serve the first-party build slot. See the doc
  // comment above for why this degrades instead of failing.
  return NextResponse.json({
    gameUrl: game.path,
    gameId: game.id,
    title: game.title,
  });
}
