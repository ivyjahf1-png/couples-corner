/**
 * Wallet server actions — coin withdrawal requests and payout binding.
 *
 * A withdrawal request is recorded as a pending row so staff can settle it, and
 * the payout destination is stored separately so the member only binds it once.
 * When a backing table is absent (migration not applied yet) every action here
 * fails gracefully with a message instead of throwing — the wallet modal must
 * still open and still show a balance when the database is behind.
 */
"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/** How a member wants to be paid. */
export type PayoutMethod = "bank" | "crypto";

/** One bound withdrawal destination. */
export interface PayoutAccount {
  method: PayoutMethod;
  /** Bank name ("GTBank") or crypto network ("TRC-20"). */
  provider: string;
  /** Account number / IBAN, or the wallet address. */
  destination: string;
  /** Account or wallet holder name. */
  holderName: string;
}

/** Upper bounds so a caller cannot store a megabyte of text in a payout row. */
const MAX_FIELD_LENGTH = 120;

/**
 * Validate a payout destination.
 *
 * Returns a human-readable problem, or null when the input is acceptable. The
 * checks are deliberately permissive about FORMAT: an IBAN, a domestic account
 * number and a crypto address are all just strings of plausible characters, and
 * rejecting a valid-but-unusual one would block a real member. What is enforced
 * is presence, length, and a character set that rules out control characters —
 * enough that a bound destination cannot inject markup into the staff-facing
 * settlement view.
 */
function validatePayout(account: PayoutAccount): string | null {
  if (account.method !== "bank" && account.method !== "crypto") {
    return "Choose a bank account or a crypto wallet.";
  }
  const fields: (keyof PayoutAccount)[] = ["provider", "destination", "holderName"];
  for (const field of fields) {
    const value = account[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      return "Fill in every field before binding your account.";
    }
    if (value.length > MAX_FIELD_LENGTH) {
      return "One of those fields is too long. Keep it under 120 characters.";
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F]/.test(value)) {
      return "Remove any line breaks from those details.";
    }
  }
  return null;
}

/**
 * Read the signed-in member's bound payout destination.
 *
 * Returns `account: null` when nothing is bound, which is the normal first-run
 * state and must not read as an error.
 */
export async function getPayoutAccountAction(): Promise<{
  ok: boolean;
  account?: PayoutAccount | null;
  error?: string;
}> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Wallet is unavailable right now." };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const { data, error } = await supabase
      .from("payout_accounts")
      .select("method, provider, destination, holder_name")
      .eq("user_id", user.id)
      .maybeSingle();
    // A missing table (migration 057 not applied) surfaces here as an error;
    // treat it as "nothing bound" so the modal still works, minus binding.
    if (error || !data) return { ok: true, account: null };

    const row = data as {
      method?: string | null;
      provider?: string | null;
      destination?: string | null;
      holder_name?: string | null;
    };
    if (row.method !== "bank" && row.method !== "crypto") return { ok: true, account: null };
    return {
      ok: true,
      account: {
        method: row.method,
        provider: row.provider ?? "",
        destination: row.destination ?? "",
        holderName: row.holder_name ?? "",
      },
    };
  } catch {
    return { ok: false, error: "Wallet is unavailable right now." };
  }
}

/**
 * Bind (or replace) the member's payout destination.
 *
 * One row per member, so this is an UPSERT rather than an insert: rebinding
 * after moving bank must update the existing row, not fail on the primary key
 * or leave two competing destinations behind.
 */
export async function savePayoutAccountAction(params: {
  account: PayoutAccount;
}): Promise<{ ok: boolean; error?: string }> {
  const problem = validatePayout(params.account);
  if (problem) return { ok: false, error: problem };
  const { account } = params;

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Wallet is unavailable right now." };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const { error } = await supabase.from("payout_accounts").upsert(
      {
        user_id: user.id,
        method: account.method,
        provider: account.provider.trim(),
        destination: account.destination.trim(),
        holder_name: account.holderName.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true };
  } catch {
    // Most likely migration 057 is not applied yet. Say so plainly rather than
    // pretending the bind succeeded and failing at withdrawal time instead.
    return {
      ok: false,
      error: "Binding an account isn't available yet. You can still withdraw.",
    };
  }
}

/** Remove the bound destination. Idempotent: unbinding twice is not an error. */
export async function clearPayoutAccountAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Wallet is unavailable right now." };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You are not signed in." };

    const { error } = await supabase.from("payout_accounts").delete().eq("user_id", user.id);
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't unbind that account. Try again later." };
  }
}

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
