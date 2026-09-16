// One-off audit: lists file:token occurrences for high-risk tokens.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.argv[2] ?? process.cwd();
const DIRS = ["app", "components", "styles"];
const EXT = new Set([".tsx", ".ts", ".css"]);
const TOKENS = (process.argv[3] ?? "bg-white")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const RE = new RegExp(
  `(?:^|[\\s"'\`{])((?:hover:|focus:|active:|disabled:|dark:|group-hover:|placeholder:|peer-\\w+:|sm:|md:|lg:)*)(${TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(/[0-9.]+|\\b)`,
  "g",
);

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

const hits = new Map();
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(RE)) {
    const key = relative(ROOT, file).replace(/\\/g, "/");
    const token = `${m[1]}${m[2]}${m[3]}`;
    if (!hits.has(key)) hits.set(key, new Map());
    const perFile = hits.get(key);
    perFile.set(token, (perFile.get(token) ?? 0) + 1);
  }
}
for (const [file, tokens] of [...hits].sort((a, b) => a[0].localeCompare(b[0]))) {
  const list = [...tokens].map(([t, c]) => `${t} x${c}`).join("  ");
  console.log(`${file}\n    ${list}`);
}
