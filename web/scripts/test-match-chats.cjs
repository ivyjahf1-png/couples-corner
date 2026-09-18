/*
 * Self-cleaning round-trip test for the Matches chats data path.
 * Validates the exact columns/filters the app uses against the live database:
 *   1. conversations insert (connections.ts payload)
 *   2. participant filter query (match-chats.ts payload)
 *   3. messages insert with the app payload (messaging.ts / chat page)
 *   4. messages read-back
 * Cleans up everything it created. Run: node scripts/test-match-chats.cjs
 */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes("your-project")) {
  console.log("ENV-STATUS: missing Supabase env — cannot run live test");
  process.exit(0);
}

const h = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...h,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

let conversationId = null;
let failures = 0;
function check(label, ok, detail) {
  if (ok) console.log(`PASS: ${label}`);
  else {
    failures += 1;
    console.error(`FAIL: ${label}${detail ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

(async () => {
  // Real user ids are required: messages.sender_id has an FK to users(id).
  const usersRes = await rest("users?select=id&limit=2");
  if (!usersRes.ok || !Array.isArray(usersRes.body) || usersRes.body.length < 2) {
    console.log("ENV-STATUS: need at least 2 rows in public.users to run the live test");
    process.exit(0);
  }
  const userA = usersRes.body[0].id;
  const userB = usersRes.body[1].id;
  const now = new Date().toISOString();

  try {
    // 1) conversations insert — exact payload from lib/server/connections.ts
    const conv = await rest("conversations", {
      method: "POST",
      body: JSON.stringify({
        type: "direct",
        participant_user_ids: [userA, userB],
        created_by_id: userA,
        created_at: now,
        updated_at: now,
      }),
    });
    check("conversations insert (connections.ts payload)", conv.ok, conv.body);
    if (!conv.ok) return;
    conversationId = conv.body[0].id;
    console.log(`      created conversation ${conversationId}`);

    // 2) participant-filter query — exact payload from lib/server/match-chats.ts
    const list = await rest(
      `conversations?select=id,type,participant_user_ids,last_message_at&participant_user_ids=cs.%7B${userA}%7D&order=last_message_at.desc.nullslast&order=created_at.desc&limit=100`
    );
    check(
      "participant filter returns the conversation (match-chats.ts)",
      list.ok && Array.isArray(list.body) && list.body.some((r) => r.id === conversationId),
      list.body
    );

    // 3) messages insert — exact payload produced by the REAL app helper
    //    (lib/utils/message-payload.ts, used by messaging.ts, outbox.ts, chat page)
    const { buildMessageInsert } = require("../lib/utils/message-payload.ts");
    const payload = buildMessageInsert({
      conversationId,
      senderId: userA,
      body: "round-trip test",
      type: "text",
      status: "sent",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`      payload keys: ${Object.keys(payload).join(", ")}`);
    const msg = await rest("messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    check("messages insert (buildMessageInsert payload)", msg.ok, msg.body);
    if (msg.ok) {
      check(
        "legacy content column mirrors body",
        msg.body[0].body === "round-trip test" && msg.body[0].content === "round-trip test",
        { body: msg.body[0].body, content: msg.body[0].content }
      );
      check("insert returns a non-null id (no null .id crash)", Boolean(msg.body[0].id), msg.body[0].id);
    }

    // 4) messages read-back — exact query from messaging.ts listMessages
    if (msg.ok) {
      const read = await rest(
        `messages?select=*&conversation_id=eq.${conversationId}&order=created_at.asc&limit=500`
      );
      check("messages read-back", read.ok && read.body.length === 1, read.body);
    }

    // 5) conversation activity update — messaging.ts sendMessage tail
    const touch = await rest(`conversations?id=eq.${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ last_message_at: now, updated_at: now }),
    });
    check("conversations last_message_at update", touch.ok, touch.body);
  } finally {
    // Cleanup — never leave test rows behind.
    if (conversationId) {
      await rest(`messages?conversation_id=eq.${conversationId}`, { method: "DELETE" });
      await rest(`conversations?id=eq.${conversationId}`, { method: "DELETE" });
      const remaining = await rest(`conversations?id=eq.${conversationId}&select=id`);
      console.log(`      cleanup: conversation removed = ${remaining.body?.length === 0}`);
    }
    console.log(failures === 0 ? "\nRESULT: PASS — match-chats data path verified" : `\nRESULT: FAIL (${failures})`);
    process.exit(failures === 0 ? 0 : 1);
  }
})().catch((e) => {
  console.error("TEST-CRASH:", e.message);
  process.exit(1);
});
