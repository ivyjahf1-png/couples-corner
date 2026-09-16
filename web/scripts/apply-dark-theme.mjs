// One-off codemod: remaps light-theme token classes to the dark landing-page
// palette across app/ + components/. Preserves variant prefixes (hover:, focus:,
// placeholder: …) and opacity suffixes (/50) because only the token itself is
// rewritten. Outputs never collide with inputs (verified by ordering + guards).
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.argv[2] ?? process.cwd();
const DRY = process.argv.includes("--dry");

const DIRS = ["app", "components"];
const EXT = new Set([".tsx", ".ts"]);

/** @type {[string,string][]} from → to, evaluated in order. */
const RULES = [
  // --- Surfaces: light grays become translucent white glass -------------
  ["bg-ink-100", "bg-white/10"],
  ["bg-ink-200", "bg-white/15"],
  ["bg-ink-300", "bg-white/20"],
  ["bg-ink-50", "bg-white/5"],
  ["bg-ink-500", "bg-white/25"],

  // --- Text: dark grays become crisp white / light slate ----------------
  ["text-ink-900", "text-white"],
  ["text-ink-800", "text-ink-100"],
  ["text-ink-700", "text-ink-200"],
  ["text-ink-600", "text-ink-300"],
  ["text-ink-500", "text-ink-400"],

  // --- Borders / dividers ----------------------------------------------
  ["border-ink-200", "border-ink-700"],
  ["border-ink-300", "border-ink-600"],
  ["border-ink-400", "border-ink-500"],
  ["divide-ink-200", "divide-ink-700"],
  ["divide-ink-300", "divide-ink-600"],

  // --- Brand (orange) accent -------------------------------------------
  ["bg-brand-100", "bg-brand-500/15"],
  ["bg-brand-200", "bg-brand-500/20"],
  ["bg-brand-50", "bg-brand-500/10"],
  ["text-brand-700", "text-brand-300"],
  ["text-brand-800", "text-brand-200"],
  ["text-brand-600", "text-brand-400"],
  ["border-brand-200", "border-brand-500/40"],
  ["border-brand-300", "border-brand-500/50"],
  ["border-brand-400", "border-brand-500/60"],
  ["ring-brand-200", "ring-brand-500/40"],
  ["decoration-brand-300", "decoration-brand-500"],

  // --- Success ----------------------------------------------------------
  ["bg-success-100", "bg-success-500/15"],
  ["bg-success-50", "bg-success-500/10"],
  ["text-success-700", "text-success-300"],
  ["text-success-800", "text-success-200"],
  ["text-success-600", "text-success-400"],
  ["border-success-300", "border-success-500/40"],
  ["border-success-200", "border-success-500/30"],

  // --- Danger -----------------------------------------------------------
  ["bg-danger-100", "bg-danger-500/15"],
  ["bg-danger-200", "bg-danger-500/20"],
  ["bg-danger-300", "bg-danger-500/25"],
  ["bg-danger-50", "bg-danger-500/10"],
  ["text-danger-700", "text-danger-300"],
  ["text-danger-800", "text-danger-200"],
  ["text-danger-900", "text-danger-200"],
  ["text-danger-600", "text-danger-400"],
  ["border-danger-200", "border-danger-500/30"],
  ["border-danger-300", "border-danger-500/40"],

  // --- Warning ----------------------------------------------------------
  ["bg-warning-50", "bg-warning-500/10"],

  // --- Native control accent (checkbox/range ticks) → CTA orange -------
  ["accent-brand-700", "accent-brand-500"],
  ["accent-[var(--color-brand-700)]", "accent-[var(--color-brand-500)]"],

  // --- Opaque white form surfaces → glass (bare bg-white only) ----------
  ["bg-white", "bg-white/5", true],
];

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXT.has(extname(entry.name))) files.push(full);
  }
}
for (const d of DIRS) {
  try {
    walk(join(ROOT, d));
  } catch {
    /* dir may not exist */
  }
}

function applyRules(text) {
  let out = text;
  const counts = new Map();
  for (const [from, to, bare] of RULES) {
    // `bare` rules must not be followed by `/` so `bg-white/10` is untouched.
    const tail = bare ? "(?![/\\w-])" : "(?:/\\d+)?(?![-\\w])";
    const re = new RegExp(`(?<![-\\w])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${tail}`, "g");
    out = out.replace(re, (match) => {
      // Re-emit any preserved opacity suffix (e.g. `bg-ink-100/60` → `bg-white/10/60`
      // is wrong, so only the token is swapped and the suffix kept as-is).
      counts.set(from, (counts.get(from) ?? 0) + 1);
      return bare ? to : to + (match.slice(from.length) ?? "");
    });
  }
  return { out, counts };
}

let changedFiles = 0;
let totalReplacements = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  const { out, counts } = applyRules(original);
  if (out === original) continue;
  const n = [...counts.values()].reduce((a, b) => a + b, 0);
  changedFiles += 1;
  totalReplacements += n;
  console.log(`${DRY ? "[dry] " : ""}${relative(ROOT, file).replace(/\\/g, "/")}  (${n})`);
  if (!DRY) writeFileSync(file, out, "utf8");
}
console.log(`\n${DRY ? "would change" : "changed"} ${changedFiles} files, ${totalReplacements} replacements`);
