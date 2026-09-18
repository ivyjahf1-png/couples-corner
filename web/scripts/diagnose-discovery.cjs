// Read-only diagnostic. Never prints credentials or profile/account contents.
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');
const path = require('node:path');

loadEnvConfig(path.resolve(__dirname, '..'), process.argv.includes('--production') ? false : true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const source = fs.readFileSync(path.resolve(__dirname, '../lib/server/profiles.ts'), 'utf8');
const fields = [...source.match(/PROFILE_DB_FIELDS = \[([\s\S]*?)\] as const/)[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function report(stage, query, summarize = () => ({})) {
  const response = await query.abortSignal(AbortSignal.timeout(12000));
  console.log(JSON.stringify({ stage, status: response.status, error: response.error, ...summarize(response.data) }, null, 2));
  return response;
}

(async () => {
  await report('profiles column names (sample row, values omitted)', client.from('profiles').select('*').limit(1), (rows) => {
    const columns = Object.keys(rows?.[0] ?? {});
    return { columns, selectedFieldsMissingFromSample: columns.length ? fields.filter((field) => !columns.includes(field)) : null };
  });
  const profiles = await report('original Discover profile query', client.from('profiles').select(fields.join(',')).eq('discoverable', true).eq('visibility', 'public').limit(24), (rows) => ({
    count: rows?.length ?? 0,
    invalidUserIds: rows?.filter((row) => typeof row.user_id !== 'string' || !uuid.test(row.user_id)).length ?? 0,
  }));
  if (profiles.data?.length) {
    await report('original account lookup (reproduces invalid IDs)', client.from('users').select('id,display_name,username,avatar_url,country,status').in('id', profiles.data.map((row) => row.user_id)).eq('status', 'active'));
  }
  await report('corrected profile candidate query', client.from('profiles').select(fields.join(',')).not('user_id', 'is', null).eq('discoverable', true).eq('visibility', 'public').limit(24), (rows) => ({ count: rows?.length ?? 0 }));
  await Promise.all([
    ['connection_requests', 'id,from_user_id,to_user_id,status'],
    ['connections', 'id,user1_id,user2_id'],
    ['blocks', 'id,blocker_id,blocked_id'],
  ].map(([table, columns]) => report(table, client.from(table).select(columns).limit(0))));
  const viewer = process.env.DISCOVERY_VIEWER_UID;
  console.log(JSON.stringify({ viewerUid: viewer ? (uuid.test(viewer) ? 'valid UUID' : 'INVALID UUID') : 'not supplied; set DISCOVERY_VIEWER_UID to test a viewer' }));
  if (viewer && uuid.test(viewer)) {
    await report('viewer interests', client.from('profiles').select('interests').eq('user_id', viewer).maybeSingle());
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
