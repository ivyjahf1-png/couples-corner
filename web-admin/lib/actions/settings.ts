"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requireAdminDev } from "@/lib/auth/authorization";
import { rethrowIfNavigation } from "@/lib/utils/errors";
import {
  getPlatformSettings,
  savePlatformSettings,
} from "@/lib/server/settings";

export interface SettingsActionResult {
  ok: boolean;
  error?: string;
}

/** Load payment settings (admin only). */
export async function getPlatformSettingsAction() {
  await requireAdminDev();
  return getPlatformSettings();
}

/** Persist Paystack credentials (admin only). */
export async function savePaymentSettingsAction(
  paystackPublicKey: string,
  paystackSecretKey: string
): Promise<SettingsActionResult> {
  try {
    await requireAdminDev();
    await savePlatformSettings({
      paystackPublicKey: paystackPublicKey.trim(),
      paystackSecretKey: paystackSecretKey.trim(),
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (err) {
    // redirect()/notFound() from requireAdminDev() must propagate so Next.js
    // navigates correctly instead of reporting a bogus save error.
    rethrowIfNavigation(err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save payment settings.",
    };
  }
}