/**
 * Fast syntax/diagnostic check for the files touched by the Matches fix.
 * Uses the TypeScript transpileModule API so it never walks the project graph
 * (the full `tsc -p` run hangs on this machine's node_modules junctions).
 */
const path = require("path");
const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));

const files = [
  "lib/server/match-chats.ts",
  "lib/utils/supabase-error.ts",
  "lib/utils/message-payload.ts",
  "lib/server/messaging.ts",
  "lib/server/outbox.ts",
  "app/chat/page.tsx",
  "app/(app)/matches/page.tsx",
  "app/(app)/matches/ActiveChats.tsx",
];

let failed = false;
for (const rel of files) {
  const absolute = path.join(__dirname, "..", rel);
  const source = require("fs").readFileSync(absolute, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
    },
    fileName: absolute,
    reportDiagnostics: true,
  });
  const diagnostics = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  if (diagnostics.length > 0) {
    failed = true;
    for (const d of diagnostics) {
      const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null;
      console.error(
        `${rel}${pos ? `:${pos.line + 1}:${pos.character + 1}` : ""} — ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
      );
    }
  } else {
    console.log(`OK  ${rel}`);
  }
}

console.log(failed ? "\nFAIL: syntax diagnostics found" : "\nPASS: all touched files parse cleanly");
process.exit(failed ? 1 : 0);
