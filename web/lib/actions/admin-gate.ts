"use server";

/**
 * Server action backing the admin unlock form.
 *
 * SECURITY: the passphrase is compared on the server and NEVER returned to the
 * client. The action returns only a status enum, so a compromised or
 * curious client cannot read the expected value out of the response payload.
 * The comparison itself lives in lib/auth/admin-gate.ts and is constant-time.
 */

import { grantAdminGate, verifyAdminPassword } from "@/lib/auth/admin-gate";

export interface AdminUnlockResult {
  ok: boolean;
  /** Set only on failure; drives the form's inline message. */
  error?: string;
}

export async function unlockAdminPanelAction(
  _prev: AdminUnlockResult | null,
  formData: FormData
): Promise<AdminUnlockResult> {
  const candidate = String(formData.get("password") ?? "");

  if (!candidate.trim()) {
    return { ok: false, error: "Enter the admin passphrase." };
  }

  const result = await verifyAdminPassword(candidate);

  if (result.ok) {
    await grantAdminGate();
    return { ok: true };
  }

  if (result.reason === "unconfigured") {
    // An operator problem, not a member problem. Distinct copy so nobody
    // retries a form that can never succeed.
    return {
      ok: false,
      error:
        "The admin passphrase is not configured on this deployment. Set ADMIN_PANEL_PASSWORD in the environment.",
    };
  }
  if (result.reason === "locked") {
    return {
      ok: false,
      error: "Too many failed attempts. Try again in 15 minutes.",
    };
  }
  // Deliberately vague: confirming WHICH part was wrong is free information for
  // someone guessing the secret.
  return { ok: false, error: "Incorrect passphrase." };
}

/** Sign out of the admin gate and drop the unlock cookie. */
export async function lockAdminPanelAction(): Promise<void> {
  const { revokeAdminGate } = await import("@/lib/auth/admin-gate");
  await revokeAdminGate();
}
