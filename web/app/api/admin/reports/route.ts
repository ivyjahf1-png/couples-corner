import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adminRefs } from "@/lib/firebase/collections";
import type { Report } from "@/lib/models";

/**
 * Admin moderation: list open/reviewed reports, highest priority first.
 * Admin only — requires verified custom claim via requireAdmin().
 */
export async function GET() {
  const admin = await requireAdmin();
  const refs = adminRefs(getAdminFirestore());
  const snap = await refs.reports
    .where("status", "in", ["open", "reviewed"])
    .orderBy("priority", "desc")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const reports = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Report, "id"> & { priority: string }),
  }));

  return NextResponse.json({ adminId: admin.uid, reports });
}

/**
 * Admin moderation: triage a report (dismiss / warn / restrict / suspend / ban).
 * The decision AND its audit-log entry are written in the SAME transaction, so
 * a moderation action can never commit without its audit record.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();

  try {
    const body = await request.json().catch(() => ({}));
    const { reportId, action, note } = body as {
      reportId: string;
      action: "review" | "dismiss" | "warn" | "restrict" | "suspend" | "ban" | "remove-content";
      note?: string | null;
    };

    if (!reportId || !action) {
      return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const refs = adminRefs(db);
    const now = new Date().toISOString();

    const reportDoc = await refs.reports.doc(reportId).get();
    if (!reportDoc.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const report = reportDoc.data() as Report;

    const newStatus = action === "dismiss" ? "dismissed" : "resolved";

    await db.runTransaction(async (tx) => {
      tx.update(refs.reports.doc(reportId), {
        status: newStatus,
        handledByAdminId: admin.uid,
        resolutionNote: note?.trim() || null,
        updatedAt: now,
      });

      tx.set(refs.auditLogs.doc(), {
        adminUserId: admin.uid,
        entityType: report.entityType,
        entityId: report.entityId,
        action,
        note: note?.trim() || null,
        resolvedReportId: reportId,
        createdAt: now,
      });
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
