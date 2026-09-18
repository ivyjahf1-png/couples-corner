/*
 * Targeted probe: confirm that messages inserts succeed once the legacy
 * NOT NULL `content` column is satisfied. Creates and deletes its own rows.
 * Run: node scripts/probe-message-insert.cjs
 */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("ENV-STATUS: missing Supabase env");
  process.exit(0);
}
const { generateUuid } = require("../lib/utils/uuid.ts");
const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...h, Prefer: "return=representation", ...(init.headers ?? {}) },
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

(async () => {
  const a = generateUuid();
  const b = generateUuid();
  const now = new Date().toISOString();
  let conv = null;
  try {
    const c = await rest("conversations", {
      method: "POST",
      body: JSON.stringify({
        type: "direct",
        participant_user_ids: [a, b],
        created_by_id: a,
        created_at: now,
        updated_at: now,
      }),
    });
    if (!c.ok) {
      console.log("conversations insert FAILED:", JSON.stringify(c.body));
      return;
    }
    conv = c.body[0].id;

    // Variant 1: body only (what the app currently writes)
    const v1 = await rest("messages", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: conv,
        sender_id: a,
        type: "text",
        body: "variant-1",
        created_at: now,
        updated_at: now,
      }),
    });
    console.log(`VARIANT-1 (body only): ok=${v1.ok} ${v1.ok ? "" : JSON.stringify(v1.body?.message)}`);

    // Variant 2: body + legacy content (proposed app fix)
    const v2 = await rest("messages", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: conv,
        sender_id: a,
        type: "text",
        body: "variant-2",
        content: "variant-2",
        created_at: now,
        updated_at: now,
      }),
    });
    console.log(`VARIANT-2 (body + content): ok=${v2.ok} ${v2.ok ? `id=${v2.body[0].id}` : JSON.stringify(v2.body?.message)}`);
    if (v2.ok) {
      console.log(`  readback body=${JSON.stringify(v2.body[0].body)} content=${JSON.stringify(v2.body[0].content)}`);
    }
  } finally {
    if (conv) {
      await rest(`messages?conversation_id=eq.${conv}`, { method: "DELETE" });
      await rest(`conversations?id=eq.${conv}`, { method: "DELETE" });
      console.log("cleanup done");
    }
  }
})().catch((e) => console.error("PROBE-CRASH:", e.message));