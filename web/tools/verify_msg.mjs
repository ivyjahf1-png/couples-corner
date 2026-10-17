import fs from "fs";
const path = "c:/Users/HomePC/Documents/couples-corner/web/lib/server/messaging.ts";
const content = fs.readFileSync(path, "utf-8");
console.log("Has hasMatchBetween:", content.includes("hasMatchBetween"));
console.log("Has DIRECT_INTRO_COINS:", content.includes("DIRECT_INTRO_COINS"));
console.log("Has deductCoins:", content.includes("deductCoins"));
console.log("Has INSUFFICIENT_COINS:", content.includes("INSUFFICIENT_COINS"));