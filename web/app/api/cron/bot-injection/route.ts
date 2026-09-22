import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cron endpoint for the automated bot onboarding system (migration 023).
 *
 * Calls process_bot_onboarding() which, for every user registered at least
 * 2 days ago that hasn't been processed yet:
 *   • injects 10 blurry placeholder like profiles (profile_likes)
 *   • populates 30 interactive bot profiles (flagged via preferences)
 *   • seeds realistic chat data (conversations + messages)
 *
 * Schedule with an external cron (e.g. Netlify Scheduled Function, GitHub
 * Action, or Supabase pg_cron — see the migration) hitting this route:
 *
 *   POST /api/cron/bot-injection
 *   Authorization: Bearer $CRON_SECRET   (required only when CRON_SECRET is set)
 *
 * The function is idempotent (guarded by bot_setup_log) so calling it more
 * often is safe.
 */

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function run(): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("process_bot_onboarding", { p_limit: 50 });
  if (error) {
    console.error("[cron/bot-injection] RPC failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: data ?? 0 });
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}

async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.headers.get("x-cron-secret") ??
      "";
    if (header !== secret) return unauthorized();
  }
  return run();
}
