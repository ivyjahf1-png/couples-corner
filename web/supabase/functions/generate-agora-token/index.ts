/**
 * generate-agora-token — Supabase Edge Function.
 *
 * Mints an Agora RTC token (AccessToken2) for one channel join and returns it
 * as JSON. The Agora App ID and Primary Certificate are read from Edge
 * Function secrets — NEVER from code — so this file is safe to commit.
 *
 * REQUEST  (POST, application/json)
 *   { "channelName": "call-7f3a", "uid": 20481 }   // uid optional, default 0
 *
 * RESPONSE (200, application/json)
 *   { "token": "...", "channelName": "call-7f3a", "uid": 20481,
 *     "expiresIn": 14400 }
 *
 * NOTES
 *  - Role is always PUBLISHER (join + publish audio/video/data).
 *  - TTL is 4 hours (14400s). Agora caps token lifetime at 24 hours.
 *  - uid 0 (the default) means "no uid bound": Agora does not check the
 *    joining user's uid, so any client holding the token may join. Pass the
 *    caller's real uid to bind the token to one user.
 *  - `supabase functions deploy` verifies the caller's JWT by default, so
 *    only signed-in members can reach this function unless you deploy with
 *    `--no-verify-jwt` (test only).
 *
 * LIBRARY VERSION QUIRK (why version pinning matters here):
 * `agora-token@1.x`'s buildTokenWithUid took an ABSOLUTE unix timestamp and
 * a different parameter count. The 2.x export (RtcTokenBuilder2) takes
 * DURATIONS in seconds: "represented by the number of seconds elapsed since
 * now". Both facts are documented in the official sources — this function
 * pins 2.0.7 and passes durations, verified against the published
 * index.d.ts and src/RtcTokenBuilder2.js.
 */

import { RtcRole, RtcTokenBuilder } from "npm:agora-token@2.0.7";

/** Token lifetime: 4 hours, in seconds. */
const TOKEN_TTL_SECONDS = 14_400;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Every response carries CORS headers, so errors are readable cross-origin too. */
function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  /* CORS preflight — browsers send OPTIONS before the real POST. */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    /* Secrets live in Supabase Edge Function secrets, never in this file.
       Missing config is a 500 with a generic body: the detail goes to the
       function logs so it never leaks to callers. */
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCertificate) {
      console.error(
        "[generate-agora-token] AGORA_APP_ID / AGORA_APP_CERTIFICATE secret missing",
      );
      return json({ error: "Token service is not configured." }, 500);
    }

    let payload: { channelName?: unknown; uid?: unknown };
    try {
      payload = (await req.json()) as typeof payload;
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }

    /* channelName — required, non-empty, < 64 bytes (Agora's documented cap). */
    const rawChannel = payload?.channelName;
    if (typeof rawChannel !== "string" || rawChannel.trim().length === 0) {
      return json({ error: "channelName is required and must be a non-empty string." }, 400);
    }
    const channelName = rawChannel.trim();
    if (new TextEncoder().encode(channelName).length >= 64) {
      return json({ error: "channelName must be shorter than 64 bytes." }, 400);
    }

    /* uid — optional, defaults to 0 (Agora: token not bound to a uid).
       Accepts a number or a numeric string; everything else is a 400. */
    let uid = 0;
    if (payload.uid !== undefined && payload.uid !== null) {
      const n =
        typeof payload.uid === "number"
          ? payload.uid
          : typeof payload.uid === "string" && payload.uid.trim() !== ""
            ? Number(payload.uid)
            : NaN;
      if (!Number.isInteger(n) || n < 0 || n > 4_294_967_295) {
        return json({ error: "uid must be an integer between 0 and 4294967295." }, 400);
      }
      uid = n;
    }

    /* buildTokenWithUid(appId, appCertificate, channelName, uid, role,
       tokenExpire, privilegeExpire) — the last two are durations in
       seconds since now (NOT absolute timestamps), both set to 4 hours
       so join and publish privileges expire together with the token. */
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS,
    );

    /* The library returns "" instead of throwing when the App ID or
       Certificate is not a valid 32-char hex string (AccessToken2's
       __build_check fails silently). Surface that as a 500 with the
       detail in logs, never as a 200 with an empty token. */
    if (!token) {
      console.error(
        "[generate-agora-token] builder returned an empty token — check that " +
          "AGORA_APP_ID and AGORA_APP_CERTIFICATE are the 32-character hex values " +
          "from Agora Console (no quotes or whitespace).",
      );
      return json({ error: "Token generation failed. Check server secrets." }, 500);
    }

    return json({ token, channelName, uid, expiresIn: TOKEN_TTL_SECONDS }, 200);
  } catch (err) {
    console.error("[generate-agora-token] unexpected error:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
