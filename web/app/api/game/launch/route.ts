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
 *   - `gameUrl` points at the public HTML5 Distribution embed URL for the
 *     requested game, served directly by this route. No provider is involved —
 *     the external embed host (html5.gamedistribution.com) returns the iframe
 *     with its launch token baked in. The title is display-only registry copy,
 *     so the modal header can name the game while the URL is still in flight.
 */

/** Resolve the provider launch base + token, or null when unconfigured. */
function providerConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.GAME_PROVIDER_BASE_URL?.trim();
  const token = process.env.GAME_SECRET_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

/**
 * The literal body GameDistribution serves for an unknown/unpublished embed id.
 * Checking for this string is the only way to detect a dead build, because the
 * host answers with HTTP 200 — a status check alone passes a dead id cleanly.
 */
const DEAD_EMBED_SENTINEL = "Not found at origin";

/**
 * Confirm the embed actually resolves BEFORE handing a URL to the modal.
 *
 * WHY THIS EXISTS. Every embed id this project had ever been given — from two
 * separate design briefs — answered `Not found at origin!` with a 200 status and
 * a 49-byte body. The client could not tell that from a real game: the iframe
 * "loads" successfully, `onLoad` fires, and the member stares at that sentence
 * inside a fullscreen game frame with a coin counter and a Close button around
 * it. Validating here means a dead build fails as a 503 the modal can present
 * honestly, instead of as a screenshot-worthy defect.
 *
 * FAILS OPEN ON NETWORK ERROR, DELIBERATELY. A transient provider outage or a
 * fetch that times out must not permanently disable the game suite — the embed
 * may well be alive and merely unreachable from this server. Only a DEFINITIVE
 * negative (200 + the sentinel body) blocks the launch. The client-side timeout
 * in GameModal remains the backstop for that case.
 */
async function embedResolves(url: string): Promise<boolean> {
  /* SAME-ORIGIN SELF-HOSTED BUILDS ARE ALWAYS PRESENT. A registry path that
     is a relative URL (e.g. "/html5-games/ludo/index.html") is one of our own
     files under public/ — Next serves it statically, so there is nothing to
     probe and, crucially, no external host that could answer "Not found at
     origin!". Skip the network round trip: a server fetch cannot even resolve a
     relative URL, and the only failure mode that check guards against (the dead
     external embed) cannot happen for a file we ship ourselves. */
  if (url.startsWith("/")) return true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        /* GameDistribution serves the sentinel to clients with no user agent. */
        headers: { "user-agent": "Mozilla/5.0 (compatible; CouplesCorner/1.0)" },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return false;
    const body = await response.text();
    if (body.includes(DEAD_EMBED_SENTINEL)) return false;
    /* A real embed is a full HTML document with a game manifest; the sentinel
       page is 49 bytes. Anything that short is not a game. */
    return body.length > 200;
  } catch {
    return true; // Unreachable, not proven dead — let the client decide.
  }
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

  /* Native entries (Truth or Dare, Real Feelings, the compatibility quiz)
     are launched by their own modal event, never by the iframe — minting a
     launch URL for one would hand the modal an empty src. Fail fast as a
     call-site programming error rather than rendering a dead frame. */
  if (game.kind === "native" || !game.path) {
    return NextResponse.json({ error: "This game opens in its own experience" }, { status: 400 });
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

  // No provider configured — serve the public HTML5 Distribution embed URL
  // directly from the registry. The embed host delivers its own launch token
  // (via cookies/anonymous session) so no first-party build slot is needed.
  //
  // PREFLIGHTED. The embed is fetched here rather than trusted, so a dead build
  // surfaces as a 503 the modal renders as a real message. Without this the
  // member gets a fullscreen iframe reading "Not found at origin!" — which is
  // exactly the defect this check exists for.
  if (!(await embedResolves(game.path))) {
    return NextResponse.json(
      {
        error:
          "This game is temporarily unavailable. Our team is re-publishing it — please try another title for now.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    gameUrl: game.path,
    gameId: game.id,
    title: game.title,
  });
}
