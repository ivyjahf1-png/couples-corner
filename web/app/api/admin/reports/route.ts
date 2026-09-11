import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Report } from "@/lib/models";

/**
 * Admin moderation: list open/reviewed reports, highest priority first.
 * Admin only — requires verified role via requireAdmin().
 */
export async function GET() {
  const admin = await requireAdmin();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: reportRows } = await supabase
    .from("reports")
    .select("*")
    .in("status", ["open", "reviewed"])
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (reportRows ?? []).map((row) => ({
    id: row.id,
    ...(row as unknown as Omit<Report, "id">),
  }));

  return NextResponse.json({ adminId: admin.uid, reports });
}

/**
 * Admin moderation: triage a report (dismiss / warn / restrict / suspend / ban / remove-content).
 * The decision AND its audit-log entry are written together.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

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

    // Get report
    const { data: reportRow } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!reportRow) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = reportRow as unknown as Report;
    const newStatus = action === "dismiss" ? "dismissed" : "resolved";
    const now = new Date().toISOString();

    // Update report status
    await supabase
      .from("reports")
      .update({
        status: newStatus,
        handled_by_admin_id: admin.uid,
        resolution_note: note?.trim() || null,
        updated_at: now,
      })
      .eq("id", reportId);

    // Write audit log
    await supabase.from("audit_logs").insert({
      admin_user_id: admin.uid,
      action,
      target_ref: { type: report.entityType, id: report.entityId },
      details: {
        note: note?.trim() || null,
        resolved_report_id: reportId,
      },
      created_at: now,
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

