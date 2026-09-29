// Guards the admin gate's security properties.
//
// A shared-passphrase gate is a deliberate simplification, so these assertions
// exist to stop the simplifications from quietly getting worse: a
// NEXT_PUBLIC_ prefix, a non-constant-time compare, a forgeable cookie or a
// missing fail-closed default would each reintroduce a real vulnerability.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n        ${detail}`}`);
}

const gate = fs.readFileSync(path.join(root, "lib", "auth", "admin-gate.ts"), "utf8");

// 1. Never a NEXT_PUBLIC_ variable: that inlines the secret into the client
//    bundle and publishes the admin password to every visitor.
check(
  "does not read the passphrase from a NEXT_PUBLIC_ variable",
  !/process\.env\.NEXT_PUBLIC_[A-Z_]*PASSWORD/.test(gate) &&
    !/NEXT_PUBLIC_ADMIN/.test(gate)
);

// 2. Constant-time comparison, not ===.
check("uses a constant-time comparison", /timingSafeEqual/.test(gate));
check(
  "does not compare the passphrase with ===",
  !/candidate\s*===\s*expected|expected\s*===\s*candidate/.test(gate)
);

// 3. The unlock cookie must be signed, httpOnly and scoped to /admin.
check("the unlock cookie is HMAC-signed", /createHmac/.test(gate) && /timingSafeEqual/.test(gate));
check("the unlock cookie is httpOnly", /httpOnly:\s*true/.test(gate));
check("the unlock cookie is scoped to /admin", /path:\s*"\/admin"/.test(gate));
check("the unlock cookie is SameSite", /sameSite:\s*"lax"/.test(gate));

// 4. Fail closed: an unset password must never mean "open".
check("treats a missing passphrase as deny", /configuredPassword\(\)\s*:\s*string \| null/.test(gate));
check(
  "isAdminGateOpen returns false when unconfigured",
  /isAdminGateOpen[\s\S]{0,220}isAdminGateConfigured\(\)\) return false/.test(gate)
);

// 5. Rate limiting must exist, or the passphrase is brute-forceable.
check("rate-limits failed attempts", /MAX_ATTEMPTS/.test(gate) && /LOCKOUT_MS/.test(gate));

// 6. The action must never read or echo the secret itself — it delegates to
//    the gate and returns a status enum. Checking for the env-var READ (rather
//    than the NAME) is deliberate: the unconfigured-error copy legitimately
//    names the variable so an operator knows what to set, and matching the bare
//    string would flag that helpful message as a leak.
const action = fs.readFileSync(path.join(root, "lib", "actions", "admin-gate.ts"), "utf8");
check(
  "the server action never reads the secret directly",
  !/process\.env\.ADMIN_PANEL_PASSWORD/.test(action) &&
    !/process\.env\.ADMIN_PANEL_SECRET/.test(action)
);
check(
  "the server action delegates the comparison to the gate",
  /verifyAdminPassword/.test(action) && /grantAdminGate/.test(action)
);

// 7. The dead "not yet available" error view must be gone. Matched against the
//    rendered JSX rather than the phrase, because the layout's doc comment
//    deliberately quotes the old heading to explain what it replaced.
const layout = fs.readFileSync(path.join(root, "app", "admin", "layout.tsx"), "utf8");
const body = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check(
  "the old error screen is removed from the rendered output",
  !body.includes("not yet available") && !body.includes("SUPABASE_SERVICE_ROLE_KEY")
);
check("the layout renders the unlock card", layout.includes("AdminGateCard"));
check(
  "the admin nav is hidden while locked",
  /unlocked \? <AdminNav \/>/.test(body)
);

// 8. Every admin PAGE must re-assert the gate for itself, not rely on the
//    layout alone. settings/page.tsx is a Client Component and is exempt by
//    necessity — a client component cannot read an httpOnly cookie.
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
};

const adminDir = path.join(root, "app", "admin");
const pages = walk(adminDir);
const unguarded = pages
  .filter((f) => !/await requireAdminGate\(\)/.test(fs.readFileSync(f, "utf8")))
  .map((f) => path.relative(root, f));

const expectedExempt = ["app\\admin\\settings\\page.tsx"];
const unexpected = unguarded.filter((f) => !expectedExempt.includes(f));
check(
  "every admin page re-asserts the gate (settings exempt: client component)",
  unexpected.length === 0,
  `unguarded: ${unguarded.join(", ")}`
);

// 9. The role-based guard must still exist for the WRITE path.
const authz = fs.readFileSync(path.join(root, "lib", "auth", "authorization.ts"), "utf8");
check(
  "the database role check still exists for server actions",
  /export async function requireAdmin\b/.test(authz)
);

console.log(
  failures === 0 ? "\nAll admin-gate checks passed." : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
