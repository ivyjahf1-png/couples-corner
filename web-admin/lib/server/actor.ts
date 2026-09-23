import "server-only";

/**
 * Couples Corner — resolve the UUID of the admin accountable for a write.
 *
 * SECURITY BOUNDARY: identity columns such as `content.created_by` and
 * `content.updated_by` are `uuid not null` FKs to `auth.users`, and
 * `audit_logs.admin_user_id` is a `uuid` too. A failed/absent session lookup
 * used to yield the empty string, which Postgres rejects with
 * `invalid input syntax for type uuid: ""` — so every writer resolves its actor
 * here instead of accepting a client value at face value.
 *
 * Resolution order:
 *   1. the server-verified session user (never trust a client uid alone);
 *   2. the caller-supplied uid, but only when it is a well-formed UUID;
 *   3. in development only, an existing account — the dev admin bypass
 *      (`requireAdminDev`) has no `auth.users` row, so writes need a real
 *      account to satisfy the FK;
 *   4. otherwise `null`, which `requireActorUuid` turns into an actionable
 *      sign-in error rather than a raw Postgres type error.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { isDevAdminBypassActive } from "@/lib/auth/authorization";
import { toUuidOrNull } from "@/lib/utils/uuid";

/**
 * Best-effort resolution of the acting admin's UUID.
 * Returns `null` when no usable identity can be established.
 */
export async function resolveActorUuid(candidate?: string | null): Promise<string | null> {
  // Server-verified identity wins over anything the client sent.
  const session = await getCurrentSessionUser().catch(() => null);
  const fromSession = toUuidOrNull(session?.uid);
  if (fromSession) return fromSession;

  const fromClient = toUuidOrNull(candidate);
  if (fromClient) return fromClient;

  if (!isDevAdminBypassActive()) return null;
  return resolveDevBypassActorUuid();
}

/** Resolve the acting admin's UUID or throw a sign-in prompt. */
export async function requireActorUuid(
  candidate: string | null | undefined,
  action = "this action"
): Promise<string> {
  const actorUid = await resolveActorUuid(candidate);
  if (!actorUid) {
    throw new Error(
      `Unable to identify the administrator account performing ${action}. ` +
        "Sign in with an admin account, then retry."
    );
  }
  return actorUid;
}

/**
 * Development-only fallback: the dev bypass has no `auth.users` row, so pick an
 * existing account (preferring a real admin) purely to satisfy the FK. Never
 * runs in production — `isDevAdminBypassActive()` is NODE_ENV === "development".
 */
async function resolveDevBypassActorUuid(): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data: adminRow } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    const adminUid = toUuidOrNull(adminRow?.id);
    if (adminUid) {
      console.warn(
        `[actor] dev admin bypass: attributing this write to existing admin ${adminUid}. ` +
          "No admin session is signed in."
      );
      return adminUid;
    }

    const { data: anyRow } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .maybeSingle();
    const anyUid = toUuidOrNull(anyRow?.id);
    if (anyUid) {
      console.warn(
        `[actor] dev admin bypass: attributing this write to existing user ${anyUid}. ` +
          "No admin session is signed in."
      );
      return anyUid;
    }
  } catch (err) {
    console.warn(
      "[actor] dev admin bypass lookup failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
  return null;
}
