(function () {
  "use strict";
  const fs = require("fs");
  const filePath = "components/admin/ContentRow.tsx";
  const content = fs.readFileSync(filePath, "utf8");

  // Find the position of the duplicate: after "}" and blank line, then duplicate import
  const lines = content.split("\n");
  let cutoff = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") braceCount++;
      if (ch === "}") braceCount--;
    }
    
    if (braceCount === 0 && i > 35) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && lines[j].trim().startsWith("import")) {
        cutoff = i + 1;
        break;
      }
    }
  }

  if (cutoff > 0) {
    const kept = lines.slice(0, cutoff + 1).join("\n");
    fs.writeFileSync(filePath, kept + "\n", "utf8");
    console.log(`ContentRow.tsx fixed: removed ${lines.length - cutoff - 1} duplicate lines`);
  } else {
    console.log("Could not find duplicate start automatically");
    const dupIdx = content.indexOf('\n\nimport { useState } from "react";');
    if (dupIdx > 0) {
      const kept = content.slice(0, dupIdx + 1);
      fs.writeFileSync(filePath, kept, "utf8");
      console.log(`ContentRow.tsx fixed via fallback: removed ${content.length - dupIdx - 1} chars`);
    }
  }
})();
