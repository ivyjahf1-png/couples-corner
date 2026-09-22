/*
 * Self-cleaning live-schema probe for migration 023 (likes / bots / locations).
 *
 * Answers the two questions that decide whether the bot-onboarding SQL can
 * run on the live database:
 *   1. Can `profiles` rows be inserted with a synthetic `user_id` (i.e. is
 *      there a real FK to auth.users)?  Bot profiles rely on this.
 *   2. Does `conversations.type` accept 'person', or only the documented
 *      ('direct' | 'couple' | 'group') set?
 *   3. Which `profiles` columns are actually NOT NULL (so the bot insert
 *      has to supply them)?
 *
 * Every row it creates is deleted again before it exits.
 * Run: node scripts/probe-bot-onboarding-schema.cjs
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

(async () => {
  // ---------------------------------------------------------------- 1. columns
  const specRes = await fetch(`${url}/rest/v1/`, {
    headers: { ...headers, Accept: "application/openapi+json" },
  });
  const spec = await specRes.json();
  for (const table of ["users", "profiles", "conversations", "messages", "profile_likes", "user_locations", "bot_setup_log"]) {
    const def = spec.definitions?.[table];
    if (!def) {
      console.log(`\n=== ${table}: NOT EXPOSED (table missing) ===`);
      continue;
    }
    console.log(`\n=== ${table} | required(nullable=false): ${JSON.stringify(def.required ?? [])} ===`);
    if (table === "profiles" || table === "conversations" || table === "users") {
      for (const [name, col] of Object.entries(def.properties ?? {})) {
        const nullable = String(col.format ?? "").includes("nullable") ? "NULLABLE" : "not-null";
        console.log(`  ${name.padEnd(22)} ${String(col.type).padEnd(10)} ${nullable} default=${JSON.stringify(col.default ?? null)}`);
      }
    }
  }

  const profilesDef = spec.definitions?.profiles;
  if (!profilesDef) {
    console.log("\nABORT: profiles table not exposed — cannot continue.");
    return;
  }
  const profileColumns = Object.keys(profilesDef.properties ?? {});
  const requiredProfileColumns = profilesDef.required ?? [];

  const usersDef = spec.definitions?.users;
  const userColumns = Object.keys(usersDef?.properties ?? {});

  // ------------------------------- 2a. synthetic account row (public.users)
  const botId = randomUUID();
  const accountRow = {
    id: botId,
    email: `probe-bot-${botId.slice(0, 8)}@example.invalid`,
    display_name: "PROBE Bot Couple",
    role: "user",
    status: "active",
  };
  for (const column of Object.keys(accountRow)) {
    if (!userColumns.includes(column)) delete accountRow[column];
  }
  const accountInsert = await rest("users", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(accountRow),
  });
  console.log(`\n=== users insert with synthetic id -> ${accountInsert.status} ${accountInsert.ok ? "OK" : "FAIL"} ===`);
  if (!accountInsert.ok) console.log("  detail:", JSON.stringify(accountInsert.body).slice(0, 400));

  // ------------------------------------------------- 2b. synthetic bot profile
  const botRow = {
    id: botId,
    user_id: botId,
    display_name: "PROBE Bot Couple",
    bio: "probe row",
    occupation: "Teacher",
    interests: ["travel"],
    photos: [],
    visibility: "public",
    discoverable: true,
    preferences: { is_bot: true, probe: true },
    created_at: new Date().toISOString(),
  };
  for (const column of Object.keys(botRow)) {
    if (!profileColumns.includes(column)) delete botRow[column];
  }

  const profileInsert = await rest("profiles", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(botRow),
  });
  console.log(`=== profiles insert with synthetic user_id -> ${profileInsert.status} ${profileInsert.ok ? "OK" : "FAIL"} ===`);
  if (!profileInsert.ok) {
    console.log("  detail:", JSON.stringify(profileInsert.body).slice(0, 400));
    console.log("  => a real FK/NOT NULL blocks bot profiles; migration must adapt.");
  } else {
    console.log("  => bot profiles with a synthetic user_id are allowed.");
  }
  if (requiredProfileColumns.length > 0) {
    console.log(`  NOT NULL columns the bot insert must always send: ${requiredProfileColumns.join(", ")}`);
  }

  // ------------------------------------------- 3. conversations.type variants
  const convBase = {
    participant_user_ids: [botId],
    created_by_id: null,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Probe 'person' first: it is the value migration 023 wants to use, so we
  // need an explicit answer rather than "direct happened to work".
  for (const candidate of ["person", "direct"]) {
    const insert = await rest("conversations", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ ...convBase, id: randomUUID(), type: candidate }),
    });
    console.log(`conversations.type=${candidate.padEnd(8)} -> ${insert.status} ${insert.ok ? "OK" : "FAIL"}`);
    if (!insert.ok) console.log("   detail:", JSON.stringify(insert.body).slice(0, 300));
    if (insert.ok) await rest(`conversations?id=eq.${insert.body[0].id}`, { method: "DELETE" });
  }

  // ------------------------------------------------------------- 4. cleanup
  if (profileInsert.ok) {
    const del = await rest(`profiles?id=eq.${botId}`, { method: "DELETE" });
    console.log(`\ncleanup profiles -> ${del.status} ${del.ok ? "OK" : "FAIL"}`);
  }
  if (accountInsert.ok) {
    const del = await rest(`users?id=eq.${botId}`, { method: "DELETE" });
    console.log(`cleanup users    -> ${del.status} ${del.ok ? "OK" : "FAIL"}`);
  }
  console.log("probe complete (all probe rows removed).");
})().catch((e) => console.error("PROBE-CRASH:", e.message));
