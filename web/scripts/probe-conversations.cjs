/* Live-schema probe for the matches-chats failure. Run: node scripts/probe-conversations.cjs */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes("your-project")) {
  console.log("ENV-STATUS: url=" + (url ? url : "MISSING") + " key=" + (key ? "set" : "MISSING"));
  process.exit(0);
}
const headers = { apikey: key, Authorization: "Bearer " + key };
async function tryTable(table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.log(`[${table}] HTTP ${res.status}: ${JSON.stringify(body)}`);
    return null;
  }
  return body;
}
(async () => {
  // 1) Does the table exist at all?
  const rows = await tryTable("conversations", "select=*&limit=3");
  if (rows === null) return;
  if (rows.length === 0) {
    console.log("[conversations] table EXISTS but is EMPTY (no rows to infer columns).");
    // introspect via OpenAPI
    const res = await fetch(`${url}/rest/v1/`, { headers });
    const spec = await res.json();
    const def = spec.definitions && spec.definitions.conversations;
    console.log("[conversations] OpenAPI columns:", def ? Object.keys(def.properties).join(", ") : "TABLE NOT IN OpenAPI (does not exist)");
    const msg = spec.definitions && spec.definitions.messages;
    console.log("[messages] OpenAPI columns:", msg ? Object.keys(msg.properties).join(", ") : "TABLE NOT IN OpenAPI");
  } else {
    console.log("[conversations] columns:", Object.keys(rows[0]).join(", "));
    console.log("[conversations] sample row:", JSON.stringify(rows[0]).slice(0, 400));
  }
  // 2) Reproduce the exact query the Matches page runs (service role bypasses RLS,
  //    so any error here is a schema problem, not an RLS problem).
  const q = "select=id,type,participant_user_ids,last_message_at&order=last_message_at.desc.nullsfirst&limit=3";
  await tryTable("conversations", q);
  const q2 = "select=id,type,participant_user_ids,last_message_at&order=last_message_at.desc.nullslast&limit=3";
  const ok = await tryTable("conversations", q2);
  console.log(ok !== null ? "[repro with nullslast] OK rows=" + ok.length : "[repro with nullslast] FAILED");
})().catch((e) => console.log("PROBE-CRASH:", e.message));
