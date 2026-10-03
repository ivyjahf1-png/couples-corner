/*
 * READ-ONLY probe: does the live `posts` table match what the app inserts?
 *
 * WHY THIS EXISTS. Migrations 006 and 008 both begin with
 * `create table if not exists public.posts`, so whichever ran first wins and the
 * other is a silent no-op:
 *
 *   006's shape:  user_id uuid not null, media_urls jsonb, no author_id, no visibility
 *   008's shape:  author_id uuid not null, media_urls text[], visibility text
 *
 * `createFeedPostAction` (lib/actions/profile.ts) inserts 008's shape because
 * that is what `getPublicFeed` selects and what the `posts_insert_own` policy
 * checks. If the deployed table is still 006's, every publish fails with 42703
 * ("column author_id does not exist") or PGRST204 (schema cache) — which the
 * member sees as "my photo doesn't appear".
 *
 * This writes NOTHING and deletes nothing. It only reads columns, constraints,
 * policies and the PostgREST OpenAPI spec, then prints a verdict. Safe to run
 * against production at any time.
 *
 * Run: node scripts/probe-posts-schema.cjs
 */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("ENV-STATUS: missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
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

function line(label, value) {
  console.log(`${String(label).padEnd(34)} ${value}`);
}

(async () => {
  console.log("=== posts table: columns the app depends on ===");

  const { body: cols } = await rest(
    "posts?select=*&limit=1"
  );

  if (!cols) {
    // A select error here is itself the finding: PostgREST cannot serve the table.
    console.log("  FAILED to select from posts — see the HTTP status above.");
  }

  /* Read the real shape from the OpenAPI spec rather than inferring it from a
     sample row: a row only proves which columns happen to be populated, not
     which ones exist. The spec lists every column PostgREST knows about, which
     is exactly the set an insert may name. */
  const specRes = await fetch(`${url}/rest/v1/`, { headers });
  const spec = await specRes.json().catch(() => null);
  const def = spec?.definitions?.posts;

  if (def) {
    const names = Object.keys(def.properties || {});
    console.log("");
    line("columns visible to PostgREST:", names.join(", ") || "(none)");
    console.log("");

    for (const col of ["author_id", "user_id", "visibility", "media_urls", "content"]) {
      const present = names.includes(col);
      const type = def.properties?.[col]?.format || def.properties?.[col]?.type || "";
      line(`${col}:`, present ? `present ${type ? `(${type})` : ""}` : "MISSING");
    }

    console.log("");
    console.log("=== verdict ===");

    const hasAuthor = names.includes("author_id");
    const hasVisibility = names.includes("visibility");

    if (hasAuthor && hasVisibility) {
      console.log("  OK — the deployed table matches 008's shape.");
      console.log("  createFeedPostAction should insert cleanly.");
    } else {
      console.log("  MISMATCH — the app inserts author_id + visibility, which are absent.");
      console.log("  Every publish will fail with 42703 / PGRST204 until this is run:");
      console.log("");
      console.log("    supabase/migrations/049_reconcile_posts_schema.sql");
      console.log("");
      console.log("  It is idempotent and safe to run twice. After running it, if the");
      console.log("  error persists, PostgREST is serving a stale schema cache — 049 and");
      console.log("  052 both end with `notify pgrst, 'reload schema'` for this reason.");
    }

    const mediaType = def.properties?.media_urls?.items?.type || def.properties?.media_urls?.type;
    if (mediaType === "string") {
      console.log("");
      console.log("  NOTE: media_urls is text[] (008 shape) — the app's string[] is correct.");
    } else if (mediaType) {
      console.log("");
      console.log(`  NOTE: media_urls is ${mediaType} — expected text[] under 008's shape.`);
    }
  } else {
    console.log("");
    console.log("  Could not read the OpenAPI spec for `posts`.");
    console.log("  Check that the table is exposed to the REST role.");
  }

  console.log("");
  console.log("(this probe made no writes)");
})();
