(function () {
  "use strict";
  const fs = require("fs");
  const path = require("path");

  // Fix ContentForm.tsx - restore missing backticks in template literals
  const filePath = path.join(process.cwd(), "web", "components", "admin", "ContentForm.tsx");
  let c = fs.readFileSync(filePath, "utf8");
  c = c.replace(/\r\n/g, "\n");

  // Fix missing backticks on template literals (lines 32 and 38)
  const oldReturn = "  return ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())};";
  const newReturn = "  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;";
  c = c.split(oldReturn).join(newReturn);

  fs.writeFileSync(filePath, c, "utf8");
  console.log("Fixed ContentForm.tsx template literals");

  // Verify the relevant lines
  const lines = c.split("\n");
  console.log("Lines 30-42:");
  for (let i = 29; i < 42; i++) {
    if (lines[i]) console.log((i + 1) + ": " + lines[i]);
  }
  console.log("\nLines 85-92:");
  for (let i = 84; i < 93; i++) {
    if (lines[i]) console.log((i + 1) + ": " + lines[i]);
  }

  // Also verify ContentRow.tsx and AdminContentClient.tsx
  const rowPath = path.join(process.cwd(), "web", "components", "admin", "ContentRow.tsx");
  const row = fs.readFileSync(rowPath, "utf8");
  console.log("\nContentRow.tsx exports:", (row.match(/export function ContentRow/g) || []).length);

  const clientPath = path.join(process.cwd(), "web", "components", "admin", "AdminContentClient.tsx");
  const client = fs.readFileSync(clientPath, "utf8");
  console.log("AdminContentClient adminUid type:", client.includes("adminUid: string;") ? "FIXED" : "NOT FIXED");
})();
