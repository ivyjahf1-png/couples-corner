import fs from "fs";

const path = "c:/Users/HomePC/Documents/couples-corner/web/lib/server/messaging.ts";
let content = fs.readFileSync(path, "utf-8");

const startMarker = "/** Send a message into a conversation. */";
const endMarker = "\r\n/**\r\n * Edit a message";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find sendMessage function boundaries");
  process.exit(1);
}

console.log("Found sendMessage at:", startIdx, "to", endIdx);

const oldFn = content.substring(startIdx, endIdx);

const newFn = `/** True when two users have a mutual match in the public.matches table. */
async function hasMatchBetween(userA: string, userB: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const a = userA < userB ? userA : userB;
  const b = userA < userB ? userB : userA;
  const { data } = await supabase
    .from("matches")
    .select("id")
    .eq("user1_id", a)
    .eq("user2_id", b)
    .maybeSingle();
  return Boolean(data);
}

/** Direct intro price in coins. */
const DIRECT_INTRO_COINS = 100;

/** Deduct coins from a user's wallet via the service-role RPC. Returns false
 *  when the balance is insufficient or the wallet is missing. */
async function deductCoins(userId: string, amount: number): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const { data: wallet } = await supabase
    .from("game_wallets")
    .select("coin_balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (!wallet || typeof wallet.coin_balance !== "number" || wallet.coin_balance < amount) {
    return false;
  }

  const { error } = await supabase.rpc("increment_user_coins", {
    p_user_id: userId,
    p_amount: -amount,
  });
  return !error;
}

/** Send a message into a conversation.
 *
 * MUTUAL MATCH GATE:
 *   • If a mutual match exists between sender and the other participant,
 *     the insert is free and proceeds immediately.
 *   • If no match exists, the sender must have >= DIRECT_INTRO_COINS
 *     (100) coins; 100 are debited before the message is written.
 *   • Insufficient coins throws so the caller can surface an inline error.
 */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
  type?: Message["type"];
}): Promise<MessageRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  /* Resolve the other participant in this conversation so we can check the
     mutual match gate. The conversation row is authoritative for who is in
     the thread. */
  const { data: conversation } = await supabase
    .from("conversations")
    .select("participant_user_ids")
    .eq("id", params.conversationId)
    .maybeSingle();
  const participantIds = (conversation?.participant_user_ids as string[] | undefined) ?? [];
  const otherId = participantIds.find((id) => id && id !== params.senderId);

  let matched = false;
  if (otherId) {
    matched = await hasMatchBetween(params.senderId, otherId);
  }

  /* When there is no match (or no other participant to match with), gate the
     send behind a coin payment. A direct intro costs DIRECT_INTRO_COINS. */
  if (!matched) {
    const paid = await deductCoins(params.senderId, DIRECT_INTRO_COINS);
    if (!paid) {
      const error = new Error("Insufficient coins for direct intro");
      (error as { code?: string }).code = "INSUFFICIENT_COINS";
      throw error;
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert(
      buildMessageInsert({
        conversationId: params.conversationId,
        senderId: params.senderId,
        body: params.body,
        type: params.type ?? "text",
        createdAt: now,
        updatedAt: now,
      })
    )
    /* Row shape matches \`MessageRow\` — the same columns \`listMessages\`
       selects, so both read paths agree on what a message row IS. */
    .select("id, conversation_id, sender_id, type, body, read_at, created_at, updated_at, image_url, audio_url")
    .single();

  // Never swallow the database exception — it is the only way to diagnose a
  // failed send (e.g. 23502 NOT NULL on a legacy column, 42501 RLS denial).
  if (error) {
    console.error("[messaging] Message insert failed", {
      conversationId: params.conversationId,
      senderId: params.senderId,
      ...supabaseErrorDetail(error),
    });
    throw error;
  }

  // Update conversation's last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", params.conversationId);

  return (data as MessageRow | null) ?? null;
}`;

content = content.replace(oldFn, newFn);
fs.writeFileSync(path, content, "utf-8");
console.log("Patched successfully");