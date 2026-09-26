import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { uploadProfilePhoto } from "@/lib/server/profiles";
import { recordAuditBestEffort } from "@/lib/server/audit";

/**
 * POST /api/photos/profile
 *
 * LEGACY — superseded by direct browser -> storage upload.
 *
 * This route reads the file with `await request.formData()`, which makes it the
 * request body of a Vercel function. Vercel rejects any function request body
 * over 4.5 MB with 413 FUNCTION_PAYLOAD_TOO_LARGE *before* this handler runs,
 * so a photo between 4.5 MB and the advertised 20 MB cap could never be
 * uploaded through here — the client just saw a network error.
 *
 * Kept working and kept correct rather than deleted, because removing an
 * endpoint is a breaking change for any client that has not been redeployed (a
 * cached old bundle, a native wrapper). New code should use:
 *   1. `uploadFileDirect(uid, file, { bucket: "photos", profilePhoto: true })`
 *   2. `setProfilePhotoAction({ userId, storagePath })`
 *
 * Auth = httpOnly session cookie, with fallback to an Authorization bearer
 * token carrying a fresh Supabase access token (the cookie's token expires
 * after ~1h while the cookie lives 14 days; see lib/supabase/auth-client).
 */
export async function POST(request: NextRequest) {
  console.warn(
    "[profile-photo] legacy upload route used; migrate the client to direct storage upload"
  );

  // Auth = httpOnly session cookie, with fallback to an Authorization bearer
  // token carrying a fresh Supabase access token (the cookie's token expires
  // after ~1h while the cookie lives 14 days; see lib/supabase/auth-client).
  const session = await getCurrentSessionUser(request.headers.get("authorization"));
  if (!session) {
    return NextResponse.json(
      {
        error: "Authentication required",
        hint: "Your session expired. Please sign out and sign back in, then retry the upload.",
      },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadProfilePhoto(session.uid, file);

    await recordAuditBestEffort({
      adminUserId: session.uid,
      action: "profile_photo_upload",
      targetRef: { type: "profilePhoto", id: result.path },
      reason: "profile photo uploaded via API",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[profile-photo] upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
