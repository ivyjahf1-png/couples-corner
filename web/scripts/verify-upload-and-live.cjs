// Two guards in one script, because both are about a failure mode that is
// invisible in review until a user hits it:
//
//   1. UPLOAD — a File travelling through a Server Action request body.
//   2. GO LIVE — the feature existing but being unreachable from the UI.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n        ${detail}`}`);
}

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const files = walk(root);
const read = (f) => fs.readFileSync(f, "utf8");
const rel = (f) => path.relative(root, f);

// ── 1. UPLOAD ───────────────────────────────────────────────────────────────
//
// Vercel rejects a FUNCTION request body over 4.5 MB with 413
// FUNCTION_PAYLOAD_TOO_LARGE *before* the action runs, so a File handed to a
// Server Action is capped at 4.5 MB no matter what the app advertises (250 MB
// for user media). The rejection never reaches application code, so nothing is
// logged and the UI just shows "Payload too large" / E394.
//
// The fix pattern is: bytes go browser -> Supabase Storage via
// `uploadFileDirect`, and the action receives only a short storage path.
const actionFiles = files.filter((f) => /[\\/]lib[\\/]actions[\\/]/.test(f));

// A function is excused ONLY if it carries an explicit DEPRECATED marker in its
// own doc comment. That is checked rather than hard-coded by name so the
// exemption cannot silently widen: adding a "deprecated" comment to a live
// upload path would be caught here, because the no-UI-caller rule below still
// applies to it.
const isDocumentedDeprecated = (text, fnName) => {
  const at = text.indexOf(`export async function ${fnName}`);
  if (at === -1) return false;
  // Walk back over the contiguous doc comment immediately above the function.
  const before = text.slice(0, at);
  const start = before.lastIndexOf("/**");
  const end = before.lastIndexOf("*/");
  if (start === -1 || end === -1 || end < start) return false;
  return /DEPRECATED/.test(before.slice(start, end));
};

const fileParams = [];
for (const f of actionFiles) {
  const text = read(f);
  const re = /export\s+async\s+function\s+(\w+)\s*\([^)]*(file\s*:\s*File|files\s*:\s*File\[\])/gs;
  for (const m of text.matchAll(re)) {
    // A documented-deprecated File-taking action is tolerated HERE, but only
    // because the next check proves nothing calls it. It is a tombstone that
    // records why the pattern is wrong, not a supported path.
    if (isDocumentedDeprecated(text, m[1])) continue;
    fileParams.push(`${rel(f)} (${m[1]})`);
  }
}
check(
  "no live server action accepts a File",
  fileParams.length === 0,
  fileParams.join(", ")
);

// The one documented exception must stay genuinely dead: a DEPRECATED
// File-taking action is tolerable only while nothing calls it. If a UI starts
// using it, the 4.5 MB cap is back in production and this must fail.
const deprecated = [];
for (const f of actionFiles) {
  const text = read(f);
  for (const m of text.matchAll(
    /export\s+async\s+function\s+(\w+)\s*\([^)]*(?:file\s*:\s*File|files\s*:\s*File\[\])/gs
  )) {
    const fn = m[1];
    if (!isDocumentedDeprecated(text, fn)) continue;
    const callers = files.filter(
      (c) => c !== f && new RegExp(`\\b${fn}\\s*\\(`).test(read(c))
    );
    if (callers.length > 0) {
      deprecated.push(
        `${fn} (${path.basename(rel(f))}) is called from ${callers.map((c) => path.basename(rel(c))).join(", ")}`
      );
    }
  }
}
check(
  "deprecated File-taking actions have no callers",
  deprecated.length === 0,
  deprecated.join("; ")
);

// The direct uploader must still exist and still be what the UI calls.
check("the direct upload helper still exists", fs.existsSync(path.join(root, "lib", "utils", "direct-upload.ts")));

const momentAction = read(path.join(root, "lib", "actions", "tasks.ts"));
check(
  "the moment action takes a storage path, not a file",
  !/file\s*:\s*File/.test(momentAction) && /storagePath/.test(momentAction)
);

// The user-media cap is the 250 MB the UI advertises.
const limits = read(path.join(root, "lib", "utils", "media-upload.ts"));
check("the user-media cap is 250 MB", /MAX_USER_MEDIA_BYTES = 250 \* 1024 \* 1024/.test(limits));

// Every upload UI must route through the direct helper.
for (const ui of [
  "components/app/FeedUploadModal.tsx",
  "components/app/ProfilePhotoUploader.tsx",
  "components/admin/ContentForm.tsx",
]) {
  const text = read(path.join(root, ui));
  check(
    `${path.basename(ui)} uploads directly to storage`,
    /uploadFileDirect|uploadMediaDirect/.test(text)
  );
}

// ── 2. GO LIVE ──────────────────────────────────────────────────────────────
//
// A feature that exists but cannot be reached from the UI is invisible. These
// assert at least two independent entry points, so losing one still leaves the
// other.
const nav = read(path.join(root, "components", "app", "AppNav.tsx"));
const liveNavEntries = (nav.match(/href:\s*"\/live"/g) || []).length;
check(
  "Go Live is in the sidebar AND the mobile drawer",
  liveNavEntries >= 2,
  `found ${liveNavEntries}`
);

const sheet = read(path.join(root, "components", "app", "FeedUploadModal.tsx"));
check("the creation sheet links to /live", /href="\/live"/.test(sheet));
check("the creation sheet labels it Go Live", />\s*Go Live/.test(sheet));

// The route itself must exist, or the links 404.
check(
  "the /live route exists",
  fs.existsSync(path.join(root, "app", "(realtime)", "live", "page.tsx"))
);

// The nav needs an icon that actually renders.
const icons = read(path.join(root, "components", "landing", "Icon.tsx"));
check("the live icon is registered", /"live"/.test(icons) && /live:\s*\(/.test(icons));

console.log(
  failures === 0
    ? "\nAll upload + go-live checks passed."
    : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
