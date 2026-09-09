import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { blockUser, unblockUser } from "@/lib/server/safety";

/**
 * POST /api/safety/block
 *
 * Authenticated users block someone. The target is taken from the URL/query —
 * never trusted from a client field — and the blockerId always comes from the
 * verified session. Unblock via DELETE with ?targetUid=.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetUid = searchParams.get("targetUid");
    if (!targetUid) {
      return NextResponse.json({ error: "targetUid is required" }, { status: 400 });
    }
    await blockUser(session.uid, targetUid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to block user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetUid = searchParams.get("targetUid");
    if (!targetUid) {
      return NextResponse.json({ error: "targetUid is required" }, { status: 400 });
    }
    await unblockUser(session.uid, targetUid);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unblock user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
