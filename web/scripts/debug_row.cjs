(function () {
  "use strict";
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(process.cwd(), "web", "components", "admin", "ContentForm.tsx");
  let c = fs.readFileSync(filePath, "utf8");
  c = c.replace(/\r\n/g, "\n");

  // Fix the corrupted payload section
  const payloadStart = c.indexOf("    const payload = {");
  if (payloadStart !== -1) {
    let depth = 0;
    let endIdx = payloadStart;
    for (let i = payloadStart; i < c.length; i++) {
      if (c[i] === "{") depth++;
      if (c[i] === "}") {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    while (c[endIdx] !== ";" && endIdx < c.length) endIdx++;
    endIdx++;

    const correctPayload = [
      "      category,",
      "      title: title.trim(),",
      "      description: description.trim() || undefined,",
      "      mediaType,",
      "      mediaUrl,",
      "      thumbnailUrl: thumbnailUrl.trim() || undefined,",
      "      buttonText: buttonText.trim() || undefined,",
      "      destinationUrl,",
      "      placement,",
      "      status,",
      "      priority: Number(priority) || 0,",
      "      startAt: new Date(startAt).toISOString(),",
      "      endAt: new Date(endAt).toISOString(),",
      "      targetAudience: targetAudience.trim() || undefined,",
      "    };",
    ].join("\n");

    c = c.substring(0, payloadStart) + "    const payload = {\n" + correctPayload + "\n" + c.substring(endIdx);
    fs.writeFileSync(filePath, c, "utf8");
    console.log("Fixed ContentForm.tsx payload section");
  } else {
    console.log("Could not find payload section");
  }

  // Fix missing backticks on template literals (lines 32 and 38)
  const oldReturn = "  return ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())};";
  const newReturn = "  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;";
  c = c.split(oldReturn).join(newReturn);

  fs.writeFileSync(filePath, c, "utf8");
  console.log("Fixed ContentForm.tsx template literals");

  // Verify
  const lines = c.split("\n");
  console.log("Lines 30-42:");
  for (let i = 29; i < 42; i++) {
    if (lines[i]) console.log((i + 1) + ": " + lines[i]);
  }

  // Verify AdminContentClient.tsx
  const clientPath = path.join(process.cwd(), "web", "components", "admin", "AdminContentClient.tsx");
  const client = fs.readFileSync(clientPath, "utf8");
  console.log("\nAdminContentClient adminUid type:", client.includes("adminUid: string;") ? "FIXED" : "NOT FIXED");

  // Verify ContentRow.tsx
  const rowPath = path.join(process.cwd(), "web", "components", "admin", "ContentRow.tsx");
  const row = fs.readFileSync(rowPath, "utf8");
  console.log("ContentRow.tsx export count:", (row.match(/export function ContentRow/g) || []).length);
})();