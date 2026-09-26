/**
 * Couples Corner — resolve the origin of the incoming request.
 *
 * WHY THIS EXISTS: building a redirect from a hardcoded scheme, or from an
 * environment variable naming one deployment, breaks as soon as the app is
 * reached through more than one host (a custom domain plus the default Vercel
 * domain, a preview deployment, a tunnel). Everything that needs an absolute URL
 * for "the site the user is currently on" should derive it from the request.
 *
 * `x-forwarded-host` / `x-forwarded-proto` are set by Vercel (and by any reverse
 * proxy in front of it) and already reflect the PUBLIC host, so they are the
 * correct source. `host` is the fallback for local dev, and `NODE_ENV` decides
 * the default scheme when no proxy header is present.
 *
 * Isomorphic-safe but server-only in practice: it reads `next/headers`, so call
 * it from a Server Component, route handler, or Server Action.
 */

import { headers } from "next/headers";

/**
 * The origin (scheme + host) the current request arrived on, or null when no
 * host header is available at all.
 *
 * Returns a bare origin with NO trailing slash so callers can safely append
 * "/path".
 */
export async function getRequestOrigin(): Promise<string | null> {
  const h = await headers();

  // The first entry is the original client-facing host when a proxy chains
  // multiple hops; Vercel sets a single value, but taking the first is the
  // conventional and safer reading.
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || h.get("host")?.trim();
  if (!host) return null;

  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${proto}://${host}`;
}

/**
 * Same as `getRequestOrigin` but falls back to a supplied value, so a caller
 * that already has a trustworthy origin (e.g. one parsed from `request.url`)
 * can pass it through rather than re-deriving.
 */
export async function getRequestOriginOr(fallback: string | null): Promise<string> {
  return (await getRequestOrigin()) ?? fallback ?? "";
}