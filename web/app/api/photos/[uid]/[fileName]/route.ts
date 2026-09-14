import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/server/profiles";

/**
 * GET /api/photos/{uid}/{fileName}
 *
 * Serves a profile photo from Supabase Storage through the server client.
 * This avoids signed-URL expiration issues while still letting us gate
 * access server-side if needed (e.g. private profiles in the future).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string; fileName: string }> }
) {
  const { uid, fileName } = await params;

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const path = `profiles/${uid}/${fileName}`;

    const { data, error } = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).download(path);

    if (error || !data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const buffer = await data.arrayBuffer();
    const contentType = data.type || "image/jpeg";

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
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
 * Removes a profile photo from Supabase Storage and clears it from the user's
 * profile document. Only the photo owner may delete their own photo.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; fileName: string }> }
) {
  const session = await getCurrentSessionUser(request.headers.get("authorization"));
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { uid, fileName } = await params;

  // Only the owner may delete their own photo.
  if (session.uid !== uid) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const path = `profiles/${uid}/${fileName}`;

    // Delete from storage
    const { error: deleteError } = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
    if (deleteError) {
      throw deleteError;
    }

    // Remove the photo from the user's profile document.
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("photos")
      .eq("user_id", uid)
      .single();

    if (profileRow) {
      const photos = (profileRow.photos as Array<{ storagePath: string }>) ?? [];
      const updatedPhotos = photos.filter((p) => p.storagePath !== path);
      // Strip unknown keys in case the `photos` column hasn't been migrated yet.
      const photoUpdates: Record<string, unknown> = {
        photos: updatedPhotos,
      };
      const KNOWN_PROFILE_COLUMNS = new Set([
        "user_id",
        "display_name",
        "bio",
        "interests",
        "location",
        "country",
        "gender",
        "orientation",
        "date_of_birth",
        "relationship_status",
        "occupation",
        "genotype",
        "profile_type",
        "looking_for",
        "visibility",
        "discoverable",
        "preferences",
        "photos",
        "created_at",
        "updated_at",
      ]);
      for (const key of Object.keys(photoUpdates)) {
        if (!KNOWN_PROFILE_COLUMNS.has(key)) delete photoUpdates[key];
      }
      await supabase
        .from("profiles")
        .update(photoUpdates)
        .eq("user_id", uid);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 500 }
    );
  }
}


