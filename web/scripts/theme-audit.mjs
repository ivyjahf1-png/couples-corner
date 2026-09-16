// One-off audit: lists distinct token classes in use across the app/components.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.argv[2] ?? process.cwd();
const DIRS = ["app", "components", "styles"];
const EXT = new Set([".tsx", ".ts", ".css"]);
const RE = /(?:bg|text|border|divide|ring|from|to|via|shadow|placeholder|decoration|outline)-(?:ink|brand|success|danger|warning|white|black|slate|gray|purple|orange)-\d{0,3}/g;

const files = [];
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(full);
    else if (EXT.has(extname(entry))) files.push(full);
  }
}
for (const d of DIRS) walk(join(ROOT, d));

const counts = new Map();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const m of text.match(RE) ?? []) {
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
}
console.log(`files scanned: ${files.length}`);
for (const [name, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${String(count).padStart(5)}  ${name}`);
}
