import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage, getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import { getCurrentSessionUser } from "@/lib/server/session";

/**
 * GET /api/photos/{uid}/{fileName}
 *
 * Serves a profile photo from Cloud Storage through the Admin SDK.
 * This avoids signed-URL expiration issues while still letting us gate
 * access server-side if needed (e.g. private profiles in the future).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string; fileName: string }> }
) {
  const { uid, fileName } = await params;

  try {
    const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(`profiles/${uid}/${fileName}`);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": (metadata as { contentType?: string }).contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load photo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/{uid}/{fileName}
 *
 * Removes a profile photo from Cloud Storage and clears it from the user's
 * profile document. Only the photo owner may delete their own photo.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string; fileName: string }> }
) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { uid, fileName } = await params;

  // Only the owner may delete their own photo.
  if (session.uid !== uid) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const path = `profiles/${uid}/${fileName}`;
    const file = bucket.file(path);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }

    // Remove the photo from the user's profile document.
    const profileRef = adminRefs(getAdminFirestore()).userProfiles.doc(uid);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      const profile = profileSnap.data() as { photos?: Array<{ storagePath: string }> };
      const updatedPhotos = (profile.photos ?? []).filter((p) => p.storagePath !== path);
      await profileRef.set({ photos: updatedPhotos }, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 500 }
    );
  }
}

