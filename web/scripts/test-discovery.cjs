// Run with node; uses the project's existing TypeScript compiler, no test dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports, logger = console) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, console: logger });
  return exports;
}
const utils = load('lib/utils/discovery-profile.ts', {});
const viewer = '11111111-1111-4111-8111-111111111111';
const candidate = '22222222-2222-4222-8222-222222222222';
function service(rows, blockError = null) {
  const calls = [];
  const logs = [];
  const client = { from(table) {
    calls.push(table);
    const ops = [];
    const query = {};
    for (const method of ['select', 'not', 'neq', 'eq', 'limit', 'maybeSingle', 'in']) {
      query[method] = (...args) => { ops.push([method, ...args]); return query; };
    }
    query.then = (resolve, reject) => {
      const interests = ops.some((op) => op[0] === 'select' && op[1] === 'interests');
      const data = table === 'profiles' ? (interests ? null : rows) : [];
      return Promise.resolve({ data, error: table === 'blocks' ? blockError : null }).then(resolve, reject);
    };
    return query;
  } };
  const api = load('lib/server/discovery.ts', {
    'server-only': {},
    '@/lib/supabase/server': { getSupabaseServerClient: () => client },
    '@/lib/server/profiles': {},
    '@/lib/utils/discovery-profile': utils,
  }, { error: (...args) => logs.push(args), warn: () => {} });
  return { ...api, calls, logs };
}
(async () => {
  for (const id of [null, undefined, 'null', '', 42, 'bad-id']) assert.equal(utils.isDiscoveryUserId(id), false);
  assert.equal(utils.isDiscoveryUserId(viewer), true);
  const orphan = service([{ user_id: null }, { user_id: 'bad-id' }]);
  assert.equal((await orphan.getDiscoverProfiles(viewer)).length, 0);
  assert.deepEqual(orphan.calls, ['profiles']);
  const empty = service([]);
  assert.equal((await empty.getDiscoverProfiles(viewer)).length, 0);
  const invalid = service([]);
  await assert.rejects(invalid.getDiscoverProfiles('null'), /Invalid discovery viewer/);
  assert.equal(invalid.calls.length, 0);
  const blocked = service([{ user_id: candidate }], { code: 'PGRST205', message: 'Missing blocks table' });
  await assert.rejects(blocked.getDiscoverProfiles(viewer), /blocks.by_viewer.*PGRST205/);
  assert.equal(blocked.calls.includes('users'), false);
  assert.equal(blocked.logs[0][1].stage, 'blocks.by_viewer');
  assert.equal(blocked.logs[0][1].code, 'PGRST205');
  console.log('PASS: UUID validation, orphan/empty feed, invalid viewer, fail-closed blocks, structured diagnostics');
})().catch((error) => { console.error(error); process.exitCode = 1; });
