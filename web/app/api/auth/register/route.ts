/**
 * POST /api/auth/register
 *
 * Called by the client immediately after Supabase Auth account creation.
 * Verifies the caller's access token with the Supabase server client, then
 * provisions users/{uid} + profiles/{uid}. Deliberately thin: no client-supplied role,
 * status, or any other privileged field is ever accepted.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/server/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accessToken?: string;
      displayName?: string;
    };
    if (!body.accessToken || typeof body.accessToken !== "string") {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }
    if (body.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.length > 60)) {
      return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
    }

    // Verify the token and get the user
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data, error } = await supabase.auth.getUser(body.accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await provisionUser({
      uid: data.user.id,
      email: data.user.email ?? "",
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

