/*
 * Self-cleaning live-schema probe #2 for the bot/likes/nearby feature.
 *
 * Decides the final shape of migration 023 by answering, against the LIVE db:
 *   1. Can `bot_setup_log` take a synthetic uuid (i.e. is it FK-free)?
 *   2. Can `profile_likes` take a synthetic liker_id (FK-free)?
 *   3. Can `user_locations` take a synthetic user_id (FK-free)?
 *   4. Can `messages` be inserted with a synthetic `sender_id` into a
 *      `'direct'` conversation whose participants are also synthetic?
 *      (This is what all 30 seeded bot chats rely on.)
 *   5. Which `messages` columns are NOT NULL, so the seed insert supplies them.
 *
 * Every row it creates is deleted again before it exits.
 * Run: node scripts/probe-bot-schema-2.cjs
 */
const { loadEnvConfig } = require("@next/env");
const { randomUUID } = require("crypto");
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("ENV-STATUS: missing Supabase env");
  process.exit(0);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers, ...init });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function report(label, result, extra = "") {
  console.log(
    `${label.padEnd(46)} -> ${result.status} ${result.ok ? "OK" : "FAIL"} ${extra}`
  );
  if (!result.ok) {
    const detail = JSON.stringify(result.body).slice(0, 300);
    console.log(`   detail: ${detail}`);
  }
}

(async () => {
  // ------------------------------------------------- messages NOT NULL columns
  const specRes = await fetch(`${url}/rest/v1/`, {
    headers: { ...headers, Accept: "application/openapi+json" },
  });
  const spec = await specRes.json();
  const messagesDef = spec.definitions?.messages;
  if (messagesDef) {
    console.log(
      `messages required(nullable=false): ${JSON.stringify(messagesDef.required ?? [])}`
    );
  } else {
    console.log("messages: NOT EXPOSED");
  }

  const botId = randomUUID();
  const userId = randomUUID();

  // ------------------------------------------------ 1. bot_setup_log synthetic
  const logInsert = await rest("bot_setup_log", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, processed_at: new Date().toISOString() }),
  });
  report("bot_setup_log synthetic user_id", logInsert);
  if (logInsert.ok) {
    await rest(`bot_setup_log?user_id=eq.${userId}`, { method: "DELETE" });
  }

  // --------------------------------------------------- 2. profile_likes synthetic
  const likeInsert = await rest("profile_likes", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      liker_id: botId,
      liked_user_id: userId,
      is_bot: true,
      is_blurred: true,
      created_at: new Date().toISOString(),
    }),
  });
  report("profile_likes synthetic liker_id", likeInsert);
  if (likeInsert.ok) {
    await rest(`profile_likes?liker_id=eq.${botId}`, { method: "DELETE" });
  }

  // --------------------------------------------------- 3. user_locations synthetic
  const locInsert = await rest("user_locations", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      latitude: 6.5244,
      longitude: 3.3792,
      updated_at: new Date().toISOString(),
    }),
  });
  report("user_locations synthetic user_id", locInsert);
  if (locInsert.ok) {
    await rest(`user_locations?user_id=eq.${userId}`, { method: "DELETE" });
  }

  // ---------------------------- 4. conversation (direct) + message (synthetic sender)
  const convId = randomUUID();
  const convInsert = await rest("conversations", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      id: convId,
      type: "direct",
      participant_user_ids: [userId, botId],
      created_by_id: userId,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  report("conversations direct + synthetic participants", convInsert);

  let messageInsert = { ok: false, status: 0, body: null };
  if (convInsert.ok) {
    messageInsert = await rest("messages", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        conversation_id: convId,
        sender_id: botId,
        type: "text",
        body: "PROBE seed message",
        status: "sent",
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    report("messages synthetic sender_id", messageInsert);
    console.log(
      messageInsert.ok
        ? "  => the 30 bot chat threads can use conversations + messages directly."
        : "  => bot seeds need dedicated tables; conversations path is blocked."
    );
  }

  // --------------------------------------------------------------- 5. cleanup
  if (messageInsert.ok) {
    await rest(`messages?conversation_id=eq.${convId}`, { method: "DELETE" });
  }
  if (convInsert.ok) {
    await rest(`conversations?id=eq.${convId}`, { method: "DELETE" });
  }
  console.log("probe #2 complete (all probe rows removed).");
})().catch((e) => console.error("PROBE-CRASH:", e.message));
