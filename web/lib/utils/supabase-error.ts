/**
 * Couples Corner — safe extraction of a PostgREST/Supabase error for logging.
 *
 * Supabase query builders resolve with (rather than throw) error objects shaped
 * `{ message, code, details, hint }`. Those codes are what make a failure
 * diagnosable — e.g. `PGRST205` ("Could not find the table 'public.x'") or
 * `42501` (insufficient privilege / RLS denial). This helper pulls the fields
 * out of an unknown thrown value so server logs always capture the exact
 * database exception, and it never serialises the error object wholesale
 * (which can leak request context).
 *
 * Isomorphic on purpose: no `server-only` import, so it is safe to use in both
 * server components and route handlers.
 */

export interface SupabaseErrorDetail {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function supabaseErrorDetail(error: unknown): SupabaseErrorDetail {
  const record =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const message =
    typeof record.message === "string" && record.message.length > 0
      ? record.message
      : error instanceof Error
        ? error.message
        : String(error);
  return {
    message,
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
  };
}
