(function () {
  "use strict";
  const fs = require("fs");
  const path = require("path");
  const base = path.resolve(__dirname, "..");

  // 1. Fix ContentForm.tsx - repair corrupted payload lines
  const formPath = path.join(base, "components", "admin", "ContentForm.tsx");
  let form = fs.readFileSync(formPath, "utf8");
  form = form.replace(/\r\n/g, "\n");
  form = form.replace(
    /      buttonText: buttonText\.trim\(\) \|\| undefined,\n      destinationUrl,estinationUrl: destinationUrl\.trim\(\) \|\| undefined,\n      placement,/,
    "      buttonText: buttonText.trim() || undefined,\n      destinationUrl,\n      placement,"
  );
  fs.writeFileSync(formPath, form, "utf8");
  console.log("Fixed ContentForm.tsx");

  // 2. Fix ContentRow.tsx - strip duplicate content after first function
  const rowPath = path.join(base, "components", "admin", "ContentRow.tsx");
  let row = fs.readFileSync(rowPath, "utf8");
  row = row.replace(/\r\n/g, "\n");
  const endMarker = "    </tr>\n  );\n}\n";
  const firstEnd = row.indexOf(endMarker);
  if (firstEnd !== -1) {
    row = row.substring(0, firstEnd + endMarker.length);
    fs.writeFileSync(rowPath, row, "utf8");
    console.log("Fixed ContentRow.tsx - stripped duplicate");
  } else {
    console.log("ContentRow.tsx: end marker not found");
  }

  // 3. Fix AdminContentClient.tsx - change adminUid type from string | undefined to string
  const clientPath = path.join(base, "components", "admin", "AdminContentClient.tsx");
  let client = fs.readFileSync(clientPath, "utf8");
  client = client.replace(/\r\n/g, "\n");
  client = client.replace(/adminUid: string \| undefined;/, "adminUid: string;");
  fs.writeFileSync(clientPath, client, "utf8");
  console.log("Fixed AdminContentClient.tsx");

  console.log("All admin file fixes applied!");
})();
