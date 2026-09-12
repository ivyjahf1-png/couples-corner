const fs = require("fs");

function fixFile(path, replacements) {
  let content = fs.readFileSync(path, "utf8");
  let original = content;
  for (const [oldStr, newStr] of replacements) {
    content = content.split(oldStr).join(newStr);
  }
  if (content !== original) {
    fs.writeFileSync(path, content, "utf8");
    console.log("Fixed: " + path);
  }
}

// Fix AdminContentClient.tsx - remove type={activeTab}
fixFile("components/admin/AdminContentClient.tsx", [
  ["adminUid={adminUid} type={activeTab} />", "adminUid={adminUid} />"],
]);

console.log("Done");
