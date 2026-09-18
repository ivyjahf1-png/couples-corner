const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, console, Error, require(name) {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  }});
  return exports;
}
const validation = load('lib/utils/media-upload.ts');
async function scenario({ failSave = false, corrupt = false } = {}) {
  const calls = { uploads: [], removals: [], updates: [] };
  const bucket = {
    async upload(path, bytes, options) { calls.uploads.push({ path, bytes, options }); return { error: null }; },
    async remove(paths) { calls.removals.push(...paths); return { error: null }; },
  };
  const db = {
    storage: { async getBucket() { return { error: null }; }, from(name) { assert.equal(name, 'photos'); return bucket; } },
    from(name) {
      assert.equal(name, 'profiles');
      let updating = false;
      const query = {
        select() { return query; }, eq() { return query; }, is() { return query; },
        update(value) { updating = true; calls.updates.push(value); return query; },
        async single() {
          return updating
            ? { data: failSave ? null : { user_id: 'owner' }, error: failSave ? { code: 'TEST', message: 'save failed' } : null }
            : { data: { photos: corrupt ? ['https://legacy.example/a.jpg'] : [{ storagePath: 'ok', isPrimary: true }] }, error: null };
        },
      };
      return query;
    },
  };
  const api = load('lib/server/profiles.ts', {
    'server-only': {}, '@/lib/supabase/server': { getSupabaseServerClient: () => db },
    './audit': { recordAuditBestEffort: async () => {} }, './safety': {},
    '@/lib/utils/profile-completion': {}, '@/lib/utils/media-upload': validation,
  });
  const file = new File([new Uint8Array([255, 216, 255])], 'photo.jpg', { type: 'image/jpeg' });
  if (corrupt) {
    await assert.rejects(api.uploadProfilePhoto('owner', file), /database repair/, 'legacy text[] photos data must abort before upload');
    assert.equal(calls.uploads.length, 0, 'no storage object may be uploaded when the profile row is incompatible');
    return;
  }
  if (failSave) await assert.rejects(api.uploadProfilePhoto('owner', file), /could not be linked/);
  else {
    const result = await api.uploadProfilePhoto('owner', file);
    assert.equal(result.url, `/api/photos/owner/${result.path.split('/').pop()}`);
    assert.equal(calls.updates[0].photos[0].storagePath, result.path);
    assert.equal(calls.updates[0].photos[0].isPrimary, true);
    assert.equal(calls.updates[0].photos[1].storagePath, 'ok');
    assert.equal(calls.updates[0].photos[1].isPrimary, false, 'previous photos must be demoted, not dropped');
  }
  assert.equal(calls.uploads.length, 1);
  assert.equal(calls.removals.length, failSave ? 1 : 0);
  assert.equal(calls.uploads[0].options.contentType, 'image/jpeg');
}
(async () => {
  assert.equal(validation.validateMediaFile({ size: 100, type: 'video/quicktime' }), null);
  assert.ok(validation.validateMediaFile({ size: 100, type: 'video/quicktime' }, true));
  await scenario({ corrupt: true });
  await scenario();
  await scenario({ failSave: true });
  console.log('PASS: legacy-data abort, upload, persisted photo, URL, and failed-save cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
