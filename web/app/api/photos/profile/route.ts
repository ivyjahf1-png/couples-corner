import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { uploadProfilePhoto } from "@/lib/server/profiles";
import { recordAudit } from "@/lib/server/audit";

/**
 * POST /api/photos/profile
 *
 * Authenticated profile-photo upload. The file is validated (type + size),
 * owned by the session user's uid in the storage path, and recorded on their
 * profile document via the Admin SDK. The browser never sees Admin credentials.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadProfilePhoto(session.uid, file);

    await recordAudit({
      adminUserId: session.uid,
      action: "profile_photo_upload",
      targetRef: { type: "profilePhoto", id: result.path },
      reason: "profile photo uploaded via API",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
