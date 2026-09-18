import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { uploadProfilePhoto } from "@/lib/server/profiles";
import { recordAuditBestEffort } from "@/lib/server/audit";

/**
 * POST /api/photos/profile
 *
 * Authenticated profile-photo upload. The file is validated (type + size),
 * owned by the session user's uid in the storage path, and recorded on their
 * profile document via the Admin SDK. The browser never sees Admin credentials.
 */
export async function POST(request: NextRequest) {
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
