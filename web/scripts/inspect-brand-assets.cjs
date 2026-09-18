const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..", "..");

const targets = [
  "web/public",
  "web/app",
  "web-admin/public",
  "web-admin/app",
];

for (const rel of targets) {
  const dir = path.join(root, rel);
  console.log(`=== ${rel} ===`);
  if (!fs.existsSync(dir)) {
    console.log("  (MISSING)");
    continue;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      console.log(`  ${entry.name}/`);
      for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
        const sfull = path.join(full, sub.name);
        console.log(`    ${sub.name}${sub.isDirectory() ? "/" : `  ${fs.statSync(sfull).size} bytes`}`);
      }
    } else {
      console.log(`  ${entry.name}  ${fs.statSync(full).size} bytes`);
    }
  }
}