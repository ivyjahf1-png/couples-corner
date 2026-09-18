/*
 * Dump the live PostgREST schema for the chat tables so we can see every
 * column, type, and nullability the app must satisfy.
 * Run: node scripts/probe-chat-schema.cjs
 */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("ENV-STATUS: missing Supabase env");
  process.exit(0);
}

(async () => {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
  });
  const spec = await res.json();
  for (const table of ["messages", "conversations"]) {
    const def = spec.definitions?.[table];
    if (!def) {
      console.log(`\n=== ${table}: NOT EXPOSED ===`);
      continue;
    }
    console.log(`\n=== ${table} (required: ${JSON.stringify(def.required ?? [])}) ===`);
    for (const [name, col] of Object.entries(def.properties ?? {})) {
      const nullable = col.format?.includes("nullable") ? "NULLABLE" : "not-null";
      console.log(
        `  ${name.padEnd(22)} ${String(col.type).padEnd(10)} ${String(col.format ?? "").padEnd(24)} ${nullable} default=${JSON.stringify(col.default ?? null)}`
      );
    }
  }
})().catch((e) => console.error("PROBE-CRASH:", e.message));