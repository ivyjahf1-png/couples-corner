/**
 * Shared server-side error helpers for action handlers and catch blocks.
 *
 * Next.js `redirect()` and `notFound()` throw navigation signals that the
 * router MUST receive to navigate correctly. A catch block that swallows one of
 * these signals (logging it as a generic "\"Failed to …\"" error or returning a
 * bogus `{ ok: false }`) breaks routing and pollutes the console with raw
 * `NEXT_REDIRECT`/`NEXT_NOT_FOUND` digests.
 *
 * Use these helpers so navigation signals always re-throw, while genuine
 * failures are surfaced normally.
 */

import { isRedirectError as isNextRedirectError } from "next/dist/client/components/redirect-error";

/** True for Next.js `redirect()` signals (uses Next's own detector). */
export function isRedirectError(error: unknown): boolean {
  return isNextRedirectError(error);
}

/**
 * True for any Next.js navigation signal — `redirect()` or `notFound()`.
 * `notFound()` throws a `NEXT_NOT_FOUND` digest that Next's `isRedirectError`
 * does not match, so this also checks for it via the digest.
 */
export function isNavigationSignal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}

/**
 * Re-throw Next.js navigation signals; otherwise do nothing.
 *
 * Safe to call at the top of any catch block that needs to keep routing working
 * while still handling real errors below it.
 */
export function rethrowIfNavigation(error: unknown): void {
  if (isNavigationSignal(error)) throw error;
}

/**
 * Standardize a caught error into a friendly thrown Error.
 *
 * - A Next.js navigation signal is always re-thrown unchanged, so the router
 *   navigates instead of failing the request.
 * - Any real failure is logged and re-thrown as `new Error(fallbackMessage)`.
 *
 * Returns `never`, so it can also be used as a coerce-to-throw helper.
 */
export function handleActionError(error: unknown, fallbackMessage: string): never {
  if (isNavigationSignal(error)) throw error;
  console.error(fallbackMessage, error);
  throw new Error(fallbackMessage);
}