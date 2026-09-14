"use server";

import { cookies } from "next/headers";
import { getCurrentSessionUser, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/server/session";
import {
  changePassword,
  enrollMfaTotp,
  listMfaFactors,
  listUserSessions,
  revokeAllOtherSessions,
  revokeUserSession,
  unenrollMfa,
  verifyMfaEnrollment,
} from "@/lib/server/account-security";
import { recordAudit } from "@/lib/server/audit";
import { rethrowIfNavigation } from "@/lib/utils/errors";

/**
 * Server Actions for the /settings security panel (password, 2FA, sessions).
 * Every action re-resolves the session server-side — the client can never
 * act on another user's account.
 */

export type ActionSuccess = { ok: true };
export type ActionFailure = { ok: false; error?: string };
export type ActionResult = ActionSuccess | ActionFailure;

function actionError(err: unknown): ActionFailure {
  rethrowIfNavigation(err);
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
}

/** Read the raw access token from the httpOnly session cookie. */
async function requireAccessToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new Error("Please sign in again");
  return token;
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  try {
    if (input.newPassword.length < 8) {
      return { ok: false, error: "New password must be at least 8 characters." };
    }
    if (input.newPassword !== input.confirmPassword) {
      return { ok: false, error: "New passwords do not match." };
    }
    if (input.newPassword === input.currentPassword) {
      return { ok: false, error: "The new password must be different from the current one." };
    }

    const user = await getCurrentSessionUser();
    if (!user?.email) return { ok: false, error: "Please sign in again" };

    await changePassword({
      uid: user.uid,
      email: user.email,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    try {
      await recordAudit({
        adminUserId: user.uid,
        action: "update",
        targetRef: { type: "password", id: user.uid },
        reason: "password changed from settings",
      });
    } catch {
      // Audit logging must never block a successful password change.
    }

    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Returns the 2FA toggle state (verified TOTP factor id, if any). */
export async function getMfaStatusAction(): Promise<
  ActionSuccess & { enabled: boolean; factorId: string | null } | ActionFailure
> {
  try {
    const token = await requireAccessToken();
    const factors = await listMfaFactors(token);
    const verified = factors.find((f) => f.status === "verified");
    return { ok: true, enabled: Boolean(verified), factorId: verified?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      enabled: false,
      factorId: null,
    } as ActionSuccess & { enabled: boolean; factorId: string | null } | ActionFailure;
  }
}

/** Begin 2FA enrollment — returns QR code + secret + open challenge. */
export async function startMfaEnrollmentAction(): Promise<
  ActionSuccess & { factorId: string; challengeId: string; qrCode: string; secret: string } | ActionFailure
> {
  try {
    const token = await requireAccessToken();
    const enrollment = await enrollMfaTotp(token, "Couples Corner");
    return { ok: true, ...enrollment };
  } catch (err) {
    return actionError(err);
  }
}

/** Verify the 6-digit code to finish 2FA enrollment. */
export async function verifyMfaEnrollmentAction(
  factorId: string,
  challengeId: string,
  code: string
): Promise<ActionResult> {
  try {
    if (!/^\d{6}$/.test(code.trim())) {
      return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
    }
    const token = await requireAccessToken();
    const { newAccessToken } = await verifyMfaEnrollment(
      token,
      factorId,
      challengeId,
      code.trim()
    );

    // GoTrue rotates the access token on a verified MFA challenge — keep our
    // session cookie in sync so the next request doesn't bounce.
    if (newAccessToken) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_SECONDS,
        path: "/",
      });
    }
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Turn 2FA off by removing the verified factor. */
export async function disableMfaAction(factorId: string): Promise<ActionResult> {
  try {
    const token = await requireAccessToken();
    await unenrollMfa(token, factorId);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Refresh the active sessions list. */
export async function listSecuritySessionsAction(): Promise<
  ActionSuccess & { sessions: Awaited<ReturnType<typeof listUserSessions>> } | ActionFailure
> {
  try {
    const token = await requireAccessToken();
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Please sign in again" };
    const sessions = await listUserSessions(user.uid, token);
    return { ok: true, sessions };
  } catch (err) {
    return actionError(err);
  }
}

/** Sign out one device session. */
export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    const token = await requireAccessToken();
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Please sign in again" };
    await revokeUserSession(user.uid, sessionId);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}

/** Sign out every other device. */
export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  try {
    const token = await requireAccessToken();
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, error: "Please sign in again" };
    await revokeAllOtherSessions(user.uid, token);
    return { ok: true };
  } catch (err) {
    return actionError(err);
  }
}
