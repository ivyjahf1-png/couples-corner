/**
 * Couples Corner — demo / preview account guard utilities.
 *
 * Provides server-side helpers to identify demo accounts and enforce
 * data isolation between demo/preview and real user accounts.
 *
 * Demo accounts:
 *   - Are identified by the `is_demo` flag in the users table, OR by a
 *     matching demo email pattern (e.g. "*@demo.couplescorner.app").
 *   - Are excluded from public feeds, real matches, and production metrics.
 *   - Cannot write production data, send messages to real users, or process
 *     real subscription checkouts.
 *   - Can fully explore the dashboard UI with mock data.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Email patterns that identify demo/preview accounts.
 * Any user whose email matches one of these patterns is treated as a demo account.
 */
export const DEMO_EMAIL_PATTERNS: readonly RegExp[] = [
  /@demo\.couplescorner\.app$/i,
  /\+demo@/i,
  /^demo@/i,
];

/**
 * Check if an email matches a demo account pattern.
 */
export function isDemoEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return DEMO_EMAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Check if a user is a demo account by querying the users table.
 * Falls back to email pattern matching if the DB is unavailable.
 */
export async function isDemoAccount(userId: string, email: string): Promise<boolean> {
  // Fast path: email pattern match
  if (isDemoEmail(email)) return true;

  // DB check: is_demo flag
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return isDemoEmail(email);

    const { data } = await supabase
      .from("users")
      .select("is_demo")
      .eq("id", userId)
      .single();

    return (data?.is_demo as boolean) ?? false;
  } catch {
    return isDemoEmail(email);
  }
}

/**
 * Throw an error if the current user is a demo account.
 * Use this guard in server actions that modify production data.
 *
 * @throws Error if the user is a demo account
 */
export async function forbidDemoAction(userId: string, email: string, action: string): Promise<void> {
  const isDemo = await isDemoAccount(userId, email);
  if (isDemo) {
    throw new Error(
      `Demo accounts cannot perform "${action}". This is a preview account — sign in with a real account to use this feature.`
    );
  }
}

/**
 * Filter demo accounts out of a list of user IDs.
 * Returns only real (non-demo) user IDs.
 */
export async function filterDemoAccounts(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return userIds;

    const { data } = await supabase
      .from("users")
      .select("id, is_demo")
      .in("id", userIds);

    if (!data) return userIds;

    const demoIds = new Set(
      data.filter((u) => u.is_demo === true).map((u) => u.id as string)
    );

    return userIds.filter((id) => !demoIds.has(id));
  } catch {
    return userIds;
  }
}
