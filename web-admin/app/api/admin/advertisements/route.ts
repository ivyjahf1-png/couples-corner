import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSessionUser } from "@/lib/server/session";
import { requireActorUuid } from "@/lib/server/actor";
import { readScheduleValue, toIsoDate } from "@/lib/models/content";

/**
 * POST /api/admin/advertisements
 *
 * Secure server-side advertisement creation. Uses the service-role key to
 * bypass RLS for authorized admins only. Service key never leaves the server.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSessionUser().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Authentication required. Sign in as an admin." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin access required." }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const s = (v: unknown): string => (typeof v === "string" ? v : "");
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Optional UUID inputs must never be forwarded as empty strings: PostgreSQL
    // rejects `""` before it can apply its foreign-key/default semantics.
    const optionalUuid = (value: unknown): string | null => {
      const candidate = typeof value === "string" ? value.trim() : "";
      return candidate ? candidate : null;
    };
    const errors: string[] = [];
    if (!s(body.category)) errors.push("category is required.");
    if (!s(body.title).trim()) errors.push("title is required.");
    if (!s(body.mediaType)) errors.push("mediaType is required.");
    if (!s(body.placement)) errors.push("placement is required.");
    if (!s(body.status)) errors.push("status is required.");
    // Scheduling is canonical as `start_date` / `end_date` across the model,
    // form and row. Legacy camelCase `startAt` / `endAt` payload keys are still
    // accepted (older cached clients) but canonical keys always win.
    const startIso = toIsoDate(readScheduleValue(body, "start"));
    const endIso = toIsoDate(readScheduleValue(body, "end"));
    if (errors.length > 0 || !startIso || !endIso) {
      if (!startIso) errors.push("start_date is required and must be a valid ISO 8601 date.");
      if (!endIso) errors.push("end_date is required and must be a valid ISO 8601 date.");
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      return NextResponse.json({ error: "end_date must be after start_date." }, { status: 400 });
    }

    const payload = {
      category: s(body.category),
      title: s(body.title).trim(),
      description: s(body.description).trim() || null,
      media_type: s(body.mediaType),
      media_url: s(body.mediaUrl).trim() || null,
      thumbnail_url: s(body.thumbnailUrl).trim() || null,
      button_text: s(body.buttonText).trim() || null,
      destination_url: s(body.destinationUrl).trim() || null,
      placement: s(body.placement),
      status: s(body.status),
      priority: Number(body.priority) || 0,
      // `content.start_at` / `content.end_at` are the real DB columns
      // (see supabase/migrations/011_content_table.sql). startIso / endIso are
      // guaranteed non-empty ISO strings by the validation above.
      start_at: startIso,
      end_at: endIso,
      target_audience: s(body.targetAudience).trim() || null,
    };

    // Reuse the process-wide cached service-role client instead of building a
    // new SupabaseClient per request — no redundant initialization on the hot
    // admin write path, and env validation/quote-stripping stays centralized.
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.error("[AdminAdsAPI] Supabase credentials not configured.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const rawId = optionalUuid(body.id);
    if (rawId && !uuidRe.test(rawId)) {
      return NextResponse.json({ error: "id must be a valid UUID when provided." }, { status: 400 });
    }
    const requestedActor = optionalUuid(body.adminUid);
    if (requestedActor && !uuidRe.test(requestedActor)) {
      return NextResponse.json({ error: "adminUid must be a valid UUID when provided." }, { status: 400 });
    }

    let actorUid: string;
    try {
      actorUid = await requireActorUuid(
        requestedActor ?? session.uid,
        "advertisement creation"
      );
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Unable to identify admin." },
        { status: 401 }
      );
    }

    const row: Record<string, unknown> = {
      ...payload,
      created_by: actorUid,
      updated_by: actorUid,
      created_at: now,
      updated_at: now,
    };
    if (rawId && uuidRe.test(rawId)) row.id = rawId;

    const { data, error } = await supabase.from("content").insert(row).select("id").single();
    if (error) {
      console.error("[AdminAdsAPI] Supabase insert error:", error.message);
      // The service-role client bypasses RLS entirely — a row-level-security
      // error here means the service key env var is missing/stale and the
      // server fell back to a non-bypassing path. Surface that specifically.
      if (/row-level security|42501/i.test(error.message)) {
        return NextResponse.json(
          { error: "Insert was rejected by RLS — check that SUPABASE_SERVICE_ROLE_KEY is set correctly and restart the server." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: `Failed to create advertisement: ${error.message}` }, { status: 500 });
    }

    try {
      await supabase.from("audit_logs").insert({
        admin_user_id: actorUid,
        action: "content.create",
        target_ref: { type: "content", id: data.id },
        details: { title: payload.title, placement: payload.placement },
        created_at: now,
      });
    } catch {
      console.warn("[AdminAdsAPI] audit log failed.");
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AdminAdsAPI] Unexpected error:", message);
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
