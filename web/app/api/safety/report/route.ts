import "server-only";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { createReport } from "@/lib/server/safety";
import type { ReportEntityType, ReportReason } from "@/lib/models";

/**
 * POST /api/safety/report
 *
 * Authenticated users submit reports. The server attaches `reporterId` from the
 * verified session cookie — the client cannot spoof it. Priority is derived
 * server-side from the reason. Firestore rules require reporterId == auth.uid,
 * and this route is the only writer.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityType, entityId, reason, details } = body as {
      entityType: ReportEntityType;
      entityId: string;
      reason: ReportReason;
      details?: string | null;
    };

    if (!entityType || !entityId || !reason) {
      return NextResponse.json(
        { error: "entityType, entityId, and reason are required" },
        { status: 400 }
      );
    }

    const reportId = await createReport({
      reporterId: session.uid,
      entityType,
      entityId,
      reason,
      details,
    });

    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
