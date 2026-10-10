import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { findGame, DEFAULT_GAME_ID } from "@/lib/game/registry";

/**
 * POST /api/game/launch — mint a session-bound URL for one HTML5 game.
 *
 * Body: { gameId?: string, userId?: string }
 *   - `gameId` defaults to `DEFAULT_GAME_ID` when omitted or unknown-but-empty;
 *     any id not in `lib/game/registry` is rejected with 404 (the registry is
 *     the allow-list — a client can never talk this route into launching an
 *     arbitrary URL, which is the whole security point of a launcher).
 *   - `userId`, when supplied, must equal the session's uid. It exists so
 *     call sites that already know who they are can fail fast client-side, but
 *     the SESSION is authoritative: the uid embedded in the token always comes
 *     from `getCurrentSessionUser`, never from the body.
 *
 * Response: { gameUrl, gameId, title, token, expiresAt }
 *   - `gameUrl` is first-party (`/html5-games/<id>/index.html`) with a signed
 *     `?cc_token=` attached. The token is an HMAC-SHA256 compact string over
 *     `uid|gameId|exp` so a game build (or a future API validating in-game
 *     actions) can verify who launched it, which game, and until when —
 *     without a round trip and without ever trusting a raw query param.
 *   - `expiresAt` is 60 minutes out; the session token is short-lived by
 *     design, matching the httpOnly session cookie philosophy: re-launch to
 *     renew, never carry a long-lived credential inside an iframe URL.
 *
 * SECRET: `GAME_SESSION_SECRET` when set (recommended — rotate independently),
 * otherwise `SUPABASE_SERVICE_ROLE_KEY` as a deploy-anywhere fallback so the
 * route works out of the box. If neither exists we fail CLOSED with 503 the
 * same way /api/agora-token does — an unsigned launcher URL is worse than no
 * launcher at all.
 *
 * The response URL is same-origin, so the browser's existing session cookie
 * rides along automatically for any fetch the game itself makes back into the
 * app; the HMAC token is only the game's own identity proof.
 */

/** Launcher token lifetime. Short: re-launch to renew. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

/** Resolve the signing secret, failing closed when none is configured. */
function signingSecret(): string | null {
  return process.env.GAME_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/** Compact `uid|gameId|exp` signature. Constant work regardless of payload. */
function signToken(userId: string, gameId: string, secret: string): { token: string; exp: number } {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}|${gameId}|${exp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const body = Buffer.from(payload, "utf8").toString("base64url");
  return { token: `${body}.${signature}`, exp };
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
    /* Empty/invalid body → defaults below. Never a 500 for a missing JSON. */
  }

  // A caller-supplied userId is advisory only; a MISMATCH is still a hard
  // refusal so a confused or hostile call site can't mint tokens for uids
  // other than its own session.
  const claimedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (claimedUserId && claimedUserId !== session.uid) {
    return NextResponse.json({ error: "User mismatch" }, { status: 403 });
  }

  const requestedId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const gameId = requestedId || DEFAULT_GAME_ID;
  const game = findGame(gameId);
  if (!game) {
    return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  }

  const secret = signingSecret();
  if (!secret) {
    return NextResponse.json({ error: "Game launcher not configured" }, { status: 503 });
  }

  const { token, exp } = signToken(session.uid, game.id, secret);
  const gameUrl = `${game.path}?cc_token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    gameUrl,
    gameId: game.id,
    title: game.title,
    token,
    expiresAt: exp,
  });
}
