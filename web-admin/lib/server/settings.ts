import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Couples Corner — platform settings persistence (SERVER ONLY).
 * Stores a single JSON blob row in `platform_settings` keyed by `id = 'default'`.
 */

export interface PlatformPaymentSettings {
  paystackPublicKey: string;
  paystackSecretKey: string;
}

/** The global settings row id (singleton). */
export const SETTINGS_ID = "default";

function parseData(raw: unknown): Partial<PlatformPaymentSettings> {
  if (raw && typeof raw === "object") return raw as Partial<PlatformPaymentSettings>;
  return {};
}

/** Load platform payment settings, falling back to empty strings when unset. */
export async function getPlatformSettings(): Promise<PlatformPaymentSettings> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("platform_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;

  const d = parseData(data?.data);
  return {
    paystackPublicKey: d.paystackPublicKey ?? "",
    paystackSecretKey: d.paystackSecretKey ?? "",
  };
}

/** Upsert platform payment settings (single row). */
export async function savePlatformSettings(
  input: PlatformPaymentSettings
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        data: input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) throw error;
}