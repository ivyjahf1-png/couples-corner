/**
 * POST /api/auth/register
 *
 * Called by the client immediately after Firebase Auth account creation.
 * Verifies the caller's ID token with the Admin SDK, then provisions
 * users/{uid} + profiles/{uid}. Deliberately thin: no client-supplied role,
 * status, or any other privileged field is ever accepted.
 */

import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { provisionUser } from "@/lib/server/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idToken?: string;
      displayName?: string;
    };
    if (!body.idToken || typeof body.idToken !== "string") {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
    if (body.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.length > 60)) {
      return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
    }

    // Verify the token (not revocation-checked here — the account was just created).
    const decoded = await getAdminAuth().verifyIdToken(body.idToken);

    await provisionUser(getAdminFirestore(), {
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log the full error for server-side debugging.
    console.error("[/api/auth/register] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Could not create your account record" }, { status: 500 });
  }
}
