/**
 * Wallet server actions — coin withdrawal requests.
 *
 * The request is recorded as a pending row so staff can settle it; when the
 * backing table is absent (migration not applied yet) the action fails
 * gracefully with a message instead of throwing.
 */
"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requestWithdrawalAction(params: {
  amount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { amount } = params;
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Withdrawals are unavailable right now. Try again later." };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };
    const { error } = await supabase.from("coin_withdrawals").insert({
      user_id: user.id,
      amount,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false, error: "Withdrawals are unavailable right now. Try again later." };
  }
}
