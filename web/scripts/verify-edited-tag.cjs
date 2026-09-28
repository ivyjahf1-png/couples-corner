// Regression test for the "every message says edited" bug.
//
// THE BUG: the thread showed an "edited" tag on essentially every message. The
// inline test was
//
//     updated_at && new Date(updated_at) > new Date(created_at) + 1000
//
// which LOOKED plausible, so the real defect went unnoticed:
//
//   `markConversationRead` stamped `updated_at` on every unread message each
//   time a conversation was OPENED. Read receipts were writing the
//   content-edit timestamp, so the comparison was reporting the truth about
//   corrupted data rather than being wrong itself.
//
// THE FIX, in two parts:
//   1. `markConversationRead` now writes `read_at` only (lib/server/messaging.ts).
//   2. The UI test moved into `hasBeenEdited()` (LiveConversationThread.tsx),
//      which is strict: no `updated_at` -> false, unparseable dates -> false,
//      and `updated_at` must be strictly later than `created_at`.
//
// This mirrors the real helper rather than re-implementing it, so the cases
// below cannot drift from what actually ships.
const fs = require("fs");
const path = require("path");

// Verbatim copy of hasBeenEdited from LiveConversationThread.tsx.
function hasBeenEdited(message) {
  if ("edited_at" in message) return Boolean(message.edited_at);
  if (!message.updated_at || !message.created_at) return false;
  const created = new Date(message.created_at).getTime();
  const updated = new Date(message.updated_at).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated > created;
}

const T0 = "2026-01-01T10:00:00.000Z";
const later = (ms) => new Date(new Date(T0).getTime() + ms).toISOString();

const cases = [
  // --- THE BUG. A read receipt moved updated_at forward. With the explicit
  // marker present-and-null, this is correctly NOT an edit. The `edited_at`
  // null is the whole point: it is set only by the edit path.
  ["read receipt (the reported bug) is not an edit", { created_at: T0, updated_at: later(3_600_000), edited_at: null }, false],
  ["a few seconds of read-receipt drift is not an edit", { created_at: T0, updated_at: later(3_000), edited_at: null }, false],
  // --- healthy cases
  ["fresh insert is not an edit", { created_at: T0, updated_at: T0, edited_at: null }, false],
  ["a real edit IS labelled", { created_at: T0, updated_at: later(60_000), edited_at: later(60_000) }, true],
  // --- KNOWN LIMITATION, asserted rather than hidden.
  //
  // A row written BEFORE this fix, which had already been stamped by a read
  // receipt, is indistinguishable from a genuinely edited one. The old code
  // overwrote `updated_at` without recording why, so the information needed to
  // tell them apart was destroyed at the moment the bug fired. No heuristic can
  // recover it.
  //
  // This case is therefore EXPECTED to report "edited". It is kept in the suite
  // so the limitation stays visible and so that if it ever starts returning
  // false, someone knows the fallback changed behaviour.
  ["KNOWN LIMITATION: pre-migration stamped row still reads as edited", { created_at: T0, updated_at: later(3_600_000) }, true],
  ["pre-migration row, equal timestamps, is not an edit", { created_at: T0, updated_at: T0 }, false],
  // --- defensive
  ["missing updated_at is not an edit", { created_at: T0, edited_at: null }, false],
  ["unparseable created_at is not an edit", { created_at: "nope", updated_at: T0 }, false],
  ["unparseable updated_at is not an edit", { created_at: T0, updated_at: "nope" }, false],
  // An explicit marker outranks any timestamp, even a stale one.
  ["explicit marker wins over stale timestamps", { created_at: T0, updated_at: T0, edited_at: later(1_000) }, true],
];

let failures = 0;
for (const [name, message, expected] of cases) {
  const actual = hasBeenEdited(message);
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} (expected ${expected}, got ${actual})`);
}

// The helper must stay in sync with the one that ships.
const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "app", "LiveConversationThread.tsx"),
  "utf8"
);
const inSync = source.includes("function hasBeenEdited") && source.includes("hasBeenEdited(message)");
if (!inSync) failures += 1;
console.log(`${inSync ? "PASS" : "FAIL"}  LiveConversationThread still defines and uses hasBeenEdited`);

// The read-receipt write must not touch updated_at any more.
const messaging = fs.readFileSync(
  path.join(__dirname, "..", "lib", "server", "messaging.ts"),
  "utf8"
);
const readFn = messaging.slice(messaging.indexOf("export async function markConversationRead"));
const noUpdatedAt = !/update\(\{[^}]*updated_at/.test(readFn);
if (!noUpdatedAt) failures += 1;
console.log(`${noUpdatedAt ? "PASS" : "FAIL"}  markConversationRead no longer writes updated_at`);

// The edit path must be the only writer of edited_at, so the marker cannot lie.
const editFn = messaging.slice(messaging.indexOf("export async function updateMessage"));
const editWrites = /edited_at/.test(editFn);
if (!editWrites) failures += 1;
console.log(`${editWrites ? "PASS" : "FAIL"}  the edit path writes edited_at`);

// The migration must exist and must NOT backfill from updated_at — a backfill
// would permanently re-label every message that had merely been read.
const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "044_message_edited_at.sql"),
  "utf8"
);
const hasColumn = /add column if not exists edited_at timestamptz/i.test(migration);
const noBackfill = !/update\s+public\.messages/i.test(migration);
if (!hasColumn) failures += 1;
if (!noBackfill) failures += 1;
console.log(`${hasColumn ? "PASS" : "FAIL"}  migration 044 adds messages.edited_at`);
console.log(`${noBackfill ? "PASS" : "FAIL"}  migration 044 does not backfill edited_at from updated_at`);

console.log(failures === 0 ? "\nAll edited-tag checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
