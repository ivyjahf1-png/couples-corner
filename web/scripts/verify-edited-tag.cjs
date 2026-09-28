// Guards that the "edited" label cannot reappear in the chat UI.
//
// HISTORY: the tag was rendered from
//
//     updated_at && new Date(updated_at) > new Date(created_at) + 1000
//
// and, because markConversationRead also wrote `updated_at`, it appeared on
// essentially every message. That was fixed in fe272de. This label has since
// been removed from the product entirely by decision, so the helper that drove
// it went with it.
//
// The underlying data is still correct and still maintained — markConversationRead
// writes only `read_at`, and the edit path still stamps `edited_at` — but none of
// it is surfaced. This script exists so a well-meaning "let's show edited
// again" change cannot land without noticing that the timestamps are unreliable
// on pre-migration rows (see the note at the bottom).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n        ${detail}`}`);
}

const thread = fs.readFileSync(
  path.join(root, "components", "app", "LiveConversationThread.tsx"),
  "utf8"
);

// 1. No user-visible "edited" text anywhere in the component.
const visibleTag = /<span[^>]*>\s*edited\s*<\/span>/i.test(thread);
check("no 'edited' label is rendered in the thread", !visibleTag);

// 2. The helper that produced it must be gone, not merely unused.
check(
  "the hasBeenEdited helper is removed",
  !/function hasBeenEdited/.test(thread)
);

// 3. The timestamp is still rendered — removing the label must not have
//    taken the message time with it.
check("the message timestamp is still rendered", /formatTime\(message\.created_at\)/.test(thread));

// 4. Nothing else in the app renders an "edited" label either.
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const offenders = walk(root)
  .filter((f) => !f.endsWith("044_message_edited_at.sql"))
  .filter((f) => /<span[^>]*>\s*edited\s*<\/span>/i.test(fs.readFileSync(f, "utf8")))
  .map((f) => path.relative(root, f));

check(
  "no component anywhere renders an 'edited' label",
  offenders.length === 0,
  offenders.join(", ")
);

// 5. The data-layer fixes from fe272de must survive: they are what makes the
//    timestamps trustworthy for anyone who wants the label back later.
const messaging = fs.readFileSync(path.join(root, "lib", "server", "messaging.ts"), "utf8");
const readFn = messaging.slice(messaging.indexOf("export async function markConversationRead"));
check(
  "markConversationRead still writes read_at only",
  !/update\(\{[^}]*updated_at/.test(readFn)
);
check(
  "the edit path still stamps edited_at",
  /edited_at/.test(messaging.slice(messaging.indexOf("export async function updateMessage")))
);

console.log(
  failures === 0
    ? "\nAll edited-label checks passed."
    : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);

